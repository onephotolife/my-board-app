import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://board.blankbrainai.com';
const LOGIN_EMAIL = 'one.photolife+2@gmail.com';
const LOGIN_PASSWORD = '?@thc123THC@?';

test.describe('CSRF 403エラー調査', () => {
  test('CSRFトークンの状態を確認', async ({ page }) => {
    console.log('📊 本番環境でのCSRF 403エラー調査開始...');
    
    // 1. サインインページにアクセス
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    // 2. ログイン実行
    console.log('🔐 ログイン処理開始...');
    await page.fill('input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[name="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ ログイン成功');
    
    // 3. 新規投稿ページへ移動
    await page.goto(`${PRODUCTION_URL}/posts/new`);
    await page.waitForLoadState('networkidle');
    
    // 4. CSRFトークンの状態を確認
    const tokenInfo = await page.evaluate(() => {
      // メタタグからトークンを取得
      const metaTag = document.querySelector('meta[name="app-csrf-token"]');
      const metaToken = metaTag?.getAttribute('content');
      
      // クッキーの存在確認（JavaScriptからは値が取得できない可能性）
      const cookies = document.cookie;
      
      // LocalStorage/SessionStorageの確認
      const localStorageItems = Object.keys(localStorage);
      const sessionStorageItems = Object.keys(sessionStorage);
      
      return {
        metaToken: metaToken || null,
        metaTokenLength: metaToken?.length || 0,
        metaTokenSample: metaToken ? metaToken.substring(0, 20) + '...' : null,
        cookieString: cookies,
        hasCSRFCookie: cookies.includes('app-csrf-token'),
        hasSessionCookie: cookies.includes('app-csrf-session'),
        hasNextAuthCookie: cookies.includes('next-auth'),
        localStorageKeys: localStorageItems,
        sessionStorageKeys: sessionStorageItems,
        documentReadyState: document.readyState,
        pageURL: window.location.href
      };
    });
    
    console.log('📝 CSRFトークン情報:', JSON.stringify(tokenInfo, null, 2));
    
    // 5. ネットワークインターセプトで実際のリクエストを監視
    page.on('request', request => {
      if (request.url().includes('/api/posts') && request.method() === 'POST') {
        console.log('🔍 POSTリクエスト検出:');
        console.log('  URL:', request.url());
        console.log('  Headers:', request.headers());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/posts') && response.status() === 403) {
        console.log('❌ 403レスポンス検出:');
        console.log('  URL:', response.url());
        console.log('  Status:', response.status());
        console.log('  Headers:', response.headers());
      }
    });
    
    // 6. 投稿の試行
    console.log('📝 投稿作成を試行...');
    await page.fill('input[label*="タイトル"]', 'テスト投稿 - CSRF検証');
    await page.fill('textarea[label*="本文"]', 'CSRFトークン検証のためのテスト投稿です。');
    
    // ボタンをクリックする前にリクエストインターセプトを設定
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/posts') && resp.request().method() === 'POST'),
      page.click('button:has-text("投稿する")')
    ]);
    
    console.log('📊 レスポンス状態:');
    console.log('  Status:', response.status());
    console.log('  Status Text:', response.statusText());
    
    const responseBody = await response.json().catch(() => null);
    console.log('  Response Body:', JSON.stringify(responseBody, null, 2));
    
    // 7. DevToolsでネットワークタブの情報を取得（リクエストヘッダーの詳細）
    const requestHeaders = await page.evaluate(async () => {
      // csrfFetch関数の動作を確認
      try {
        // csrfFetchが使用可能か確認（グローバルには公開されていない可能性）
        const testResponse = await fetch('/api/csrf', {
          method: 'GET',
          credentials: 'include'
        });
        
        const csrfData = await testResponse.json();
        
        return {
          csrfEndpointStatus: testResponse.status,
          csrfToken: csrfData.token || null,
          csrfTokenLength: csrfData.token?.length || 0,
          csrfTokenSample: csrfData.token ? csrfData.token.substring(0, 20) + '...' : null,
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('📝 CSRFエンドポイント確認:', JSON.stringify(requestHeaders, null, 2));
    
    // 8. 開発者コンソールのエラーを取得
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('🔴 コンソールエラー:');
      consoleErrors.forEach(error => console.log('  -', error));
    }
    
    // 9. 最終診断
    console.log('\n========== 診断結果 ==========');
    console.log('メタタグトークン:', tokenInfo.metaToken ? '存在' : '不在');
    console.log('CSRFクッキー:', tokenInfo.hasCSRFCookie ? '存在' : '不在');
    console.log('セッションクッキー:', tokenInfo.hasSessionCookie ? '存在' : '不在');
    console.log('レスポンスステータス:', response.status());
    console.log('=============================\n');
  });

  test('CSRFトークンの送信状態を詳細確認', async ({ page, context }) => {
    console.log('📊 CSRFトークン送信の詳細調査...');
    
    // CDP（Chrome DevTools Protocol）を有効化
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.enable');
    
    // ネットワークリクエストを監視
    const requests: any[] = [];
    cdpSession.on('Network.requestWillBeSent', (params) => {
      if (params.request.url.includes('/api/posts')) {
        requests.push({
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // ログイン
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    await page.fill('input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[name="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 新規投稿ページへ
    await page.goto(`${PRODUCTION_URL}/posts/new`);
    await page.waitForLoadState('networkidle');
    
    // CSRFトークンが設定されるまで待つ
    await page.waitForTimeout(2000);
    
    // 投稿を試行
    await page.fill('input[label*="タイトル"]', 'CDP監視テスト');
    await page.fill('textarea[label*="本文"]', 'Chrome DevTools Protocolでの監視テスト');
    
    await page.click('button:has-text("投稿する")');
    await page.waitForTimeout(2000);
    
    console.log('📝 捕捉したリクエスト:');
    requests.forEach(req => {
      console.log('\n  URL:', req.url);
      console.log('  Method:', req.method);
      console.log('  Headers:');
      Object.entries(req.headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('csrf') || key.toLowerCase().includes('cookie')) {
          console.log(`    ${key}: ${value}`);
        }
      });
    });
  });
});