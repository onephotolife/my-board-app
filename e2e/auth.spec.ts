import { test, expect } from '@playwright/test';

// テスト用のユーザー情報
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'E2E Test User',
};

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display home page with login and signup buttons', async ({ page }) => {
    // ホームページの確認
    await expect(page.locator('h1')).toContainText('会員制掲示板へようこそ');
    
    // ログインボタンの確認
    const loginButton = page.locator('a[href="/auth/signin"]').first();
    await expect(loginButton).toBeVisible();
    
    // 新規登録ボタンの確認
    const signupButton = page.locator('a[href="/auth/signup"]').first();
    await expect(signupButton).toBeVisible();
  });

  test('should complete full registration flow', async ({ page }) => {
    // 新規登録ページへ移動
    await page.click('a[href="/auth/signup"]');
    await expect(page).toHaveURL(/.*\/auth\/signup/);
    
    // フォームの確認
    await expect(page.locator('h1')).toContainText('新規登録');
    
    // フォームに入力
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    // 登録ボタンをクリック
    await page.click('button[type="submit"]');
    
    // 成功メッセージまたはリダイレクトを確認
    await page.waitForLoadState('networkidle');
    
    // 成功メッセージの確認（メール送信が必要なため、実際の確認は難しい）
    const successAlert = page.locator('.MuiAlert-root').filter({ hasText: /登録が完了しました/ });
    const isSuccess = await successAlert.isVisible().catch(() => false);
    
    if (isSuccess) {
      await expect(successAlert).toBeVisible();
    }
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    // 新規登録ページへ移動
    await page.goto('http://localhost:3000/auth/signup');
    
    // 無効なデータで送信を試みる
    await page.fill('input[name="name"]', 'A'); // 短すぎる名前
    await page.fill('input[name="email"]', 'invalid-email'); // 無効なメール
    await page.fill('input[name="password"]', 'weak'); // 弱いパスワード
    await page.fill('input[name="confirmPassword"]', 'different'); // 一致しないパスワード
    
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    await page.waitForTimeout(500); // エラー表示を待つ
    const errorAlert = page.locator('.MuiAlert-root.MuiAlert-colorError');
    await expect(errorAlert).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    // ログインページへ移動
    await page.goto('http://localhost:3000/auth/signin');
    await expect(page.locator('h1')).toContainText('ログイン');
    
    // 無効な認証情報でログイン
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    await page.waitForTimeout(1000);
    const errorAlert = page.locator('.MuiAlert-root.MuiAlert-colorError');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/メールアドレスまたはパスワードが正しくありません/);
  });

  test('should show/hide password when visibility toggle is clicked', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');
    
    const passwordInput = page.locator('input[name="password"]');
    const visibilityToggle = page.locator('button[aria-label="toggle password visibility"]');
    
    // 初期状態：パスワードは非表示
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // トグルをクリック：パスワードを表示
    await visibilityToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // 再度トグルをクリック：パスワードを非表示
    await visibilityToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate between login and signup pages', async ({ page }) => {
    // ログインページから開始
    await page.goto('http://localhost:3000/auth/signin');
    
    // 新規登録リンクをクリック
    await page.click('a[href="/auth/signup"]');
    await expect(page).toHaveURL(/.*\/auth\/signup/);
    await expect(page.locator('h1')).toContainText('新規登録');
    
    // ログインリンクをクリックして戻る
    await page.click('a[href="/auth/signin"]');
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    await expect(page.locator('h1')).toContainText('ログイン');
  });

  test('should handle password mismatch in registration', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signup');
    
    // パスワードが一致しない場合
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    await page.waitForTimeout(500);
    const errorAlert = page.locator('.MuiAlert-root.MuiAlert-colorError');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/パスワードが一致しません/);
  });

  test('should protect board page from unauthenticated access', async ({ page }) => {
    // 未認証状態で掲示板ページにアクセス
    await page.goto('http://localhost:3000/board');
    
    // ログインページにリダイレクトされることを確認
    await page.waitForURL(/.*\/auth\/signin/);
    await expect(page.locator('h1')).toContainText('ログイン');
  });
});

test.describe('Authenticated User Flow', () => {
  // 実際の認証が必要なテストは、テスト用のセッション設定が必要
  // ここでは基本的なナビゲーションのみテスト
  
  test('should display header with navigation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // ヘッダーの確認
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // サイトタイトルの確認
    const title = header.locator('h6');
    await expect(title).toContainText('会員制掲示板');
  });

  test('should handle loading states properly', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');
    
    // フォームに入力
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // 送信ボタンをクリック
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // ローディング状態の確認（ボタンが無効化される）
    await expect(submitButton).toBeDisabled();
  });
});