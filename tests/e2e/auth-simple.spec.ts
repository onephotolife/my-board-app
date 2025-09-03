import { test, expect } from '@playwright/test';

test.describe('Simple Authentication Test', () => {
  test('can login with test user', async ({ page }) => {
    // ログインページに移動
    await page.goto('/auth/signin');
    
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // ログインフォームに入力
    const email = 'one.photolife+1@gmail.com';
    const password = '?@thc123THC@?';
    
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    
    // スクリーンショットを撮る（デバッグ用）
    await page.screenshot({ path: 'test-results/login-form-filled.png' });
    
    // ログインボタンをクリック
    await page.click('[data-testid="signin-button"]');
    
    // レスポンスを待つ
    await page.waitForTimeout(5000); // 5秒待機
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // スクリーンショットを撮る
    await page.screenshot({ path: 'test-results/after-login.png' });
    
    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    
    // ダッシュボードの要素が表示されることを確認
    await page.waitForSelector('h1', { timeout: 5000 });
    const heading = await page.locator('h1').first().textContent();
    console.log('Dashboard heading:', heading);
  });
});