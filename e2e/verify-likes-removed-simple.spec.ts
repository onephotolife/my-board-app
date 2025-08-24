import { test, expect } from '@playwright/test';

test.describe('いいね機能削除の確認（簡易版）', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const testCredentials = {
    email: 'one.photolife+2@gmail.com',
    password: '?@thc123THC@?'
  };

  test('ログインして掲示板ページでいいねボタンが存在しないことを確認', async ({ page }) => {
    // タイムアウトを長めに設定
    test.setTimeout(90000);
    
    // サインインページに移動
    await page.goto(`${prodUrl}/auth/signin`, { waitUntil: 'domcontentloaded' });
    
    // ログインフォームが表示されるまで待つ
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    // ログイン
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 30000 });
    
    // 掲示板ページに移動
    await page.goto(`${prodUrl}/board`, { waitUntil: 'domcontentloaded' });
    
    // ページが読み込まれるまで少し待つ
    await page.waitForTimeout(5000);
    
    // いいねに関連するテキストやアイコンが存在しないことを確認
    const pageContent = await page.content();
    
    // いいね関連のテキストチェック
    expect(pageContent.toLowerCase()).not.toContain('いいね');
    expect(pageContent.toLowerCase()).not.toContain('like');
    
    // FavoriteIconのdata-testidチェック
    const favoriteIcons = await page.$$('[data-testid*="Favorite"]');
    expect(favoriteIcons.length).toBe(0);
    
    // いいねボタンの存在チェック
    const likeButtons = await page.$$('button:has-text("いいね")');
    expect(likeButtons.length).toBe(0);
    
    console.log('✅ 掲示板ページでいいね機能が削除されていることを確認しました');
  });

  test('APIエンドポイント /api/posts/[id]/like が404を返すことを確認', async ({ request, page }) => {
    // まずログインしてセッションを取得
    await page.goto(`${prodUrl}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 30000 });
    
    // APIリクエストを送信
    const response = await request.post(`${prodUrl}/api/posts/test-post-id/like`, {
      data: { action: 'toggle_like' }
    });
    
    // 404エラーが返ることを確認
    expect(response.status()).toBe(404);
    
    console.log('✅ いいねAPIエンドポイントが削除されていることを確認しました');
  });
});