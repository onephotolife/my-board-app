import { test, expect } from '@playwright/test';

test.describe('My Posts機能テスト', () => {
  const timestamp = Date.now();
  const testEmail = `test-my-posts-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  test('ローカル環境: 新規投稿がmy-postsページに表示される', async ({ page }) => {
    // 1. サインアップ
    await page.goto('http://localhost:3000/auth/signup');
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');
    
    // メール確認メッセージを待つ（実際にはスキップ）
    await page.waitForURL('**/auth/verify-email**', { timeout: 5000 }).catch(() => {});
    
    // 2. MongoDBで直接メール確認を有効化（開発環境のみ）
    // 実際の本番環境ではメール確認が必要
    
    // 3. my-postsページへアクセス
    await page.goto('http://localhost:3000/my-posts');
    
    // 認証されていない場合はサインインページにリダイレクト
    if (page.url().includes('/auth/signin')) {
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
    }
    
    // 4. 初期状態を確認（投稿がない場合）
    const noPostsMessage = await page.locator('text=/まだ投稿がありません/').isVisible().catch(() => false);
    console.log('初期状態（投稿なし）:', noPostsMessage);
    
    // 5. 新規投稿を作成
    await page.goto('http://localhost:3000/posts/new');
    
    const postTitle = `テスト投稿 ${timestamp}`;
    const postContent = `これはmy-postsテストのための投稿です。タイムスタンプ: ${timestamp}`;
    
    await page.fill('input[label*="タイトル"]', postTitle);
    await page.fill('textarea[label*="本文"]', postContent);
    await page.click('button:has-text("投稿する")');
    
    // 投稿成功を確認
    await page.waitForURL('**/board**', { timeout: 5000 }).catch(() => {});
    
    // 6. my-postsページに戻って確認
    await page.goto('http://localhost:3000/my-posts');
    
    // 投稿が表示されることを確認
    await expect(page.locator(`text=${postTitle}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${postContent}`)).toBeVisible({ timeout: 10000 });
    
    console.log('✅ ローカル環境: 投稿がmy-postsページに正しく表示されました');
  });
});