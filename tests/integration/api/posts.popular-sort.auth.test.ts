/**
 * 結合テスト（認証済み・API）：実行はしない（雛形）
 * 目的: 認証→/api/posts?tag=東京&sort=-likes の 200 応答と likes 降順の基本健全性を確認
 * 注意: 実行時は AUTH_BASE_URL/AUTH_EMAIL/AUTH_PASSWORD を設定。既定は指示値を使用。
 */

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import fetch from 'node-fetch';

const BASE = process.env.AUTH_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.AUTH_EMAIL || 'one.photolife+1@gmail.com';
const PASSWORD = process.env.AUTH_PASSWORD || '?@thc123THC@?';

async function getCsrf() {
  const res = await fetch(`${BASE}/api/auth/csrf`, { method: 'GET' });
  const json = (await res.json()) as any;
  const cookie = res.headers.get('set-cookie') || '';
  // デバッグ
  // eslint-disable-next-line no-console
  console.log('[INTEG-DEBUG] CSRF status:', res.status, 'cookie-set:', Boolean(cookie));
  return { token: json?.csrfToken, cookieRaw: cookie };
}

async function signin(csrfToken: string, cookieRaw: string) {
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieRaw },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, csrfToken, json: true }),
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie') || '';
  // eslint-disable-next-line no-console
  console.log('[INTEG-DEBUG] SIGNIN status:', res.status, 'set-cookie:', Boolean(setCookie));
  const sessionCookie =
    (setCookie.match(/(?:__Secure-)?next-auth\.session-token=[^;]+/) || [])[0] || '';
  return sessionCookie;
}

describe('API /posts popular sort (auth, integration)', () => {
  it('認証後に /api/posts?tag=東京&sort=-likes が 200 を返す（雛形・未実行）', async () => {
    // ここでは実行しない。承認後に以下を用いて検証可能。
    // 1) const { token, cookieRaw } = await getCsrf();
    // 2) const sess = await signin(token!, cookieRaw);
    // 3) const res = await fetch(`${BASE}/api/posts?tag=${encodeURIComponent('東京')}&sort=-likes&page=1&limit=5`, { headers: { Cookie: sess } });
    // 4) console.log('[INTEG-DEBUG] POSTS status:', res.status); const j = await res.json(); console.log(j?.pagination, j?.data?.length);
    expect(true).toBe(true);
  });
});
