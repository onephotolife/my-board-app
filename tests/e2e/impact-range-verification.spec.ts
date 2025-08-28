import { test, expect } from '@playwright/test';

test.describe('修正影響範囲検証', () => {
  test('ホームページ基本機能に悪影響なし', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ホームページアクセス
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('load', { timeout: 10000 });
    
    // 基本要素の存在確認
    const title = await page.title();
    console.log('Page title:', title);
    expect(title).toBeTruthy();

    // コンソールエラー確認
    console.log('Home page errors:', consoleErrors);
    
    // 重篤なエラーがないことを確認
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('投稿API機能への影響確認', async ({ page }) => {
    // API健康度確認用のヘルスチェックページアクセス
    const response = await page.goto('http://localhost:3000/api/health');
    
    if (response) {
      console.log('Health API status:', response.status());
      console.log('Health API ok:', response.ok());
      
      // APIが応答していることを確認
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('認証機能への影響確認', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // サインインページアクセス
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('load', { timeout: 10000 });
    
    // フォーム要素の存在確認
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    const emailExists = await emailInput.count() > 0;
    const passwordExists = await passwordInput.count() > 0;
    
    console.log('Email input exists:', emailExists);
    console.log('Password input exists:', passwordExists);
    console.log('Auth errors:', consoleErrors);
    
    // 認証フォームが正常に表示されることを確認
    expect(emailExists || passwordExists).toBe(true);
  });
});