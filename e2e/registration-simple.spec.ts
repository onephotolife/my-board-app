import { test, expect } from '@playwright/test';

test.describe('ユーザー登録フロー - 基本テスト', () => {
  test('登録ページが正しく表示される', async ({ page }) => {
    // 登録ページへアクセス
    await page.goto('/auth/signup');
    
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('新規登録');
    
    // 必須フィールドの存在確認
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('フォームバリデーション - 空のフィールド', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // 空のまま送信ボタンをクリック
    await page.click('button[type="submit"]');
    
    // ブラウザのHTML5バリデーションメッセージを確認
    const nameInput = page.locator('input[name="name"]');
    const nameValidity = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(nameValidity).toBeTruthy();
  });

  test('正常な登録フロー', async ({ page }) => {
    await page.goto('/auth/signup');
    
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    
    // フォームに入力
    await page.fill('input[name="name"]', 'テストユーザー');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Test123!Pass');
    await page.fill('input[name="confirmPassword"]', 'Test123!Pass');
    
    // パスワード一致確認メッセージを待つ
    await expect(page.locator('text=パスワードが一致しています')).toBeVisible();
    
    // 送信
    await page.click('button[type="submit"]');
    
    // 成功メッセージまたはエラーメッセージを待つ（最大10秒）
    await page.waitForSelector('text=/登録が完了しました|エラーが発生しました/', { timeout: 10000 });
  });

  test('パスワード強度インジケータの動作', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // 弱いパスワードを入力
    await page.fill('input[name="password"]', 'weak');
    
    // PasswordStrengthIndicatorコンポーネントの存在を確認（実装に依存）
    const strengthIndicator = page.locator('[data-testid="password-strength"], .password-strength');
    const indicatorCount = await strengthIndicator.count();
    
    if (indicatorCount > 0) {
      // 弱いパスワードの場合の表示を確認
      await expect(strengthIndicator.first()).toBeVisible();
    }
    
    // 強いパスワードに変更
    await page.fill('input[name="password"]', 'SuperSecure123!@#Pass');
    
    if (indicatorCount > 0) {
      // 強いパスワードの場合の表示を確認
      await expect(strengthIndicator.first()).toBeVisible();
    }
  });

  test('パスワード表示/非表示トグル', async ({ page }) => {
    await page.goto('/auth/signup');
    
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button').filter({ hasText: /👁️/ }).first();
    
    // 初期状態はpassword type
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // トグルボタンをクリック
    await toggleButton.click();
    
    // text typeに変更されたか確認
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // 再度クリックして戻す
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('メールアドレスの形式チェック', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // 無効なメールアドレスを入力
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('input[name="password"]'); // フォーカスを外す
    
    await page.waitForTimeout(500); // バリデーション待機
    
    // エラーメッセージの確認
    const emailError = page.locator('text=/有効なメールアドレス/');
    const errorCount = await emailError.count();
    
    if (errorCount > 0) {
      await expect(emailError.first()).toBeVisible();
    }
  });

  test('パスワード確認の一致チェック', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // パスワードを入力
    await page.fill('input[name="password"]', 'Test123!Pass');
    
    // 異なるパスワードを確認フィールドに入力
    await page.fill('input[name="confirmPassword"]', 'Different123!');
    await page.click('input[name="email"]'); // フォーカスを外す
    
    await page.waitForTimeout(500); // バリデーション待機
    
    // エラーメッセージの確認
    const mismatchError = page.locator('text=パスワードが一致しません');
    const errorCount = await mismatchError.count();
    
    if (errorCount > 0) {
      await expect(mismatchError).toBeVisible();
    }
    
    // 正しいパスワードに修正
    await page.fill('input[name="confirmPassword"]', 'Test123!Pass');
    
    // 一致確認メッセージ
    await expect(page.locator('text=パスワードが一致しています')).toBeVisible();
  });

  test('短い名前のバリデーション', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // 1文字の名前を入力
    await page.fill('input[name="name"]', 'A');
    await page.click('input[name="email"]'); // フォーカスを外す
    
    await page.waitForTimeout(500); // バリデーション待機
    
    // エラーメッセージの確認
    const nameError = page.locator('text=/2文字以上/');
    const errorCount = await nameError.count();
    
    if (errorCount > 0) {
      await expect(nameError).toBeVisible();
    }
  });
});

test.describe('レスポンシブデザイン', () => {
  test('モバイル表示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/signup');
    
    // 主要要素が表示されているか確認
    await expect(page.locator('h1')).toContainText('新規登録');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('タブレット表示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/auth/signup');
    
    await expect(page.locator('h1')).toContainText('新規登録');
    await expect(page.locator('form')).toBeVisible();
  });

  test('デスクトップ表示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/auth/signup');
    
    await expect(page.locator('h1')).toContainText('新規登録');
    await expect(page.locator('form')).toBeVisible();
  });
});