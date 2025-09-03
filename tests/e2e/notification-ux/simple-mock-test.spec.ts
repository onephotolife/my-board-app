/**
 * シンプルモックテスト - 通知システム基本動作確認
 * STRICT120準拠
 */

import { test, expect } from '@playwright/test';

test.describe('通知システム基本動作確認', () => {
  test('通知バッジのモック表示', async ({ page }) => {
    console.log('[MOCK_TEST] 開始:', new Date().toISOString());
    
    // モックデータ設定
    await page.route('/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications: [
            {
              _id: 'mock-1',
              type: 'comment',
              message: 'テストコメント通知',
              read: false,
              createdAt: new Date().toISOString()
            },
            {
              _id: 'mock-2',
              type: 'like',
              message: 'テストいいね通知',
              read: false,
              createdAt: new Date().toISOString()
            },
            {
              _id: 'mock-3',
              type: 'follow',
              message: 'テストフォロー通知',
              read: true,
              createdAt: new Date().toISOString()
            }
          ],
          unreadCount: 2,
          totalCount: 3
        })
      });
    });
    
    // ダッシュボードへアクセス
    await page.goto('/dashboard');
    
    // 通知ベルアイコンの存在確認
    const bellIcon = page.locator('[data-testid="notification-bell"]');
    await expect(bellIcon).toBeVisible({ timeout: 5000 });
    console.log('[MOCK_TEST] ✅ ベルアイコン表示確認');
    
    // バッジの存在と数値確認
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).toBeVisible({ timeout: 5000 });
    const badgeText = await badge.textContent();
    expect(badgeText).toBe('2'); // 未読数2件
    console.log('[MOCK_TEST] ✅ バッジ数確認:', badgeText);
    
    // ベルアイコンクリック
    await bellIcon.click();
    
    // ドロップダウン表示確認
    const dropdown = page.locator('[data-testid="notification-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    console.log('[MOCK_TEST] ✅ ドロップダウン表示確認');
    
    // 通知アイテム数確認
    const items = page.locator('[data-testid^="notification-item-"]');
    const itemCount = await items.count();
    expect(itemCount).toBe(3);
    console.log('[MOCK_TEST] ✅ 通知アイテム数:', itemCount);
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'test-results/mock-test-success.png',
      fullPage: true 
    });
    
    console.log('[MOCK_TEST] ✅ テスト完了');
  });
});