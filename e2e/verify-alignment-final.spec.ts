import { test, expect } from '@playwright/test';

test.describe('Final Alignment Verification', () => {
  test('verify exact vertical alignment', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const pages = [
      { url: 'https://board.blankbrainai.com/dashboard', name: 'Dashboard', selector: 'h4:has-text("ダッシュボード")' },
      { url: 'https://board.blankbrainai.com/profile', name: 'Profile', selector: 'h4:has-text("プロフィール")' },
      { url: 'https://board.blankbrainai.com/posts/new', name: 'New Post', selector: 'h4:has-text("新規投稿")' },
      { url: 'https://board.blankbrainai.com/my-posts', name: 'My Posts', selector: 'h3:has-text("自分の投稿")' }
    ];
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await page.waitForTimeout(2000);
      
      // サイドバーメニューアイテムの位置測定
      const menuItem = await page.locator('li:has-text("ダッシュボード")').first();
      const menuBounds = await menuItem.boundingBox();
      
      // メインコンテンツのタイトル位置測定
      const mainTitle = await page.locator(pageInfo.selector).first();
      const titleBounds = await mainTitle.boundingBox();
      
      console.log(`=== ${pageInfo.name} ===`);
      console.log(`Menu Y: ${menuBounds?.y}px`);
      console.log(`Title Y: ${titleBounds?.y}px`);
      console.log(`Difference: ${Math.abs((menuBounds?.y || 0) - (titleBounds?.y || 0))}px`);
      
      // スクリーンショット
      await page.screenshot({ 
        path: `screenshots/verified-${pageInfo.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: false
      });
      
      // 許容誤差20px以内であることを確認
      const difference = Math.abs((menuBounds?.y || 0) - (titleBounds?.y || 0));
      expect(difference).toBeLessThan(20);
    }
  });
});