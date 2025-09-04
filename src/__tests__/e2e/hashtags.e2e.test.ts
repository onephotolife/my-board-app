/**
 * ハッシュタグ機能 E2E（Jest簡易スモーク）
 * 認証/CSRF依存を避け、公開エンドポイントとSSRページを検証
 */

import { v4 as uuid } from 'uuid';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('Hashtags E2E (public endpoints)', () => {
  it('should return trending data (200)', async () => {
    const res = await fetch(`${BASE_URL}/api/tags/trending?days=7&limit=5`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('success');
  }, 15000);

  it('should return search suggestions (200)', async () => {
    const res = await fetch(`${BASE_URL}/api/tags/search?q=t&limit=5`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('success');
  }, 15000);

  it('should open tag page (SSR) for arbitrary tag (200)', async () => {
    const tag = `東京-${uuid().slice(0, 6)}`;
    const res = await fetch(`${BASE_URL}/tags/${encodeURIComponent(tag)}`);
    expect(res.status).toBe(200);
  }, 15000);
});
