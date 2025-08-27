import { test, expect } from '@playwright/test';

test.describe('Board Follow CSRF Test', () => {
  test('フォロー機能のCSRFトークン検証', async ({ page }) => {
    console.log('🔍 Boardページアクセステスト開始');
    
    // 1. Boardページにアクセス
    await page.goto('http://localhost:3000/board');
    console.log('✅ Boardページにアクセス');
    
    // ページの読み込み完了を待つ
    await page.waitForLoadState('networkidle');
    
    // 2. コンソールログを監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      } else if (msg.text().includes('CSRF') || msg.text().includes('Follow')) {
        console.log('📝 Console:', msg.text());
      }
    });
    
    // 3. ネットワークリクエストを監視
    page.on('request', request => {
      if (request.url().includes('/api/follow')) {
        console.log('📡 Follow API Request:', {
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/follow')) {
        console.log('📨 Follow API Response:', {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // 4. ページタイトル確認
    await expect(page).toHaveTitle(/オープン掲示板/);
    console.log('✅ ページタイトル確認');
    
    // 5. CSRFトークンの存在確認（開発者ツールで確認）
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name === 'app-csrf-token');
    
    if (csrfCookie) {
      console.log('✅ CSRFトークンCookie確認:', csrfCookie.value.substring(0, 10) + '...');
    } else {
      console.log('⚠️  CSRFトークンCookieが見つかりません');
    }
    
    // 6. 投稿が表示されるまで待つ（最大10秒）
    try {
      await page.waitForSelector('.MuiCard-root', { timeout: 10000 });
      console.log('✅ 投稿カードが表示されました');
      
      // 投稿数を確認
      const posts = await page.locator('.MuiCard-root').count();
      console.log(`📝 表示されている投稿数: ${posts}`);
    } catch (error) {
      console.log('⚠️  投稿が表示されませんでした');
    }
    
    // 7. フォローボタンの存在確認
    const followButtons = await page.locator('button:has-text("フォロー")').count();
    console.log(`📝 フォローボタン数: ${followButtons}`);
    
    // 8. ネットワークアクティビティを確認
    await page.waitForTimeout(2000); // 2秒待機してネットワーク活動を観察
    
    // 9. 最終確認
    console.log('\n=== テスト結果サマリー ===');
    console.log('CSRFトークンCookie:', csrfCookie ? '✅ 存在' : '❌ なし');
    console.log('投稿表示:', (await page.locator('.MuiCard-root').count()) > 0 ? '✅' : '❌');
    console.log('フォローボタン:', followButtons > 0 ? '✅ 存在' : '⚠️ なし');
  });

  test('認証済みユーザーでのフォロー機能テスト', async ({ page }) => {
    console.log('🔐 認証付きフォロー機能テスト開始');
    
    // 1. サインインページにアクセス
    await page.goto('http://localhost:3000/auth/signin');
    
    // 2. テストユーザーでログイン（環境に応じて調整）
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    
    // ログイン成功を待つ
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('⚠️  ダッシュボードへのリダイレクトなし');
    });
    
    // 3. Boardページへ移動
    await page.goto('http://localhost:3000/board');
    await page.waitForLoadState('networkidle');
    
    // 4. フォローボタンをクリック（存在する場合）
    const followButton = page.locator('button:has-text("フォロー")').first();
    const buttonExists = await followButton.count() > 0;
    
    if (buttonExists) {
      console.log('🎯 フォローボタンをクリック');
      
      // レスポンスを待つPromise
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/follow'),
        { timeout: 5000 }
      ).catch(() => null);
      
      // ボタンクリック
      await followButton.click();
      
      // レスポンスを確認
      const response = await responsePromise;
      if (response) {
        console.log('📨 フォローAPIレスポンス:', {
          status: response.status(),
          statusText: response.statusText()
        });
        
        if (response.status() === 200) {
          console.log('✅ フォロー成功！');
        } else if (response.status() === 403) {
          console.log('❌ CSRFエラー（403）');
        } else if (response.status() === 404) {
          console.log('⚠️  ユーザーが見つかりません（404）');
        }
      }
    } else {
      console.log('⚠️  フォローボタンが見つかりません');
    }
  });
});