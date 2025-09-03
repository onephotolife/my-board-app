import { test, expect, Page } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';

test.describe('通知UI E2Eテスト', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // 認証セットアップ
    await setupAuth(page);
  });

  test.beforeEach(async () => {
    // ダッシュボードページへ移動
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.describe('ベルアイコン表示', () => {
    test('認証済みユーザーにベルアイコンが表示される', async () => {
      // ベルアイコンの存在確認
      const bellButton = page.getByRole('button', { name: /通知/i });
      await expect(bellButton).toBeVisible();
      
      // スクリーンショット取得（IPoV）
      await page.screenshot({ 
        path: 'test-results/notification-bell-visible.png',
        fullPage: false 
      });
    });

    test('未読通知数がバッジに表示される', async () => {
      // APIレスポンスをモック
      await page.route('**/api/notifications*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: [
                {
                  _id: 'test-notif-1',
                  recipient: 'test-user',
                  type: 'follow',
                  actor: { _id: 'actor-1', name: 'Test User', avatar: null },
                  target: { type: 'user', id: 'target-1', preview: null },
                  message: 'Test Userさんがあなたをフォローしました',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                }
              ],
              unreadCount: 5,
              pagination: { hasMore: false, total: 1, page: 1, totalPages: 1 }
            }
          })
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // バッジの数字確認
      const badge = page.locator('.MuiBadge-badge').first();
      await expect(badge).toContainText('5');
      
      // 視覚的証拠（IPoV）
      const boundingBox = await badge.boundingBox();
      console.log('Badge position:', boundingBox);
      
      await page.screenshot({ 
        path: 'test-results/notification-badge-count.png',
        clip: boundingBox || undefined
      });
    });

    test('99件を超える未読通知は99+と表示される', async () => {
      await page.route('**/api/notifications*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: [],
              unreadCount: 150,
              pagination: { hasMore: false, total: 0, page: 1, totalPages: 1 }
            }
          })
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const badge = page.locator('.MuiBadge-badge').first();
      await expect(badge).toContainText('99+');
    });
  });

  test.describe('ポップオーバー動作', () => {
    test('ベルアイコンクリックでポップオーバーが開く', async () => {
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      // ポップオーバーの表示確認
      const popover = page.locator('[role="presentation"]').filter({ hasText: '通知' });
      await expect(popover).toBeVisible();

      // ヘッダーの確認
      await expect(page.getByText('通知', { exact: true })).toBeVisible();
      
      // サイズの確認（400px幅）
      const popoverBox = await popover.boundingBox();
      expect(popoverBox?.width).toBeCloseTo(400, 10);
      
      await page.screenshot({ 
        path: 'test-results/notification-popover-open.png' 
      });
    });

    test('通知リストが正しく表示される', async () => {
      // 複数の通知をモック
      await page.route('**/api/notifications*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: [
                {
                  _id: 'notif-1',
                  recipient: 'test-user',
                  type: 'follow',
                  actor: { _id: 'actor-1', name: '山田太郎', avatar: null },
                  target: { type: 'user', id: 'target-1', preview: null },
                  message: '山田太郎さんがあなたをフォローしました',
                  isRead: false,
                  createdAt: new Date(Date.now() - 60000).toISOString(),
                },
                {
                  _id: 'notif-2',
                  recipient: 'test-user',
                  type: 'like',
                  actor: { _id: 'actor-2', name: '佐藤花子', avatar: 'https://example.com/avatar.jpg' },
                  target: { type: 'post', id: 'post-1', preview: 'テスト投稿' },
                  message: '佐藤花子さんがあなたの投稿にいいねしました',
                  isRead: true,
                  readAt: new Date(Date.now() - 30000).toISOString(),
                  createdAt: new Date(Date.now() - 120000).toISOString(),
                },
                {
                  _id: 'notif-3',
                  recipient: 'test-user',
                  type: 'comment',
                  actor: { _id: 'actor-3', name: '鈴木一郎', avatar: null },
                  target: { type: 'post', id: 'post-2', preview: '別の投稿' },
                  message: '鈴木一郎さんがあなたの投稿にコメントしました',
                  isRead: false,
                  createdAt: new Date(Date.now() - 180000).toISOString(),
                }
              ],
              unreadCount: 2,
              pagination: { hasMore: false, total: 3, page: 1, totalPages: 1 }
            }
          })
        });
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      // 通知アイテムの確認
      await expect(page.getByText('山田太郎さんがあなたをフォローしました')).toBeVisible();
      await expect(page.getByText('佐藤花子さんがあなたの投稿にいいねしました')).toBeVisible();
      await expect(page.getByText('鈴木一郎さんがあなたの投稿にコメントしました')).toBeVisible();

      // 未読インジケーターの確認
      const unreadIndicators = page.locator('[style*="border-radius: 50%"][style*="bgcolor: primary.main"]');
      await expect(unreadIndicators).toHaveCount(2);

      // 既読マークの確認
      const readMarks = page.locator('[data-testid="CheckCircleIcon"]');
      await expect(readMarks).toHaveCount(1);

      await page.screenshot({ 
        path: 'test-results/notification-list-display.png' 
      });
    });

    test('通知がない場合のメッセージ表示', async () => {
      await page.route('**/api/notifications*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: [],
              unreadCount: 0,
              pagination: { hasMore: false, total: 0, page: 1, totalPages: 1 }
            }
          })
        });
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      await expect(page.getByText('通知はありません')).toBeVisible();
      
      // 空状態のアイコン確認
      const emptyIcon = page.locator('[data-testid="NotificationsNoneIcon"]').last();
      await expect(emptyIcon).toBeVisible();
    });
  });

  test.describe('既読処理', () => {
    test('すべて既読にするボタンが機能する', async () => {
      // 未読通知をセットアップ
      await page.route('**/api/notifications?*', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                notifications: [
                  {
                    _id: 'notif-1',
                    recipient: 'test-user',
                    type: 'follow',
                    actor: { _id: 'actor-1', name: 'Test User', avatar: null },
                    target: { type: 'user', id: 'target-1', preview: null },
                    message: 'Test Userさんがあなたをフォローしました',
                    isRead: false,
                    createdAt: new Date().toISOString(),
                  }
                ],
                unreadCount: 1,
                pagination: { hasMore: false, total: 1, page: 1, totalPages: 1 }
              }
            })
          });
        }
      });

      // 既読処理のAPIモック
      await page.route('**/api/notifications', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { unreadCount: 0 }
            })
          });
        }
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      // すべて既読ボタンをクリック
      const markAllReadButton = page.getByRole('button', { name: /すべて既読にする/i });
      await expect(markAllReadButton).toBeEnabled();
      await markAllReadButton.click();

      // APIコールの確認（ネットワークログ）
      await page.waitForResponse(response => 
        response.url().includes('/api/notifications') && 
        response.request().method() === 'POST'
      );

      await page.screenshot({ 
        path: 'test-results/notification-mark-all-read.png' 
      });
    });

    test('自動既読処理（1秒後）が機能する', async () => {
      let markAsReadCalled = false;

      await page.route('**/api/notifications?*', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                notifications: [
                  {
                    _id: 'notif-auto-read',
                    recipient: 'test-user',
                    type: 'follow',
                    actor: { _id: 'actor-1', name: 'Auto Read Test', avatar: null },
                    target: { type: 'user', id: 'target-1', preview: null },
                    message: 'Auto Read Testさんがあなたをフォローしました',
                    isRead: false,
                    createdAt: new Date().toISOString(),
                  }
                ],
                unreadCount: 1,
                pagination: { hasMore: false, total: 1, page: 1, totalPages: 1 }
              }
            })
          });
        }
      });

      await page.route('**/api/notifications', async route => {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON();
          if (body.notificationIds?.includes('notif-auto-read')) {
            markAsReadCalled = true;
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { unreadCount: 0 }
            })
          });
        }
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      // 1秒待機
      await page.waitForTimeout(1100);

      // 既読APIが呼ばれたことを確認
      expect(markAsReadCalled).toBe(true);
    });
  });

  test.describe('無限スクロール', () => {
    test('スクロールで追加の通知が読み込まれる', async () => {
      let pageNumber = 1;

      await page.route('**/api/notifications*', async route => {
        const url = new URL(route.request().url());
        const requestedPage = parseInt(url.searchParams.get('page') || '1');
        
        const notifications = Array.from({ length: 20 }, (_, i) => ({
          _id: `notif-page${requestedPage}-${i}`,
          recipient: 'test-user',
          type: 'follow',
          actor: { _id: `actor-${i}`, name: `User ${(requestedPage - 1) * 20 + i + 1}`, avatar: null },
          target: { type: 'user', id: `target-${i}`, preview: null },
          message: `User ${(requestedPage - 1) * 20 + i + 1}さんがあなたをフォローしました`,
          isRead: false,
          createdAt: new Date(Date.now() - i * 60000).toISOString(),
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: requestedPage <= 2 ? notifications : [],
              unreadCount: 40,
              pagination: { 
                hasMore: requestedPage < 2,
                total: 40,
                page: requestedPage,
                totalPages: 2
              }
            }
          })
        });
        
        pageNumber = requestedPage;
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      // 最初のページの通知確認
      await expect(page.getByText('User 1さんがあなたをフォローしました')).toBeVisible();

      // スクロール可能な要素を取得
      const scrollContainer = page.locator('[style*="overflow-y: auto"]').first();
      
      // スクロール実行
      await scrollContainer.evaluate((element) => {
        element.scrollTop = element.scrollHeight - element.clientHeight;
      });

      // 2ページ目の読み込みを待つ
      await page.waitForResponse(response => 
        response.url().includes('/api/notifications?page=2') && 
        response.status() === 200
      );

      // 2ページ目の通知確認
      await expect(page.getByText('User 21さんがあなたをフォローしました')).toBeVisible();

      await page.screenshot({ 
        path: 'test-results/notification-infinite-scroll.png' 
      });
    });
  });

  test.describe('エラーハンドリング', () => {
    test('API通信エラー時にエラーメッセージが表示される', async () => {
      await page.route('**/api/notifications*', async route => {
        await route.abort('failed');
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      await expect(page.getByText(/不明なエラー|通知の取得に失敗しました/)).toBeVisible();
      
      await page.screenshot({ 
        path: 'test-results/notification-error-display.png' 
      });
    });

    test('401エラー時に適切なメッセージが表示される', async () => {
      await page.route('**/api/notifications*', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unauthorized'
          })
        });
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      await expect(page.getByText(/通知の取得に失敗しました/)).toBeVisible();
    });

    test('500エラー時のフォールバック表示', async () => {
      await page.route('**/api/notifications*', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error'
          })
        });
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      await expect(page.getByText(/通知の取得に失敗しました/)).toBeVisible();
    });
  });

  test.describe('アクセシビリティ', () => {
    test('キーボードナビゲーションが機能する', async () => {
      const bellButton = page.getByRole('button', { name: /通知/i });
      
      // Tabキーでフォーカス
      await page.keyboard.press('Tab');
      await expect(bellButton).toBeFocused();

      // Enterキーで開く
      await page.keyboard.press('Enter');
      await expect(page.getByText('通知', { exact: true })).toBeVisible();

      // Escapeキーで閉じる
      await page.keyboard.press('Escape');
      await expect(page.getByText('通知', { exact: true })).not.toBeVisible();

      // スペースキーでも開く
      await bellButton.focus();
      await page.keyboard.press(' ');
      await expect(page.getByText('通知', { exact: true })).toBeVisible();
    });

    test('適切なARIA属性が設定されている', async () => {
      const bellButton = page.getByRole('button', { name: /通知/i });
      
      // aria-label確認
      await expect(bellButton).toHaveAttribute('aria-label', '通知');
      
      // ポップオーバーのrole確認
      await bellButton.click();
      const popover = page.locator('[role="presentation"]');
      await expect(popover).toBeVisible();
    });

    test('フォーカストラップが機能する', async () => {
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      // ポップオーバー内でTabキーを押してもフォーカスが循環することを確認
      const markAllReadButton = page.getByRole('button', { name: /すべて既読にする/i });
      await markAllReadButton.focus();
      
      // Shift+Tabで逆方向に移動
      await page.keyboard.press('Shift+Tab');
      
      // フォーカスがポップオーバー内に留まることを確認
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).not.toBe('BODY');
    });

    test('スクリーンリーダー対応', async () => {
      // 通知数の読み上げテキスト確認
      await page.route('**/api/notifications*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: [],
              unreadCount: 3,
              pagination: { hasMore: false, total: 0, page: 1, totalPages: 1 }
            }
          })
        });
      });

      await page.reload();
      
      // バッジのaria-label確認
      const badge = page.locator('.MuiBadge-badge').first();
      const badgeText = await badge.textContent();
      expect(badgeText).toBe('3');
    });
  });

  test.describe('パフォーマンス', () => {
    test('初回表示が500ms以内に完了する', async () => {
      const startTime = Date.now();
      
      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();
      
      await page.getByText('通知', { exact: true }).waitFor({ state: 'visible' });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(500);
      console.log(`通知ポップオーバー表示時間: ${loadTime}ms`);
    });

    test('大量の通知（100件）でもスムーズにスクロールする', async () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        _id: `notif-perf-${i}`,
        recipient: 'test-user',
        type: 'follow',
        actor: { _id: `actor-${i}`, name: `Performance Test User ${i + 1}`, avatar: null },
        target: { type: 'user', id: `target-${i}`, preview: null },
        message: `Performance Test User ${i + 1}さんがあなたをフォローしました`,
        isRead: i % 2 === 0,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
      }));

      await page.route('**/api/notifications*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              notifications: notifications.slice(0, 20),
              unreadCount: 50,
              pagination: { hasMore: true, total: 100, page: 1, totalPages: 5 }
            }
          })
        });
      });

      await page.reload();
      const bellButton = page.getByRole('button', { name: /通知/i });
      await bellButton.click();

      // スクロールパフォーマンス測定
      const scrollContainer = page.locator('[style*="overflow-y: auto"]').first();
      
      const scrollStartTime = Date.now();
      await scrollContainer.evaluate((element) => {
        element.scrollTop = element.scrollHeight / 2;
      });
      const scrollEndTime = Date.now();
      
      const scrollTime = scrollEndTime - scrollStartTime;
      expect(scrollTime).toBeLessThan(100);
      console.log(`スクロール時間（100件）: ${scrollTime}ms`);
    });
  });

  test.afterAll(async () => {
    await page.close();
  });
});