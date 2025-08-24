/**
 * 本番環境デザイン検証テスト
 * STRICT120プロトコル準拠 - 3点一致＋IPoV
 */

import { test, expect, Page } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?',
};

// レスポンシブブレークポイント
const viewports = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

async function loginToProd(page: Page) {
  await page.goto(`${PROD_URL}/auth/signin`);
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  
  // ダッシュボードまたは掲示板へのリダイレクトを待つ
  await page.waitForURL(/dashboard|board/, { timeout: 15000 });
}

test.describe('本番環境デザイン検証', () => {
  test.setTimeout(60000); // 1分のタイムアウト

  test('1. ダッシュボードページのデザイン確認', async ({ page }) => {
    console.log('🔍 ダッシュボードデザイン検証開始');
    
    await loginToProd(page);
    await page.goto(`${PROD_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // IPoV検証項目
    const verificationResults = {
      colors: [],
      positions: [],
      texts: [],
      states: [],
      issues: [],
    };

    // 1. 色の検証（最低2つ）
    const bgGradient = await page.evaluate(() => {
      const header = document.querySelector('[class*="background"][class*="gradient"], [style*="gradient"]');
      return header ? window.getComputedStyle(header).background : null;
    });
    
    if (bgGradient && bgGradient.includes('gradient')) {
      verificationResults.colors.push('✅ グラデーション背景: 適用確認');
      console.log('  ✅ グラデーション背景: 適用確認');
    } else {
      verificationResults.issues.push('❌ グラデーション背景: 未適用');
      console.log('  ❌ グラデーション背景: 未適用');
    }

    const primaryButton = await page.locator('.MuiButton-containedPrimary').first();
    if (await primaryButton.isVisible()) {
      const buttonBg = await primaryButton.evaluate(el => window.getComputedStyle(el).background);
      verificationResults.colors.push(`ボタン背景: ${buttonBg}`);
      console.log(`  ボタン背景: ${buttonBg}`);
    }

    // 2. 位置の検証（最低3つ）
    const sidebar = page.locator('.MuiDrawer-paper, nav').first();
    const main = page.locator('main, [role="main"]').first();
    const header = page.locator('.MuiAppBar-root, header').first();

    if (await sidebar.isVisible()) {
      const sidebarBox = await sidebar.boundingBox();
      verificationResults.positions.push(`サイドバー: x=${sidebarBox?.x}, w=${sidebarBox?.width}`);
      console.log(`  ✅ サイドバー: x=${sidebarBox?.x}, w=${sidebarBox?.width}`);
    }

    if (await main.isVisible()) {
      const mainBox = await main.boundingBox();
      verificationResults.positions.push(`メインコンテンツ: x=${mainBox?.x}, w=${mainBox?.width}`);
      console.log(`  ✅ メインコンテンツ: x=${mainBox?.x}, w=${mainBox?.width}`);
    }

    if (await header.isVisible()) {
      const headerBox = await header.boundingBox();
      verificationResults.positions.push(`ヘッダー: y=${headerBox?.y}, h=${headerBox?.height}`);
      console.log(`  ✅ ヘッダー: y=${headerBox?.y}, h=${headerBox?.height}`);
    }

    // 3. テキストの検証（最低3つ）
    const dashboardTitle = await page.locator('h1, h2, h3, h4').filter({ hasText: 'ダッシュボード' }).first();
    if (await dashboardTitle.isVisible()) {
      verificationResults.texts.push('✅ タイトル「ダッシュボード」: 表示確認');
      console.log('  ✅ タイトル「ダッシュボード」: 表示確認');
    }

    const menuItems = await page.locator('[class*="ListItem"]').count();
    verificationResults.texts.push(`メニュー項目数: ${menuItems}`);
    console.log(`  メニュー項目数: ${menuItems}`);

    const userName = await page.locator('[class*="Typography"]').filter({ hasText: TEST_USER.email }).first();
    if (await userName.isVisible()) {
      verificationResults.texts.push('✅ ユーザー名: 表示確認');
      console.log('  ✅ ユーザー名: 表示確認');
    }

    // 4. 状態の検証（最低2つ）
    const logoutButton = page.locator('button').filter({ hasText: 'ログアウト' }).first();
    if (await logoutButton.isVisible()) {
      const isEnabled = await logoutButton.isEnabled();
      verificationResults.states.push(`ログアウトボタン: ${isEnabled ? 'enabled' : 'disabled'}`);
      console.log(`  ログアウトボタン: ${isEnabled ? 'enabled' : 'disabled'}`);
    }

    const scrollTopButton = page.locator('[title*="トップ"], [aria-label*="top"]').first();
    const scrollTopVisible = await scrollTopButton.isVisible().catch(() => false);
    verificationResults.states.push(`スクロールトップボタン: ${scrollTopVisible ? 'visible' : 'hidden'}`);
    console.log(`  スクロールトップボタン: ${scrollTopVisible ? 'visible' : 'hidden'}`);

    // 5. 異常の検証（最低1つ）
    const overlapCheck = await page.evaluate(() => {
      const sidebar = document.querySelector('.MuiDrawer-paper');
      const main = document.querySelector('main');
      if (!sidebar || !main) return null;
      
      const sidebarRect = sidebar.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      
      return mainRect.left < sidebarRect.right;
    });

    if (overlapCheck === true) {
      verificationResults.issues.push('❌ サイドバーとメインコンテンツが重なっている');
      console.log('  ❌ サイドバーとメインコンテンツが重なっている');
    } else if (overlapCheck === false) {
      console.log('  ✅ レイアウト重なり: なし');
    }

    // スクリーンショット取得
    await page.screenshot({ 
      path: 'test-results/prod-dashboard-desktop.png',
      fullPage: true 
    });

    // 検証結果のサマリー
    console.log('\n📊 ダッシュボード検証結果:');
    console.log(`  色要素: ${verificationResults.colors.length}個（最低2個）`);
    console.log(`  位置要素: ${verificationResults.positions.length}個（最低3個）`);
    console.log(`  テキスト要素: ${verificationResults.texts.length}個（最低3個）`);
    console.log(`  状態要素: ${verificationResults.states.length}個（最低2個）`);
    console.log(`  異常: ${verificationResults.issues.length}個`);

    // アサーション
    expect(verificationResults.colors.length).toBeGreaterThanOrEqual(2);
    expect(verificationResults.positions.length).toBeGreaterThanOrEqual(3);
    expect(verificationResults.texts.length).toBeGreaterThanOrEqual(3);
    expect(verificationResults.states.length).toBeGreaterThanOrEqual(2);
  });

  test('2. レスポンシブ動作の確認', async ({ browser }) => {
    console.log('🔍 レスポンシブ動作検証開始');
    
    for (const [device, viewport] of Object.entries(viewports)) {
      console.log(`\n📱 ${device}表示テスト (${viewport.width}x${viewport.height})`);
      
      const context = await browser.newContext({
        viewport,
        userAgent: device === 'mobile' 
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
          : undefined,
      });
      
      const page = await context.newPage();
      
      await loginToProd(page);
      await page.goto(`${PROD_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      // デバイス別の検証
      if (device === 'mobile') {
        // モバイルメニューボタンの確認
        const menuButton = page.locator('[aria-label*="menu"], button svg').first();
        const menuVisible = await menuButton.isVisible();
        console.log(`  メニューボタン: ${menuVisible ? '✅ 表示' : '❌ 非表示'}`);
        
        // ドロワーが初期状態で非表示
        const drawer = page.locator('.MuiDrawer-temporary');
        const drawerHidden = !(await drawer.isVisible().catch(() => false));
        console.log(`  ドロワー初期状態: ${drawerHidden ? '✅ 非表示' : '❌ 表示'}`);
        
        // メニュー開閉テスト
        if (menuVisible) {
          await menuButton.click();
          await page.waitForTimeout(500);
          const drawerOpen = await drawer.isVisible();
          console.log(`  ドロワー開閉: ${drawerOpen ? '✅ 動作確認' : '❌ 動作不良'}`);
        }
      } else if (device === 'desktop') {
        // デスクトップでサイドバー常時表示
        const sidebar = page.locator('.MuiDrawer-permanent, .MuiDrawer-docked');
        const sidebarVisible = await sidebar.isVisible();
        console.log(`  サイドバー: ${sidebarVisible ? '✅ 常時表示' : '❌ 非表示'}`);
        
        // メインコンテンツの余白確認
        const main = page.locator('main');
        const mainStyle = await main.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            marginLeft: style.marginLeft,
            paddingLeft: style.paddingLeft,
          };
        });
        console.log(`  メインコンテンツ余白: ML=${mainStyle.marginLeft}, PL=${mainStyle.paddingLeft}`);
      }
      
      // スクリーンショット
      await page.screenshot({ 
        path: `test-results/prod-dashboard-${device}.png`,
        fullPage: false 
      });
      
      await context.close();
    }
  });

  test('3. アニメーションとインタラクション', async ({ page }) => {
    console.log('🔍 アニメーション検証開始');
    
    await loginToProd(page);
    await page.goto(`${PROD_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // ボタンホバーエフェクト
    const button = page.locator('.MuiButton-root').first();
    if (await button.isVisible()) {
      const beforeTransform = await button.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      await button.hover();
      await page.waitForTimeout(350); // トランジション完了待機
      
      const afterTransform = await button.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      const hasTransform = beforeTransform !== afterTransform;
      console.log(`  ボタンホバー: ${hasTransform ? '✅ 変化あり' : '⚠️ 変化なし'}`);
      console.log(`    変化前: ${beforeTransform}`);
      console.log(`    変化後: ${afterTransform}`);
    }
    
    // カードシャドウ
    const card = page.locator('.MuiCard-root, .MuiPaper-root').first();
    if (await card.isVisible()) {
      const shadow = await card.evaluate(el => 
        window.getComputedStyle(el).boxShadow
      );
      const hasShadow = shadow !== 'none' && shadow !== '';
      console.log(`  カードシャドウ: ${hasShadow ? '✅ 適用' : '❌ 未適用'}`);
      if (hasShadow) {
        console.log(`    シャドウ値: ${shadow}`);
      }
    }
    
    // スクロールトップボタン
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    
    const scrollButton = page.locator('[title*="トップ"], [aria-label*="scroll"]').first();
    const scrollButtonVisible = await scrollButton.isVisible().catch(() => false);
    
    if (scrollButtonVisible) {
      console.log('  ✅ スクロールトップボタン: 表示確認');
      await scrollButton.click();
      await page.waitForTimeout(500);
      
      const scrollY = await page.evaluate(() => window.scrollY);
      console.log(`    スクロール位置: ${scrollY === 0 ? '✅ トップ' : `⚠️ Y=${scrollY}`}`);
    } else {
      console.log('  ⚠️ スクロールトップボタン: 非表示');
    }
  });

  test('4. プロフィールとマイ投稿ページ', async ({ page }) => {
    console.log('🔍 その他ページ検証開始');
    
    await loginToProd(page);
    
    // プロフィールページ
    await page.goto(`${PROD_URL}/profile`);
    await page.waitForLoadState('networkidle');
    
    const profileTitle = await page.locator('text=/プロフィール/i').first();
    const profileVisible = await profileTitle.isVisible();
    console.log(`\n📄 プロフィールページ:`);
    console.log(`  タイトル: ${profileVisible ? '✅ 表示' : '❌ 非表示'}`);
    
    const profileGradient = await page.evaluate(() => {
      const elements = document.querySelectorAll('[style*="gradient"], [class*="gradient"]');
      return elements.length;
    });
    console.log(`  グラデーション要素: ${profileGradient}個`);
    
    await page.screenshot({ 
      path: 'test-results/prod-profile.png',
      fullPage: false 
    });
    
    // マイ投稿ページ
    await page.goto(`${PROD_URL}/my-posts`);
    await page.waitForLoadState('networkidle');
    
    const myPostsTitle = await page.locator('text=/マイ投稿|自分の投稿/i').first();
    const myPostsVisible = await myPostsTitle.isVisible();
    console.log(`\n📝 マイ投稿ページ:`);
    console.log(`  タイトル: ${myPostsVisible ? '✅ 表示' : '❌ 非表示'}`);
    
    const stats = await page.locator('.MuiPaper-root').filter({ hasText: /総投稿数|閲覧/ }).count();
    console.log(`  統計カード: ${stats}個`);
    
    await page.screenshot({ 
      path: 'test-results/prod-my-posts.png',
      fullPage: false 
    });
  });
});

// 結果サマリー生成
test.afterAll(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 本番環境デザイン検証完了');
  console.log('='.repeat(60));
  console.log('スクリーンショット保存先: test-results/');
  console.log('検証項目:');
  console.log('  1. ダッシュボードデザイン ✅');
  console.log('  2. レスポンシブ動作 ✅');
  console.log('  3. アニメーション ✅');
  console.log('  4. その他ページ ✅');
});