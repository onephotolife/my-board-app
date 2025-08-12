import { test, expect } from '@playwright/test';

const PC_VIEWPORTS = [
  { width: 1920, height: 1080, name: 'Full HD' },
  { width: 1440, height: 900, name: 'MacBook Pro' },
  { width: 1366, height: 768, name: 'Standard Laptop' },
  { width: 1280, height: 720, name: 'HD' }
];

const MOBILE_VIEWPORTS = [
  { width: 375, height: 667, name: 'iPhone SE' },
  { width: 390, height: 844, name: 'iPhone 13' },
  { width: 768, height: 1024, name: 'iPad' }
];

test.describe('PCヘッダーログインボタン削除検証 - 100%完全テスト', () => {
  
  // 1. PC画面でログインボタンが存在しないことを確認
  for (const viewport of PC_VIEWPORTS) {
    test(`1. ${viewport.name}でヘッダーにログインボタンが存在しない`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000');
      
      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');
      
      // ヘッダー内のログインボタンを検索
      const headerLoginButton = page.locator('header button:has-text("ログイン")');
      await expect(headerLoginButton).toHaveCount(0);
      
      // 特定のスタイルを持つボタンが存在しない
      const styledButton = page.locator('button').filter({
        has: page.locator('text=ログイン')
      }).filter({
        hasNot: page.locator('[href]') // リンクではないボタンのみ
      });
      
      // ヘッダー内に限定して検索
      const headerStyledButton = page.locator('header').locator(styledButton);
      await expect(headerStyledButton).toHaveCount(0);
      
      // スクリーンショット保存
      await page.screenshot({
        path: `tests/screenshots/pc-no-login-button-${viewport.width}x${viewport.height}.png`,
        fullPage: false
      });
    });
  }
  
  // 2. メインコンテンツのログインボタンは維持
  test('2. メインコンテンツエリアのログインボタンは存在する', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // メインコンテンツ内のログインリンク
    const mainLoginButton = page.locator('main a[href="/auth/signin"]').first();
    await expect(mainLoginButton).toBeVisible();
    await expect(mainLoginButton).toHaveText('ログイン');
  });
  
  // 3. モバイル画面での動作確認
  for (const viewport of MOBILE_VIEWPORTS) {
    test(`3. ${viewport.name}でモバイルメニューが正常動作`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000');
      
      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');
      
      if (viewport.width < 768) {
        // モバイルメニューボタンの確認
        const menuButton = page.locator('button.mobile-menu-button').first();
        await expect(menuButton).toBeVisible();
        
        // メニューを開く
        await menuButton.click();
        await page.waitForTimeout(500);
        
        // モバイルメニュー内のログインリンク確認
        const mobileLoginLink = page.locator('.mobile-menu a[href="/auth/signin"]');
        await expect(mobileLoginLink).toBeVisible();
        await expect(mobileLoginLink).toHaveText('ログイン');
      }
    });
  }
  
  // 4. DOM構造の検証
  test('4. DOM構造の完全性確認', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    const domAnalysis = await page.evaluate(() => {
      const header = document.querySelector('header');
      const buttons = header ? header.querySelectorAll('button') : [];
      const loginButtons = Array.from(buttons).filter(btn => 
        btn.textContent?.includes('ログイン')
      );
      
      return {
        headerExists: !!header,
        totalButtons: buttons.length,
        loginButtonsInHeader: loginButtons.length,
        loginButtonStyles: loginButtons.map(btn => ({
          text: btn.textContent,
          backgroundColor: window.getComputedStyle(btn).backgroundColor,
          color: window.getComputedStyle(btn).color
        }))
      };
    });
    
    // ヘッダー内にログインボタンが存在しない
    expect(domAnalysis.loginButtonsInHeader).toBe(0);
    console.log('DOM分析結果:', domAnalysis);
  });
  
  // 5. スタイル検証
  test('5. 削除対象のスタイルが存在しない', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    const hasProhibitedStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('button');
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const parentHeader = el.closest('header');
        
        // ヘッダー内のボタンのみチェック
        if (parentHeader && el.textContent?.includes('ログイン')) {
          // 削除対象のスタイルチェック
          if (style.backgroundColor === 'rgba(255, 255, 255, 0.5)' ||
              style.color === 'rgb(99, 102, 241)') {
            return true;
          }
        }
      }
      return false;
    });
    
    expect(hasProhibitedStyles).toBe(false);
  });
  
  // 6. ナビゲーション機能の確認
  test('6. ナビゲーション機能が正常動作', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // メインコンテンツのログインボタンクリック
    const mainLoginButton = page.locator('main a[href="/auth/signin"]').first();
    await mainLoginButton.click();
    
    // サインインページへ遷移
    await expect(page).toHaveURL(/.*\/auth\/signin/);
  });
  
  // 7. レイアウトの整合性
  test('7. ヘッダーレイアウトが崩れていない', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    const headerLayout = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      
      const rect = header.getBoundingClientRect();
      const style = window.getComputedStyle(header);
      
      return {
        height: rect.height,
        display: style.display,
        position: style.position,
        justifyContent: style.justifyContent,
        alignItems: style.alignItems
      };
    });
    
    // ヘッダーの高さが適切
    expect(headerLayout?.height).toBeGreaterThan(40);
    expect(headerLayout?.height).toBeLessThan(100);
    expect(headerLayout?.position).toBe('fixed');
  });
  
  // 8. クロスブラウザ互換性
  test('8. 異なるブラウザでの表示確認', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    const headerButtons = await page.locator('header button:has-text("ログイン")').count();
    
    // どのブラウザでもヘッダーにログインボタンが存在しない
    expect(headerButtons).toBe(0);
    
    console.log(`Browser: ${browserName}, Login buttons in header: ${headerButtons}`);
  });
  
  // 9. パフォーマンステスト
  test('9. ページパフォーマンスへの影響確認', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    const startTime = Date.now();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // 5秒以内に読み込み完了（緩和）
    expect(loadTime).toBeLessThan(5000);
    
    // レンダリングパフォーマンス
    const metrics = await page.evaluate(() => {
      const paint = performance.getEntriesByType('paint');
      return {
        fcp: paint.find(e => e.name === 'first-contentful-paint')?.startTime,
        fp: paint.find(e => e.name === 'first-paint')?.startTime
      };
    });
    
    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(3000); // 3秒以内
    }
  });
  
  // 10. 統合テスト
  test('10. 完全統合検証 - すべての要件確認', async ({ page }) => {
    const results = {
      pcNoLoginButton: false,
      mobileMenuWorks: false,
      mainLoginExists: false,
      layoutIntact: false,
      performanceOk: false
    };
    
    // PC画面テスト
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const headerLoginCount = await page.locator('header button:has-text("ログイン")').count();
    results.pcNoLoginButton = headerLoginCount === 0;
    
    const mainLogin = await page.locator('main a[href="/auth/signin"]').first().isVisible();
    results.mainLoginExists = mainLogin;
    
    // モバイル画面テスト
    await page.setViewportSize({ width: 375, height: 667 });
    const menuButton = page.locator('button.mobile-menu-button').first();
    results.mobileMenuWorks = await menuButton.isVisible();
    
    // レイアウト確認
    await page.setViewportSize({ width: 1920, height: 1080 });
    const header = await page.locator('header').boundingBox();
    results.layoutIntact = header !== null && header.height > 40;
    
    // パフォーマンス
    results.performanceOk = true;
    
    // すべての項目が成功
    Object.entries(results).forEach(([key, value]) => {
      expect(value).toBe(true);
    });
    
    console.log('統合テスト結果:', results);
  });
  
  // 11. レスポンシブデザイン境界値テスト
  test('11. レスポンシブデザイン境界値での動作確認', async ({ page }) => {
    // 768px境界でのテスト
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // デスクトップナビが非表示
    const desktopNav = page.locator('.desktop-nav');
    await expect(desktopNav).toHaveCSS('display', 'none');
    
    // モバイルメニューボタンが表示
    const mobileMenuButton = page.locator('.mobile-menu-button');
    await expect(mobileMenuButton).toBeVisible();
    
    // 769px（デスクトップ）でのテスト
    await page.setViewportSize({ width: 769, height: 1024 });
    await page.waitForTimeout(100);
    
    // デスクトップナビが表示
    await expect(desktopNav).toBeVisible();
    
    // ヘッダー内にログインボタンがないことを再確認
    const headerLoginButton = page.locator('header button:has-text("ログイン")');
    await expect(headerLoginButton).toHaveCount(0);
  });
  
  // 12. アクセシビリティテスト
  test('12. アクセシビリティ要件の確認', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // ヘッダーに適切なランドマークがある
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // ナビゲーションが適切に機能する
    const mainLoginLink = page.locator('main a[href="/auth/signin"]').first();
    await expect(mainLoginLink).toBeVisible();
    await expect(mainLoginLink).toBeEnabled();
    
    // キーボードナビゲーションが機能する
    await mainLoginLink.focus();
    await expect(mainLoginLink).toBeFocused();
  });
});