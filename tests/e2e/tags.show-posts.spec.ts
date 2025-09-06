import { test, expect } from '@playwright/test';

// 前提: 開発モードでは API がモック認証を受け付ける（/api/posts 内の dev-bypass）
// 手順:
// 1) #東京 タグの投稿をAPI経由で作成
// 2) /tags/東京 に移動
// 3) 投稿カードが表示され、リンク等が動作することを検証

test.describe('Tags page shows posts for #東京', () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false });

  test('Create post via API and verify it appears on tag page', async ({ page, request }) => {
    // 0) ブラウザ側にもモック認証Cookieを設定（ミドルウェアのE2Eバイパスを有効化）
    await page.context().addCookies([
      {
        name: 'e2e-mock-auth',
        value: 'mock-session-token-for-e2e-testing',
        url: 'http://localhost:3000',
      },
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token-for-e2e-testing',
        url: 'http://localhost:3000',
      },
    ]);
    // 1) 投稿を作成
    const createRes = await request.post('/api/posts', {
      data: {
        title: 'E2E: 東京タグの投稿',
        content: 'E2Eテスト用の本文です。#東京 で検証します。',
        category: 'general',
        tags: ['東京'],
      },
      headers: {
        cookie: 'e2e-mock-auth=mock-session-token-for-e2e-testing',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const body = await createRes.json();
    expect(body?.success).toBeTruthy();

    // 2) タグページへ移動
    await page.goto('/tags/%E6%9D%B1%E4%BA%AC');

    // タイトルとソートトグルが見える
    await expect(page.getByTestId('tag-page-title')).toBeVisible();
    await expect(page.getByTestId('tag-sort-toggle')).toBeVisible();

    // 3) 投稿カードが少なくとも1枚表示される（可視性の確認に限定）
    const card = page.locator('[data-testid^="tag-post-card-"]').first();
    await expect(card).toBeVisible();
    // 認証ルートの影響を避け、詳細遷移テストは別ケースで実施
  });
});
