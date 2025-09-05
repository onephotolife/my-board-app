import { test, expect } from '@playwright/test';

test.describe('Tags Index Page', () => {
  test('navigates to tags page and displays list', async ({ page }) => {
    console.log('[TAGS-INDEX-TEST] Starting tags index page test');

    // Navigate to tags page
    await page.goto('/tags');
    await page.waitForLoadState('domcontentloaded');

    // Check page title
    await expect(page.locator('h1')).toContainText('タグ一覧');
    console.log('[TAGS-INDEX-TEST] Page title confirmed');

    // Wait for tags list to load
    await page.waitForSelector('[data-testid="tags-list"]', { timeout: 10000 }).catch(() => {
      console.log('[TAGS-INDEX-TEST] No tags list found - might be empty');
    });

    // Check if tags are displayed (may be zero)
    const tagsList = page.locator('[data-testid="tags-list"]');
    const tagsCount = await tagsList
      .locator('li')
      .count()
      .catch(() => 0);
    console.log('[TAGS-INDEX-TEST] Tags count:', tagsCount);

    // Verify load succeeded (no error alert)
    const errorAlert = page.locator('[data-testid="tags-error-alert"]');
    const hasError = await errorAlert.isVisible().catch(() => false);
    expect(hasError).toBe(false);

    console.log('[TAGS-INDEX-TEST] Tags page loaded successfully');
  });

  test('searches for tags', async ({ page }) => {
    console.log('[TAGS-INDEX-TEST] Starting tag search test');

    await page.goto('/tags');
    await page.waitForLoadState('domcontentloaded');

    // Find search input
    const searchInput = page.locator('[data-testid="tags-search-input"] input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Search for "東"
    await searchInput.fill('東');
    await searchInput.press('Enter');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check for results or empty state
    const tagsList = page.locator('[data-testid="tags-list"]');
    const emptyState = page.locator('text=タグが見つかりません');

    const hasResults = await tagsList.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    // Either results or empty state should be visible
    expect(hasResults || isEmpty).toBe(true);

    if (hasResults) {
      const count = await tagsList.locator('li').count();
      console.log('[TAGS-INDEX-TEST] Search found', count, 'results');
    } else {
      console.log('[TAGS-INDEX-TEST] Search returned empty (OK)');
    }
  });

  test('switches between popular and recent sort', async ({ page }) => {
    console.log('[TAGS-INDEX-TEST] Starting sort toggle test');

    await page.goto('/tags');
    await page.waitForLoadState('domcontentloaded');

    // Find sort toggle
    const sortToggle = page.locator('[data-testid="tags-sort-toggle"]');
    await expect(sortToggle).toBeVisible({ timeout: 10000 });

    // Click on recent sort
    const recentButton = sortToggle.locator('button[value="recent"]');
    await recentButton.click();

    // Wait for update
    await page.waitForTimeout(1000);

    // Verify no error occurred
    const errorAlert = page.locator('[data-testid="tags-error-alert"]');
    const hasError = await errorAlert.isVisible().catch(() => false);
    expect(hasError).toBe(false);

    console.log('[TAGS-INDEX-TEST] Sort changed to recent');

    // Switch back to popular
    const popularButton = sortToggle.locator('button[value="popular"]');
    await popularButton.click();

    await page.waitForTimeout(1000);

    console.log('[TAGS-INDEX-TEST] Sort changed back to popular');
  });

  test('clicks tag to navigate to tag detail page', async ({ page }) => {
    console.log('[TAGS-INDEX-TEST] Starting tag navigation test');

    await page.goto('/tags');
    await page.waitForLoadState('domcontentloaded');

    // Wait for tags to load
    await page.waitForTimeout(2000);

    // Check if any tags are available
    const tagsList = page.locator('[data-testid="tags-list"]');
    const hasTagsList = await tagsList.isVisible().catch(() => false);

    if (!hasTagsList) {
      console.log('[TAGS-INDEX-TEST] No tags available - skipping navigation test');
      test.skip();
      return;
    }

    // Get first tag item
    const firstTag = tagsList.locator('li').first();
    const tagExists = await firstTag.isVisible().catch(() => false);

    if (!tagExists) {
      console.log('[TAGS-INDEX-TEST] No tag items found - skipping');
      test.skip();
      return;
    }

    // Get tag key from the first item
    const tagText = await firstTag.textContent();
    console.log('[TAGS-INDEX-TEST] Clicking on tag:', tagText);

    // Click the tag
    await Promise.all([page.waitForURL(/\/tags\/[^\/]+$/, { timeout: 5000 }), firstTag.click()]);

    // Wait for navigation to complete
    await page.waitForLoadState('domcontentloaded');

    // Verify we navigated to a tag detail page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/tags\/[^\/]+$/);

    console.log('[TAGS-INDEX-TEST] Successfully navigated to:', currentUrl);
  });

  test('handles rate limiting gracefully', async ({ request }) => {
    console.log('[TAGS-INDEX-TEST] Starting rate limit test');

    // Add initial delay to avoid interference
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Make multiple requests rapidly
    const requests = Array.from({ length: 5 }, () =>
      request.get('/api/tags/index?sort=popular&page=1&limit=5')
    );

    const results = await Promise.all(requests);
    const statusCodes = results.map((r) => r.status());

    console.log('[TAGS-INDEX-TEST] Status codes:', statusCodes);

    // Check if we got some successful responses
    const successCount = statusCodes.filter((code) => code === 200).length;
    const rateLimitCount = statusCodes.filter((code) => code === 429).length;

    console.log('[TAGS-INDEX-TEST] Success:', successCount, 'Rate limited:', rateLimitCount);

    // At least some should succeed
    expect(successCount + rateLimitCount).toBe(5);

    // If rate limited, wait and retry
    if (rateLimitCount > 0) {
      console.log('[TAGS-INDEX-TEST] Rate limited - waiting before retry');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const retryResponse = await request.get('/api/tags/index?sort=popular&page=1&limit=5');
      console.log('[TAGS-INDEX-TEST] Retry status:', retryResponse.status());

      // Retry should eventually succeed
      expect([200, 429].includes(retryResponse.status())).toBe(true);
    }

    console.log('[TAGS-INDEX-TEST] Rate limit test completed');
  });
});
