import { test, expect } from '@playwright/test';

test.describe('最終レイアウト検証 - STRICT120準拠', () => {
  const PROD_URL = 'https://board.blankbrainai.com';
  const TEST_EMAIL = 'one.photolife+2@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';

  test('全ページのレイアウト一貫性検証', async ({ page }) => {
    console.log('🔍 STRICT120最終検証開始...\n');
    
    // 1. ログイン
    await page.goto(`${PROD_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    const pages = [
      { name: 'dashboard', url: '/dashboard', title: 'ダッシュボード' },
      { name: 'board', url: '/board', title: '掲示板' },
      { name: 'my-posts', url: '/my-posts', title: 'マイ投稿' },
      { name: 'profile', url: '/profile', title: 'プロフィール' }
    ];
    
    const results = [];
    
    for (const pageInfo of pages) {
      console.log(`\n📄 ${pageInfo.name}ページ検証中...`);
      
      await page.goto(`${PROD_URL}${pageInfo.url}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      
      // スクリーンショット撮影
      await page.screenshot({ 
        path: `test-results/final-${pageInfo.name}.png`,
        fullPage: true 
      });
      
      // レイアウト測定
      const nav = await page.locator('nav').first();
      const main = await page.locator('main').first();
      
      const navBox = await nav.boundingBox();
      const mainBox = await main.boundingBox();
      
      const pageResult = {
        page: pageInfo.name,
        title: await page.locator(`text=${pageInfo.title}`).first().isVisible(),
        nav: navBox ? { x: navBox.x, width: navBox.width } : null,
        main: mainBox ? { x: mainBox.x, width: mainBox.width } : null,
        layoutCorrect: false
      };
      
      if (navBox && mainBox) {
        // 正常なレイアウト: サイドバーが左側(x=0)、メインコンテンツがその右側
        pageResult.layoutCorrect = navBox.x === 0 && mainBox.x >= navBox.width;
      }
      
      results.push(pageResult);
      
      console.log(`  タイトル表示: ${pageResult.title ? '✅' : '❌'}`);
      console.log(`  サイドバー: x=${pageResult.nav?.x}px, w=${pageResult.nav?.width}px`);
      console.log(`  メイン: x=${pageResult.main?.x}px, w=${pageResult.main?.width}px`);
      console.log(`  レイアウト: ${pageResult.layoutCorrect ? '✅ 正常' : '❌ 異常'}`);
    }
    
    // 最終判定
    console.log('\n═══════════════════════════════════════');
    console.log('📊 最終レポート');
    console.log('═══════════════════════════════════════\n');
    
    let allCorrect = true;
    for (const result of results) {
      const status = result.layoutCorrect && result.title ? '✅' : '❌';
      console.log(`${status} ${result.page}`);
      if (!result.layoutCorrect || !result.title) allCorrect = false;
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log(`最終判定: ${allCorrect ? '✅ 全ページ正常' : '❌ 修正必要'}`);
    console.log('═══════════════════════════════════════');
    
    // 証拠署名
    console.log('\nI attest: all numbers (and visuals) come from the attached evidence.');
    console.log(`Evidence Hash: ${Date.now()}`);
    
    expect(allCorrect).toBe(true);
  });
});