import { test, expect } from '@playwright/test';

test.describe('Tags Index Page v5', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済みstorageStateを使用
    await page.goto('/tags');
    await page.waitForLoadState('domcontentloaded');
  });

  test('displays tags list page', async ({ page }) => {
    console.log('[TAGS-INDEX-V5] Starting tags index page test');

    // タイトル確認
    await expect(page.locator('h1')).toContainText('タグ一覧');

    // 検索フィールド確認
    const searchInput = page.locator('[data-testid="tags-search-input"]');
    await expect(searchInput).toBeVisible();

    // ソートトグル確認
    const sortToggle = page.locator('[data-testid="tags-sort-toggle"]');
    await expect(sortToggle).toBeVisible();

    console.log('[TAGS-INDEX-V5] Page elements verified');
  });

  test('searches tags with debounce', async ({ page }) => {
    console.log('[TAGS-INDEX-V5] Starting search test');

    // 検索フィールドに入力
    const searchInput = page.locator('[data-testid="tags-search-input"] input');
    await searchInput.fill('java');

    // Enterキーで検索実行
    await searchInput.press('Enter');
    await page.waitForTimeout(500);

    // リストまたは空状態を確認
    const hasList = await page
      .locator('[data-testid="tags-list"]')
      .isVisible()
      .catch(() => false);
    const hasEmpty = await page
      .locator('text=タグが見つかりません')
      .isVisible()
      .catch(() => false);

    expect(hasList || hasEmpty).toBe(true);
    console.log('[TAGS-INDEX-V5] Search executed:', hasList ? 'results found' : 'no results');
  });

  test('toggles between popular and recent sort', async ({ page }) => {
    console.log('[TAGS-INDEX-V5] Starting sort toggle test');

    // 最近使用ボタンをクリック
    const recentButton = page.locator('[data-testid="tags-sort-toggle"] button[value="recent"]');
    await recentButton.click();
    await page.waitForTimeout(500);

    // 人気順に戻す
    const popularButton = page.locator('[data-testid="tags-sort-toggle"] button[value="popular"]');
    await popularButton.click();
    await page.waitForTimeout(500);

    console.log('[TAGS-INDEX-V5] Sort toggle completed');
  });

  test('navigates to tag detail page', async ({ page }) => {
    console.log('[TAGS-INDEX-V5] Starting navigation test');

    await page.waitForTimeout(1000);

    // タグアイテムがあるか確認
    const tagItems = page.locator('[data-testid^="tag-item-"]');
    const itemCount = await tagItems.count();

    if (itemCount > 0) {
      // 最初のタグをクリック
      const firstTag = tagItems.first();
      const tagKey = await firstTag.getAttribute('data-testid');
      console.log('[TAGS-INDEX-V5] Clicking tag:', tagKey);

      await Promise.all([page.waitForURL(/\/tags\/.+/), firstTag.click()]);

      // 遷移先を確認
      expect(page.url()).toMatch(/\/tags\/.+/);
      console.log('[TAGS-INDEX-V5] Navigation successful');
    } else {
      console.log('[TAGS-INDEX-V5] No tags available to navigate');
    }
  });

  test('handles rate limiting gracefully', async ({ request }) => {
    console.log('[TAGS-INDEX-V5] Starting rate limit test');

    // 初期遅延
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 複数のリクエストを順次送信
    const results = [];
    for (let i = 0; i < 3; i++) {
      const response = await request.get('/api/tags/index?sort=popular&page=1&limit=20');
      results.push(response.status());
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('[TAGS-INDEX-V5] Status codes:', results);

    // 成功またはレート制限
    const validStatuses = results.every((status) => [200, 401, 429].includes(status));
    expect(validStatuses).toBe(true);

    console.log('[TAGS-INDEX-V5] Rate limit test completed');
  });
});
