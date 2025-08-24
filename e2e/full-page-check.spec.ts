import { test, expect } from '@playwright/test';

test.describe('Full Page Check', () => {
  test('verify content exists with full page screenshots', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // ダッシュボードの完全なスクリーンショット
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'screenshots/dashboard-full.png',
      fullPage: true
    });
    
    // スクロールして内容を確認
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.screenshot({ 
      path: 'screenshots/dashboard-scrolled.png',
      fullPage: false
    });
    
    console.log('Full page screenshots taken');
  });
});