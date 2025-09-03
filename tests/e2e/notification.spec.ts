import { test, expect } from './fixtures/auth.fixture';
import { testHelpers } from './helpers/async-helpers';

test.describe('通知UIのE2Eテスト', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await testHelpers.waitForAppReady(authenticatedPage);
  });

  test('通知ベルが表示される', async ({ authenticatedPage }) => {
    // 通知ベルボタンを確認
    const bellButton = authenticatedPage.getByRole('button', { name: /通知/i });
    await expect(bellButton).toBeVisible();
    
    // エビデンススクリーンショット
    await testHelpers.captureEvidence(authenticatedPage, 'notification-bell-visible');
  });

  test('通知ポップオーバーが開閉する', async ({ authenticatedPage }) => {
    // 通知ベルを開く
    await testHelpers.openNotificationBell(authenticatedPage);
    
    // ポップオーバーのヘッダーを確認
    const header = authenticatedPage.getByText('通知').first();
    await expect(header).toBeVisible();
    
    // エビデンス取得
    await testHelpers.captureEvidence(authenticatedPage, 'notification-popover-open');
    
    // ポップオーバーを閉じる
    await testHelpers.closeNotificationBell(authenticatedPage);
    
    // ポップオーバーが閉じたことを確認
    await expect(header).not.toBeVisible();
  });

  test('通知リストが表示される', async ({ authenticatedPage }) => {
    // 通知ベルを開く
    await testHelpers.openNotificationBell(authenticatedPage);
    
    // データロード待機
    await testHelpers.waitForDataLoad(authenticatedPage);
    
    // 通知リストを取得
    const notifications = await testHelpers.getNotificationItems(authenticatedPage);
    
    if (notifications.length > 0) {
      // 通知がある場合
      expect(notifications.length).toBeGreaterThan(0);
      await testHelpers.captureEvidence(authenticatedPage, 'notification-list-with-items');
    } else {
      // 通知がない場合
      const emptyMessage = authenticatedPage.getByText('通知はありません');
      await expect(emptyMessage).toBeVisible();
      await testHelpers.captureEvidence(authenticatedPage, 'notification-list-empty');
    }
  });

  test('すべて既読にするボタンが機能する', async ({ authenticatedPage }) => {
    // 通知ベルを開く
    await testHelpers.openNotificationBell(authenticatedPage);
    await testHelpers.waitForDataLoad(authenticatedPage);
    
    // 通知リストを確認
    const notifications = await testHelpers.getNotificationItems(authenticatedPage);
    
    if (notifications.length > 0) {
      // 「すべて既読にする」ボタンを探す
      const markAllReadButton = authenticatedPage.getByRole('button', { 
        name: /すべて既読にする/i 
      });
      
      if (await markAllReadButton.isVisible()) {
        // ボタンをクリック
        await markAllReadButton.click();
        
        // API応答待機
        await authenticatedPage.waitForResponse(resp => 
          resp.url().includes('/api/notifications') && resp.status() === 200,
          { timeout: 5000 }
        );
        
        // エビデンス取得
        await testHelpers.captureEvidence(authenticatedPage, 'mark-all-read-clicked');
      }
    }
  });
});