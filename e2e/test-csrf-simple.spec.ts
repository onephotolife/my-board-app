import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://board.blankbrainai.com';
const LOGIN_EMAIL = 'one.photolife+2@gmail.com';
const LOGIN_PASSWORD = '?@thc123THC@?';

test.describe('CSRF 403エラー簡易調査', () => {
  test('投稿APIの403エラーを再現', async ({ page }) => {
    console.log('📊 403エラー再現テスト開始...');
    
    // 1. ログイン
    await page.goto(`${PRODUCTION_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[name="password"]', LOGIN_PASSWORD);
    
    // ログインボタンクリックとリダイレクトを同時に待つ
    const [response] = await Promise.all([
      page.waitForNavigation({ url: '**/dashboard' }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('✅ ログイン成功、ダッシュボードへリダイレクト');
    
    // 2. 新規投稿ページへ移動
    await page.goto(`${PRODUCTION_URL}/posts/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // CSRFトークン取得を待つ
    
    // 3. CSRFトークンの状態確認
    const tokenState = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="app-csrf-token"]');
      const metaToken = metaTag?.getAttribute('content');
      
      // csrfFetch関数が存在するか確認（開発者コンソールから）
      const hasCsrfFetch = typeof (window as any).csrfFetch !== 'undefined';
      
      return {
        hasMetaTag: !!metaTag,
        hasMetaToken: !!metaToken,
        metaTokenLength: metaToken?.length || 0,
        metaTokenPreview: metaToken ? metaToken.substring(0, 10) + '...' : null,
        hasCsrfFetch,
        cookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
      };
    });
    
    console.log('📝 CSRFトークン状態:', JSON.stringify(tokenState, null, 2));
    
    // 4. APIリクエストインターセプト設定
    let capturedRequest: any = null;
    let capturedResponse: any = null;
    
    page.on('request', req => {
      if (req.url().includes('/api/posts') && req.method() === 'POST') {
        capturedRequest = {
          url: req.url(),
          method: req.method(),
          headers: req.headers(),
          postData: req.postData()
        };
      }
    });
    
    page.on('response', res => {
      if (res.url().includes('/api/posts') && res.request().method() === 'POST') {
        capturedResponse = {
          url: res.url(),
          status: res.status(),
          statusText: res.statusText(),
          headers: res.headers()
        };
      }
    });
    
    // 5. 投稿を試行
    console.log('📝 投稿を試行中...');
    
    await page.fill('input[placeholder*="タイトル"]', 'CSRF検証テスト');
    await page.fill('textarea[placeholder*="内容"]', 'これはCSRF検証のためのテスト投稿です。');
    
    // 投稿ボタンクリック
    await page.click('button:has-text("投稿する")');
    
    // レスポンスを待つ
    await page.waitForTimeout(3000);
    
    // 6. 結果を出力
    console.log('\n========== リクエスト情報 ==========');
    if (capturedRequest) {
      console.log('URL:', capturedRequest.url);
      console.log('Method:', capturedRequest.method);
      console.log('Headers:');
      Object.entries(capturedRequest.headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('csrf') || 
            key.toLowerCase().includes('cookie') ||
            key.toLowerCase() === 'x-csrf-token') {
          console.log(`  ${key}: ${value}`);
        }
      });
      if (capturedRequest.postData) {
        try {
          const body = JSON.parse(capturedRequest.postData);
          console.log('Body:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('Body (raw):', capturedRequest.postData);
        }
      }
    } else {
      console.log('❌ リクエストがキャプチャされませんでした');
    }
    
    console.log('\n========== レスポンス情報 ==========');
    if (capturedResponse) {
      console.log('Status:', capturedResponse.status, capturedResponse.statusText);
      console.log('Headers:');
      Object.entries(capturedResponse.headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log('❌ レスポンスがキャプチャされませんでした');
    }
    
    // 7. エラーメッセージの確認
    const errorMessage = await page.textContent('.MuiAlert-message').catch(() => null);
    if (errorMessage) {
      console.log('\n⚠️ 画面上のエラーメッセージ:', errorMessage);
    }
    
    // 8. コンソールログの確認
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    
    await page.waitForTimeout(1000);
    
    if (logs.length > 0) {
      console.log('\n========== コンソールログ ==========');
      logs.forEach(log => console.log(log));
    }
    
    // アサーション
    expect(capturedResponse?.status).toBe(403);
  });
});