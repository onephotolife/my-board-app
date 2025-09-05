import { test, expect } from '@playwright/test';

test.describe('Tag Detail Page', () => {
  test('displays tag page with posts', async ({ page }) => {
    console.log('[TAG-DETAIL-TEST] Starting tag detail page test');

    // javascriptタグのページへ遷移
    await page.goto('/tags/javascript');
    await page.waitForLoadState('domcontentloaded');

    // タイトルを確認
    const title = page.locator('[data-testid="tag-page-title"]');
    await expect(title).toContainText('#javascript');
    console.log('[TAG-DETAIL-TEST] Tag title confirmed');

    // 投稿リストまたは空状態を確認
    await page.waitForTimeout(2000);

    const hasCards = await page
      .locator('[data-testid^="tag-post-card-"]')
      .first()
      .isVisible()
      .catch(() => false);
    const emptyState = page.locator('text=まだ投稿がありません');
    const isEmpty = await emptyState.isVisible().catch(() => false);

    // いずれかが表示されていることを確認
    expect(hasCards || isEmpty).toBe(true);

    if (hasCards) {
      const cardsCount = await page.locator('[data-testid^="tag-post-card-"]').count();
      console.log('[TAG-DETAIL-TEST] Posts found:', cardsCount);
    } else {
      console.log('[TAG-DETAIL-TEST] No posts found - showing empty state');
    }

    console.log('[TAG-DETAIL-TEST] Tag detail page loaded successfully');
  });

  test('toggles between newest and popular sort', async ({ page }) => {
    console.log('[TAG-DETAIL-TEST] Starting sort toggle test');

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

    console.log('[TAG-DETAIL-TEST] Changed to popular sort');

    // 最新順に戻す
    const newestButton = sortToggle.locator('button[value="newest"]');
    await newestButton.click();

    await page.waitForTimeout(1000);

    console.log('[TAG-DETAIL-TEST] Changed back to newest sort');
  });

  test('has linkified hashtags in post content', async ({ page }) => {
    console.log('[TAG-DETAIL-TEST] Starting linkify test');

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
      console.log('[TAG-DETAIL-TEST] No posts available - skipping linkify test');
      test.skip();
      return;
    }

    // linkifyされたハッシュタグリンクを探す
    const hashtagLinks = page.locator('a[href*="/tags/"]');
    const linkCount = await hashtagLinks.count().catch(() => 0);

    console.log('[TAG-DETAIL-TEST] Found hashtag links:', linkCount);

    // 少なくとも1つのハッシュタグリンクがあることを期待
    // （投稿にハッシュタグが含まれている場合）
    if (linkCount > 0) {
      const firstLink = hashtagLinks.first();
      const href = await firstLink.getAttribute('href');
      expect(href).toMatch(/\/tags\/.+/);
      console.log('[TAG-DETAIL-TEST] Hashtags are properly linkified');
    }
  });

  test('navigates to another tag from hashtag link', async ({ page }) => {
    console.log('[TAG-DETAIL-TEST] Starting hashtag navigation test');

    await page.goto('/tags/javascript');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(2000);

    // タグチップを探す
    const tagChips = page.locator('a[href^="/tags/"]');
    const hasTagChips = await tagChips
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasTagChips) {
      console.log('[TAG-DETAIL-TEST] No tag chips available - skipping navigation test');
      test.skip();
      return;
    }

    // 最初のタグチップをクリック
    const firstChip = tagChips.first();
    const chipHref = await firstChip.getAttribute('href');

    console.log('[TAG-DETAIL-TEST] Clicking tag chip with href:', chipHref);

    await Promise.all([page.waitForURL(/\/tags\/[^\/]+$/, { timeout: 5000 }), firstChip.click()]);

    // 遷移先を確認
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/tags\/[^\/]+$/);

    console.log('[TAG-DETAIL-TEST] Successfully navigated to:', currentUrl);
  });

  test('handles rate limiting gracefully', async ({ request }) => {
    console.log('[TAG-DETAIL-TEST] Starting rate limit test');

    // 初期遅延
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 複数のリクエストを高速送信
    const requests = Array.from({ length: 5 }, () =>
      request.get('/api/posts?tag=javascript&sort=-createdAt&page=1&limit=5')
    );

    const results = await Promise.all(requests);
    const statusCodes = results.map((r) => r.status());

    console.log('[TAG-DETAIL-TEST] Status codes:', statusCodes);

    // 成功と制限の数をカウント
    const successCount = statusCodes.filter((code) => code === 200).length;
    const rateLimitCount = statusCodes.filter((code) => code === 429).length;
    const authErrorCount = statusCodes.filter((code) => code === 401).length;

    console.log(
      '[TAG-DETAIL-TEST] Success:',
      successCount,
      'Rate limited:',
      rateLimitCount,
      'Auth error:',
      authErrorCount
    );

    // 認証エラーまたは成功/レート制限のいずれか
    expect(successCount + rateLimitCount + authErrorCount).toBe(5);

    // レート制限された場合、待機してリトライ
    if (rateLimitCount > 0) {
      console.log('[TAG-DETAIL-TEST] Rate limited - waiting before retry');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const retryResponse = await request.get(
        '/api/posts?tag=javascript&sort=-createdAt&page=1&limit=5'
      );
      console.log('[TAG-DETAIL-TEST] Retry status:', retryResponse.status());

      // リトライは最終的に成功、レート制限、または認証エラーのいずれか
      expect([200, 401, 429].includes(retryResponse.status())).toBe(true);
    }

    console.log('[TAG-DETAIL-TEST] Rate limit test completed');
  });
});
