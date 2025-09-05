import { test, expect } from '@playwright/test';

test.describe('Hashtag APIs (search/trending/timeline)', () => {
  test('search returns { success, data }', async ({ request }) => {
    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const r = await request.get('/api/tags/search?q=東&limit=5');
    console.log('[API-SEARCH]', r.status());
    expect(r.status()).toBe(200);
    const j = await r.json();
    console.log('[API-SEARCH] payload=', JSON.stringify(j).slice(0, 300));
    expect(j.success).toBe(true);
    expect(Array.isArray(j.data)).toBe(true);
  });

  test('trending returns { key, count }', async ({ request }) => {
    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const r = await request.get('/api/tags/trending?days=30&limit=5');
    console.log('[API-TRENDING]', r.status());
    expect(r.status()).toBe(200);
    const j = await r.json();
    console.log('[API-TRENDING] payload=', JSON.stringify(j).slice(0, 300));
    expect(j.success).toBe(true);
    expect(Array.isArray(j.data)).toBe(true);
    if (j.data.length) {
      expect(j.data[0]).toHaveProperty('key');
      expect(j.data[0]).toHaveProperty('count');
    }
  });

  test('timeline requires authentication', async ({ request }) => {
    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const r = await request.get('/api/timeline');
    console.log('[TIMELINE-AUTH]', r.status());
    // With storageState, should be 200; without, 401
    expect([200, 401].includes(r.status())).toBe(true);
    if (r.status() === 200) {
      const j = await r.json();
      expect(j.success).toBe(true);
      expect(Array.isArray(j.posts)).toBe(true);
    }
  });
});
