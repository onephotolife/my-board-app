import { test, expect } from '@playwright/test';

test.describe('Profile Layout Test', () => {
  const PROD_URL = 'https://board.blankbrainai.com';
  const TEST_EMAIL = 'one.photolife+2@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';

  test('profileページが正しいレイアウトで表示される', async ({ page }) => {
    console.log('🔍 profileページのレイアウト検証開始...\n');
    
    // 1. ログイン
    await page.goto(`${PROD_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ（ログイン完了確認）
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // 2. profileページへ遷移
    await page.goto(`${PROD_URL}/profile`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // 3. スクリーンショット撮影
    await page.screenshot({ 
      path: 'test-results/profile-layout.png',
      fullPage: true 
    });
    
    // 4. 要素の表示確認
    const checks = [
      { name: 'ページタイトル', selector: 'h4:has-text("プロフィール")' },
      { name: 'アバター', selector: '.MuiAvatar-root' },
      { name: '編集ボタン', selector: 'button:has-text("編集")' },
      { name: 'アカウント情報カード', selector: 'text=アカウント情報' },
      { name: 'サイドバー', selector: 'nav' },
      { name: 'メインコンテンツ', selector: 'main' }
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
    
    // 5. レイアウト構造確認
    const nav = await page.locator('nav').first();
    const main = await page.locator('main').first();
    
    const navBox = await nav.boundingBox();
    const mainBox = await main.boundingBox();
    
    if (navBox && mainBox) {
      console.log(`\n📐 レイアウト詳細:`);
      console.log(`  - サイドバー位置: x=${navBox.x}px, 幅=${navBox.width}px`);
      console.log(`  - メインコンテンツ位置: x=${mainBox.x}px, 幅=${mainBox.width}px`);
      
      const isCorrectLayout = mainBox.x >= navBox.width || navBox.x === 0;
      console.log(`  - レイアウト状態: ${isCorrectLayout ? '✅ 正常' : '❌ 異常（重なりあり）'}`);
      
      if (!isCorrectLayout) {
        allVisible = false;
      }
    }
    
    console.log(`\n🎯 最終結果: ${allVisible ? '✅ すべて正常' : '❌ 問題あり'}`);
    
    // アサーション
    expect(allVisible).toBe(true);
  });
});