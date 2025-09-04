import { test, expect } from '@playwright/test';

test.describe('Hashtag feature', () => {
  test('suggestion and navigation', async ({ page }) => {
    await page.goto('/auth/signin');
    // 簡易ログイン（テスト用に環境変数でメール/パスワードを注入する想定）
    await page.getByLabel('Email').fill(process.env.AUTH_EMAIL || '');
    await page.getByLabel('Password').fill(process.env.AUTH_PASSWORD || '');
    await page.getByRole('button', { name: /sign in|ログイン/i }).click();

    // 投稿画面へ
    await page.goto('/posts/new');
    await page.getByLabel(/本文|content/i).fill('Playwrightタグテスト #東');
    // サジェストが表示されること（リストが見える想定のロール）
    await expect(page.getByRole('list')).toBeVisible({ timeout: 5000 });

    // 先頭アイテムを選択（上下+Enterをシミュレーション）
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // 投稿する
    await page.getByRole('button', { name: /投稿/ }).click();

    // タイムラインへ遷移して本文中のハッシュタグリンクが存在
    await page.goto('/');
    const tagLink = page.getByRole('link', { name: /#.+/ });
    await expect(tagLink.first()).toBeVisible();

    // クリックでタグページへ遷移
    await tagLink.first().click();
    await expect(page).toHaveURL(/\/tags\//);
  });
});
