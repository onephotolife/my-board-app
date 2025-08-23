import { test, expect } from '@playwright/test';

test.describe('本番環境 - 簡略版認証テスト', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const prodEmail = 'one.photolife+2@gmail.com';
  const prodPassword = '?@thc123THC@?';

  test('本番環境ログイン検証', async ({ page }) => {
    console.log(`🌐 開始: ${new Date().toISOString()}`);
    console.log(`📍 URL: ${prodUrl}`);
    console.log(`📧 Email: ${prodEmail}`);
    
    // Step 1: ログインページへアクセス（waitUntilを調整）
    console.log('Step 1: ページアクセス開始');
    await page.goto(`${prodUrl}/auth/signin`, { 
      waitUntil: 'domcontentloaded',  // networkidleから変更
      timeout: 15000 
    });
    console.log('✅ ページ読み込み完了');
    
    // Step 2: フォーム要素の確認
    console.log('Step 2: フォーム要素確認');
    const emailInput = await page.locator('input[name="email"]').isVisible({ timeout: 5000 });
    const passwordInput = await page.locator('input[name="password"]').isVisible({ timeout: 5000 });
    console.log(`📝 Email input visible: ${emailInput}`);
    console.log(`📝 Password input visible: ${passwordInput}`);
    
    if (!emailInput || !passwordInput) {
      throw new Error('ログインフォームが見つかりません');
    }
    
    // Step 3: 認証情報入力
    console.log('Step 3: 認証情報入力');
    await page.fill('input[name="email"]', prodEmail);
    await page.fill('input[name="password"]', prodPassword);
    console.log('✅ 入力完了');
    
    // Step 4: ログイン実行
    console.log('Step 4: ログインボタンクリック');
    await page.click('button[type="submit"]');
    
    // Step 5: 結果待機（ダッシュボードまたはエラー）
    console.log('Step 5: リダイレクト待機');
    await page.waitForTimeout(5000); // 固定待機時間
    
    const currentUrl = page.url();
    console.log(`📍 現在のURL: ${currentUrl}`);
    
    // Step 6: 結果検証
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ ログイン成功 - ダッシュボードへリダイレクト');
      await page.screenshot({ path: 'test-results/prod-login-success.png' });
    } else if (currentUrl.includes('/auth/signin')) {
      console.log('❌ ログイン失敗 - サインインページに留まる');
      const errors = await page.locator('.error-message, [role="alert"]').allTextContents();
      console.log('エラーメッセージ:', errors);
      await page.screenshot({ path: 'test-results/prod-login-failed.png' });
      throw new Error(`ログイン失敗: ${errors.join(', ')}`);
    } else {
      console.log(`⚠️ 予期しないURL: ${currentUrl}`);
      await page.screenshot({ path: 'test-results/prod-login-unexpected.png' });
    }
    
    console.log(`🏁 完了: ${new Date().toISOString()}`);
  });
});