import { test, expect } from '@playwright/test';

test.describe('ログインデバッグテスト', () => {
  test('手動ログインプロセスの確認', async ({ page }) => {
    console.log('===== ログインデバッグテスト開始 =====');
    
    // ログインページへ移動
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // 2秒待機
    
    // フォーム要素の確認
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log('フォーム要素の存在確認:');
    console.log('- Email入力:', await emailInput.isVisible());
    console.log('- Password入力:', await passwordInput.isVisible());
    console.log('- 送信ボタン:', await submitButton.isVisible());
    
    // フォームに入力
    await emailInput.fill('test@example.com');
    await passwordInput.fill('Test1234!');
    
    // スクリーンショット: 入力後
    await page.screenshot({ 
      path: 'test-results/debug-before-submit.png',
      fullPage: true 
    });
    
    // ネットワークレスポンスを監視
    page.on('response', response => {
      if (response.url().includes('/api/auth')) {
        console.log(`API応答: ${response.url()} - Status: ${response.status()}`);
      }
    });
    
    // ログインボタンをクリック
    console.log('ログインボタンをクリック...');
    await submitButton.click();
    
    // 5秒待機してレスポンスを確認
    await page.waitForTimeout(5000);
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // ページタイトルを確認
    const title = await page.title();
    console.log('ページタイトル:', title);
    
    // エラーメッセージの確認
    const errorMessages = await page.locator('text=/error|エラー|失敗|Invalid/i').all();
    if (errorMessages.length > 0) {
      console.log('エラーメッセージ検出:');
      for (const msg of errorMessages) {
        const text = await msg.textContent();
        console.log('  -', text);
      }
    }
    
    // スクリーンショット: ログイン試行後
    await page.screenshot({ 
      path: 'test-results/debug-after-submit.png',
      fullPage: true 
    });
    
    // Cookieの確認
    const cookies = await page.context().cookies();
    console.log('Cookies:');
    for (const cookie of cookies) {
      if (cookie.name.includes('auth') || cookie.name.includes('session')) {
        console.log(`  - ${cookie.name}: ${cookie.value ? '設定済み' : '未設定'}`);
      }
    }
    
    console.log('===== ログインデバッグテスト完了 =====');
  });
});