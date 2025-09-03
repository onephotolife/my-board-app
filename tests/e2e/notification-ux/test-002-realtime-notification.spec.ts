/**
 * TEST_002: 新着通知のリアルタイム受信
 * 優先度: P0（必須）
 * ペルソナ: アクティブコミュニケーター
 * STRICT120準拠
 */

import { test, expect, Browser } from '@playwright/test';
import { NotificationTestHelper } from './helpers/notification-helper';

// 必須認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

const SECONDARY_USER = {
  email: 'test.user2@example.com',
  password: 'TestPass123!'
};

test.describe('TEST_002: 新着通知のリアルタイム受信', () => {
  let helper: NotificationTestHelper;
  
  test.beforeEach(async ({ page }) => {
    helper = new NotificationTestHelper(page);
    console.log('[TEST_002] テスト開始:', new Date().toISOString());
  });

  test('リアルタイム通知受信とバッジ更新', async ({ browser }) => {
    // ユーザーA（通知受信側）のセットアップ
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const helperA = new NotificationTestHelper(pageA);
    
    // ユーザーB（アクション実行側）のセットアップ
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const helperB = new NotificationTestHelper(pageB);
    
    console.log('[SETUP] 2ユーザー環境準備');
    
    // Step 1: ユーザーAでログイン
    console.log('[STEP1] ユーザーAログイン');
    await helperA.login(pageA, AUTH_CREDENTIALS);
    await pageA.goto('/dashboard');
    
    // 初期の通知数を確認（3件と仮定）
    const initialBadge = pageA.locator('[data-testid="notification-badge"]');
    await expect(initialBadge).toBeVisible();
    const initialCount = await initialBadge.textContent();
    console.log(`[INITIAL] 初期通知数: ${initialCount}`);
    
    // Step 2: Socket.IO接続を模擬
    await pageA.evaluate(() => {
      // Socket.IOリスナーの設定
      window.addEventListener('notification:new', (event: any) => {
        console.log('[SOCKET] 新着通知受信:', event.detail);
      });
    });
    
    // Step 3: ユーザーBでログインし、ユーザーAの投稿にコメント
    console.log('[STEP2] ユーザーBがアクション実行');
    await helperB.login(pageB, SECONDARY_USER);
    await pageB.goto('/posts/test-post-1'); // ユーザーAの投稿
    
    // コメント投稿
    const commentInput = pageB.locator('[data-testid="comment-input"]');
    await commentInput.fill('素晴らしい投稿ですね！');
    
    // 測定開始
    const startTime = Date.now();
    
    await pageB.click('[data-testid="submit-comment"]');
    console.log('[ACTION] コメント投稿完了');
    
    // Step 4: ユーザーA側で通知受信を確認
    console.log('[STEP3] 通知受信確認');
    
    // 期待結果1: 5秒以内に通知を受信
    await pageA.waitForFunction(
      (oldCount) => {
        const badge = document.querySelector('[data-testid="notification-badge"]');
        if (!badge) return false;
        const newCount = parseInt(badge.textContent || '0');
        return newCount > parseInt(oldCount || '0');
      },
      initialCount || '0',
      { timeout: 5000 }
    );
    
    const receiveTime = Date.now() - startTime;
    console.log(`[PERF] 通知受信時間: ${receiveTime}ms`);
    expect(receiveTime).toBeLessThan(5000);
    
    // 期待結果2: バッジ数が+1される
    const updatedBadge = pageA.locator('[data-testid="notification-badge"]');
    const updatedCount = await updatedBadge.textContent();
    expect(parseInt(updatedCount || '0')).toBe(parseInt(initialCount || '0') + 1);
    console.log(`[UPDATE] 更新後の通知数: ${updatedCount}`);
    
    // 期待結果3: トースト通知が表示される（オプション）
    const toast = pageA.locator('[data-testid="notification-toast"]');
    if (await toast.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('[TOAST] トースト通知表示確認');
      await expect(toast).toContainText(/新着通知|コメント/);
      
      // トーストの自動消去確認（5秒後）
      await pageA.waitForTimeout(5000);
      await expect(toast).not.toBeVisible();
    }
    
    // IPoV生成
    const ipov = await helperA.generateIPoV('[data-testid="notification-badge"]');
    console.log('[IPoV] バッジ更新の視覚的証拠:', ipov);
    
    // エビデンス保存
    await helperA.captureEvidence('TEST_002', 'notification-received');
    
    // クリーンアップ
    await contextA.close();
    await contextB.close();
    
    console.log('[TEST_002] ✅ リアルタイム通知テスト成功');
  });

  test('複数通知の連続受信', async ({ page }) => {
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    
    const initialBadge = page.locator('[data-testid="notification-badge"]');
    const initialCount = parseInt(await initialBadge.textContent() || '0');
    
    console.log('[MULTI] 複数通知の連続送信');
    
    // 3つの異なるタイプの通知を模擬
    const notifications = [
      { type: 'comment', delay: 0 },
      { type: 'like', delay: 500 },
      { type: 'follow', delay: 1000 }
    ];
    
    for (const notif of notifications) {
      await page.waitForTimeout(notif.delay);
      
      // 通知イベントを発火
      await page.evaluate((type) => {
        const event = new CustomEvent('notification:new', {
          detail: { type, message: `${type}通知` }
        });
        window.dispatchEvent(event);
      }, notif.type);
      
      console.log(`[NOTIFY] ${notif.type}通知送信`);
    }
    
    // 全通知が反映されることを確認
    await page.waitForFunction(
      (initial) => {
        const badge = document.querySelector('[data-testid="notification-badge"]');
        if (!badge) return false;
        return parseInt(badge.textContent || '0') === initial + 3;
      },
      initialCount,
      { timeout: 5000 }
    );
    
    const finalCount = await initialBadge.textContent();
    expect(parseInt(finalCount || '0')).toBe(initialCount + 3);
    
    console.log('[TEST_002] ✅ 複数通知受信テスト成功');
  });

  test('オフライン時の通知キューイング', async ({ page }) => {
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    
    console.log('[OFFLINE] オフラインシミュレーション開始');
    
    // オフラインに切り替え
    await page.context().setOffline(true);
    
    // オフライン中に通知を生成
    const offlineNotifications = 3;
    for (let i = 0; i < offlineNotifications; i++) {
      await page.evaluate((index) => {
        // ローカルストレージにキューイング
        const queue = JSON.parse(
          localStorage.getItem('notification_queue') || '[]'
        );
        queue.push({
          id: `offline-${index}`,
          type: 'comment',
          message: `オフライン通知 ${index + 1}`,
          timestamp: Date.now()
        });
        localStorage.setItem('notification_queue', JSON.stringify(queue));
      }, i);
    }
    
    console.log('[QUEUE] オフライン通知をキューに追加');
    
    // オンラインに復帰
    await page.context().setOffline(false);
    console.log('[ONLINE] オンライン復帰');
    
    // キューされた通知が処理されることを確認
    await page.waitForFunction(
      () => {
        const queue = JSON.parse(
          localStorage.getItem('notification_queue') || '[]'
        );
        return queue.length === 0;
      },
      { timeout: 5000 }
    );
    
    // バッジが更新されることを確認
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).toBeVisible();
    
    console.log('[TEST_002] ✅ オフライン通知キューテスト成功');
  });
});

// パフォーマンステスト
test.describe('TEST_002: パフォーマンス検証', () => {
  test('大量通知受信時のパフォーマンス', async ({ page }) => {
    const helper = new NotificationTestHelper(page);
    await helper.login(page, AUTH_CREDENTIALS);
    await page.goto('/dashboard');
    
    console.log('[PERF] 大量通知パフォーマンステスト');
    
    // 50件の通知を連続送信
    const notificationCount = 50;
    const startTime = Date.now();
    
    for (let i = 0; i < notificationCount; i++) {
      await page.evaluate((index) => {
        const event = new CustomEvent('notification:new', {
          detail: {
            id: `bulk-${index}`,
            type: 'comment',
            message: `通知 ${index + 1}`
          }
        });
        window.dispatchEvent(event);
      }, i);
      
      // 負荷分散のため少し待機
      if (i % 10 === 0) {
        await page.waitForTimeout(100);
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`[PERF] ${notificationCount}件の処理時間: ${processingTime}ms`);
    
    // メモリ使用量確認
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (metrics) {
      console.log('[MEMORY] 使用量:', {
        usedJSHeapSize: `${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        totalJSHeapSize: `${(metrics.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`
      });
      
      // メモリ使用量が50MB以下
      expect(metrics.usedJSHeapSize / 1024 / 1024).toBeLessThan(50);
    }
    
    // CPU使用率は直接測定できないため、レスポンシブ性で代替
    const isResponsive = await page.evaluate(() => {
      let responsive = true;
      const startCheck = Date.now();
      
      // 100ms以内にDOMが応答するか
      setTimeout(() => {
        if (Date.now() - startCheck > 100) {
          responsive = false;
        }
      }, 0);
      
      return new Promise(resolve => {
        setTimeout(() => resolve(responsive), 100);
      });
    });
    
    expect(isResponsive).toBe(true);
    
    console.log('[TEST_002] ✅ パフォーマンステスト成功');
  });
});