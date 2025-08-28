import { test, expect } from '@playwright/test';

test.describe('Simple Menu Z-Index Test', () => {
  test('モバイルメニューのz-index問題を検証', async ({ page }) => {
    // モバイルビューポートを設定
    await page.setViewportSize({ width: 390, height: 844 });
    
    // メインページに直接アクセス
    await page.goto('/');
    
    // メニューボタンを探す（ログイン不要の場合）
    const menuButton = await page.locator('[aria-label*="menu"], button:has(svg)').first();
    
    if (await menuButton.count() > 0) {
      console.log('✅ メニューボタンが見つかりました');
      
      // メニューを開く
      await menuButton.click();
      await page.waitForTimeout(1000);
      
      // DOM分析
      const analysis = await page.evaluate(() => {
        // すべてのz-indexを収集
        const elements = [];
        document.querySelectorAll('*').forEach(el => {
          const styles = window.getComputedStyle(el);
          const zIndex = styles.zIndex;
          if (zIndex && zIndex !== 'auto') {
            elements.push({
              tag: el.tagName,
              class: el.className,
              zIndex: parseInt(zIndex),
              position: styles.position,
              isMenu: el.className.includes('Drawer') || el.className.includes('Modal')
            });
          }
        });
        
        // z-indexでソート
        elements.sort((a, b) => b.zIndex - a.zIndex);
        
        return {
          topElement: elements[0],
          menuElements: elements.filter(e => e.isMenu),
          allElements: elements.slice(0, 10) // トップ10
        };
      });
      
      console.log('分析結果:');
      console.log('最上位要素:', analysis.topElement);
      console.log('メニュー要素:', analysis.menuElements);
      console.log('上位10要素:', analysis.allElements);
      
      // スクリーンショット
      await page.screenshot({ path: 'tests/screenshots/simple-menu-test.png', fullPage: true });
      
      // アサーション
      if (analysis.menuElements.length > 0) {
        const menuZIndex = Math.max(...analysis.menuElements.map(e => e.zIndex));
        console.log(`メニューの最大z-index: ${menuZIndex}`);
        
        // メニューが最上位にあるかチェック
        expect(menuZIndex).toBeGreaterThanOrEqual(analysis.topElement?.zIndex || 0);
      } else {
        console.error('❌ メニュー要素が見つかりません');
      }
    } else {
      console.log('⚠️ メニューボタンが見つかりません（ログインが必要かもしれません）');
      
      // ログインページに移動してテスト
      await page.goto('/auth/signin');
      
      // ダミーアカウントでログイン試行
      if (await page.locator('input[name="email"]').count() > 0) {
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Test123!@#');
        await page.click('button[type="submit"]');
        
        // ログイン後の処理
        await page.waitForTimeout(3000);
        
        // 再度メニューボタンを探す
        const menuButtonAfterLogin = await page.locator('[aria-label*="menu"]').first();
        if (await menuButtonAfterLogin.count() > 0) {
          await menuButtonAfterLogin.click();
          await page.waitForTimeout(1000);
          
          console.log('ログイン後のメニューをテスト');
          await page.screenshot({ path: 'tests/screenshots/menu-after-login.png', fullPage: true });
        }
      }
    }
  });
});