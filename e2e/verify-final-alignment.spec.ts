import { test, expect } from '@playwright/test';

test.describe('Final Alignment Verification', () => {
  test('verify main content position on all pages', async ({ page }) => {
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
      { url: 'https://board.blankbrainai.com/dashboard', name: 'Dashboard', titleSelector: 'h4:has-text("ダッシュボード")' },
      { url: 'https://board.blankbrainai.com/profile', name: 'Profile', titleSelector: 'h4:has-text("プロフィール")' },
      { url: 'https://board.blankbrainai.com/posts/new', name: 'New Post', titleSelector: 'h4:has-text("新規投稿")' },
      { url: 'https://board.blankbrainai.com/my-posts', name: 'My Posts', titleSelector: 'h3:has-text("自分の投稿")' },
      { url: 'https://board.blankbrainai.com/board', name: 'Board (Reference)', titleSelector: 'h1, h4' }
    ];
    
    const results = [];
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await page.waitForTimeout(2000);
      
      // メインコンテンツのタイトル位置を測定
      const mainTitle = await page.locator(pageInfo.titleSelector).first();
      const titleBounds = await mainTitle.boundingBox();
      const isVisible = await mainTitle.isVisible();
      
      const result = {
        page: pageInfo.name,
        titleY: titleBounds?.y || -1,
        visible: isVisible,
        inViewport: (titleBounds?.y || -1) < 400 && (titleBounds?.y || -1) >= 0
      };
      
      results.push(result);
      
      console.log(`=== ${pageInfo.name} ===`);
      console.log(`Title Y: ${titleBounds?.y}px`);
      console.log(`Visible: ${isVisible}`);
      console.log(`In Viewport: ${result.inViewport}`);
      
      // スクリーンショット
      await page.screenshot({ 
        path: `screenshots/final-${pageInfo.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: false
      });
      
      // メインコンテンツが画面内に表示されていることを確認
      expect(result.inViewport).toBe(true);
    }
    
    // すべてのページで一貫した配置であることを確認
    const yPositions = results.map(r => r.titleY).filter(y => y >= 0);
    const maxDifference = Math.max(...yPositions) - Math.min(...yPositions);
    
    console.log('\n=== Summary ===');
    console.log(`Y positions: ${yPositions.join(', ')}px`);
    console.log(`Max difference: ${maxDifference}px`);
    
    // 最大差が150px以内であることを確認
    expect(maxDifference).toBeLessThan(150);
  });
});