import { test, expect } from '@playwright/test';

test.describe('Layout Alignment Verification', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('verify sidebar and main content alignment on all pages', async ({ page }) => {
    const pages = [
      { url: 'https://board.blankbrainai.com/dashboard', name: 'Dashboard' },
      { url: 'https://board.blankbrainai.com/profile', name: 'Profile' },
      { url: 'https://board.blankbrainai.com/posts/new', name: 'New Post' },
      { url: 'https://board.blankbrainai.com/my-posts', name: 'My Posts' }
    ];

    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      // デスクトップサイズに設定
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // サイドバーメニューアイテムの位置を取得
      const menuItem = await page.locator('[role="button"]:has-text("ダッシュボード")').first();
      const menuBounds = await menuItem.boundingBox();
      
      // メインコンテンツの最初の要素の位置を取得
      let mainContentElement;
      if (pageInfo.name === 'Dashboard' || pageInfo.name === 'My Posts') {
        // ヘッダーがある場合
        mainContentElement = await page.locator('h4, h3').first();
      } else if (pageInfo.name === 'Profile') {
        // プロフィールページ
        mainContentElement = await page.locator('h4:has-text("プロフィール")').first();
      } else {
        // 新規投稿ページ
        mainContentElement = await page.locator('h4:has-text("新規投稿")').first();
      }
      
      const contentBounds = await mainContentElement.boundingBox();
      
      console.log(`${pageInfo.name} - Menu Y: ${menuBounds?.y}, Content Y: ${contentBounds?.y}`);
      
      // スクリーンショットを撮影
      await page.screenshot({ 
        path: `screenshots/layout-${pageInfo.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: false
      });
      
      // 垂直位置の差を確認（許容誤差: 20px）
      if (menuBounds && contentBounds) {
        const difference = Math.abs(menuBounds.y - contentBounds.y);
        expect(difference).toBeLessThan(20);
      }
    }
  });
});