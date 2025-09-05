import { test, expect } from '@playwright/test';

test('navigate to tag page from trending key', async ({ request, page }) => {
  // トレンドから既存keyを取得→タグページへ遷移
  const r = await request.get('/api/tags/trending?days=30&limit=1');
  expect(r.status()).toBe(200);
  const j = await r.json();
  const key = j?.data?.[0]?.key;
  console.log('[TREND->TAG] key=', key);
  test.skip(!key, 'No trending key available');

  await page.goto(`/tags/${encodeURIComponent(key)}`);
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(new RegExp(`/tags/${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  await expect(page.locator('h1')).toBeVisible();
});
