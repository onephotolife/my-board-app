import { test, expect, type Page } from '@playwright/test';
import { createTestUser, deleteTestUser, signInUser } from '../helpers/auth-helpers';
import { createTestPost, deleteTestPost } from '../helpers/post-helpers';

test.describe('全文検索機能のE2Eテスト', () => {
  let user1: any;
  let testPosts: any[] = [];

  test.beforeAll(async () => {
    // テスト用ユーザーを作成
    user1 = await createTestUser('search_user1@test.com', 'Search User 1');

    // 検索用のテスト投稿を複数作成
    const postsData = [
      {
        title: 'JavaScript入門ガイド',
        content: 'JavaScriptの基本的な使い方を学びましょう。変数、関数、オブジェクトについて説明します。',
        category: 'tech',
        tags: ['JavaScript', 'プログラミング', '入門'],
      },
      {
        title: 'React開発のベストプラクティス',
        content: 'Reactアプリケーション開発で気をつけるべきポイントを紹介します。パフォーマンス最適化、状態管理、テストについて。',
        category: 'tech',
        tags: ['React', 'JavaScript', 'フロントエンド'],
      },
      {
        title: '今日のお昼ご飯',
        content: '今日は美味しいパスタを食べました。トマトソースがとても美味しかったです。',
        category: 'general',
        tags: ['食事', 'パスタ'],
      },
      {
        title: 'TypeScript導入のメリット',
        content: 'TypeScriptを導入することで、型安全性が向上し、開発効率が上がります。エラーの早期発見にも役立ちます。',
        category: 'tech',
        tags: ['TypeScript', 'JavaScript', 'プログラミング'],
      },
      {
        title: '質問：Next.jsの使い方',
        content: 'Next.jsでSSRを実装する方法について教えてください。ページの読み込み速度を改善したいです。',
        category: 'question',
        tags: ['Next.js', 'React', 'SSR'],
      },
    ];

    for (const postData of postsData) {
      const post = await createTestPost(user1._id, postData);
      testPosts.push(post);
    }

    // インデックスが作成されるまで少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  test.afterAll(async () => {
    // テストデータの清理
    for (const post of testPosts) {
      await deleteTestPost(post._id);
    }
    await deleteTestUser(user1._id);
  });

  test('基本的なキーワード検索', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // 検索ページが表示されることを確認
    await expect(page.locator('text=高度な検索')).toBeVisible();

    // 「JavaScript」で検索
    await page.fill('[data-testid="search-input"]', 'JavaScript');
    await page.click('[data-testid="search-button"]');

    // 検索結果が表示されることを確認
    await expect(page.locator('text=JavaScript入門ガイド')).toBeVisible();
    await expect(page.locator('text=React開発のベストプラクティス')).toBeVisible();
    await expect(page.locator('text=TypeScript導入のメリット')).toBeVisible();

    // パスタの投稿は表示されないことを確認
    await expect(page.locator('text=今日のお昼ご飯')).not.toBeVisible();

    // 検索結果数が表示されることを確認
    await expect(page.locator('text=3件の結果が見つかりました')).toBeVisible();
  });

  test('カテゴリフィルター検索', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // カテゴリフィルターを技術に設定
    await page.selectOption('[data-testid="category-filter"]', 'tech');
    await page.fill('[data-testid="search-input"]', 'JavaScript');
    await page.click('[data-testid="search-button"]');

    // 技術カテゴリの投稿のみ表示されることを確認
    await expect(page.locator('text=JavaScript入門ガイド')).toBeVisible();
    await expect(page.locator('text=React開発のベストプラクティス')).toBeVisible();
    await expect(page.locator('text=TypeScript導入のメリット')).toBeVisible();

    // 質問カテゴリの投稿は表示されないことを確認
    await expect(page.locator('text=質問：Next.jsの使い方')).not.toBeVisible();
  });

  test('タグフィルター検索', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // タグフィルターを設定
    await page.fill('[data-testid="tags-filter"]', 'React');
    await page.keyboard.press('Enter');
    await page.click('[data-testid="search-button"]');

    // Reactタグが付いた投稿のみ表示されることを確認
    await expect(page.locator('text=React開発のベストプラクティス')).toBeVisible();
    await expect(page.locator('text=質問：Next.jsの使い方')).toBeVisible();

    // Reactタグが付いていない投稿は表示されないことを確認
    await expect(page.locator('text=JavaScript入門ガイド')).not.toBeVisible();
    await expect(page.locator('text=今日のお昼ご飯')).not.toBeVisible();
  });

  test('並び順変更機能', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // 検索を実行
    await page.fill('[data-testid="search-input"]', 'プログラミング');
    await page.click('[data-testid="search-button"]');

    // デフォルト（関連度順）の結果を確認
    const defaultResults = await page.locator('[data-testid="search-results"] .search-result-title').allTextContents();

    // 日付順に変更
    await page.selectOption('[data-testid="sort-select"]', 'date');

    // 結果の順序が変わることを確認
    const dateResults = await page.locator('[data-testid="search-results"] .search-result-title').allTextContents();
    expect(dateResults).not.toEqual(defaultResults);

    // いいね順に変更
    await page.selectOption('[data-testid="sort-select"]', 'likes');

    // 並び順オプションが正しく表示されることを確認
    await expect(page.locator('[data-testid="sort-select"]')).toHaveValue('likes');
  });

  test('オートコンプリート機能', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // 検索フィールドに入力
    await page.fill('[data-testid="search-input"]', 'Java');

    // オートコンプリートの候補が表示されることを確認
    await expect(page.locator('[data-testid="autocomplete-option"]')).toBeVisible({ timeout: 2000 });

    // JavaScript入門ガイドが候補に表示されることを確認
    await expect(page.locator('text=JavaScript入門ガイド')).toBeVisible();

    // 候補をクリックして選択
    await page.click('text=JavaScript入門ガイド');

    // 検索が実行されることを確認
    await expect(page.locator('text=JavaScript入門ガイド')).toBeVisible();
  });

  test('検索履歴機能', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // 複数回検索を実行
    const searchQueries = ['JavaScript', 'React', 'TypeScript'];

    for (const query of searchQueries) {
      await page.fill('[data-testid="search-input"]', query);
      await page.click('[data-testid="search-button"]');
      await page.waitForTimeout(1000);
    }

    // 検索履歴エリアが表示されることを確認
    await expect(page.locator('[data-testid="search-history"]')).toBeVisible();

    // 履歴から検索を再実行
    await page.click('[data-testid="history-item-JavaScript"]');

    // JavaScript検索結果が表示されることを確認
    await expect(page.locator('text=JavaScript入門ガイド')).toBeVisible();
  });

  test('検索結果の詳細表示', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // 検索を実行
    await page.fill('[data-testid="search-input"]', 'パスタ');
    await page.click('[data-testid="search-button"]');

    // 検索結果の詳細情報が表示されることを確認
    const resultCard = page.locator('[data-testid="search-result-card"]').first();
    
    await expect(resultCard.locator('text=今日のお昼ご飯')).toBeVisible();
    await expect(resultCard.locator('[data-testid="post-category"]')).toContainText('一般');
    await expect(resultCard.locator('[data-testid="post-author"]')).toContainText('Search User 1');
    await expect(resultCard.locator('[data-testid="post-views"]')).toBeVisible();
    await expect(resultCard.locator('[data-testid="post-likes"]')).toBeVisible();

    // 詳細を見るボタンをクリック
    await resultCard.locator('text=詳細を見る').click();

    // 投稿詳細ページに遷移することを確認
    await expect(page).toHaveURL(/\/posts\/.+/);
    await expect(page.locator('text=今日のお昼ご飯')).toBeVisible();
  });

  test('検索タイプ切り替え（投稿/ユーザー/すべて）', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // 投稿検索（デフォルト）
    await page.fill('[data-testid="search-input"]', 'JavaScript');
    await page.click('[data-testid="search-button"]');

    // 投稿結果が表示されることを確認
    await expect(page.locator('[data-testid="posts-results"]')).toBeVisible();

    // ユーザー検索に切り替え
    await page.click('[data-testid="search-type-users"]');
    await page.click('[data-testid="search-button"]');

    // ユーザー結果セクションが表示されることを確認
    await expect(page.locator('[data-testid="users-results"]')).toBeVisible();

    // すべて検索に切り替え
    await page.click('[data-testid="search-type-all"]');
    await page.click('[data-testid="search-button"]');

    // 両方の結果が表示されることを確認
    await expect(page.locator('text=投稿')).toBeVisible();
    await expect(page.locator('text=ユーザー')).toBeVisible();
  });

  test('検索フィルターのクリア機能', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // フィルターを設定
    await page.selectOption('[data-testid="category-filter"]', 'tech');
    await page.fill('[data-testid="tags-filter"]', 'React');
    await page.keyboard.press('Enter');
    await page.selectOption('[data-testid="sort-select"]', 'likes');

    // フィルタークリアボタンをクリック
    await page.click('[data-testid="clear-filters-button"]');

    // フィルターがクリアされることを確認
    await expect(page.locator('[data-testid="category-filter"]')).toHaveValue('all');
    await expect(page.locator('[data-testid="tags-filter"]')).toHaveValue('');
    await expect(page.locator('[data-testid="sort-select"]')).toHaveValue('relevance');
  });

  test('関連キーワード提案機能', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // プログラミング関連で検索
    await page.fill('[data-testid="search-input"]', 'プログラミング');
    await page.click('[data-testid="search-button"]');

    // 関連キーワードが表示されることを確認
    await expect(page.locator('[data-testid="related-keywords"]')).toBeVisible();

    // 関連キーワードをクリックして検索
    const relatedKeyword = page.locator('[data-testid="related-keyword"]').first();
    await relatedKeyword.click();

    // 新しい検索が実行されることを確認
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('日付範囲フィルター', async ({ page }) => {
    await signInUser(page, user1.email, 'TestPassword123!');
    await page.goto('/search');

    // フィルターパネルを展開
    await page.click('[data-testid="filters-toggle"]');

    // 日付範囲を設定（今月）
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    await page.fill('[data-testid="date-from"]', firstDay.toISOString().split('T')[0]);
    await page.fill('[data-testid="date-to"]', today.toISOString().split('T')[0]);

    // 検索を実行
    await page.fill('[data-testid="search-input"]', 'JavaScript');
    await page.click('[data-testid="search-button"]');

    // 結果が期間内の投稿のみ表示されることを確認
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // 結果の日付が指定範囲内であることを確認
    const dates = await page.locator('[data-testid="post-date"]').allTextContents();
    dates.forEach(dateStr => {
      const postDate = new Date(dateStr);
      expect(postDate.getTime()).toBeGreaterThanOrEqual(firstDay.getTime());
      expect(postDate.getTime()).toBeLessThanOrEqual(today.getTime());
    });
  });

  test('検索結果のページネーション', async ({ page }) => {
    // 大量のテストデータを作成（検索結果のページネーションをテストするため）
    const additionalPosts = [];
    for (let i = 0; i < 15; i++) {
      const post = await createTestPost(user1._id, {
        title: `JavaScript テスト投稿 ${i + 1}`,
        content: `JavaScript関連のテスト投稿です。番号: ${i + 1}`,
        category: 'tech',
        tags: ['JavaScript', 'テスト'],
      });
      additionalPosts.push(post);
    }

    try {
      await signInUser(page, user1.email, 'TestPassword123!');
      await page.goto('/search');

      // 検索を実行
      await page.fill('[data-testid="search-input"]', 'JavaScript');
      await page.click('[data-testid="search-button"]');

      // ページネーションが表示されることを確認
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();

      // 2ページ目に移動
      await page.click('[data-testid="page-2"]');

      // URLが更新されることを確認
      await expect(page).toHaveURL(/page=2/);

      // 2ページ目の結果が表示されることを確認
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    } finally {
      // 追加で作成したテストデータを清理
      for (const post of additionalPosts) {
        await deleteTestPost(post._id);
      }
    }
  });
});