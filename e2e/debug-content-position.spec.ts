import { test, expect } from '@playwright/test';

test.describe('Debug Content Position', () => {
  test('find where content is', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // フルページスクリーンショット
    await page.screenshot({ 
      path: 'screenshots/dashboard-full-debug.png',
      fullPage: true
    });
    
    // ビューポート内のスクリーンショット
    await page.screenshot({ 
      path: 'screenshots/dashboard-viewport-debug.png',
      fullPage: false
    });
    
    // ページの高さを確認
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`Page total height: ${pageHeight}px`);
    
    // すべてのh4要素を探す
    const h4Elements = await page.locator('h4').all();
    console.log(`Found ${h4Elements.length} h4 elements`);
    
    for (let i = 0; i < h4Elements.length; i++) {
      const text = await h4Elements[i].textContent();
      const bounds = await h4Elements[i].boundingBox();
      console.log(`h4[${i}]: "${text}" at Y=${bounds?.y}px`);
    }
    
    // スクロールして見る
    await page.evaluate(() => window.scrollTo(0, 1100));
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/dashboard-scrolled-debug.png',
      fullPage: false
    });
    
    console.log('Debug screenshots saved');
  });
});