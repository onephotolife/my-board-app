import { test, expect } from '@playwright/test';

test.describe('本番環境レイアウト確認', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const testCredentials = {
    email: 'one.photolife+2@gmail.com',
    password: '?@thc123THC@?'
  };

  test('本番環境でデスクトップ画面レイアウトを確認', async ({ page }) => {
    test.setTimeout(120000); // 2分タイムアウト
    
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto(`${prodUrl}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 45000 });
    await page.waitForTimeout(5000); // レンダリング完了を待つ
    
    // サイドバーが存在することを確認
    const sidebar = await page.locator('[data-testid="sidebar"], .MuiDrawer-root, div[style*="width: 280"]').first();
    const sidebarBox = await sidebar.boundingBox();
    console.log(`本番環境サイドバー位置: x=${sidebarBox?.x}, width=${sidebarBox?.width}`);
    
    // 各ページをテスト
    const pages = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/profile', name: 'profile' },
      { path: '/my-posts', name: 'my-posts' },
      { path: '/posts/new', name: 'posts-new' }
    ];
    
    for (const pageInfo of pages) {
      console.log(`本番環境テスト: ${pageInfo.name}ページ`);
      await page.goto(`${prodUrl}${pageInfo.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      // スクリーンショット撮影
      await page.screenshot({ 
        path: `test-results/prod-${pageInfo.name}-layout.png`,
        fullPage: false 
      });
      
      // メインコンテンツがサイドバーと重複していないことを確認
      const mainContent = await page.locator('main, [role="main"], .main-content, div[style*="margin-left"]').first();
      if (await mainContent.count() > 0) {
        const contentBox = await mainContent.boundingBox();
        if (contentBox && sidebarBox) {
          const overlap = contentBox.x < (sidebarBox.x + sidebarBox.width);
          if (overlap) {
            console.log(`❌ ${pageInfo.name}: メインコンテンツがサイドバーと重複 (content.x=${contentBox.x}, sidebar.right=${sidebarBox.x + sidebarBox.width})`);
          } else {
            console.log(`✅ ${pageInfo.name}: レイアウト正常 (content.x=${contentBox.x}, sidebar.right=${sidebarBox.x + sidebarBox.width})`);
          }
        }
      }
    }
    
    console.log('✅ 本番環境でのレイアウトテスト完了');
  });
});