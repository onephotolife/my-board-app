/**
 * E2E（認証済み・UI）: 実行は後続承認後
 * 目的: サインイン→/tags/東京→「人気順」切替→Network に sort=-likes を確認
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.AUTH_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.AUTH_EMAIL || 'one.photolife+1@gmail.com';
const PASSWORD = process.env.AUTH_PASSWORD || '?@thc123THC@?';

test.describe('Tags popular visibility (auth E2E)', () => {
  test('ログイン後に人気順トグルが機能し、sort=-likes が発行される（雛形）', async ({
    page,
    request,
  }) => {
    // 実行は承認後。以下は雛形: CSRF→credentials サインイン→cookie 注入→ページ遷移

    // CSRF
    const csrfRes = await request.get(`${BASE}/api/auth/csrf`);
    const csrfJson = await csrfRes.json();
    const csrfToken = csrfJson?.csrfToken as string;
    console.warn('[E2E-DEBUG] csrf status:', csrfRes.status());

    // Credentials サインイン（API）
    const signinRes = await request.post(`${BASE}/api/auth/callback/credentials`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: EMAIL, password: PASSWORD, csrfToken, json: true },
      failOnStatusCode: false,
    });
    const setCookie = signinRes.headers()['set-cookie'] || '';
    console.warn(
      '[E2E-DEBUG] signin status:',
      signinRes.status(),
      'set-cookie:',
      Boolean(setCookie)
    );
    const sessionCookie = (Array.isArray(setCookie) ? setCookie.join(';') : setCookie).match(
      /(?:__Secure-)?next-auth\.session-token=[^;]+/
    );

    // ブラウザコンテキストへ Cookie 反映
    if (sessionCookie && sessionCookie[0]) {
      const token = sessionCookie[0].split('=')[1];
      await page
        .context()
        .addCookies([
          {
            name: 'next-auth.session-token',
            value: token,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
          },
        ]);
    }

    // /tags/東京 へ
    await page.goto(`${BASE}/tags/%E6%9D%B1%E4%BA%AC`);
    await page.waitForLoadState('domcontentloaded');

    // トグル可視
    await expect(page.getByTestId('tag-sort-toggle')).toBeVisible();

    // Network 監視（次リクエストのクエリに sort=-likes を含むこと）
    const [api] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes('/api/posts') && req.url().includes('sort=-likes')
      ),
      page.getByRole('button', { name: '人気順' }).click(),
    ]);
    console.warn('[E2E-DEBUG] captured request:', api.url());

    // いずれかのカード or 空状態
    const hasCard = await page
      .locator('[data-testid^="tag-post-card-"]')
      .first()
      .isVisible()
      .catch(() => false);
    const isEmpty = await page
      .locator('text=まだ投稿がありません')
      .isVisible()
      .catch(() => false);
    expect(hasCard || isEmpty).toBeTruthy();
  });
});
