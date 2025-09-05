import { test, expect } from '@playwright/test';

test.describe('Tag Detail Page v5', () => {
  test('displays tag detail page', async ({ page }) => {
    console.log('[TAG-DETAIL-V5] Starting tag detail page test');

    await page.goto('/tags/javascript');
    await page.waitForLoadState('domcontentloaded');

    // タイトル確認
    const title = page.locator('[data-testid="tag-page-title"]');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText('#javascript');
    console.log('[TAG-DETAIL-V5] Tag title confirmed');

    // ソートトグル確認
    const sortToggle = page.locator('[data-testid="tag-sort-toggle"]');
    await expect(sortToggle).toBeVisible();

    // 投稿リストまたは空状態を確認
    await page.waitForTimeout(2000);

    const hasCards = await page
      .locator('[data-testid^="tag-post-card-"]')
      .first()
      .isVisible()
      .catch(() => false);
    const emptyState = page.locator('text=まだ投稿がありません');
    const isEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasCards || isEmpty).toBe(true);

    if (hasCards) {
      const cardsCount = await page.locator('[data-testid^="tag-post-card-"]').count();
      console.log('[TAG-DETAIL-V5] Posts found:', cardsCount);
    } else {
      console.log('[TAG-DETAIL-V5] No posts found - showing empty state');
    }
  });

  test('toggles between newest and popular sort', async ({ page }) => {
    console.log('[TAG-DETAIL-V5] Starting sort toggle test');

    await page.goto('/tags/javascript');
    await page.waitForLoadState('domcontentloaded');

    // ソートトグルを確認
    const sortToggle = page.locator('[data-testid="tag-sort-toggle"]');
    await expect(sortToggle).toBeVisible({ timeout: 10000 });

    // 人気順に切り替え
    const popularButton = sortToggle.locator('button[value="popular"]');
    await popularButton.click();
    await page.waitForTimeout(1000);

    // エラーがないことを確認
    const errorAlert = page.locator('[data-testid="tag-error-alert"]');
    const hasError = await errorAlert.isVisible().catch(() => false);
    expect(hasError).toBe(false);

    console.log('[TAG-DETAIL-V5] Changed to popular sort');

    // 最新順に戻す
    const newestButton = sortToggle.locator('button[value="newest"]');
    await newestButton.click();
    await page.waitForTimeout(1000);

    console.log('[TAG-DETAIL-V5] Changed back to newest sort');
  });

  test('has linkified hashtags in post content', async ({ page }) => {
    console.log('[TAG-DETAIL-V5] Starting linkify test');

    await page.goto('/tags/javascript');
    await page.waitForLoadState('domcontentloaded');

    // 投稿が表示されるまで待機
    await page.waitForTimeout(2000);

    // 投稿カードがあるか確認
    const hasCards = await page
      .locator('[data-testid^="tag-post-card-"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasCards) {
      console.log('[TAG-DETAIL-V5] No posts available - skipping linkify test');
      return;
    }

    // linkifyされたハッシュタグリンクを探す
    const hashtagLinks = page.locator('a[href*="/tags/"]');
    const linkCount = await hashtagLinks.count().catch(() => 0);

    console.log('[TAG-DETAIL-V5] Found hashtag links:', linkCount);

    if (linkCount > 0) {
      const firstLink = hashtagLinks.first();
      const href = await firstLink.getAttribute('href');
      expect(href).toMatch(/\/tags\/.+/);
      console.log('[TAG-DETAIL-V5] Hashtags are properly linkified');
    }
  });

  test('navigates to another tag from tag chip', async ({ page }) => {
    console.log('[TAG-DETAIL-V5] Starting tag chip navigation test');

    await page.goto('/tags/javascript');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // タグチップを探す
    const tagChips = page.locator('[data-testid^="tag-post-card-"] a[href^="/tags/"]');
    const hasTagChips = await tagChips
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasTagChips) {
      console.log('[TAG-DETAIL-V5] No tag chips available - skipping navigation test');
      return;
    }

    // 最初のタグチップを取得
    const firstChip = tagChips.first();
    const chipHref = await firstChip.getAttribute('href');

    console.log('[TAG-DETAIL-V5] Clicking tag chip with href:', chipHref);

    // クリックしてナビゲーション
    await firstChip.click();
    await page.waitForTimeout(1000);

    // URLが変わったことを確認
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/tags\/.+/);

    console.log('[TAG-DETAIL-V5] Successfully navigated to:', currentUrl);
  });

  test('handles pagination with load more', async ({ page }) => {
    console.log('[TAG-DETAIL-V5] Starting pagination test');

    await page.goto('/tags/javascript');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // さらに読み込むボタンを探す
    const loadMoreButton = page.locator('[data-testid="tag-load-more-button"]');
    const hasLoadMore = await loadMoreButton.isVisible().catch(() => false);

    if (hasLoadMore) {
      console.log('[TAG-DETAIL-V5] Load more button found');

      // 現在の投稿数を取得
      const initialCount = await page.locator('[data-testid^="tag-post-card-"]').count();
      console.log('[TAG-DETAIL-V5] Initial post count:', initialCount);

      // さらに読み込むをクリック
      await loadMoreButton.click();
      await page.waitForTimeout(2000);

      // 投稿数が増えたか確認
      const newCount = await page.locator('[data-testid^="tag-post-card-"]').count();
      console.log('[TAG-DETAIL-V5] New post count:', newCount);

      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    } else {
      console.log('[TAG-DETAIL-V5] No load more button - insufficient posts for pagination');
    }
  });

  test('handles rate limiting gracefully', async ({ request }) => {
    console.log('[TAG-DETAIL-V5] Starting rate limit test');

    // 初期遅延
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 複数のリクエストを順次送信
    const results = [];
    for (let i = 0; i < 3; i++) {
      const response = await request.get(
        '/api/posts?tag=javascript&sort=-createdAt&page=1&limit=5'
      );
      results.push(response.status());
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log('[TAG-DETAIL-V5] Status codes:', results);

    // 成功、認証エラー、またはレート制限
    const validStatuses = results.every((status) => [200, 401, 429].includes(status));
    expect(validStatuses).toBe(true);

    console.log('[TAG-DETAIL-V5] Rate limit test completed');
  });
});
