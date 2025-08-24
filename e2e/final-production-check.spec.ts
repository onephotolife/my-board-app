import { test, expect } from '@playwright/test';

test.describe('最終本番環境確認', () => {
  const PROD_URL = 'https://board.blankbrainai.com';
  const TEST_EMAIL = 'one.photolife+2@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';

  test('ダッシュボードが正しく表示される', async ({ page }) => {
    console.log('🔍 最終確認を開始...\n');
    
    // ログイン
    await page.goto(`${PROD_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへ遷移
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await page.waitForTimeout(3000); // 完全なレンダリングを待つ
    
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: 'test-results/prod-dashboard-final-check.png',
      fullPage: true 
    });
    
    // 重要要素の表示確認
    const checks = [
      { name: 'ダッシュボードタイトル', selector: 'h4:has-text("ダッシュボード")' },
      { name: 'ユーザー挨拶', selector: 'text=おかえりなさい' },
      { name: '統計カード（総投稿数）', selector: 'text=総投稿数' },
      { name: '統計カード（今日の投稿）', selector: 'text=今日の投稿' },
      { name: 'クイックアクション', selector: 'text=クイックアクション' },
      { name: '最新の投稿', selector: 'text=最新の投稿' }
    ];
    
    let allVisible = true;
    for (const check of checks) {
      try {
        const element = await page.locator(check.selector).first();
        const isVisible = await element.isVisible({ timeout: 3000 });
        console.log(`${isVisible ? '✅' : '❌'} ${check.name}`);
        if (!isVisible) allVisible = false;
      } catch (error) {
        console.log(`❌ ${check.name}`);
        allVisible = false;
      }
    }
    
    // レイアウトの確認
    const nav = await page.locator('nav').first();
    const main = await page.locator('main').first();
    
    const navBox = await nav.boundingBox();
    const mainBox = await main.boundingBox();
    
    if (navBox && mainBox) {
      console.log(`\n📐 レイアウト詳細:`);
      console.log(`  - サイドバー左位置: ${navBox.x}px`);
      console.log(`  - サイドバー幅: ${navBox.width}px`);
      console.log(`  - メインコンテンツ左位置: ${mainBox.x}px`);
      console.log(`  - メインコンテンツ幅: ${mainBox.width}px`);
      
      // 正しいレイアウトかチェック
      const isCorrectLayout = navBox.x === 0 && mainBox.x >= navBox.width;
      console.log(`  - レイアウト状態: ${isCorrectLayout ? '✅ 正常' : '❌ 異常'}`);
    }
    
    console.log(`\n🎯 最終結果: ${allVisible ? '✅ すべて正常に表示' : '❌ 一部要素が表示されていません'}`);
    
    // アサーション
    expect(allVisible).toBe(true);
  });
});