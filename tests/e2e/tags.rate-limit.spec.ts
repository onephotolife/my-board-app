import { test, expect } from '@playwright/test';

test('search API should return 429 when rapidly exceeding limits', async ({ request }) => {
  // Add initial delay to reset rate limit from previous tests
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('[RATE] start burst');
  const runs = 70; // searchは60req/min。70回で少なくとも一部429を期待
  const results = await Promise.all(
    Array.from({ length: runs }, () => request.get('/api/tags/search?q=ratelimit&limit=1'))
  );
  const codes = results.map((r) => r.status());
  console.log('[RATE] status codes:', codes);
  expect(codes.some((c) => c === 429)).toBeTruthy();
});
