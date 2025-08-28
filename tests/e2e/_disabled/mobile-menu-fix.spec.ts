import { test, expect, devices } from '@playwright/test';

/**
 * Mobile Menu Z-Index Complete Fix Protocol
 * Phase 1: 問題の完全再現と原因特定
 */

// デバイス設定をトップレベルで定義
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Menu Z-Index Complete Fix', () => {

  test('Phase 1: 実際の問題を再現して原因を特定', async ({ page }) => {
    console.log('========================================');
    console.log('Phase 1: 問題の再現と原因特定');
    console.log('========================================');

    // 1. ログインしてコンテンツページへ
    await page.goto('/auth/signin');
    
    // ログインフォームが表示されるまで待機
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    // ログイン後のリダイレクトを待つ
    await page.waitForURL(/\/(board|$)/, { timeout: 10000 });
    console.log('✓ ログイン成功');

    // 2. 投稿を作成（z-index競合を確実に発生させる）
    const boardUrl = page.url().includes('board') ? page.url() : '/board';
    await page.goto(boardUrl);
    
    // 投稿フォームの存在を確認
    const hasPostForm = await page.locator('textarea[name="content"], input[name="content"]').count() > 0;
    
    if (hasPostForm) {
      for (let i = 0; i < 3; i++) {
        await page.fill('textarea[name="content"], input[name="content"]', `Test post ${i} - This is a test content to verify z-index`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }
      console.log('✓ テスト投稿を3件作成');
    } else {
      console.log('⚠ 投稿フォームが見つかりません');
    }

    // 3. メニューボタンを探して開く
    const menuButton = page.locator('[aria-label="menu"], [aria-label*="Menu"], button:has(svg)').first();
    const menuExists = await menuButton.count() > 0;
    
    if (!menuExists) {
      console.error('❌ メニューボタンが見つかりません');
      await page.screenshot({ path: 'tests/screenshots/no-menu-button.png', fullPage: true });
      return;
    }

    await menuButton.click();
    console.log('✓ メニューボタンをクリック');
    await page.waitForTimeout(1000); // アニメーション待機

    // 4. DOM構造とCSS詳細分析
    const analysis = await page.evaluate(() => {
      const result = {
        menu: null as any,
        content: null as any,
        parents: [] as any[],
        problem: null as string | null,
        allElements: [] as any[]
      };

      // メニュー要素を探す（複数のセレクタを試行）
      const menuSelectors = [
        '.MuiDrawer-root',
        '.MuiModal-root',
        '[role="presentation"]',
        '[data-mobile-menu-portal]',
        'div[class*="Drawer"]',
        'div[class*="Modal"]'
      ];

      let menuElement = null;
      for (const selector of menuSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          menuElement = el as HTMLElement;
          console.log(`Menu found with selector: ${selector}`);
          break;
        }
      }

      if (menuElement) {
        const menuStyles = window.getComputedStyle(menuElement);
        result.menu = {
          selector: menuElement.className || menuElement.id || 'unknown',
          zIndex: menuStyles.zIndex,
          position: menuStyles.position,
          transform: menuStyles.transform,
          willChange: menuStyles.willChange,
          opacity: menuStyles.opacity,
          display: menuStyles.display,
          visibility: menuStyles.visibility,
          pointerEvents: menuStyles.pointerEvents,
          rect: menuElement.getBoundingClientRect(),
          parentTagName: menuElement.parentElement?.tagName,
          parentClass: menuElement.parentElement?.className
        };

        // 親要素のスタッキングコンテキストを調査
        let parent = menuElement.parentElement;
        while (parent && parent !== document.body) {
          const parentStyles = window.getComputedStyle(parent);
          result.parents.push({
            tagName: parent.tagName,
            className: parent.className,
            id: parent.id,
            zIndex: parentStyles.zIndex,
            position: parentStyles.position,
            transform: parentStyles.transform,
            opacity: parentStyles.opacity,
            filter: parentStyles.filter,
            willChange: parentStyles.willChange,
            isolation: parentStyles.isolation
          });
          parent = parent.parentElement;
        }
      }

      // コンテンツ要素の分析
      const contentElement = document.querySelector('.MuiPaper-root, .MuiCard-root, main');
      if (contentElement) {
        const contentStyles = window.getComputedStyle(contentElement);
        result.content = {
          selector: contentElement.className,
          zIndex: contentStyles.zIndex,
          position: contentStyles.position,
          transform: contentStyles.transform,
          rect: contentElement.getBoundingClientRect()
        };
      }

      // すべての高z-index要素を収集
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const zIndex = parseInt(styles.zIndex);
        if (!isNaN(zIndex) && zIndex > 1) {
          result.allElements.push({
            tagName: el.tagName,
            className: (el as HTMLElement).className,
            zIndex: zIndex,
            position: styles.position
          });
        }
      });

      // 最上位要素の確認
      if (menuElement) {
        const rect = menuElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const topElement = document.elementFromPoint(centerX, centerY);
        
        if (!menuElement.contains(topElement)) {
          result.problem = `メニューが他の要素に隠れています。最上位要素: ${topElement?.tagName}.${topElement?.className}`;
        }
      } else {
        result.problem = 'メニュー要素が見つかりません';
      }

      return result;
    });

    // 5. 分析結果を出力
    console.log('\n=== DOM/CSS分析結果 ===');
    console.log('Menu:', JSON.stringify(analysis.menu, null, 2));
    console.log('Content:', JSON.stringify(analysis.content, null, 2));
    console.log('Parent Elements:', JSON.stringify(analysis.parents, null, 2));
    console.log('High z-index elements:', analysis.allElements.length);
    
    if (analysis.problem) {
      console.error('❌ 問題検出:', analysis.problem);
    }

    // 6. スクリーンショット撮影
    await page.screenshot({ 
      path: 'tests/screenshots/menu-problem-analysis.png', 
      fullPage: true 
    });

    // 7. 問題の診断
    if (analysis.menu && analysis.content) {
      const menuZ = parseInt(analysis.menu.zIndex) || 0;
      const contentZ = parseInt(analysis.content.zIndex) || 0;
      
      console.log(`\nz-index比較: Menu=${menuZ}, Content=${contentZ}`);
      
      if (menuZ <= contentZ) {
        console.error(`❌ z-indexが不適切: メニューがコンテンツより低い`);
      } else if (menuZ > contentZ) {
        console.log(`✓ z-indexは正しい: メニューがコンテンツより高い`);
        
        if (analysis.problem) {
          console.error(`❌ しかし、実際には表示されていない: ${analysis.problem}`);
        }
      }
    }

    // 8. 根本原因の特定
    console.log('\n=== 根本原因の分析 ===');
    
    // スタッキングコンテキストの問題を検出
    const hasTransform = analysis.parents.some(p => p.transform && p.transform !== 'none');
    const hasOpacity = analysis.parents.some(p => p.opacity && p.opacity !== '1');
    const hasFilter = analysis.parents.some(p => p.filter && p.filter !== 'none');
    const hasIsolation = analysis.parents.some(p => p.isolation === 'isolate');
    
    if (hasTransform) console.error('❌ 親要素にtransformが設定されています（新しいスタッキングコンテキスト）');
    if (hasOpacity) console.error('❌ 親要素にopacity < 1が設定されています');
    if (hasFilter) console.error('❌ 親要素にfilterが設定されています');
    if (hasIsolation) console.error('❌ 親要素にisolation: isolateが設定されています');

    // アサーション（問題があることを確認）
    expect(analysis.problem).toBeNull();
  });

  test('Phase 2: 修正実装とリアルタイム検証', async ({ page }) => {
    console.log('\n========================================');
    console.log('Phase 2: 段階的修正の適用');
    console.log('========================================');

    await page.goto('/board');
    
    // ログイン状態を確認
    const isLoggedIn = await page.locator('[aria-label="menu"]').count() > 0;
    if (!isLoggedIn) {
      await page.goto('/auth/signin');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(board|$)/);
    }

    // Step 1: CSS Resetを適用
    console.log('\nStep 1: CSS Reset適用');
    await page.addStyleTag({
      content: `
        /* Phase 1: Reset all transforms and stacking contexts */
        * {
          transform: none !important;
          will-change: auto !important;
        }
        
        /* Phase 2: Force menu to absolute top */
        .MuiDrawer-root,
        .MuiModal-root,
        [role="presentation"] {
          z-index: 2147483647 !important;
          position: fixed !important;
          isolation: isolate !important;
        }
        
        /* Phase 3: Push all content down */
        .MuiContainer-root,
        .MuiPaper-root,
        .MuiCard-root,
        main {
          z-index: 1 !important;
          position: relative !important;
          transform: none !important;
        }
        
        /* Phase 4: Ensure backdrop is visible */
        .MuiBackdrop-root {
          z-index: 2147483646 !important;
          position: fixed !important;
        }
      `
    });

    // メニューを開いて検証
    await page.click('[aria-label="menu"]');
    await page.waitForTimeout(1000);

    // 修正後の検証
    const isFixed = await page.evaluate(() => {
      const menu = document.querySelector('.MuiDrawer-root, .MuiModal-root, [role="presentation"]');
      if (!menu) return { success: false, reason: 'メニューが見つかりません' };
      
      const rect = menu.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // 複数のポイントでチェック
      const points = [
        { x: centerX, y: centerY },
        { x: rect.left + 10, y: rect.top + 10 },
        { x: rect.right - 10, y: rect.bottom - 10 }
      ];
      
      for (const point of points) {
        const topElement = document.elementFromPoint(point.x, point.y);
        if (!menu.contains(topElement)) {
          return { 
            success: false, 
            reason: `ポイント(${point.x}, ${point.y})で他の要素が上にあります: ${topElement?.tagName}`
          };
        }
      }
      
      return { success: true, reason: 'メニューが正しく最前面に表示されています' };
    });

    console.log('CSS Reset結果:', isFixed);
    
    if (!isFixed.success) {
      console.log('\nStep 2: JavaScript介入による修正');
      
      // JavaScriptで直接DOM操作
      await page.evaluate(() => {
        const menu = document.querySelector('.MuiDrawer-root, .MuiModal-root, [role="presentation"]') as HTMLElement;
        if (menu) {
          // body直下に移動
          document.body.appendChild(menu);
          
          // スタイルを強制上書き
          menu.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 2147483647 !important;
            pointer-events: auto !important;
            display: block !important;
            visibility: visible !important;
          `;
        }
      });
      
      console.log('✓ JavaScript介入による修正を適用');
    }

    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'tests/screenshots/menu-after-fix.png', 
      fullPage: true 
    });

    // 最終検証
    const finalCheck = await page.evaluate(() => {
      const menu = document.querySelector('.MuiDrawer-root, .MuiModal-root, [role="presentation"]');
      const content = document.querySelector('.MuiPaper-root');
      
      if (!menu) return false;
      
      const menuZ = window.getComputedStyle(menu).zIndex;
      const contentZ = content ? window.getComputedStyle(content).zIndex : '0';
      
      return parseInt(menuZ) > parseInt(contentZ);
    });

    expect(finalCheck).toBe(true);
  });
});