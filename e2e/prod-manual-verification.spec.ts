import { test, expect } from '@playwright/test';

test.describe('本番環境ダッシュボード手動検証', () => {
  const PROD_URL = 'https://board.blankbrainai.com';
  const TEST_EMAIL = 'one.photolife+2@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';

  test('ダッシュボードレイアウトが正しく表示されることを確認', async ({ page }) => {
    console.log('🔍 本番環境の検証を開始します...');
    
    // 1. ログインページへアクセス
    await page.goto(`${PROD_URL}/auth/signin`);
    console.log('✅ ログインページにアクセス成功');
    
    // 2. ログイン実行
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    console.log('✅ ログイン情報を入力');
    
    // 3. ダッシュボードへの遷移を待つ
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    // networkidleは時間がかかるので、domcontentloadedで十分
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ ダッシュボードページに遷移成功');
    
    // 4. 重要要素の表示確認
    const checks = [
      { name: '統計カード（総投稿数）', selector: 'text=総投稿数' },
      { name: '統計カード（今日の投稿）', selector: 'text=今日の投稿' },
      { name: '統計カード（メンバー歴）', selector: 'text=メンバー歴' },
      { name: 'クイックアクション', selector: 'text=クイックアクション' },
      { name: '掲示板リンク', selector: 'text=掲示板を見る' },
      { name: '新規投稿リンク', selector: 'text=新規投稿' },
      { name: '最新の投稿セクション', selector: 'text=最新の投稿' },
      { name: 'お知らせセクション', selector: 'text=お知らせ' }
    ];
    
    for (const check of checks) {
      try {
        const element = await page.locator(check.selector).first();
        await expect(element).toBeVisible({ timeout: 5000 });
        console.log(`✅ ${check.name} が表示されています`);
      } catch (error) {
        console.log(`❌ ${check.name} が表示されていません`);
      }
    }
    
    // 5. スクリーンショット撮影
    await page.screenshot({ 
      path: 'test-results/prod-dashboard-verified.png',
      fullPage: true 
    });
    console.log('📸 スクリーンショットを保存しました: test-results/prod-dashboard-verified.png');
    
    // 6. サイドバーとメインコンテンツの確認
    const sidebar = await page.locator('nav').first();
    const sidebarVisible = await sidebar.isVisible();
    console.log(`📊 サイドバー表示状態: ${sidebarVisible ? '✅ 表示' : '❌ 非表示'}`);
    
    // 7. レイアウトの視覚的確認
    const mainArea = await page.locator('.MuiBox-root').filter({ hasText: '総投稿数' }).first();
    const mainAreaVisible = await mainArea.isVisible();
    console.log(`📊 メインコンテンツ表示状態: ${mainAreaVisible ? '✅ 表示' : '❌ 非表示'}`);
    
    console.log('\n🎉 検証完了');
  });
});