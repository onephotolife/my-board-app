import { test, expect } from '@playwright/test';

test.describe('Production Dashboard Verification', () => {
  const PROD_URL = 'https://board.blankbrainai.com';
  const TEST_EMAIL = 'one.photolife+2@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';

  test('verify dashboard layout is fixed in production', async ({ page }) => {
    // 本番環境のログインページへアクセス
    await page.goto(`${PROD_URL}/auth/signin`);
    
    // ログイン
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // メインコンテンツエリアが表示されていることを確認
    const mainContent = await page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // サイドバーが表示されていることを確認
    const sidebar = await page.locator('nav');
    await expect(sidebar).toBeVisible();
    
    // 統計カードセクションが表示されていることを確認
    const statsSection = await page.locator('text=総投稿数').first();
    await expect(statsSection).toBeVisible();
    
    // クイックアクションセクションが表示されていることを確認
    const quickActions = await page.locator('text=クイックアクション').first();
    await expect(quickActions).toBeVisible();
    
    // 最新の投稿セクションが表示されていることを確認
    const latestPosts = await page.locator('text=最新の投稿').first();
    await expect(latestPosts).toBeVisible();
    
    // メインコンテンツとサイドバーの配置を確認
    const mainBox = await mainContent.boundingBox();
    const sidebarBox = await sidebar.boundingBox();
    
    if (mainBox && sidebarBox) {
      // メインコンテンツがサイドバーと重ならないことを確認
      expect(mainBox.x).toBeGreaterThanOrEqual(280);
      
      // メインコンテンツの幅が適切であることを確認
      expect(mainBox.width).toBeGreaterThan(600);
    }
    
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: 'test-results/prod-dashboard-fixed.png',
      fullPage: true 
    });
  });
});