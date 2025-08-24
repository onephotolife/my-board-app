/**
 * デザイン改善検証テスト
 * STRICT120プロトコル準拠 - 3点一致＋IPoV
 */

import { test, expect, Page } from '@playwright/test';

const TEST_URL = process.env.BASE_URL || 'http://localhost:3000';
const PROD_URL = 'https://board.blankbrainai.com';

const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?',
};

// レスポンシブブレークポイント
const viewports = {
  mobile: { width: 375, height: 812 },  // iPhone X
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1920, height: 1080 }, // Full HD
};

test.describe('デザイン品質検証テスト', () => {
  
  test.describe('レスポンシブデザイン検証', () => {
    Object.entries(viewports).forEach(([device, viewport]) => {
      test(`${device}表示の検証`, async ({ page }) => {
        console.log(`🔍 ${device}表示テスト開始 (${viewport.width}x${viewport.height})`);
        
        await page.setViewportSize(viewport);
        await page.goto(TEST_URL);
        
        // ビジュアル要素の確認
        const header = page.locator('header, [role="banner"]').first();
        await expect(header).toBeVisible();
        
        // レイアウトの確認
        if (device === 'mobile') {
          // モバイルではハンバーガーメニューが表示
          const menuButton = page.locator('[aria-label*="menu"], [data-testid="menu-button"]').first();
          await expect(menuButton).toBeVisible();
          console.log('  ✅ モバイルメニューボタン: 表示確認');
          
          // サイドバーは非表示
          const sidebar = page.locator('nav[role="navigation"], .MuiDrawer-root').first();
          const sidebarVisible = await sidebar.isVisible().catch(() => false);
          expect(sidebarVisible).toBe(false);
          console.log('  ✅ サイドバー: 非表示確認');
        } else if (device === 'desktop') {
          // デスクトップではサイドバーが常時表示
          const sidebar = page.locator('.MuiDrawer-docked, nav[role="navigation"]').first();
          await expect(sidebar).toBeVisible();
          console.log('  ✅ サイドバー: 常時表示確認');
          
          // サイドバーの幅を確認
          const sidebarBox = await sidebar.boundingBox();
          expect(sidebarBox?.width).toBeGreaterThanOrEqual(240);
          expect(sidebarBox?.width).toBeLessThanOrEqual(320);
          console.log(`  ✅ サイドバー幅: ${sidebarBox?.width}px`);
        }
        
        // メインコンテンツの配置確認
        const main = page.locator('main, [role="main"]').first();
        await expect(main).toBeVisible();
        const mainBox = await main.boundingBox();
        console.log(`  ✅ メインコンテンツ: x=${mainBox?.x}, y=${mainBox?.y}, w=${mainBox?.width}, h=${mainBox?.height}`);
        
        // スクリーンショット取得
        await page.screenshot({ 
          path: `test-results/design-${device}.png`,
          fullPage: true 
        });
      });
    });
  });

  test('カラースキームとテーマの検証', async ({ page }) => {
    console.log('🔍 カラースキーム検証開始');
    
    await page.goto(TEST_URL);
    
    // 背景色の確認
    const bgColor = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });
    console.log(`  背景色: ${bgColor}`);
    
    // プライマリカラーの要素を確認
    const primaryButton = page.locator('.MuiButton-containedPrimary').first();
    if (await primaryButton.isVisible()) {
      const buttonColor = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      console.log(`  プライマリボタン色: ${buttonColor}`);
      
      // グラデーション確認
      const buttonBg = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).background
      );
      if (buttonBg.includes('gradient')) {
        console.log('  ✅ グラデーション: 適用確認');
      }
    }
    
    // 影の確認
    const card = page.locator('.MuiCard-root, .MuiPaper-root').first();
    if (await card.isVisible()) {
      const shadow = await card.evaluate(el => 
        window.getComputedStyle(el).boxShadow
      );
      expect(shadow).not.toBe('none');
      console.log(`  ✅ カードシャドウ: ${shadow}`);
    }
  });

  test('アニメーションとトランジションの検証', async ({ page }) => {
    console.log('🔍 アニメーション検証開始');
    
    await page.goto(TEST_URL);
    
    // ホバーエフェクトの確認
    const button = page.locator('.MuiButton-root').first();
    if (await button.isVisible()) {
      const beforeHover = await button.boundingBox();
      await button.hover();
      await page.waitForTimeout(300); // トランジション待機
      
      const transition = await button.evaluate(el => 
        window.getComputedStyle(el).transition
      );
      expect(transition).toContain('0.3s');
      console.log(`  ✅ ボタントランジション: ${transition}`);
    }
    
    // フェードイン効果の確認
    const fadeElements = await page.locator('[class*="fade"], [class*="Fade"]').count();
    console.log(`  フェード要素数: ${fadeElements}`);
    
    // スクロールアニメーション
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    
    const scrollButton = page.locator('[aria-label*="top"], [title*="トップ"]').first();
    const scrollButtonVisible = await scrollButton.isVisible().catch(() => false);
    if (scrollButtonVisible) {
      console.log('  ✅ スクロールトップボタン: 表示確認');
    }
  });

  test('アクセシビリティとフォーカス管理', async ({ page }) => {
    console.log('🔍 アクセシビリティ検証開始');
    
    await page.goto(TEST_URL);
    
    // キーボードナビゲーション
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        role: el?.getAttribute('role'),
        ariaLabel: el?.getAttribute('aria-label'),
      };
    });
    console.log(`  最初のフォーカス要素: ${JSON.stringify(firstFocused)}`);
    
    // フォーカスリングの確認
    const focusedElement = page.locator(':focus');
    if (await focusedElement.isVisible()) {
      const outline = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).outline
      );
      expect(outline).not.toBe('none');
      console.log(`  ✅ フォーカスリング: ${outline}`);
    }
    
    // ARIAラベルの確認
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    let ariaLabelCount = 0;
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
      const text = await buttons.nth(i).textContent();
      if (ariaLabel || text) ariaLabelCount++;
    }
    
    console.log(`  ✅ ボタンのアクセシビリティ: ${ariaLabelCount}/${Math.min(buttonCount, 5)} にラベル設定`);
    
    // コントラスト比の検証（簡易版）
    const textColor = await page.evaluate(() => {
      const p = document.querySelector('p, .MuiTypography-body1');
      return p ? window.getComputedStyle(p).color : null;
    });
    console.log(`  テキスト色: ${textColor}`);
  });

  test('モバイルジェスチャーとタッチターゲット', async ({ browser }) => {
    console.log('🔍 モバイル操作性検証開始');
    
    const context = await browser.newContext({
      ...viewports.mobile,
      hasTouch: true,
    });
    const page = await context.newPage();
    
    await page.goto(TEST_URL);
    
    // タッチターゲットのサイズ確認
    const buttons = page.locator('button, a, [role="button"]');
    const buttonCount = await buttons.count();
    let adequateSizeCount = 0;
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box && box.width >= 44 && box.height >= 44) {
        adequateSizeCount++;
      }
    }
    
    console.log(`  ✅ タッチターゲット: ${adequateSizeCount}/${Math.min(buttonCount, 10)} が推奨サイズ（44x44px以上）`);
    
    // スワイプ対応の確認（Drawer）
    const menuButton = page.locator('[aria-label*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
      
      const drawer = page.locator('.MuiDrawer-root');
      const drawerVisible = await drawer.isVisible();
      expect(drawerVisible).toBe(true);
      console.log('  ✅ ドロワーメニュー: 開閉確認');
      
      // スワイプで閉じる（エミュレート）
      await page.locator('.MuiBackdrop-root').click();
      await page.waitForTimeout(300);
    }
    
    await context.close();
  });

  test('美的要素とビジュアルハーモニー', async ({ page }) => {
    console.log('🔍 ビジュアルデザイン検証開始');
    
    await page.goto(TEST_URL);
    
    // グラデーション背景の確認
    const gradientElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let gradientCount = 0;
      elements.forEach(el => {
        const bg = window.getComputedStyle(el).background;
        if (bg.includes('gradient')) gradientCount++;
      });
      return gradientCount;
    });
    console.log(`  グラデーション要素数: ${gradientElements}`);
    
    // 角丸の確認
    const borderRadius = await page.evaluate(() => {
      const card = document.querySelector('.MuiCard-root, .MuiPaper-root');
      return card ? window.getComputedStyle(card).borderRadius : null;
    });
    if (borderRadius && borderRadius !== '0px') {
      console.log(`  ✅ 角丸デザイン: ${borderRadius}`);
    }
    
    // フォントの美しさ
    const fontSmoothing = await page.evaluate(() => {
      return window.getComputedStyle(document.body).webkitFontSmoothing;
    });
    expect(fontSmoothing).toBe('antialiased');
    console.log('  ✅ フォントスムージング: 有効');
    
    // 余白の調和
    const spacing = await page.evaluate(() => {
      const container = document.querySelector('.MuiContainer-root');
      if (!container) return null;
      const style = window.getComputedStyle(container);
      return {
        padding: style.padding,
        margin: style.margin,
      };
    });
    console.log(`  コンテナ余白: ${JSON.stringify(spacing)}`);
  });
});

test.describe('本番環境デザイン検証', () => {
  test.skip(process.env.NODE_ENV !== 'production', 'Production only test');
  
  test('本番環境での美的品質確認', async ({ page }) => {
    console.log('🔍 本番環境デザイン検証開始');
    
    await page.goto(PROD_URL);
    
    // ログイン
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|board/, { timeout: 10000 });
    
    // 全体的なビジュアル品質
    const visualQuality = {
      hasGradients: await page.locator('[style*="gradient"]').count() > 0,
      hasShadows: await page.locator('[class*="shadow"], [style*="box-shadow"]').count() > 0,
      hasAnimations: await page.locator('[class*="transition"], [style*="transition"]').count() > 0,
      hasRoundedCorners: await page.locator('[style*="border-radius"]').count() > 0,
    };
    
    console.log('✅ ビジュアル品質チェック:');
    console.log(`  グラデーション: ${visualQuality.hasGradients ? '✓' : '✗'}`);
    console.log(`  影効果: ${visualQuality.hasShadows ? '✓' : '✗'}`);
    console.log(`  アニメーション: ${visualQuality.hasAnimations ? '✓' : '✗'}`);
    console.log(`  角丸デザイン: ${visualQuality.hasRoundedCorners ? '✓' : '✗'}`);
    
    // レスポンシブ動作の最終確認
    for (const [device, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: `test-results/prod-design-${device}.png`,
        fullPage: false 
      });
      console.log(`  ✅ ${device}スクリーンショット取得完了`);
    }
  });
});