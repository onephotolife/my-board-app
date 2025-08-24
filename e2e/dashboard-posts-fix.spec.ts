import { test, expect } from '@playwright/test';

test.describe('Dashboard Posts Display Fix', () => {
  test('should display latest posts without slice error', async ({ page }) => {
    // APIレスポンスをモック
    await page.route('/api/posts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: '1',
              content: 'Test post 1',
              author: 'User1',
              title: 'Title 1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              _id: '2',
              content: 'Test post 2',
              author: 'User2',
              title: 'Title 2',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
          }
        })
      });
    });

    // ユーザー統計APIもモック
    await page.route('/api/users/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalPosts: 10,
            todayPosts: 2,
            lastLogin: new Date().toISOString(),
            memberSince: new Date().toISOString(),
            email: 'test@example.com'
          }
        })
      });
    });

    // セッションをモック
    await page.addInitScript(() => {
      window.sessionStorage.setItem('next-auth.session-token', 'mock-token');
    });

    // ダッシュボードページにアクセス
    await page.goto('/dashboard');

    // エラーが発生していないことを確認
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ページ読み込み完了を待つ
    await page.waitForLoadState('networkidle');

    // s.sliceエラーが発生していないことを確認
    const sliceErrors = consoleErrors.filter(error => 
      error.includes('slice is not a function')
    );
    expect(sliceErrors).toHaveLength(0);

    // 投稿が表示されることを確認（最大5件）
    const postItems = page.locator('[role="listitem"]');
    const count = await postItems.count();
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0);
  });
});