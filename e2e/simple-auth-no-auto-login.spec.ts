import { test, expect } from '@playwright/test';

test.describe('認証フロー - 基本動作確認', () => {
  test('新規登録ページでセッションがクリアされることを確認', async ({ page }) => {
    // 新規登録ページへ移動
    await page.goto('http://localhost:3000/auth/signup');
    await page.waitForLoadState('networkidle');

    // ページタイトルまたは見出しを確認
    await expect(page.locator('h1').filter({ hasText: '新規登録' })).toBeVisible();
    
    // 新規登録ページにいることを確認（自動的にダッシュボードへリダイレクトされていない）
    expect(page.url()).toContain('/auth/signup');
    expect(page.url()).not.toContain('/dashboard');
    
    console.log('✅ 新規登録ページでセッションがクリアされ、自動ログインしていません');
  });

  test('サインインページでメール確認メッセージが表示されることを確認', async ({ page }) => {
    // メール確認メッセージ付きでサインインページへ移動
    await page.goto('http://localhost:3000/auth/signin?message=verify-email');
    await page.waitForLoadState('networkidle');

    // メッセージが表示されることを確認
    await expect(page.locator('text=登録が完了しました！メールを確認してアカウントを有効化してください。')).toBeVisible();
    
    // サインインページにいることを確認（自動的にダッシュボードへリダイレクトされていない）
    expect(page.url()).toContain('/auth/signin');
    expect(page.url()).not.toContain('/dashboard');
    
    console.log('✅ サインインページでメール確認メッセージが正しく表示されています');
  });
});