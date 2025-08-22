import { test, expect, type Page } from '@playwright/test';
import { createTestUser, deleteTestUser, signInUser } from '../helpers/auth-helpers';
import { createTestPost, deleteTestPost } from '../helpers/post-helpers';

test.describe('リアルタイム更新機能のE2Eテスト', () => {
  let user1: any;
  let user2: any;
  let testPost: any;

  test.beforeAll(async () => {
    // テスト用ユーザーを作成
    user1 = await createTestUser('realtime_user1@test.com', 'Realtime User 1');
    user2 = await createTestUser('realtime_user2@test.com', 'Realtime User 2');
  });

  test.afterAll(async () => {
    // テストデータの清理
    if (testPost) {
      await deleteTestPost(testPost._id);
    }
    await deleteTestUser(user1._id);
    await deleteTestUser(user2._id);
  });

  test('リアルタイム投稿作成と表示', async ({ browser }) => {
    // 2つのブラウザコンテキストを作成（2人のユーザーをシミュレート）
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User1がログイン
      await signInUser(page1, user1.email, 'TestPassword123!');
      await page1.goto('/board');
      
      // User2がログイン
      await signInUser(page2, user2.email, 'TestPassword123!');
      await page2.goto('/board');

      // 両方のページでSocket.io接続を確認
      await expect(page1.locator('text=リアルタイム接続中')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('text=リアルタイム接続中')).toBeVisible({ timeout: 10000 });

      // User1が新規投稿を作成
      await page1.click('text=新規投稿');
      await page1.fill('[data-testid="post-title"]', 'リアルタイムテスト投稿');
      await page1.fill('[data-testid="post-content"]', 'リアルタイム機能のテスト投稿です');
      await page1.click('text=投稿する');

      // 投稿成功を確認
      await expect(page1.locator('text=投稿が作成されました')).toBeVisible();

      // User2のページにリアルタイムで新着投稿が表示されることを確認
      await expect(page2.locator('text=リアルタイムテスト投稿')).toBeVisible({ timeout: 5000 });
      await expect(page2.locator('text=新着')).toBeVisible();

      // 新着アニメーションが表示されることを確認
      const newPostCard = page2.locator('text=リアルタイムテスト投稿').locator('..');
      await expect(newPostCard).toHaveCSS('animation-name', 'pulse');

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('リアルタイムいいね機能', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // 事前にテスト投稿を作成
      testPost = await createTestPost(user1._id, {
        title: 'いいねテスト投稿',
        content: 'いいね機能のテスト投稿です',
        category: 'general',
      });

      await signInUser(page1, user1.email, 'TestPassword123!');
      await signInUser(page2, user2.email, 'TestPassword123!');
      
      await page1.goto('/board');
      await page2.goto('/board');

      // User2がいいねボタンをクリック
      const likeButton = page2.locator(`[data-testid="like-button-${testPost._id}"]`);
      await likeButton.click();

      // User1のページでリアルタイムにいいね数が更新されることを確認
      await expect(page1.locator(`[data-testid="like-count-${testPost._id}"]`)).toContainText('1', { timeout: 5000 });

      // User2が再度いいねボタンをクリック（取り消し）
      await likeButton.click();

      // いいね数が0に戻ることを確認
      await expect(page1.locator(`[data-testid="like-count-${testPost._id}"]`)).toContainText('0', { timeout: 5000 });

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('オンラインユーザー表示機能', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await signInUser(page1, user1.email, 'TestPassword123!');
      await page1.goto('/board');

      // 初期状態でオンラインユーザー数を確認
      const initialOnlineCount = await page1.locator('text=オンライン:').textContent();

      // User2がログイン
      await signInUser(page2, user2.email, 'TestPassword123!');
      await page2.goto('/board');

      // オンラインユーザー数が増加することを確認
      await expect(page1.locator('text=オンライン:')).not.toContainText(initialOnlineCount || '0', { timeout: 5000 });

      // User2がページを閉じる
      await page2.close();

      // オンラインユーザー数が減少することを確認
      await expect(page1.locator('text=オンライン:')).toContainText(initialOnlineCount || '1', { timeout: 10000 });

    } finally {
      await context1.close();
      if (!page2.isClosed()) {
        await context2.close();
      }
    }
  });

  test('リアルタイム投稿削除', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User1が投稿を作成
      testPost = await createTestPost(user1._id, {
        title: '削除テスト投稿',
        content: '削除機能のテスト投稿です',
        category: 'general',
      });

      await signInUser(page1, user1.email, 'TestPassword123!');
      await signInUser(page2, user2.email, 'TestPassword123!');
      
      await page1.goto('/board');
      await page2.goto('/board');

      // 両方のページで投稿が表示されることを確認
      await expect(page1.locator('text=削除テスト投稿')).toBeVisible();
      await expect(page2.locator('text=削除テスト投稿')).toBeVisible();

      // User1（投稿者）が投稿を削除
      await page1.locator(`[data-testid="delete-button-${testPost._id}"]`).click();
      await page1.locator('text=削除').click(); // 確認ダイアログ

      // User2のページからもリアルタイムで投稿が削除されることを確認
      await expect(page2.locator('text=削除テスト投稿')).not.toBeVisible({ timeout: 5000 });

      testPost = null; // 清理済みマーク

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('接続状態インジケーター', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/board');

    // 接続中インジケーターが表示されることを確認
    await expect(page.locator('text=リアルタイム接続中')).toBeVisible({ timeout: 10000 });
    
    // アイコンの色が正しいことを確認
    const connectionIcon = page.locator('[data-testid="connection-status"]');
    await expect(connectionIcon).toHaveClass(/success/);
  });
});