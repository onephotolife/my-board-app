import { test, expect } from '@playwright/test';

test.describe('ローカル環境レイアウト確認', () => {
  test('ダッシュボードのレイアウトが正しく表示される', async ({ page }) => {
    // ローカル環境のダッシュボードへ直接アクセス（認証スキップ）
    await page.goto('http://localhost:3000/dashboard');
    
    // ページが読み込まれるまで待機
    await page.waitForTimeout(2000);
    
    // サイドバーとメインコンテンツの位置を確認
    const sidebar = await page.locator('nav').first();
    const main = await page.locator('main').first();
    
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: 'test-results/local-dashboard-layout.png',
      fullPage: true 
    });
    
    // サイドバーの幅を確認
    const sidebarBox = await sidebar.boundingBox();
    if (sidebarBox) {
      console.log(`サイドバー幅: ${sidebarBox.width}px`);
      expect(sidebarBox.width).toBe(280);
    }
    
    // メインコンテンツの位置を確認
    const mainBox = await main.boundingBox();
    if (mainBox) {
      console.log(`メインコンテンツ左位置: ${mainBox.x}px`);
      console.log(`メインコンテンツ幅: ${mainBox.width}px`);
      // メインコンテンツがサイドバーの右側にあることを確認
      expect(mainBox.x).toBeGreaterThanOrEqual(280);
    }
  });
});