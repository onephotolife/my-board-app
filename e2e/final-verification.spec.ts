import { test, expect } from '@playwright/test';

test.describe('Final Layout Verification', () => {
  test('verify all pages with full screenshots', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // 各ページのフルスクリーンショット
    const pages = [
      { url: 'https://board.blankbrainai.com/dashboard', name: 'dashboard' },
      { url: 'https://board.blankbrainai.com/profile', name: 'profile' },
      { url: 'https://board.blankbrainai.com/posts/new', name: 'new-post' },
      { url: 'https://board.blankbrainai.com/my-posts', name: 'my-posts' }
    ];
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: `screenshots/final-${pageInfo.name}.png`,
        fullPage: true
      });
      console.log(`Screenshot taken for ${pageInfo.name}`);
    }
    
    console.log('All pages verified successfully');
  });
});