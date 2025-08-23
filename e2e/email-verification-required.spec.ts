import { test, expect } from '@playwright/test';

test.describe('メール確認必須フロー検証', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  
  test('メール未確認の新規登録ユーザーがログインできないことを確認', async ({ page }) => {
    console.log('========================================');
    console.log('メール確認必須フロー検証開始');
    console.log('========================================');
    
    // Step 1: 新規登録
    const timestamp = Date.now();
    const testEmail = `test_unverified_${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('📧 テストメール:', testEmail);
    
    await page.goto(`${prodUrl}/auth/signup`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // 登録フォーム入力
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"]', testEmail);
    
    const passwordFields = await page.locator('input[type="password"]').all();
    if (passwordFields.length >= 2) {
      await passwordFields[0].fill(testPassword);
      await passwordFields[1].fill(testPassword);
    }
    
    // 登録実行
    await page.click('button[type="submit"]');
    
    // 成功メッセージ待機
    const successMessage = page.locator('.success-message, [role="status"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    const messageText = await successMessage.textContent();
    console.log('✅ 登録成功:', messageText);
    
    // サインインページへリダイレクト待機
    await page.waitForTimeout(3500);
    expect(page.url()).toContain('/auth/signin');
    
    // Step 2: メール確認前にログイン試行
    console.log('🔐 メール確認前のログイン試行開始');
    
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // ログイン情報入力
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // スクリーンショット（ログイン前）
    await page.screenshot({ 
      path: 'test-results/unverified-before-login.png',
      fullPage: true 
    });
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    console.log('✅ ログインボタンクリック');
    
    // ログイン結果を待機（5秒）
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('📍 ログイン試行後のURL:', currentUrl);
    
    // スクリーンショット（ログイン後）
    await page.screenshot({ 
      path: 'test-results/unverified-after-login.png',
      fullPage: true 
    });
    
    // 検証: ダッシュボードへアクセスできないこと
    if (currentUrl.includes('/dashboard')) {
      console.log('❌ エラー: メール未確認でもログインできてしまいました');
      throw new Error('メール未確認ユーザーがログインできてしまいます（重大なセキュリティ問題）');
    }
    
    // エラーメッセージの確認
    const errorMessage = await page.locator('.error-message, [role="alert"], .MuiAlert-root').textContent().catch(() => null);
    if (errorMessage) {
      console.log('✅ エラーメッセージ表示:', errorMessage);
      expect(errorMessage).toContain('メール');
    }
    
    // サインインページに留まることを確認
    expect(currentUrl).toContain('/auth/signin');
    console.log('✅ サインインページに留まっています');
    
    console.log('========================================');
    console.log('🎉 メール確認必須フロー検証成功');
    console.log('========================================');
  });
});