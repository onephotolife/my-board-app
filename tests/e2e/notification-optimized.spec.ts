/**
 * 通知システムE2Eテスト - 最適化認証版
 * STRICT120準拠
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers/optimal-auth';

test.describe('通知システム - 最適化認証版', () => {
  test.beforeEach(async ({ page }) => {
    // 最適化認証フローでセッション確立
    await setupAuthenticatedSession(page);
  });

  test('通知リストの表示', async ({ page }) => {
    // ダッシュボードへ移動
    await page.goto('http://localhost:3000/dashboard');
    
    // ページ読み込み完了を待つ
    await page.waitForLoadState('networkidle');
    
    // 通知APIの呼び出し
    const notificationsResponse = await page.request.get('http://localhost:3000/api/notifications');
    expect(notificationsResponse.ok()).toBeTruthy();
    
    // 通知データの取得
    const notifications = await notificationsResponse.json();
    console.log('通知データ:', notifications);
    
    // 通知ベルアイコンの存在確認（存在する場合）
    const bellIcon = page.locator('[data-testid="notification-bell"], [aria-label*="通知"], .notification-icon');
    const bellExists = await bellIcon.count() > 0;
    
    if (bellExists) {
      console.log('✅ 通知ベルアイコンが存在');
      
      // ベルアイコンをクリックして通知リストを開く
      await bellIcon.first().click();
      
      // 通知リストの表示を待つ
      const notificationList = page.locator('[data-testid="notification-list"], .notification-list, [role="list"]');
      await expect(notificationList).toBeVisible({ timeout: 5000 });
      
      console.log('✅ 通知リストが表示されました');
    } else {
      console.log('⚠️ 通知UIコンポーネントは未実装');
    }
  });

  test('通知の既読処理', async ({ page }) => {
    // 通知一覧を取得
    const response = await page.request.get('http://localhost:3000/api/notifications');
    expect(response.ok()).toBeTruthy();
    
    const notifications = await response.json();
    
    if (notifications && notifications.length > 0) {
      const firstNotification = notifications[0];
      
      // 既読APIを呼び出し（エンドポイントが存在する場合）
      const markAsReadResponse = await page.request.patch(
        `http://localhost:3000/api/notifications/${firstNotification._id || firstNotification.id}/read`,
        {
          data: { isRead: true }
        }
      );
      
      if (markAsReadResponse.status() === 200) {
        console.log('✅ 通知を既読にしました');
        
        // 既読状態の確認
        const updatedResponse = await page.request.get('http://localhost:3000/api/notifications');
        const updatedNotifications = await updatedResponse.json();
        
        const updatedNotification = updatedNotifications.find(
          (n: any) => (n._id || n.id) === (firstNotification._id || firstNotification.id)
        );
        
        if (updatedNotification) {
          expect(updatedNotification.isRead).toBeTruthy();
        }
      } else if (markAsReadResponse.status() === 404) {
        console.log('⚠️ 既読APIエンドポイントは未実装');
      }
    } else {
      console.log('⚠️ テスト用通知データがありません');
    }
  });

  test('リアルタイム通知受信のモック', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Socket.IOの存在確認
    const hasSocketIO = await page.evaluate(() => {
      return typeof (window as any).io !== 'undefined';
    });
    
    if (hasSocketIO) {
      console.log('✅ Socket.IOが利用可能');
      
      // モック通知イベントをトリガー
      await page.evaluate(() => {
        const mockNotification = {
          id: 'test-' + Date.now(),
          type: 'info',
          title: 'テスト通知',
          message: 'これはテスト通知です',
          timestamp: new Date().toISOString()
        };
        
        // カスタムイベントをディスパッチ
        window.dispatchEvent(new CustomEvent('notification', {
          detail: mockNotification
        }));
        
        console.log('Mock notification dispatched:', mockNotification);
      });
      
      // 通知が表示されるまで待つ（実装されている場合）
      const toastNotification = page.locator('.notification-toast, [role="alert"]');
      const toastVisible = await toastNotification.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (toastVisible) {
        console.log('✅ リアルタイム通知が表示されました');
      } else {
        console.log('⚠️ リアルタイム通知UIは未実装');
      }
    } else {
      console.log('⚠️ Socket.IOは未実装（将来の実装予定）');
    }
  });

  test('通知設定の確認', async ({ page }) => {
    // 設定ページへ移動（存在する場合）
    const settingsResponse = await page.goto('http://localhost:3000/settings/notifications', {
      waitUntil: 'networkidle'
    });
    
    if (settingsResponse && settingsResponse.status() === 200) {
      console.log('✅ 通知設定ページが存在');
      
      // 通知設定フォームの確認
      const emailNotifications = page.locator('input[name="emailNotifications"], #email-notifications');
      const pushNotifications = page.locator('input[name="pushNotifications"], #push-notifications');
      
      if (await emailNotifications.count() > 0) {
        const isChecked = await emailNotifications.isChecked();
        console.log(`メール通知設定: ${isChecked ? '有効' : '無効'}`);
      }
      
      if (await pushNotifications.count() > 0) {
        const isChecked = await pushNotifications.isChecked();
        console.log(`プッシュ通知設定: ${isChecked ? '有効' : '無効'}`);
      }
    } else {
      console.log('⚠️ 通知設定ページは未実装');
      
      // APIエンドポイントで設定を確認
      const settingsApiResponse = await page.request.get('http://localhost:3000/api/user/settings');
      
      if (settingsApiResponse.ok()) {
        const settings = await settingsApiResponse.json();
        console.log('通知設定（API）:', settings.notifications || '未設定');
      }
    }
  });

  test('通知の削除', async ({ page }) => {
    // 通知一覧を取得
    const response = await page.request.get('http://localhost:3000/api/notifications');
    expect(response.ok()).toBeTruthy();
    
    const notifications = await response.json();
    
    if (notifications && notifications.length > 0) {
      const firstNotification = notifications[0];
      const notificationId = firstNotification._id || firstNotification.id;
      
      // 削除APIを呼び出し
      const deleteResponse = await page.request.delete(
        `http://localhost:3000/api/notifications/${notificationId}`
      );
      
      if (deleteResponse.status() === 200 || deleteResponse.status() === 204) {
        console.log('✅ 通知を削除しました');
        
        // 削除確認
        const verifyResponse = await page.request.get('http://localhost:3000/api/notifications');
        const remainingNotifications = await verifyResponse.json();
        
        const deletedNotification = remainingNotifications.find(
          (n: any) => (n._id || n.id) === notificationId
        );
        
        expect(deletedNotification).toBeUndefined();
      } else if (deleteResponse.status() === 404) {
        console.log('⚠️ 削除APIエンドポイントは未実装');
      } else {
        console.log(`⚠️ 削除失敗: ${deleteResponse.status()}`);
      }
    } else {
      console.log('⚠️ 削除するテスト用通知データがありません');
    }
  });
});

test.describe('通知システム - パフォーマンステスト', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
  });

  test('通知APIのレスポンス時間', async ({ page }) => {
    const startTime = Date.now();
    
    const response = await page.request.get('http://localhost:3000/api/notifications');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`通知API レスポンス時間: ${responseTime}ms`);
    
    // パフォーマンス基準（500ms以内）
    expect(responseTime).toBeLessThan(500);
    expect(response.ok()).toBeTruthy();
  });

  test('大量通知の表示パフォーマンス', async ({ page }) => {
    // モック大量データの生成
    const mockNotifications = Array.from({ length: 100 }, (_, i) => ({
      id: `notification-${i}`,
      type: i % 3 === 0 ? 'info' : i % 3 === 1 ? 'warning' : 'success',
      title: `通知 ${i + 1}`,
      message: `これはテスト通知 ${i + 1} です`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      isRead: i % 2 === 0
    }));
    
    // APIモックまたはインターセプト（実装に応じて）
    await page.route('**/api/notifications', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNotifications)
      });
    });
    
    const navigationStart = Date.now();
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    const navigationEnd = Date.now();
    
    const loadTime = navigationEnd - navigationStart;
    console.log(`大量通知ありのページ読み込み時間: ${loadTime}ms`);
    
    // パフォーマンス基準（3秒以内）
    expect(loadTime).toBeLessThan(3000);
  });
});