/**
 * モバイルメニューz-index検証テスト
 * 
 * z-index問題の解決のため、以下の対策を実装:
 * 1. React Portalを使用してbody直下にマウント
 * 2. 最大安全整数に近いz-index値を使用（2147483647）
 * 3. stacking contextの分離（isolation: isolate）
 * 4. スクロールロックの改善実装
 * 
 * @since 2025-01-13
 */

import { test, expect, devices } from '@playwright/test';

// モバイルデバイス設定
test.use({ ...devices['iPhone 12'] });

test.describe('モバイルメニューz-index検証', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  });

  test('掲示板ページでメニューが最前面に表示される', async ({ page }) => {
    await page.goto('/board');
    
    // ハンバーガーメニューをクリック
    await page.click('[aria-label="menu"]');
    
    // メニューが表示されるまで待機
    await page.waitForSelector('[data-mobile-menu-portal]', { state: 'visible' });
    
    // z-indexの値を取得
    const menuZIndex = await page.evaluate(() => {
      const menu = document.querySelector('[data-mobile-menu-portal]');
      return menu ? window.getComputedStyle(menu).zIndex : 'auto';
    });
    
    const contentZIndex = await page.evaluate(() => {
      const content = document.querySelector('#board-content');
      return content ? window.getComputedStyle(content).zIndex : 'auto';
    });
    
    // メニューのz-indexがコンテンツより大きいことを確認
    expect(parseInt(menuZIndex)).toBeGreaterThan(parseInt(contentZIndex || '0'));
    
    // メニューが最前面にあることを確認（z-index: 2147483647）
    expect(menuZIndex).toBe('2147483647');
    
    // スクリーンショット取得
    await page.screenshot({ path: 'tests/screenshots/mobile-menu-board.png' });
  });

  test('トップページでメニューが最前面に表示される', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[aria-label="menu"]');
    await page.waitForSelector('[data-mobile-menu-portal]', { state: 'visible' });
    
    // ビジュアル確認
    const menuBoundingBox = await page.locator('[data-mobile-menu-portal]').boundingBox();
    expect(menuBoundingBox?.width).toBe(390); // iPhone 12の幅
    expect(menuBoundingBox?.height).toBeGreaterThanOrEqual(812); // iPhone 12の高さ
    
    // Portal がbody直下にマウントされていることを確認
    const isDirectChildOfBody = await page.evaluate(() => {
      const portal = document.querySelector('[data-mobile-menu-portal]');
      return portal?.parentElement === document.body;
    });
    expect(isDirectChildOfBody).toBe(true);
    
    await page.screenshot({ path: 'tests/screenshots/mobile-menu-home.png' });
  });

  test('メニュー開閉でスクロール位置が保持される', async ({ page }) => {
    await page.goto('/board');
    
    // ダミーコンテンツを追加してスクロール可能にする
    await page.evaluate(() => {
      const container = document.querySelector('#board-content');
      if (container) {
        for (let i = 0; i < 20; i++) {
          const div = document.createElement('div');
          div.style.height = '100px';
          div.textContent = `Test content ${i}`;
          container.appendChild(div);
        }
      }
    });
    
    // 下にスクロール
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollBefore = await page.evaluate(() => window.scrollY);
    
    // メニューを開いて閉じる
    await page.click('[aria-label="menu"]');
    await page.waitForSelector('[data-mobile-menu-portal]');
    await page.click('[aria-label="close menu"]');
    await page.waitForSelector('[data-mobile-menu-portal]', { state: 'hidden' });
    
    // スクロール位置が保持されていることを確認
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(scrollBefore);
  });

  test('メニュー表示中は背景スクロールが無効', async ({ page }) => {
    await page.goto('/board');
    
    await page.click('[aria-label="menu"]');
    await page.waitForSelector('[data-mobile-menu-portal]');
    
    // bodyのスタイルを確認
    const bodyStyles = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return {
        overflow: styles.overflow,
        position: styles.position
      };
    });
    
    expect(bodyStyles.overflow).toBe('hidden');
    expect(bodyStyles.position).toBe('fixed');
  });

  test('stacking contextが正しく分離されている', async ({ page }) => {
    await page.goto('/board');
    
    // stacking context の確認
    const hasIsolation = await page.evaluate(() => {
      const content = document.querySelector('#board-content');
      const styles = content ? window.getComputedStyle(content) : null;
      return styles?.isolation === 'isolate';
    });
    
    expect(hasIsolation).toBe(true);
  });

  test('複数回のメニュー開閉でメモリリークがない', async ({ page }) => {
    await page.goto('/board');
    
    // 初期メモリ使用量を記録
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // 10回メニューを開閉
    for (let i = 0; i < 10; i++) {
      await page.click('[aria-label="menu"]');
      await page.waitForSelector('[data-mobile-menu-portal]');
      await page.click('[aria-label="close menu"]');
      await page.waitForSelector('[data-mobile-menu-portal]', { state: 'hidden' });
    }
    
    // 最終メモリ使用量を記録
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // メモリ使用量が異常に増加していないことを確認（10MB以内の増加）
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }
  });
});

// デスクトップ環境でのテスト
test.describe('デスクトップメニュー動作確認', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  });
  
  test('デスクトップではMenuコンポーネントが使用される', async ({ page }) => {
    await page.goto('/board');
    
    // アバターをクリック
    await page.click('[aria-label="menu"]');
    
    // MuiMenuが表示されることを確認
    const menuExists = await page.locator('.MuiMenu-root').isVisible();
    expect(menuExists).toBe(true);
    
    // Drawerが存在しないことを確認
    const drawerExists = await page.locator('[data-mobile-menu-portal]').count();
    expect(drawerExists).toBe(0);
  });
});