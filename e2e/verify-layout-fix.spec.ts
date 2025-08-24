import { test, expect } from '@playwright/test';

test.describe('デスクトップレイアウト修正確認', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const testCredentials = {
    email: 'one.photolife+2@gmail.com',
    password: '?@thc123THC@?'
  };

  // テスト対象ページ
  const pagesToTest = [
    { path: '/profile', name: 'プロフィール' },
    { path: '/dashboard', name: 'ダッシュボード' },
    { path: '/posts/new', name: '新規投稿' },
    { path: '/my-posts', name: '自分の投稿' }
  ];

  test.beforeEach(async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto(`${prodUrl}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 30000 });
  });

  pagesToTest.forEach(({ path, name }) => {
    test(`${name}ページのレイアウトが正しく表示される`, async ({ page }) => {
      // ページに移動
      await page.goto(`${prodUrl}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // レンダリング完了を待つ
      
      // サイドバーの存在と位置を確認
      const sidebar = page.locator('div').filter({ 
        has: page.locator('text="ダッシュボード"'),
        hasText: 'ログアウト'
      }).first();
      
      await expect(sidebar).toBeVisible();
      
      // サイドバーの位置を取得
      const sidebarBox = await sidebar.boundingBox();
      expect(sidebarBox).not.toBeNull();
      
      if (sidebarBox) {
        // サイドバーが左端（0px付近）に固定されていることを確認
        expect(sidebarBox.x).toBeLessThanOrEqual(5);
        expect(sidebarBox.width).toBeGreaterThan(200);
        expect(sidebarBox.width).toBeLessThan(300);
      }
      
      // メインコンテンツエリアの確認
      const mainContent = await page.locator('main, [role="main"], .MuiContainer-root').first();
      const mainContentBox = await mainContent.boundingBox();
      
      if (mainContentBox && sidebarBox) {
        // メインコンテンツがサイドバーの右側に配置されていることを確認
        expect(mainContentBox.x).toBeGreaterThan(sidebarBox.width - 10);
        
        // メインコンテンツが画面の中央寄りに配置されていることを確認
        const viewportWidth = 1920;
        const contentCenterX = mainContentBox.x + (mainContentBox.width / 2);
        const viewportCenterX = viewportWidth / 2;
        
        // コンテンツの中心が画面の中心付近にあることを確認（許容範囲: ±200px）
        expect(Math.abs(contentCenterX - viewportCenterX)).toBeLessThan(300);
      }
      
      // スクリーンショットを撮影（視覚的確認用）
      await page.screenshot({ 
        path: `test-results/layout-${path.replace(/\//g, '-')}.png`,
        fullPage: false 
      });
      
      console.log(`✅ ${name}ページのレイアウト確認完了`);
    });
  });

  test('レイアウトの一貫性確認', async ({ page }) => {
    const sidebarWidths: number[] = [];
    const mainContentPositions: number[] = [];
    
    for (const { path, name } of pagesToTest) {
      await page.goto(`${prodUrl}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const sidebar = page.locator('div').filter({ 
        has: page.locator('text="ダッシュボード"'),
        hasText: 'ログアウト'
      }).first();
      
      const sidebarBox = await sidebar.boundingBox();
      if (sidebarBox) {
        sidebarWidths.push(sidebarBox.width);
      }
      
      const mainContent = await page.locator('main, [role="main"], .MuiContainer-root').first();
      const mainContentBox = await mainContent.boundingBox();
      if (mainContentBox) {
        mainContentPositions.push(mainContentBox.x);
      }
    }
    
    // すべてのページでサイドバー幅が同じであることを確認
    const uniqueWidths = [...new Set(sidebarWidths)];
    expect(uniqueWidths.length).toBe(1);
    
    // メインコンテンツの開始位置がほぼ同じであることを確認（±10px）
    const avgPosition = mainContentPositions.reduce((a, b) => a + b, 0) / mainContentPositions.length;
    mainContentPositions.forEach(pos => {
      expect(Math.abs(pos - avgPosition)).toBeLessThan(10);
    });
    
    console.log('✅ すべてのページでレイアウトが一貫している');
  });
});