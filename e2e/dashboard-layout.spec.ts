import { test, expect } from '@playwright/test';

test.describe('Dashboard Layout Fix', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用のログイン
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should display main content area correctly', async ({ page }) => {
    // メインコンテンツエリアが表示されていることを確認
    const mainContent = await page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // サイドバーが表示されていることを確認
    const sidebar = await page.locator('nav');
    await expect(sidebar).toBeVisible();
    
    // 統計カードが表示されていることを確認
    const statsCards = await page.locator('[class*="MuiPaper-root"]').filter({ hasText: '総投稿数' });
    await expect(statsCards).toBeVisible();
    
    // クイックアクションセクションが表示されていることを確認
    const quickActions = await page.locator('text=クイックアクション');
    await expect(quickActions).toBeVisible();
    
    // 最新の投稿セクションが表示されていることを確認
    const latestPosts = await page.locator('text=最新の投稿');
    await expect(latestPosts).toBeVisible();
  });

  test('sidebar should have correct width on desktop', async ({ page }) => {
    // デスクトップビューポートに設定
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // サイドバーの幅を確認
    const drawer = await page.locator('.MuiDrawer-paperAnchorDockedLeft');
    const box = await drawer.boundingBox();
    expect(box?.width).toBe(280);
  });

  test('main content should not be overlapped by sidebar', async ({ page }) => {
    // デスクトップビューポートに設定
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // メインコンテンツの位置を確認
    const main = await page.locator('main');
    const mainBox = await main.boundingBox();
    
    // サイドバーの幅を確認
    const drawer = await page.locator('.MuiDrawer-paperAnchorDockedLeft');
    const drawerBox = await drawer.boundingBox();
    
    // メインコンテンツがサイドバーの右側に配置されていることを確認
    if (mainBox && drawerBox) {
      expect(mainBox.x).toBeGreaterThanOrEqual(drawerBox.x + drawerBox.width);
    }
  });
});