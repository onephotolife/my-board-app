// tests/e2e/hashtag.seed.setup.ts
import { test, expect } from '@playwright/test';

test('seed hashtag posts', async ({ request }) => {
  console.log('[SEED] start');
  const payloads = [
    {
      title: 'Seed 東京',
      author: 'e2e-bot',
      category: 'general',
      content: 'テスト本文 #東京 #React',
    },
    { title: 'Seed 絵文字', author: 'e2e-bot', category: 'general', content: '絵文字タグ #🚀 #🇯🇵' },
  ];
  for (const p of payloads) {
    const r = await request.post('/api/posts', {
      data: { ...p, status: 'published', tags: ['東京', 'React'] },
    });
    console.log('[SEED] /api/posts status=', r.status());
    expect([200, 201, 409].includes(r.status())).toBeTruthy();
  }
  console.log('[SEED] done');
});
