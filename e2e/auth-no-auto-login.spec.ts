import { test, expect } from '@playwright/test';
import crypto from 'crypto';

// テスト用のユニークなメールアドレスを生成
const generateTestEmail = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `test_${timestamp}_${random}@example.com`;
};

test.describe('認証フロー - 自動ログイン防止確認', () => {
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async () => {
    testEmail = generateTestEmail();
    testPassword = 'TestPassword123!';
  });

  test('新規登録後に自動ログインされないことを確認', async ({ page }) => {
    console.log('📧 テストメール:', testEmail);
    
    // 新規登録ページへ移動
    await page.goto('http://localhost:3000/auth/signup');
    await page.waitForLoadState('networkidle');

    // 新規登録フォームの入力
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // 登録ボタンをクリック
    await page.click('button[type="submit"]');

    // 成功メッセージの確認
    await expect(page.locator('.success-message')).toContainText('登録が完了しました');
    await expect(page.locator('.success-message')).toContainText('確認メールを送信しました');

    // サインインページへリダイレクトされることを確認（3秒後）
    await page.waitForTimeout(3500);
    expect(page.url()).toContain('/auth/signin');
    expect(page.url()).toContain('message=verify-email');
    
    // ダッシュボードへリダイレクトされていないことを確認
    expect(page.url()).not.toContain('/dashboard');
    console.log('✅ 新規登録後、自動ログインされずにサインインページへリダイレクトされました');

    // サインインページにメッセージが表示されることを確認
    await expect(page.locator('text=登録が完了しました！メールを確認してアカウントを有効化してください。')).toBeVisible();
  });

  test('メール未確認のユーザーがログインできないことを確認', async ({ page, request }) => {
    // まず新規登録（APIを使用）
    const registerResponse = await request.post('http://localhost:3000/api/auth/register', {
      data: {
        name: 'Test User',
        email: testEmail,
        password: testPassword
      }
    });
    
    expect(registerResponse.ok()).toBeTruthy();
    console.log('📝 ユーザー登録完了:', testEmail);

    // ログインページへ移動
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');

    // ログイン試行
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // エラーメッセージまたはメール未確認ページへのリダイレクトを確認
    await page.waitForTimeout(2000);
    
    // ダッシュボードへリダイレクトされていないことを確認
    expect(page.url()).not.toContain('/dashboard');
    console.log('✅ メール未確認のユーザーはログインできません');
  });
});