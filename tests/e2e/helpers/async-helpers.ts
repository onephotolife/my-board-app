import { Page, expect } from '@playwright/test';

/**
 * E2Eテスト用非同期ヘルパー関数
 * MUIアニメーションと非同期処理の待機処理を統一
 */
export const testHelpers = {
  /**
   * MUIアニメーション完了待機
   * デフォルト: 225ms (enter) + buffer
   */
  waitForAnimation: async (page: Page, duration = 350) => {
    await page.waitForTimeout(duration);
  },
  
  /**
   * Popover/Dialog開閉待機
   */
  waitForPopover: async (page: Page, open = true) => {
    if (open) {
      // Popover開く
      await page.waitForSelector('[role="presentation"]', { 
        state: 'visible',
        timeout: 5000 
      });
    } else {
      // Popover閉じる
      await page.waitForSelector('[role="presentation"]', { 
        state: 'hidden',
        timeout: 5000 
      });
    }
    await testHelpers.waitForAnimation(page);
  },
  
  /**
   * データフェッチ完了待機
   */
  waitForDataLoad: async (page: Page) => {
    // ローディングインジケータが消えるまで待機
    await page.waitForSelector('[role="progressbar"]', { 
      state: 'hidden',
      timeout: 10000 
    });
  },
  
  /**
   * 通知ベル要素の待機（3段階）
   */
  waitForNotificationBell: async (page: Page) => {
    // Step 1: DOMアタッチ待機
    await page.waitForSelector('[data-testid="notification-bell"]', {
      state: 'attached',
      timeout: 5000
    });
    
    // Step 2: 可視性待機
    await page.waitForSelector('[data-testid="notification-bell"]', {
      state: 'visible',
      timeout: 5000
    });
    
    // Step 3: ローディング完了待機
    await page.waitForFunction(() => {
      const bell = document.querySelector('[data-testid="notification-bell"]');
      return bell && !bell.classList.contains('loading');
    }, { timeout: 5000 });
  },
  
  /**
   * クリティカルリソース待機
   */
  waitForCriticalResources: async (page: Page) => {
    // MUI CSS読み込み確認
    await page.waitForFunction(() => {
      const styles = Array.from(document.styleSheets);
      return styles.some(sheet => {
        try {
          return sheet.href?.includes('mui') || 
                 sheet.href?.includes('emotion');
        } catch (e) {
          return false;
        }
      });
    }, { timeout: 5000 });
    
    // React hydration確認
    await page.waitForFunction(() => {
      const root = document.getElementById('__next');
      return root && root.dataset.reactroot !== undefined;
    }, { timeout: 5000 });
  },
  
  /**
   * アプリケーション準備完了待機
   */
  waitForAppReady: async (page: Page) => {
    await testHelpers.waitForCriticalResources(page);
    await testHelpers.waitForAnimation(page, 500); // 初期アニメーション
  },
  
  /**
   * 通知ベルクリックと開閉
   */
  openNotificationBell: async (page: Page) => {
    const bellButton = page.getByRole('button', { name: /通知/i });
    await bellButton.click();
    await testHelpers.waitForPopover(page, true);
  },
  
  closeNotificationBell: async (page: Page) => {
    await page.keyboard.press('Escape');
    await testHelpers.waitForPopover(page, false);
  },
  
  /**
   * 通知リストの取得
   */
  getNotificationItems: async (page: Page) => {
    return page.locator('[role="listitem"]').all();
  },
  
  /**
   * スクリーンショット取得（エビデンス用）
   */
  captureEvidence: async (page: Page, name: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `test-results/screenshots/${name}-${timestamp}.png`;
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    return screenshotPath;
  },
};