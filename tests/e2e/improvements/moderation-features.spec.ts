import { test, expect, type Page } from '@playwright/test';
import { createTestUser, deleteTestUser, signInUser } from '../helpers/auth-helpers';
import { createTestPost, deleteTestPost } from '../helpers/post-helpers';

test.describe('モデレーション機能のE2Eテスト', () => {
  let user1: any;
  let moderator: any;
  let testPost: any;

  test.beforeAll(async () => {
    // テスト用ユーザーとモデレーターを作成
    user1 = await createTestUser('mod_user1@test.com', 'Mod User 1');
    moderator = await createTestUser('moderator@test.com', 'Test Moderator');
    
    // モデレーター権限を設定（環境変数に追加）
    process.env.MODERATOR_EMAILS = 'moderator@test.com';
  });

  test.afterAll(async () => {
    // テストデータの清理
    if (testPost) {
      await deleteTestPost(testPost._id);
    }
    await deleteTestUser(user1._id);
    await deleteTestUser(moderator._id);
  });

  test('投稿通報機能', async ({ page }) => {
    // テスト投稿を作成
    testPost = await createTestPost(user1._id, {
      title: '通報テスト投稿',
      content: '通報機能のテスト投稿です',
      category: 'general',
    });

    // 別のユーザーでログイン（自分の投稿は通報できないため）
    const reporterUser = await createTestUser('reporter@test.com', 'Reporter User');
    
    try {
      await signInUser(page, reporterUser.email, 'TestPassword123!');
      await page.goto('/board');

      // 投稿が表示されることを確認
      await expect(page.locator('text=通報テスト投稿')).toBeVisible();

      // 通報ボタンをクリック
      await page.locator(`[data-testid="report-button-${testPost._id}"]`).click();

      // 通報ダイアログが開くことを確認
      await expect(page.locator('text=投稿を通報')).toBeVisible();

      // 通報理由を選択
      await page.selectOption('[data-testid="report-reason"]', 'spam');

      // 詳細説明を入力
      await page.fill('[data-testid="report-description"]', 'これはスパム投稿だと思われます。');

      // 通報を送信
      await page.click('text=通報する');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=通報が送信されました')).toBeVisible();

      // ダイアログが閉じることを確認
      await expect(page.locator('text=投稿を通報')).not.toBeVisible({ timeout: 3000 });

    } finally {
      await deleteTestUser(reporterUser._id);
    }
  });

  test('通報一覧の確認', async ({ page }) => {
    await signInUser(page, moderator.email, 'TestPassword123!');
    await page.goto('/admin/moderation');

    // モデレーションダッシュボードが表示されることを確認
    await expect(page.locator('text=モデレーションダッシュボード')).toBeVisible();

    // 未処理の通報があることを確認
    await expect(page.locator('[data-testid="pending-reports"]')).toContainText('1');

    // 通報リストに対象投稿が表示されることを確認
    await expect(page.locator('text=通報テスト投稿')).toBeVisible();
    await expect(page.locator('text=スパム')).toBeVisible();
  });

  test('通報処理 - 解決', async ({ page }) => {
    await signInUser(page, moderator.email, 'TestPassword123!');
    await page.goto('/admin/moderation');

    // 処理ボタンをクリック
    await page.locator('[data-testid="process-report-button"]').first().click();

    // 処理ダイアログが開くことを確認
    await expect(page.locator('text=通報の処理')).toBeVisible();

    // アクションを選択
    await page.selectOption('[data-testid="resolve-action"]', 'warning');

    // モデレーターメモを入力
    await page.fill('[data-testid="moderator-notes"]', '初回警告として処理しました。');

    // 解決ボタンをクリック
    await page.click('text=解決');

    // 成功メッセージが表示されることを確認
    await expect(page.locator('text=通報が処理されました')).toBeVisible();

    // 未処理の通報数が減少することを確認
    await expect(page.locator('[data-testid="pending-reports"]')).toContainText('0');
  });

  test('通報処理 - 投稿削除', async ({ page }) => {
    // 新しいテスト投稿を作成
    const deleteTestPost = await createTestPost(user1._id, {
      title: '削除対象投稿',
      content: '削除されるテスト投稿です',
      category: 'general',
    });

    // 通報を作成
    const reporterUser = await createTestUser('reporter2@test.com', 'Reporter User 2');
    
    try {
      await signInUser(page, reporterUser.email, 'TestPassword123!');
      await page.goto('/board');

      // 通報を送信
      await page.locator(`[data-testid="report-button-${deleteTestPost._id}"]`).click();
      await page.selectOption('[data-testid="report-reason"]', 'inappropriate');
      await page.fill('[data-testid="report-description"]', '不適切な内容が含まれています。');
      await page.click('text=通報する');

      // モデレーターでログイン
      await signInUser(page, moderator.email, 'TestPassword123!');
      await page.goto('/admin/moderation');

      // 処理ボタンをクリック
      await page.locator('[data-testid="process-report-button"]').first().click();

      // 削除アクションを選択
      await page.selectOption('[data-testid="resolve-action"]', 'delete');
      await page.fill('[data-testid="moderator-notes"]', '規約違反のため投稿を削除しました。');
      await page.click('text=解決');

      // 成功メッセージを確認
      await expect(page.locator('text=通報が処理されました')).toBeVisible();

      // 投稿が削除されたことを確認するため掲示板に移動
      await page.goto('/board');
      await expect(page.locator('text=削除対象投稿')).not.toBeVisible();

    } finally {
      await deleteTestUser(reporterUser._id);
      // deleteTestPostは削除済みなので清理不要
    }
  });

  test('自動フラグシステム', async ({ browser }) => {
    // 複数のユーザーで同じ投稿を通報してフラグをトリガー
    const flagTestPost = await createTestPost(user1._id, {
      title: 'フラグテスト投稿',
      content: 'フラグ機能のテスト投稿です',
      category: 'general',
    });

    const reporters = [
      await createTestUser('reporter_a@test.com', 'Reporter A'),
      await createTestUser('reporter_b@test.com', 'Reporter B'),
      await createTestUser('reporter_c@test.com', 'Reporter C'),
    ];

    try {
      // 3人のユーザーが通報を送信
      for (let i = 0; i < reporters.length; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await signInUser(page, reporters[i].email, 'TestPassword123!');
        await page.goto('/board');

        await page.locator(`[data-testid="report-button-${flagTestPost._id}"]`).click();
        await page.selectOption('[data-testid="report-reason"]', 'spam');
        await page.fill('[data-testid="report-description"]', `通報者${i + 1}からの通報です。`);
        await page.click('text=通報する');

        await expect(page.locator('text=通報が送信されました')).toBeVisible();
        await context.close();
      }

      // モデレーターでダッシュボードを確認
      const modContext = await browser.newContext();
      const modPage = await modContext.newPage();
      
      await signInUser(modPage, moderator.email, 'TestPassword123!');
      await modPage.goto('/admin/moderation');

      // フラグされた投稿が特別に表示されることを確認
      await expect(modPage.locator('text=フラグテスト投稿')).toBeVisible();
      await expect(modPage.locator('[data-testid="flagged-indicator"]')).toBeVisible();

      await modContext.close();

    } finally {
      for (const reporter of reporters) {
        await deleteTestUser(reporter._id);
      }
      await deleteTestPost(flagTestPost._id);
    }
  });

  test('モデレーション統計表示', async ({ page }) => {
    await signInUser(page, moderator.email, 'TestPassword123!');
    await page.goto('/admin/moderation');

    // 統計カードが表示されることを確認
    await expect(page.locator('[data-testid="stats-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-spam"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-inappropriate"]')).toBeVisible();

    // 統計の数値が正しく表示されることを確認
    const pendingCount = await page.locator('[data-testid="stats-pending"]').textContent();
    expect(pendingCount).toMatch(/\d+/);
  });

  test('通報の取り下げ機能', async ({ page }) => {
    // 通報を作成
    const withdrawTestPost = await createTestPost(user1._id, {
      title: '取り下げテスト投稿',
      content: '取り下げ機能のテスト投稿です',
      category: 'general',
    });

    const reporterUser = await createTestUser('withdrawer@test.com', 'Withdrawer User');
    
    try {
      await signInUser(page, reporterUser.email, 'TestPassword123!');
      await page.goto('/board');

      // 通報を送信
      await page.locator(`[data-testid="report-button-${withdrawTestPost._id}"]`).click();
      await page.selectOption('[data-testid="report-reason"]', 'other');
      await page.fill('[data-testid="report-description"]', '誤って通報してしまいました。');
      await page.click('text=通報する');

      // 自分の通報履歴ページに移動
      await page.goto('/reports');

      // 通報が表示されることを確認
      await expect(page.locator('text=取り下げテスト投稿')).toBeVisible();

      // 取り下げボタンをクリック
      await page.locator('[data-testid="withdraw-report-button"]').click();

      // 確認ダイアログで取り下げを確定
      await page.click('text=取り下げる');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=通報が取り下げられました')).toBeVisible();

      // 通報が一覧から削除されることを確認
      await expect(page.locator('text=取り下げテスト投稿')).not.toBeVisible();

    } finally {
      await deleteTestUser(reporterUser._id);
      await deleteTestPost(withdrawTestPost._id);
    }
  });
});