import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://board.blankbrainai.com';
const LOGIN_EMAIL = 'one.photolife+2@gmail.com';
const LOGIN_PASSWORD = '?@thc123THC@?';

test.describe('CSRF詳細調査', () => {
  test('クッキーとトークンの詳細確認', async ({ page, context }) => {
    console.log('📊 CSRF詳細調査開始...\n');
    
    // 1. ログイン前のクッキー状態
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    let cookies = await context.cookies();
    console.log('🍪 ログイン前のクッキー:');
    cookies.forEach(cookie => {
      if (cookie.name.includes('csrf') || cookie.name.includes('session')) {
        console.log(`  ${cookie.name}: ${cookie.value ? 'Present' : 'Empty'} (httpOnly: ${cookie.httpOnly}, secure: ${cookie.secure})`);
      }
    });
    
    // 2. ログイン
    await page.fill('input[name="email"]', LOGIN_EMAIL);
    await page.fill('input[name="password"]', LOGIN_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard' }),
      page.click('button[type="submit"]')
    ]);
    console.log('\n✅ ログイン成功');
    
    // 3. ログイン後のクッキー状態
    cookies = await context.cookies();
    console.log('\n🍪 ログイン後のクッキー:');
    const csrfCookies: any = {};
    cookies.forEach(cookie => {
      if (cookie.name.includes('csrf') || cookie.name.includes('session')) {
        console.log(`  ${cookie.name}: ${cookie.value ? cookie.value.substring(0, 20) + '...' : 'Empty'} (httpOnly: ${cookie.httpOnly}, secure: ${cookie.secure})`);
        csrfCookies[cookie.name] = cookie.value;
      }
    });
    
    // 4. /api/csrfエンドポイントを直接呼び出し
    console.log('\n📡 /api/csrfエンドポイントを直接呼び出し...');
    const csrfResponse = await page.evaluate(async () => {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      return {
        status: response.status,
        token: data.token,
        headers: Object.fromEntries(response.headers.entries())
      };
    });
    console.log('  Status:', csrfResponse.status);
    console.log('  Token:', csrfResponse.token ? csrfResponse.token.substring(0, 20) + '...' : 'null');
    
    // 5. 新規投稿ページへ移動
    await page.goto(`${PRODUCTION_URL}/posts/new`);
    await page.waitForTimeout(3000);
    
    // 6. CSRFトークン取得後のクッキー状態
    cookies = await context.cookies();
    console.log('\n🍪 CSRFトークン取得後のクッキー:');
    const updatedCsrfCookies: any = {};
    cookies.forEach(cookie => {
      if (cookie.name.includes('csrf') || cookie.name.includes('session')) {
        console.log(`  ${cookie.name}: ${cookie.value ? cookie.value.substring(0, 20) + '...' : 'Empty'}`);
        updatedCsrfCookies[cookie.name] = cookie.value;
      }
    });
    
    // 7. メタタグの状態
    const metaTokenInfo = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="app-csrf-token"]');
      return {
        exists: !!metaTag,
        content: metaTag?.getAttribute('content')
      };
    });
    console.log('\n📌 メタタグの状態:');
    console.log('  存在:', metaTokenInfo.exists);
    console.log('  内容:', metaTokenInfo.content ? metaTokenInfo.content.substring(0, 20) + '...' : 'null');
    
    // 8. トークンの一致確認
    console.log('\n🔍 トークンの一致確認:');
    const cookieToken = updatedCsrfCookies['app-csrf-token'];
    const metaToken = metaTokenInfo.content;
    const sessionToken = updatedCsrfCookies['app-csrf-session'];
    
    console.log('  app-csrf-token (Cookie):', cookieToken ? cookieToken.substring(0, 20) + '...' : 'null');
    console.log('  app-csrf-token (Meta):', metaToken ? metaToken.substring(0, 20) + '...' : 'null');
    console.log('  app-csrf-session (Cookie):', sessionToken ? sessionToken.substring(0, 20) + '...' : 'null');
    console.log('  Cookie == Meta:', cookieToken === metaToken);
    
    // 9. 実際のPOSTリクエストをインターセプト
    console.log('\n📮 POSTリクエストの準備...');
    
    // リクエストインターセプト設定
    let interceptedHeaders: any = null;
    page.on('request', req => {
      if (req.url().includes('/api/posts') && req.method() === 'POST') {
        interceptedHeaders = req.headers();
      }
    });
    
    // フォーム入力と送信
    await page.fill('input[placeholder*="タイトル"]', 'トークン確認テスト');
    await page.fill('textarea[placeholder*="内容"]', 'CSRFトークンの詳細確認');
    
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/posts')),
      page.click('button:has-text("投稿する")')
    ]);
    
    console.log('\n📨 送信されたヘッダー:');
    if (interceptedHeaders) {
      Object.entries(interceptedHeaders).forEach(([key, value]) => {
        if (key.toLowerCase().includes('csrf') || key === 'x-csrf-token') {
          console.log(`  ${key}: ${value}`);
        }
      });
    }
    
    console.log('\n📬 レスポンス:');
    console.log('  Status:', response.status());
    
    if (response.status() === 403) {
      const body = await response.json();
      console.log('  Error:', JSON.stringify(body, null, 2));
      
      // サーバーログの情報を取得（可能であれば）
      console.log('\n⚠️ 403エラーが発生しました。サーバー側のログを確認してください。');
    } else if (response.status() === 201) {
      console.log('  ✅ 投稿成功（201）');
    }
    
    // 10. 診断結果
    console.log('\n========== 診断結果 ==========');
    console.log('Cookieトークン:', cookieToken ? '✅ 存在' : '❌ 不在');
    console.log('メタタグトークン:', metaToken ? '✅ 存在' : '❌ 不在');
    console.log('セッショントークン:', sessionToken ? '✅ 存在' : '❌ 不在');
    console.log('トークンの一致:', cookieToken === metaToken ? '✅ 一致' : '❌ 不一致');
    console.log('レスポンスステータス:', response.status());
    console.log('===============================');
  });
});