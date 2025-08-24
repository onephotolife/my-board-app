import { test, expect } from '@playwright/test';

test.describe('いいね機能削除の確認', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const testCredentials = {
    email: 'one.photolife+2@gmail.com',
    password: '?@thc123THC@?'
  };

  test.beforeEach(async ({ page }) => {
    // 本番環境にアクセス
    await page.goto(prodUrl);
  });

  test('ログインして掲示板でいいねボタンが表示されないことを確認', async ({ page }) => {
    // サインインページに移動
    await page.goto(`${prodUrl}/auth/signin`);
    
    // ログイン
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    
    // ログイン後のリダイレクトを待つ
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 10000 });
    
    // 掲示板ページに移動
    await page.goto(`${prodUrl}/board`);
    await page.waitForLoadState('networkidle');
    
    // いいねアイコンが存在しないことを確認
    await expect(page.locator('[data-testid="FavoriteIcon"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="FavoriteBorderIcon"]')).toHaveCount(0);
    
    // いいね関連のテキストが表示されないことを確認
    const pageContent = await page.content();
    expect(pageContent).not.toContain('いいね');
    expect(pageContent).not.toContain('Like');
    
    // CardActionsセクション自体が存在しないことを確認（いいねボタンがあった場所）
    const postCards = page.locator('.MuiCard-root');
    const cardsCount = await postCards.count();
    
    if (cardsCount > 0) {
      // 最初の投稿カードを確認
      const firstCard = postCards.first();
      const cardActions = firstCard.locator('.MuiCardActions-root');
      await expect(cardActions).toHaveCount(0);
    }
  });

  test('マイ投稿ページでいいね数が表示されないことを確認', async ({ page }) => {
    // サインインページに移動
    await page.goto(`${prodUrl}/auth/signin`);
    
    // ログイン
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    
    // ログイン後のリダイレクトを待つ
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 10000 });
    
    // マイ投稿ページに移動
    await page.goto(`${prodUrl}/my-posts`);
    await page.waitForLoadState('networkidle');
    
    // いいねアイコンが存在しないことを確認
    await expect(page.locator('[data-testid="ThumbUpIcon"]')).toHaveCount(0);
    
    // 統計セクションでいいね関連の統計が表示されないことを確認
    const statsSection = page.locator('.MuiPaper-root');
    const statsSectionCount = await statsSection.count();
    
    if (statsSectionCount > 0) {
      // 統計テキストを確認
      for (let i = 0; i < statsSectionCount; i++) {
        const stat = statsSection.nth(i);
        const text = await stat.textContent();
        expect(text).not.toContain('いいね');
        expect(text).not.toContain('Like');
      }
    }
  });

  test('APIエンドポイント /api/posts/[id]/like が404を返すことを確認', async ({ page }) => {
    // サインインページに移動
    await page.goto(`${prodUrl}/auth/signin`);
    
    // ログイン
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    
    // ログイン後のリダイレクトを待つ
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 10000 });
    
    // 掲示板ページで投稿IDを取得
    await page.goto(`${prodUrl}/board`);
    await page.waitForLoadState('networkidle');
    
    // APIリクエストをインターセプトして確認
    const likeEndpointCalled = await page.evaluate(async () => {
      try {
        // ダミーの投稿IDでいいねAPIを呼び出し
        const response = await fetch('/api/posts/123456789/like', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'toggle_like' })
        });
        return { status: response.status, ok: response.ok };
      } catch (error) {
        return { error: true, message: error.message };
      }
    });
    
    // いいねエンドポイントが404を返すか、存在しないことを確認
    expect(likeEndpointCalled.status).toBe(404);
  });

  test('投稿詳細ページでいいね機能が表示されないことを確認', async ({ page }) => {
    // サインインページに移動
    await page.goto(`${prodUrl}/auth/signin`);
    
    // ログイン
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    
    // ログイン後のリダイレクトを待つ
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 10000 });
    
    // 掲示板ページに移動
    await page.goto(`${prodUrl}/board`);
    await page.waitForLoadState('networkidle');
    
    // 投稿カードが存在する場合、最初の投稿をクリック
    const postLinks = page.locator('a[href^="/posts/"]');
    const postLinksCount = await postLinks.count();
    
    if (postLinksCount > 0) {
      // 最初の投稿詳細ページへ移動
      await postLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // いいね関連の要素が存在しないことを確認
      await expect(page.locator('[data-testid="FavoriteIcon"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="FavoriteBorderIcon"]')).toHaveCount(0);
      await expect(page.locator('button:has-text("いいね")')).toHaveCount(0);
      
      // ページコンテンツにいいね関連のテキストがないことを確認
      const pageContent = await page.content();
      expect(pageContent).not.toContain('いいねしました');
      expect(pageContent).not.toContain('いいねを取り消し');
    }
  });
});