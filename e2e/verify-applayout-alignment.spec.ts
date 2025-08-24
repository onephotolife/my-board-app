import { test, expect } from '@playwright/test';

test.describe('AppLayout Alignment Verification', () => {
  test('verify all pages use AppLayout correctly', async ({ page }) => {
    // デスクトップサイズ設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const pages = [
      { url: 'https://board.blankbrainai.com/dashboard', name: 'Dashboard' },
      { url: 'https://board.blankbrainai.com/profile', name: 'Profile' },
      { url: 'https://board.blankbrainai.com/posts/new', name: 'New Post' },
      { url: 'https://board.blankbrainai.com/my-posts', name: 'My Posts' },
      { url: 'https://board.blankbrainai.com/board', name: 'Board (Reference)' }
    ];
    
    let referenceY = null;
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await page.waitForTimeout(2000);
      
      // サイドバーの「ダッシュボード」メニューアイテムの位置を基準に
      const menuItem = await page.locator('a[href="/dashboard"], li:has-text("ダッシュボード")').first();
      const menuBounds = await menuItem.boundingBox();
      
      // メインコンテンツエリアの最初の見出し要素を取得
      const mainContent = await page.locator('main h1, main h2, main h3, main h4, h1, h2, h3, h4').first();
      const contentBounds = await mainContent.boundingBox();
      
      console.log(`=== ${pageInfo.name} ===`);
      console.log(`Menu Y: ${menuBounds?.y}px`);
      console.log(`Content Y: ${contentBounds?.y}px`);
      console.log(`Menu visible: ${await menuItem.isVisible()}`);
      console.log(`Content visible: ${await mainContent.isVisible()}`);
      
      // スクリーンショット
      await page.screenshot({ 
        path: `screenshots/applayout-${pageInfo.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: false
      });
      
      // /boardページの位置を基準として保存
      if (pageInfo.name === 'Board (Reference)') {
        referenceY = contentBounds?.y || 0;
        console.log(`Reference Y position set: ${referenceY}px`);
      }
      
      // メインコンテンツが画面内に表示されていることを確認
      expect(contentBounds?.y || 0).toBeLessThan(400);
      expect(contentBounds?.y || 0).toBeGreaterThanOrEqual(0);
    }
    
    // すべてのページが基準ページと同じような位置にあることを確認
    if (referenceY !== null) {
      for (const pageInfo of pages) {
        if (pageInfo.name === 'Board (Reference)') continue;
        
        await page.goto(pageInfo.url);
        await page.waitForTimeout(1000);
        
        const mainContent = await page.locator('main h1, main h2, main h3, main h4, h1, h2, h3, h4').first();
        const contentBounds = await mainContent.boundingBox();
        
        const difference = Math.abs((contentBounds?.y || 0) - referenceY);
        console.log(`${pageInfo.name} difference from reference: ${difference}px`);
        
        // 基準ページとの差が100px以内であることを確認
        expect(difference).toBeLessThan(100);
      }
    }
  });
});