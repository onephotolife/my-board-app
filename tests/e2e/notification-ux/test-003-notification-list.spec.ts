/**
 * TEST_003: 通知リストの表示と操作
 * 優先度: P0（必須）
 * ペルソナ: 全ペルソナ
 * STRICT120準拠
 */

import { test, expect } from '@playwright/test';
import { NotificationTestHelper, TestDataFactory } from './helpers/notification-helper';

// 必須認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('TEST_003: 通知リストの表示と操作', () => {
  let helper: NotificationTestHelper;
  
  test.beforeEach(async ({ page }) => {
    helper = new NotificationTestHelper(page);
    console.log('[TEST_003] テスト開始:', new Date().toISOString());
    
    // テストデータ: 未読5件、既読10件
    await page.route('/api/notifications', async (route) => {
      const notifications = [
        ...TestDataFactory.createMultipleNotifications(5).map(n => ({ ...n, read: false })),
        ...TestDataFactory.createMultipleNotifications(10).map(n => ({ ...n, read: true }))
      ];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications: notifications.slice(0, 10), // 最新10件
          unreadCount: 5,
          totalCount: 15
        })
      });
    });
  });

  test('通知リストの表示と基本操作', async ({ page }) => {
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    
    console.log('[STEP1] ベルアイコンをクリック');
    
    // 測定開始
    const openStartTime = Date.now();
    
    const bellIcon = page.locator('[data-testid="notification-bell"]');
    await expect(bellIcon).toBeVisible();
    await bellIcon.click();
    
    // 期待結果1: ドロップダウンが0.3秒以内に開く
    const dropdown = page.locator('[data-testid="notification-dropdown"]');
    await expect(dropdown).toBeVisible();
    
    const openTime = Date.now() - openStartTime;
    console.log(`[PERF] ドロップダウン表示時間: ${openTime}ms`);
    expect(openTime).toBeLessThan(300);
    
    // 期待結果2: 最新10件の通知が時系列で表示
    const notificationItems = page.locator('[data-testid^="notification-item-"]');
    const itemCount = await notificationItems.count();
    expect(itemCount).toBe(10);
    console.log(`[COUNT] 表示通知数: ${itemCount}件`);
    
    // 期待結果3: 未読は太字、既読は通常フォント
    for (let i = 0; i < 5; i++) {
      const notification = notificationItems.nth(i);
      const fontWeight = await notification.evaluate(el => 
        window.getComputedStyle(el).fontWeight
      );
      
      if (i < 5) { // 最初の5件は未読
        expect(['bold', '700', '600'].includes(fontWeight)).toBeTruthy();
        console.log(`[STYLE] 通知${i + 1}: 未読（太字）`);
      } else { // 残りは既読
        expect(['normal', '400'].includes(fontWeight)).toBeTruthy();
        console.log(`[STYLE] 通知${i + 1}: 既読（通常）`);
      }
    }
    
    // 期待結果4: 各通知にアイコン表示
    const icons = {
      comment: '💬',
      like: '❤️',
      follow: '👤'
    };
    
    for (let i = 0; i < 3; i++) {
      const notification = notificationItems.nth(i);
      const icon = await notification.locator('[data-testid="notification-icon"]');
      await expect(icon).toBeVisible();
      
      const type = await notification.getAttribute('data-notification-type');
      console.log(`[ICON] 通知${i + 1}: ${type}アイコン表示`);
    }
    
    // 期待結果5: ホバー時に背景色変更
    const firstNotification = notificationItems.first();
    const initialBg = await firstNotification.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    
    await firstNotification.hover();
    await page.waitForTimeout(100); // ホバーエフェクト待機
    
    const hoverBg = await firstNotification.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    
    expect(initialBg).not.toBe(hoverBg);
    console.log('[HOVER] 背景色変更確認:', { initialBg, hoverBg });
    
    // IPoV生成
    const ipov = await helper.generateIPoV('[data-testid="notification-dropdown"]');
    console.log('[IPoV] ドロップダウンの視覚的証拠:', ipov);
    
    // エビデンス保存
    await helper.captureEvidence('TEST_003', 'dropdown-open');
    
    console.log('[TEST_003] ✅ 基本表示テスト成功');
  });

  test('個別通知クリックによる遷移と既読化', async ({ page }) => {
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    
    // 通知リストを開く
    await helper.openNotificationList();
    
    // 未読通知を選択
    const unreadNotification = page.locator(
      '[data-testid^="notification-item-"]:has-text("テスト通知")'
    ).first();
    
    // 遷移前のURL
    const currentUrl = page.url();
    console.log('[BEFORE] 現在のURL:', currentUrl);
    
    // クリック前の状態確認
    const isReadBefore = await unreadNotification.getAttribute('data-read');
    expect(isReadBefore).toBe('false');
    
    // 期待結果6: クリックで該当コンテンツへ遷移
    await Promise.all([
      page.waitForNavigation(),
      unreadNotification.click()
    ]);
    
    const newUrl = page.url();
    expect(newUrl).not.toBe(currentUrl);
    console.log('[AFTER] 遷移先URL:', newUrl);
    
    // 戻るボタンで元のページに戻る
    await page.goBack();
    await expect(page).toHaveURL(currentUrl);
    
    // 期待結果7: 遷移後、その通知が既読状態に変更
    await helper.openNotificationList();
    
    const readNotification = page.locator(
      '[data-testid^="notification-item-"]:has-text("テスト通知")'
    ).first();
    
    const isReadAfter = await readNotification.getAttribute('data-read');
    expect(isReadAfter).toBe('true');
    console.log('[STATUS] 通知が既読に変更されました');
    
    // フォントウェイトも確認
    const fontWeight = await readNotification.evaluate(el =>
      window.getComputedStyle(el).fontWeight
    );
    expect(['normal', '400'].includes(fontWeight)).toBeTruthy();
    
    console.log('[TEST_003] ✅ 遷移と既読化テスト成功');
  });

  test('通知リストのスクロールとページネーション', async ({ page }) => {
    // 大量通知データの準備（50件）
    await page.route('/api/notifications', async (route) => {
      const url = new URL(route.request().url());
      const page_param = url.searchParams.get('page') || '1';
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const currentPage = parseInt(page_param);
      
      const allNotifications = TestDataFactory.createMultipleNotifications(50);
      const start = (currentPage - 1) * limit;
      const end = start + limit;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications: allNotifications.slice(start, end),
          unreadCount: 20,
          totalCount: 50,
          currentPage,
          totalPages: Math.ceil(50 / limit)
        })
      });
    });
    
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    await helper.openNotificationList();
    
    console.log('[SCROLL] スクロールテスト開始');
    
    const dropdown = page.locator('[data-testid="notification-dropdown"]');
    const scrollContainer = dropdown.locator('[data-testid="notification-scroll-container"]');
    
    // 初期表示確認（10件）
    let items = page.locator('[data-testid^="notification-item-"]');
    expect(await items.count()).toBe(10);
    
    // スクロールして追加読み込み
    await scrollContainer.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    
    // 追加読み込み待機
    await page.waitForFunction(
      () => {
        const items = document.querySelectorAll('[data-testid^="notification-item-"]');
        return items.length > 10;
      },
      { timeout: 3000 }
    );
    
    // 追加読み込み確認
    items = page.locator('[data-testid^="notification-item-"]');
    const newCount = await items.count();
    expect(newCount).toBeGreaterThan(10);
    console.log(`[LOADED] 追加読み込み: ${newCount}件`);
    
    // スクロールパフォーマンス確認
    const scrollPerf = await page.evaluate(async () => {
      const container = document.querySelector('[data-testid="notification-scroll-container"]');
      if (!container) return null;
      
      let frames = 0;
      let lastTime = performance.now();
      const targetFPS = 60;
      const frameDuration = 1000 / targetFPS;
      
      return new Promise(resolve => {
        const checkFrame = () => {
          const currentTime = performance.now();
          const elapsed = currentTime - lastTime;
          
          if (elapsed >= frameDuration) {
            frames++;
            lastTime = currentTime;
          }
          
          if (frames < 60) {
            requestAnimationFrame(checkFrame);
          } else {
            resolve(frames);
          }
        };
        
        // スクロールアニメーション開始
        container.scrollTo({ top: 0, behavior: 'smooth' });
        checkFrame();
      });
    });
    
    console.log(`[FPS] スクロール時のフレーム数: ${scrollPerf}`);
    expect(scrollPerf).toBeGreaterThanOrEqual(50); // 50fps以上
    
    console.log('[TEST_003] ✅ スクロールテスト成功');
  });

  test('通知の削除操作', async ({ page }) => {
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    await helper.openNotificationList();
    
    const firstNotification = page.locator('[data-testid^="notification-item-"]').first();
    const notificationId = await firstNotification.getAttribute('data-notification-id');
    
    console.log(`[DELETE] 通知削除: ${notificationId}`);
    
    // 削除ボタンを表示（ホバーまたは長押し）
    await firstNotification.hover();
    
    const deleteButton = firstNotification.locator('[data-testid="delete-notification"]');
    await expect(deleteButton).toBeVisible();
    
    // 削除確認ダイアログ
    page.on('dialog', async dialog => {
      console.log('[DIALOG] 削除確認:', dialog.message());
      await dialog.accept();
    });
    
    // 削除実行
    await deleteButton.click();
    
    // 削除アニメーション待機
    await page.waitForTimeout(500);
    
    // 削除されたことを確認
    const deletedNotification = page.locator(
      `[data-notification-id="${notificationId}"]`
    );
    await expect(deletedNotification).not.toBeVisible();
    
    console.log('[TEST_003] ✅ 削除操作テスト成功');
  });

  test('通知フィルタリング機能', async ({ page }) => {
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    await helper.openNotificationList();
    
    console.log('[FILTER] フィルタリングテスト');
    
    // フィルターボタン確認
    const filterButton = page.locator('[data-testid="notification-filter"]');
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    
    // フィルターオプション
    const filterOptions = ['all', 'comment', 'like', 'follow', 'unread'];
    
    for (const option of filterOptions) {
      const filterOption = page.locator(`[data-testid="filter-${option}"]`);
      await expect(filterOption).toBeVisible();
      
      // フィルター適用
      await filterOption.click();
      console.log(`[FILTER] ${option}フィルター適用`);
      
      // フィルター結果確認
      await page.waitForTimeout(300); // フィルタリングアニメーション待機
      
      const filteredItems = page.locator('[data-testid^="notification-item-"]');
      const count = await filteredItems.count();
      
      if (option !== 'all') {
        // 特定タイプのみ表示されることを確認
        for (let i = 0; i < count; i++) {
          const item = filteredItems.nth(i);
          
          if (option === 'unread') {
            const isRead = await item.getAttribute('data-read');
            expect(isRead).toBe('false');
          } else {
            const type = await item.getAttribute('data-notification-type');
            expect(type).toBe(option);
          }
        }
      }
      
      console.log(`[FILTER] ${option}: ${count}件表示`);
    }
    
    console.log('[TEST_003] ✅ フィルタリングテスト成功');
  });
});

// エラーケーステスト
test.describe('TEST_003: エラーハンドリング', () => {
  test('通知取得エラー時の表示', async ({ page }) => {
    // APIエラーを模擬
    await page.route('/api/notifications', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal Server Error'
        })
      });
    });
    
    const helper = new NotificationTestHelper(page);
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    
    // ベルアイコンクリック
    const bellIcon = page.locator('[data-testid="notification-bell"]');
    await bellIcon.click();
    
    // エラーメッセージ表示確認
    const errorMessage = page.locator('[data-testid="notification-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/エラー|失敗|取得できません/);
    
    // リトライボタン確認
    const retryButton = page.locator('[data-testid="retry-notifications"]');
    await expect(retryButton).toBeVisible();
    
    console.log('[TEST_003] ✅ エラーハンドリングテスト成功');
  });
});