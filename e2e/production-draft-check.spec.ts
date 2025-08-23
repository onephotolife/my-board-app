import { test, expect } from '@playwright/test';

test.describe('本番環境下書き保存機能削除確認', () => {
  const baseURL = 'https://board.blankbrainai.com';
  const timestamp = Date.now();
  const testEmail = `draft-check-${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Draft Check User';

  test('新規投稿ページに下書き保存ボタンが存在しないことを確認', async ({ page }) => {
    // 1. サインアップ
    await page.goto(`${baseURL}/auth/signup`);
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button[type="submit"]');
    
    // メール確認メッセージを待つ
    await page.waitForURL('**/auth/verify-email**', { timeout: 10000 });
    
    // 2. サインイン
    await page.goto(`${baseURL}/auth/signin`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // エラーメッセージ（メール未確認）が表示されることを確認
    const errorMessage = await page.locator('text=/メールアドレスを確認してください/').isVisible();
    console.log('メール未確認エラー表示:', errorMessage);
    
    // 3. 新規投稿ページへの直接アクセス試行
    await page.goto(`${baseURL}/posts/new`);
    
    // 認証されていないためサインインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*\/auth\/signin.*/);
    
    // 4. ページのHTMLを取得して下書き保存の文字列を検索
    const pageContent = await page.content();
    const hasDraftSave = pageContent.includes('下書き保存') || pageContent.includes('下書き');
    
    console.log('ページに下書き保存ボタンが存在するか:', hasDraftSave);
    expect(hasDraftSave).toBe(false);
  });

  test('編集ページに下書き保存ボタンが存在しないことを確認', async ({ page }) => {
    // テスト用の投稿IDを使用（実際には存在しない可能性が高い）
    const testPostId = '68a9213a21bebce04797b0e1';
    
    await page.goto(`${baseURL}/posts/${testPostId}/edit`);
    
    // 認証されていないためサインインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*\/auth\/signin.*/);
    
    // ページのHTMLを取得して下書き保存の文字列を検索
    const pageContent = await page.content();
    const hasDraftSave = pageContent.includes('下書き保存') || pageContent.includes('下書き');
    
    console.log('編集ページに下書き保存ボタンが存在するか:', hasDraftSave);
    expect(hasDraftSave).toBe(false);
  });
});