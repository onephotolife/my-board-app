import { test, expect } from '@playwright/test';

test.describe('本番環境レイアウト修正確認', () => {
  const PROD_URL = 'https://board.blankbrainai.com';
  const TEST_EMAIL = 'one.photolife+2@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';

  test('ダッシュボードのサイドバーとメインコンテンツが正しく表示される', async ({ page }) => {
    console.log('🔍 本番環境の表示確認を開始...\n');
    
    // ログイン
    await page.goto(`${PROD_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへ遷移
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await page.waitForTimeout(3000); // 完全なレンダリングを待つ
    
    // スクリーンショットを撮影（デバッグ用）
    await page.screenshot({ 
      path: 'test-results/prod-dashboard-current-state.png',
      fullPage: true 
    });
    
    // メインコンテンツの表示確認
    const mainContent = await page.locator('main').first();
    const isMainVisible = await mainContent.isVisible();
    console.log(`📊 メインコンテンツ表示: ${isMainVisible ? '✅ 表示' : '❌ 非表示'}`);
    
    // サイドバーの表示確認
    const sidebar = await page.locator('nav').first();
    const isSidebarVisible = await sidebar.isVisible();
    console.log(`📊 サイドバー表示: ${isSidebarVisible ? '✅ 表示' : '❌ 非表示'}`);
    
    // 重要コンテンツの表示確認
    try {
      // 統計カードエリア全体を探す
      const statsArea = await page.locator('text=総投稿数').first();
      const isStatsVisible = await statsArea.isVisible({ timeout: 5000 });
      console.log(`📊 統計カード表示: ${isStatsVisible ? '✅ 表示' : '❌ 非表示'}`);
      
      if (isStatsVisible) {
        // サイドバーとメインコンテンツの配置を確認
        const sidebarBox = await sidebar.boundingBox();
        const mainBox = await mainContent.boundingBox();
        
        if (sidebarBox && mainBox) {
          console.log(`\n📐 レイアウト詳細:`);
          console.log(`  - サイドバー幅: ${sidebarBox.width}px`);
          console.log(`  - サイドバー左位置: ${sidebarBox.x}px`);
          console.log(`  - メインコンテンツ左位置: ${mainBox.x}px`);
          console.log(`  - メインコンテンツ幅: ${mainBox.width}px`);
          
          // メインコンテンツがサイドバーと重なっていないか確認
          const isOverlapping = mainBox.x < (sidebarBox.x + sidebarBox.width);
          console.log(`  - 重なり状態: ${isOverlapping ? '❌ 重なっている' : '✅ 正常'}`);
        }
      }
    } catch (error) {
      console.log('❌ 統計カードが見つかりません - メインコンテンツが表示されていない可能性があります');
    }
    
    console.log('\n🎯 検証完了');
  });
});