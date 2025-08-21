/**
 * ユーザー登録 E2Eテスト
 * 実際のブラウザでのユーザー登録フローテスト
 */

import { test, expect, Page } from '@playwright/test';

// テスト用ユーザーデータ
const generateTestUser = () => ({
  email: `test-user-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: `Test User ${Date.now()}`,
});

// ページヘルパー関数
class RegistrationPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/signup');
  }

  async fillRegistrationForm(userData: { email: string; password: string; name: string }) {
    await this.page.fill('input[name="email"]', userData.email);
    await this.page.fill('input[name="password"]', userData.password);
    await this.page.fill('input[name="confirmPassword"]', userData.password);
    await this.page.fill('input[name="name"]', userData.name);
  }

  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  async expectSuccessMessage() {
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(this.page.locator('text=登録が完了しました')).toBeVisible();
  }

  async expectErrorMessage(errorText?: string) {
    const errorLocator = this.page.locator('[data-testid="error-message"]');
    await expect(errorLocator).toBeVisible();
    
    if (errorText) {
      await expect(errorLocator).toContainText(errorText);
    }
  }

  async expectValidationError(field: string, message: string) {
    const fieldError = this.page.locator(`[data-testid="error-${field}"]`);
    await expect(fieldError).toBeVisible();
    await expect(fieldError).toContainText(message);
  }
}

test.describe('User Registration E2E Tests', () => {
  test('正常なユーザー登録フロー', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    const userData = generateTestUser();

    // 1. 登録ページに移動
    await registrationPage.goto();
    
    // 2. ページタイトル確認
    await expect(page).toHaveTitle(/新規登録/);
    
    // 3. フォーム要素の存在確認
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // 4. フォーム入力
    await registrationPage.fillRegistrationForm(userData);

    // 5. パスワード強度インジケーターの確認
    const strengthIndicator = page.locator('[data-testid="password-strength"]');
    await expect(strengthIndicator).toBeVisible();
    await expect(strengthIndicator).toContainText('強い');

    // 6. フォーム送信
    await registrationPage.submitForm();

    // 7. ローディング状態の確認
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('text=登録中...')).toBeVisible();

    // 8. 成功メッセージの確認
    await registrationPage.expectSuccessMessage();
    await expect(page.locator('text=確認メールをご確認ください')).toBeVisible();

    // 9. リダイレクト確認
    await page.waitForURL('/auth/verify-email*');
    await expect(page.url()).toContain('/auth/verify-email');
  });

  test('入力バリデーションエラー', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.goto();

    // 1. 空フォーム送信
    await registrationPage.submitForm();

    // バリデーションエラーメッセージの確認
    await registrationPage.expectValidationError('email', 'メールアドレスを入力してください');
    await registrationPage.expectValidationError('password', 'パスワードを入力してください');
    await registrationPage.expectValidationError('name', '名前を入力してください');

    // 2. 無効なメールアドレス
    await page.fill('input[name="email"]', 'invalid-email');
    await page.blur('input[name="email"]'); // フォーカスを外す
    await registrationPage.expectValidationError('email', '有効なメールアドレスを入力してください');

    // 3. 弱いパスワード
    await page.fill('input[name="password"]', '123');
    await page.blur('input[name="password"]');
    
    const strengthIndicator = page.locator('[data-testid="password-strength"]');
    await expect(strengthIndicator).toContainText('弱い');
    await registrationPage.expectValidationError('password', 'パスワードが弱すぎます');

    // 4. パスワード不一致
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.blur('input[name="confirmPassword"]');
    await registrationPage.expectValidationError('confirmPassword', 'パスワードが一致しません');

    // 5. 名前が短すぎる
    await page.fill('input[name="name"]', 'A');
    await page.blur('input[name="name"]');
    await registrationPage.expectValidationError('name', '名前は2文字以上である必要があります');
  });

  test('重複メールアドレスエラー', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    const userData = generateTestUser();

    // 1回目の登録（成功）
    await registrationPage.goto();
    await registrationPage.fillRegistrationForm(userData);
    await registrationPage.submitForm();
    await registrationPage.expectSuccessMessage();

    // 同じメールアドレスで2回目の登録
    await registrationPage.goto();
    await registrationPage.fillRegistrationForm(userData);
    await registrationPage.submitForm();

    // 重複エラーの確認
    await registrationPage.expectErrorMessage('このメールアドレスは既に登録されています');
    
    // ログインリンクの表示確認
    const loginLink = page.locator('a[href="/auth/signin"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText('ログイン');
  });

  test('パスワード表示切替機能', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.goto();

    // 1. 初期状態ではパスワードが隠されている
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 2. 表示ボタンをクリック
    const toggleButton = page.locator('button[aria-label="パスワードを表示"]');
    await toggleButton.click();

    // 3. パスワードが表示される
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // 4. 再度クリックで隠す
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('レスポンシブデザイン確認', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });
    await registrationPage.goto();

    // モバイルでもフォームが正常に表示される
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();

    // タブレットビューポート
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('form')).toBeVisible();

    // デスクトップビューポート
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('form')).toBeVisible();
  });

  test('アクセシビリティ確認', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();

    // フォームラベルの確認
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    await expect(page.locator('label[for="confirmPassword"]')).toBeVisible();
    await expect(page.locator('label[for="name"]')).toBeVisible();

    // フォーカス管理の確認
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();

    // ARIA属性の確認
    const form = page.locator('form');
    await expect(form).toHaveAttribute('aria-label');

    // エラーメッセージとaria-describedby
    await page.fill('input[name="email"]', 'invalid');
    await page.blur('input[name="email"]');
    
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('ネットワークエラーハンドリング', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    const userData = generateTestUser();

    await registrationPage.goto();

    // ネットワークを無効化
    await page.route('/api/auth/register', route => {
      route.abort('failed');
    });

    await registrationPage.fillRegistrationForm(userData);
    await registrationPage.submitForm();

    // エラーメッセージの表示確認
    await registrationPage.expectErrorMessage('ネットワークエラーが発生しました');
    
    // フォームがリセットされないことを確認
    await expect(page.locator('input[name="email"]')).toHaveValue(userData.email);
    await expect(page.locator('input[name="name"]')).toHaveValue(userData.name);
  });

  test('CSRFトークン処理', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    
    await registrationPage.goto();

    // CSRFトークンがフォームに含まれていることを確認
    const csrfToken = page.locator('input[name="csrfToken"]');
    await expect(csrfToken).toBeHidden(); // hidden inputとして存在
    await expect(csrfToken).toHaveValue(/.+/); // 値が設定されている
  });

  test('パスワード要件ヘルプ', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    
    await registrationPage.goto();

    // パスワードフィールドにフォーカス
    await page.focus('input[name="password"]');

    // パスワード要件のヘルプが表示される
    const helpText = page.locator('[data-testid="password-requirements"]');
    await expect(helpText).toBeVisible();
    await expect(helpText).toContainText('8文字以上');
    await expect(helpText).toContainText('大文字');
    await expect(helpText).toContainText('小文字');
    await expect(helpText).toContainText('数字');
    await expect(helpText).toContainText('特殊文字');
  });

  test('利用規約・プライバシーポリシーリンク', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    
    await registrationPage.goto();

    // リンクの存在確認
    const termsLink = page.locator('a[href="/terms"]');
    const privacyLink = page.locator('a[href="/privacy"]');

    await expect(termsLink).toBeVisible();
    await expect(privacyLink).toBeVisible();

    // 外部タブで開かれることを確認
    await expect(termsLink).toHaveAttribute('target', '_blank');
    await expect(privacyLink).toHaveAttribute('target', '_blank');
  });
});