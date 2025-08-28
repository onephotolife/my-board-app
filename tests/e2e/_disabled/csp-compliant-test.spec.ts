import { test, expect } from '@playwright/test';

test.describe('CSP準拠モバイルメニューテスト', () => {
  test('CSPエラーなしでメニューが最前面に表示される', async ({ page }) => {
    // CSPエラーを監視
    const cspErrors: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CSP') || text.includes('eval') || text.includes('Content Security Policy')) {
        cspErrors.push(text);
      }
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // モバイルビューポートを設定
    await page.setViewportSize({ width: 390, height: 844 });
    
    // メインページにアクセス
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    console.log('=== CSP準拠テスト開始 ===');
    
    // ログインが必要な場合
    if (await page.url().includes('signin')) {
      console.log('ログインページ検出 - ログイン実行');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    // メニューボタンを探す
    const menuButton = await page.locator('[aria-label="menu"], button:has(svg[data-testid="MenuIcon"])').first();
    
    if (await menuButton.count() > 0) {
      console.log('✅ メニューボタンが見つかりました');
      
      // メニューを開く
      await menuButton.click();
      await page.waitForTimeout(1000);
      
      // DOM分析
      const analysis = await page.evaluate(() => {
        // SwipeableDrawerを探す
        const selectors = [
          '.MuiSwipeableDrawer-root',
          '.MuiSwipeableDrawer-paper',
          '.MuiDrawer-root',
          '.MuiDrawer-paper',
          '[role="presentation"]'
        ];
        
        let menuElement = null;
        let foundSelector = '';
        
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            menuElement = el;
            foundSelector = selector;
            break;
          }
        }
        
        if (!menuElement) {
          return { found: false, selector: null, zIndex: null };
        }
        
        const styles = window.getComputedStyle(menuElement);
        const rect = menuElement.getBoundingClientRect();
        
        // 最上位要素の確認
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const topElement = document.elementFromPoint(centerX, centerY);
        const isOnTop = menuElement.contains(topElement);
        
        return {
          found: true,
          selector: foundSelector,
          zIndex: styles.zIndex,
          position: styles.position,
          display: styles.display,
          visibility: styles.visibility,
          isOnTop: isOnTop,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          }
        };
      });
      
      console.log('メニュー分析結果:', analysis);
      
      // スクリーンショット
      await page.screenshot({ 
        path: 'tests/screenshots/csp-compliant-menu.png', 
        fullPage: true 
      });
      
      // アサーション
      expect(analysis.found).toBe(true);
      
      if (analysis.found) {
        console.log(`✅ メニュー発見: ${analysis.selector}`);
        console.log(`   z-index: ${analysis.zIndex}`);
        console.log(`   最前面: ${analysis.isOnTop ? '✅' : '❌'}`);
        
        // z-indexが高い値であること
        const zIndexValue = parseInt(analysis.zIndex || '0');
        expect(zIndexValue).toBeGreaterThan(1000);
        
        // メニューが最前面にあること
        expect(analysis.isOnTop).toBe(true);
      }
      
      // CSPエラーがないこと
      console.log('\n=== CSPエラーチェック ===');
      console.log(`CSPエラー数: ${cspErrors.length}`);
      if (cspErrors.length > 0) {
        console.log('CSPエラー詳細:', cspErrors);
      }
      expect(cspErrors.length).toBe(0);
      
      // コンソールエラーの確認
      console.log(`コンソールエラー数: ${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        console.log('エラー詳細:', consoleErrors);
      }
      
    } else {
      console.log('⚠️ メニューボタンが見つかりません');
    }
    
    console.log('\n=== テスト完了 ===');
  });
  
  test('メニューのインタラクションテスト', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000');
    
    // ログイン（必要な場合）
    if (await page.url().includes('signin')) {
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    const menuButton = await page.locator('[aria-label="menu"]').first();
    if (await menuButton.count() > 0) {
      // メニューを開く
      await menuButton.click();
      await page.waitForTimeout(1000);
      
      // メニューアイテムがクリック可能か確認
      const menuItems = await page.locator('.MuiListItemButton-root').all();
      console.log(`メニューアイテム数: ${menuItems.length}`);
      
      if (menuItems.length > 0) {
        // 最初のメニューアイテムをクリック
        await menuItems[0].click();
        await page.waitForTimeout(1000);
        
        // ページ遷移またはメニュー閉じを確認
        const menuStillOpen = await page.locator('.MuiSwipeableDrawer-root, .MuiDrawer-root').isVisible();
        expect(menuStillOpen).toBe(false);
        console.log('✅ メニューアイテムクリック後、メニューが閉じました');
      }
    }
  });
});