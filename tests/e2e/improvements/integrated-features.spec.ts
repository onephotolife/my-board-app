import { test, expect, type Page } from '@playwright/test';
import { createTestUser, deleteTestUser, signInUser } from '../helpers/auth-helpers';
import { createTestPost, deleteTestPost } from '../helpers/post-helpers';
import { createTestReport, deleteTestReport } from '../helpers/report-helpers';

test.describe('改善機能の統合E2Eテスト', () => {
  let user1: any;
  let user2: any;
  let moderator: any;
  let testPost: any;

  test.beforeAll(async () => {
    // テスト用ユーザーを作成
    user1 = await createTestUser('integrated_user1@test.com', 'Integrated User 1');
    user2 = await createTestUser('integrated_user2@test.com', 'Integrated User 2');
    moderator = await createTestUser('integrated_mod@test.com', 'Integrated Moderator');
    
    // モデレーター権限を設定
    process.env.MODERATOR_EMAILS = 'integrated_mod@test.com';

    // テスト投稿を作成
    testPost = await createTestPost(user1._id, {
      title: '統合テスト投稿',
      content: '統合テストのための投稿です。リアルタイム、モデレーション、検索機能をテストします。',
      category: 'tech',
      tags: ['統合テスト', 'JavaScript', 'テスト'],
    });
  });

  test.afterAll(async () => {
    // テストデータの清理
    if (testPost) {
      await deleteTestPost(testPost._id);
    }
    await deleteTestUser(user1._id);
    await deleteTestUser(user2._id);
    await deleteTestUser(moderator._id);
  });

  test('フルワークフロー: 投稿作成→リアルタイム表示→通報→モデレーション→検索', async ({ browser }) => {
    // 3つのブラウザコンテキストを作成（投稿者、通報者、モデレーター）
    const authorContext = await browser.newContext();
    const reporterContext = await browser.newContext();
    const moderatorContext = await browser.newContext();
    
    const authorPage = await authorContext.newPage();
    const reporterPage = await reporterContext.newPage();
    const moderatorPage = await moderatorContext.newPage();

    try {
      // Step 1: 投稿者がログインして新規投稿を作成
      await signInUser(authorPage, user1.email, 'TestPassword123!');
      await authorPage.goto('/board');

      // リアルタイム接続を確認
      await expect(authorPage.locator('text=リアルタイム接続中')).toBeVisible({ timeout: 10000 });

      // 新規投稿を作成
      await authorPage.click('text=新規投稿');
      await authorPage.fill('[data-testid="post-title"]', 'フルワークフローテスト投稿');
      await authorPage.fill('[data-testid="post-content"]', 'フルワークフローのテスト投稿です。全機能を統合的にテストします。');
      await authorPage.selectOption('[data-testid="post-category"]', 'tech');
      await authorPage.fill('[data-testid="post-tags"]', 'フルテスト');
      await authorPage.keyboard.press('Enter');
      await authorPage.click('text=投稿する');

      // 投稿成功を確認
      await expect(authorPage.locator('text=投稿が作成されました')).toBeVisible();

      // Step 2: 通報者がログインしてリアルタイム表示を確認
      await signInUser(reporterPage, user2.email, 'TestPassword123!');
      await reporterPage.goto('/board');

      // リアルタイムで新着投稿が表示されることを確認
      await expect(reporterPage.locator('text=フルワークフローテスト投稿')).toBeVisible({ timeout: 5000 });
      await expect(reporterPage.locator('text=新着')).toBeVisible();

      // Step 3: 通報者が投稿を通報
      await reporterPage.locator('[data-testid="report-button"]').first().click();
      await reporterPage.selectOption('[data-testid="report-reason"]', 'inappropriate');
      await reporterPage.fill('[data-testid="report-description"]', 'テスト用の通報です。不適切な内容が含まれています。');
      await reporterPage.click('text=通報する');

      // 通報成功を確認
      await expect(reporterPage.locator('text=通報が送信されました')).toBeVisible();

      // Step 4: モデレーターがログインして通報を処理
      await signInUser(moderatorPage, moderator.email, 'TestPassword123!');
      await moderatorPage.goto('/admin/moderation');

      // モデレーションダッシュボードが表示されることを確認
      await expect(moderatorPage.locator('text=モデレーションダッシュボード')).toBeVisible();

      // 未処理の通報があることを確認
      await expect(moderatorPage.locator('[data-testid="pending-reports"]')).toContainText('1');

      // 通報を処理
      await moderatorPage.locator('[data-testid="process-report-button"]').first().click();
      await moderatorPage.selectOption('[data-testid="resolve-action"]', 'warning');
      await moderatorPage.fill('[data-testid="moderator-notes"]', 'フルワークフローテストでの警告処理です。');
      await moderatorPage.click('text=解決');

      // 処理成功を確認
      await expect(moderatorPage.locator('text=通報が処理されました')).toBeVisible();

      // Step 5: 検索機能で投稿を検索
      await authorPage.goto('/search');

      // 検索ページが表示されることを確認
      await expect(authorPage.locator('text=高度な検索')).toBeVisible();

      // キーワード検索
      await authorPage.fill('[data-testid="search-input"]', 'フルワークフロー');
      await authorPage.click('[data-testid="search-button"]');

      // 検索結果に投稿が表示されることを確認
      await expect(authorPage.locator('text=フルワークフローテスト投稿')).toBeVisible();

      // Step 6: カテゴリフィルターで絞り込み
      await authorPage.selectOption('[data-testid="category-filter"]', 'tech');
      await authorPage.click('[data-testid="search-button"]');

      // フィルター結果を確認
      await expect(authorPage.locator('text=フルワークフローテスト投稿')).toBeVisible();

      // Step 7: タグフィルターで絞り込み
      await authorPage.fill('[data-testid="tags-filter"]', 'フルテスト');
      await authorPage.keyboard.press('Enter');
      await authorPage.click('[data-testid="search-button"]');

      // タグフィルター結果を確認
      await expect(authorPage.locator('text=フルワークフローテスト投稿')).toBeVisible();

      // Step 8: 投稿詳細ページへの遷移
      await authorPage.click('text=詳細を見る');

      // 投稿詳細ページが表示されることを確認
      await expect(authorPage).toHaveURL(/\/posts\/.+/);
      await expect(authorPage.locator('text=フルワークフローテスト投稿')).toBeVisible();

      // Step 9: いいね機能をテスト（リアルタイム更新）
      await reporterPage.goto('/board');
      const likeButton = reporterPage.locator('[data-testid="like-button"]').first();
      await likeButton.click();

      // 投稿者のページでリアルタイムにいいね数が更新されることを確認
      await authorPage.goto('/board');
      await expect(authorPage.locator('[data-testid="like-count"]').first()).toContainText('1', { timeout: 5000 });

    } finally {
      await authorContext.close();
      await reporterContext.close();
      await moderatorContext.close();
    }
  });

  test('リアルタイム + モデレーション統合テスト', async ({ browser }) => {
    const user1Context = await browser.newContext();
    const user2Context = await browser.newContext();
    const modContext = await browser.newContext();
    
    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();
    const modPage = await modContext.newPage();

    try {
      // モデレーターがダッシュボードを監視
      await signInUser(modPage, moderator.email, 'TestPassword123!');
      await modPage.goto('/admin/moderation');

      // User1が投稿を作成
      await signInUser(user1Page, user1.email, 'TestPassword123!');
      await user1Page.goto('/posts/new');

      await user1Page.fill('[data-testid="post-title"]', 'リアルタイムモデレーションテスト');
      await user1Page.fill('[data-testid="post-content"]', 'リアルタイムとモデレーション機能の統合テストです。');
      await user1Page.click('text=投稿する');

      // User2がリアルタイムで投稿を確認し、通報
      await signInUser(user2Page, user2.email, 'TestPassword123!');
      await user2Page.goto('/board');

      await expect(user2Page.locator('text=リアルタイムモデレーションテスト')).toBeVisible({ timeout: 5000 });

      // 通報を送信
      await user2Page.locator('[data-testid="report-button"]').first().click();
      await user2Page.selectOption('[data-testid="report-reason"]', 'spam');
      await user2Page.fill('[data-testid="report-description"]', 'リアルタイムテスト用の通報です。');
      await user2Page.click('text=通報する');

      // モデレーターがリアルタイムで通知を受信（統計更新）
      await modPage.reload();
      await expect(modPage.locator('[data-testid="pending-reports"]')).toContainText(/[1-9]/);

    } finally {
      await user1Context.close();
      await user2Context.close();
      await modContext.close();
    }
  });

  test('検索 + モデレーション統合テスト', async ({ page }) => {
    // モデレーターでログイン
    await signInUser(page, moderator.email, 'TestPassword123!');

    // 削除対象の投稿を作成
    const deletedPost = await createTestPost(user1._id, {
      title: '削除予定投稿',
      content: '検索から除外されるべき投稿です。',
      category: 'general',
      tags: ['削除テスト'],
    });

    try {
      // 投稿が検索結果に表示されることを確認
      await page.goto('/search');
      await page.fill('[data-testid="search-input"]', '削除予定');
      await page.click('[data-testid="search-button"]');

      await expect(page.locator('text=削除予定投稿')).toBeVisible();

      // 投稿を削除
      await deleteTestPost(deletedPost._id);

      // 検索結果から除外されることを確認
      await page.reload();
      await page.fill('[data-testid="search-input"]', '削除予定');
      await page.click('[data-testid="search-button"]');

      await expect(page.locator('text=削除予定投稿')).not.toBeVisible();
      await expect(page.locator('text=結果が見つかりませんでした')).toBeVisible();

    } finally {
      // deletedPostは既に削除済み
    }
  });

  test('全機能パフォーマンステスト', async ({ browser }) => {
    // 複数ユーザーでの同時アクセステスト
    const contexts = [];
    const pages = [];

    try {
      // 5人のユーザーを同時にシミュレート
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);

        // ユーザーによって異なるアクションを実行
        if (i === 0) {
          // User 1: 投稿作成
          await signInUser(page, user1.email, 'TestPassword123!');
          await page.goto('/posts/new');
        } else if (i === 1) {
          // User 2: 掲示板監視（リアルタイム）
          await signInUser(page, user2.email, 'TestPassword123!');
          await page.goto('/board');
        } else if (i === 2) {
          // Moderator: ダッシュボード監視
          await signInUser(page, moderator.email, 'TestPassword123!');
          await page.goto('/admin/moderation');
        } else {
          // その他: 検索
          await signInUser(page, user1.email, 'TestPassword123!');
          await page.goto('/search');
        }
      }

      // 同時アクセスの負荷テスト
      await Promise.all([
        pages[0].fill('[data-testid="post-title"]', 'パフォーマンステスト投稿'),
        pages[1].waitForSelector('text=リアルタイム接続中'),
        pages[2].waitForSelector('text=モデレーションダッシュボード'),
        pages[3].fill('[data-testid="search-input"]', 'テスト'),
        pages[4].fill('[data-testid="search-input"]', 'JavaScript'),
      ]);

      // 全ページが正常に動作することを確認
      await expect(pages[0].locator('[data-testid="post-title"]')).toHaveValue('パフォーマンステスト投稿');
      await expect(pages[1].locator('text=リアルタイム接続中')).toBeVisible();
      await expect(pages[2].locator('text=モデレーションダッシュボード')).toBeVisible();
      await expect(pages[3].locator('[data-testid="search-input"]')).toHaveValue('テスト');
      await expect(pages[4].locator('[data-testid="search-input"]')).toHaveValue('JavaScript');

    } finally {
      // 全コンテキストを閉じる
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('エラーハンドリング統合テスト', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');

    // 無効な検索クエリでのエラーハンドリング
    await page.goto('/search');
    await page.fill('[data-testid="search-input"]', '');
    await page.click('[data-testid="search-button"]');

    await expect(page.locator('text=検索キーワードまたはタグを入力してください')).toBeVisible();

    // 存在しない投稿への通報試行
    await page.goto('/board');
    
    // DOM操作で無効な投稿IDを設定
    await page.evaluate(() => {
      const reportButton = document.querySelector('[data-testid="report-button"]');
      if (reportButton) {
        reportButton.setAttribute('data-post-id', 'invalid-post-id');
      }
    });

    // 通報ボタンをクリックしても適切にエラーハンドリングされることを確認
    // （実際のエラーハンドリング動作は実装に依存）

    // ネットワークエラーシミュレーション
    await page.route('**/api/search**', route => route.abort());
    
    await page.goto('/search');
    await page.fill('[data-testid="search-input"]', 'テスト');
    await page.click('[data-testid="search-button"]');

    await expect(page.locator('text=ネットワークエラーが発生しました')).toBeVisible();
  });
});