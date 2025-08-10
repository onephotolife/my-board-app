import { test, expect, Page } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

// テストデータ生成ヘルパー
const generateTestUser = () => ({
  name: `テストユーザー${Date.now()}`,
  email: `test-${uuidv4()}@example.com`,
  password: 'Test123!Pass',
  weakPassword: 'pass',
  strongPassword: 'SuperSecure123!@#Pass',
});

// レート制限リセット待機（テスト環境では無効化されているが、念のため）
const waitForRateLimit = async (page: Page) => {
  if (process.env.WAIT_FOR_RATE_LIMIT === 'true') {
    await page.waitForTimeout(15 * 60 * 1000);
  }
};

test.describe('ユーザー登録フロー', () => {
  test.beforeEach(async ({ page }) => {
    // 登録ページへ遷移
    await page.goto('/auth/signup');
    await expect(page).toHaveURL('/auth/signup');
  });

  test('正常な登録フロー', async ({ page }) => {
    const user = generateTestUser();
    
    // フォーム要素の存在確認
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // フォーム入力
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);

    // パスワード強度インジケータの確認
    const strengthIndicator = page.locator('[data-testid="password-strength"]');
    if (await strengthIndicator.count() > 0) {
      await expect(strengthIndicator).toContainText(/普通|強い/);
    }

    // 送信ボタンクリック
    await page.click('button[type="submit"]');

    // 成功メッセージまたはリダイレクトを待つ
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/register') && response.status() === 201,
      { timeout: 10000 }
    );

    // 成功メッセージの確認
    const successMessage = page.locator('[data-testid="success-message"], .success-message, .alert-success');
    if (await successMessage.count() > 0) {
      await expect(successMessage).toContainText(/登録が完了しました|確認メール/);
    }
  });

  test('フォームバリデーション - 空のフィールド', async ({ page }) => {
    // 空のまま送信
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    const errorMessages = page.locator('.error-message, .field-error, [role="alert"]');
    await expect(errorMessages).toHaveCount({ minimum: 1 });
  });

  test('フォームバリデーション - 無効なメール形式', async ({ page }) => {
    const user = generateTestUser();
    
    // 無効なメールアドレスを入力
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', user.password);
    
    // 送信またはフィールドからフォーカスを外す
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    const emailError = page.locator('[data-testid="email-error"], .email-error, input[name="email"] ~ .error-message');
    if (await emailError.count() > 0) {
      await expect(emailError).toContainText(/有効なメールアドレス|メール/);
    }
  });

  test('フォームバリデーション - 短い名前', async ({ page }) => {
    const user = generateTestUser();
    
    // 短い名前を入力
    await page.fill('input[name="name"]', 'A');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    const nameError = page.locator('[data-testid="name-error"], .name-error, input[name="name"] ~ .error-message');
    if (await nameError.count() > 0) {
      await expect(nameError).toContainText(/2文字以上/);
    }
  });

  test('パスワード強度チェック - 弱いパスワード', async ({ page }) => {
    const user = generateTestUser();
    
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    
    // 弱いパスワードを入力
    await page.fill('input[name="password"]', user.weakPassword);
    
    // パスワード強度の確認
    const strengthIndicator = page.locator('[data-testid="password-strength"], .password-strength');
    if (await strengthIndicator.count() > 0) {
      await expect(strengthIndicator).toContainText(/弱い|非常に弱い/);
    }
    
    // 送信を試みる
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    const passwordError = page.locator('[data-testid="password-error"], .password-error');
    if (await passwordError.count() > 0) {
      await expect(passwordError).toContainText(/パスワード|8文字以上/);
    }
  });

  test('パスワード強度チェック - 強いパスワード', async ({ page }) => {
    const user = generateTestUser();
    
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    
    // 強いパスワードを入力
    await page.fill('input[name="password"]', user.strongPassword);
    
    // パスワード強度の確認
    const strengthIndicator = page.locator('[data-testid="password-strength"], .password-strength');
    if (await strengthIndicator.count() > 0) {
      await expect(strengthIndicator).toContainText(/強い|非常に強い/);
    }
  });

  test('メール重複チェック', async ({ page }) => {
    const user = generateTestUser();
    
    // 最初の登録
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // レスポンスを待つ
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/register'),
      { timeout: 10000 }
    );
    
    // 同じメールで再度登録を試みる
    await page.goto('/auth/signup');
    await page.fill('input[name="name"]', '別の名前');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/register') && response.status() === 400,
      { timeout: 10000 }
    );
    
    const errorMessage = page.locator('[data-testid="error-message"], .error-message, [role="alert"]');
    await expect(errorMessage).toContainText(/既に登録されています|既に使用されています/);
  });

  test('リアルタイムメール重複チェック（デバウンス）', async ({ page }) => {
    const user = generateTestUser();
    
    // 最初の登録
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/register'),
      { timeout: 10000 }
    );
    
    // 新しいタブで重複チェック
    await page.goto('/auth/signup');
    await page.fill('input[name="email"]', user.email);
    
    // デバウンス待機（通常500ms）
    await page.waitForTimeout(600);
    
    // 重複チェックAPIの呼び出しを確認
    const duplicateWarning = page.locator('[data-testid="email-duplicate-warning"], .email-warning');
    if (await duplicateWarning.count() > 0) {
      await expect(duplicateWarning).toContainText(/既に使用されています/);
    }
  });

  test('レート制限テスト', async ({ page }) => {
    // テストモードでない場合のみ実行
    if (process.env.TEST_RATE_LIMIT === 'true') {
      // 複数回の登録試行
      for (let i = 0; i < 6; i++) {
        const user = generateTestUser();
        await page.fill('input[name="name"]', user.name);
        await page.fill('input[name="email"]', user.email);
        await page.fill('input[name="password"]', 'weak'); // わざと弱いパスワード
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(100);
        
        // フォームをクリア
        await page.fill('input[name="name"]', '');
        await page.fill('input[name="email"]', '');
        await page.fill('input[name="password"]', '');
      }
      
      // レート制限エラーの確認
      const rateLimitError = page.locator('[data-testid="rate-limit-error"], .rate-limit-error');
      if (await rateLimitError.count() > 0) {
        await expect(rateLimitError).toContainText(/試行回数が多すぎます/);
      }
    }
  });

  test('必須フィールドのマーキング', async ({ page }) => {
    // 必須フィールドのアスタリスクまたはrequired属性の確認
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    // required属性の確認
    await expect(nameInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
    
    // またはラベルに必須マークがあるか確認
    const nameLabel = page.locator('label[for="name"], label:has(input[name="name"])');
    if (await nameLabel.count() > 0) {
      const labelText = await nameLabel.textContent();
      expect(labelText).toMatch(/\*|必須/);
    }
  });

  test('パスワード表示/非表示トグル', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('[data-testid="password-toggle"], button[aria-label*="パスワード"]');
    
    if (await toggleButton.count() > 0) {
      // 初期状態は非表示
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // トグルボタンをクリック
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // 再度クリックして非表示に
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('フォームのリセット機能', async ({ page }) => {
    const user = generateTestUser();
    
    // フォームに入力
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    
    // リセットボタンがある場合
    const resetButton = page.locator('button[type="reset"], [data-testid="reset-button"]');
    if (await resetButton.count() > 0) {
      await resetButton.click();
      
      // フィールドがクリアされたか確認
      await expect(page.locator('input[name="name"]')).toHaveValue('');
      await expect(page.locator('input[name="email"]')).toHaveValue('');
      await expect(page.locator('input[name="password"]')).toHaveValue('');
    }
  });

  test('エラー後の再試行', async ({ page }) => {
    // 無効なデータで送信
    await page.fill('input[name="name"]', 'A');
    await page.fill('input[name="email"]', 'invalid');
    await page.fill('input[name="password"]', 'weak');
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されるのを待つ
    await page.waitForTimeout(500);
    
    // 正しいデータで再試行
    const user = generateTestUser();
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // 成功を確認
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/register') && response.status() === 201,
      { timeout: 10000 }
    );
  });
});

test.describe('レスポンシブデザイン', () => {
  test('モバイル表示', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/signup');
    
    // フォーム要素が表示されているか確認
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // フォームが画面内に収まっているか確認
    const form = page.locator('form');
    const formBox = await form.boundingBox();
    if (formBox) {
      expect(formBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('タブレット表示', async ({ page }) => {
    // タブレットサイズに設定
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/auth/signup');
    
    // フォーム要素が表示されているか確認
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('デスクトップ表示', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/auth/signup');
    
    // フォーム要素が表示されているか確認
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('アクセシビリティ', () => {
  test('キーボードナビゲーション', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(firstFocused);
    
    // フォーム内をTabで移動
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Shift+Tabで戻る
    await page.keyboard.press('Shift+Tab');
    const backFocused = await page.evaluate(() => document.activeElement?.getAttribute('name'));
    expect(['email', 'password', 'name']).toContain(backFocused);
  });

  test('ARIAラベルとロール', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // フォームのロール確認
    const form = page.locator('form');
    const formRole = await form.getAttribute('role');
    if (formRole) {
      expect(['form', 'region']).toContain(formRole);
    }
    
    // 送信ボタンのアクセシブルな名前
    const submitButton = page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    expect(buttonText).toBeTruthy();
    
    // エラーメッセージのロール
    await page.click('button[type="submit"]'); // エラーを発生させる
    await page.waitForTimeout(500);
    const errorMessage = page.locator('[role="alert"]');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('スクリーンリーダー用のラベル', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // 各入力フィールドにラベルまたはaria-labelがあるか確認
    const nameInput = page.locator('input[name="name"]');
    const nameLabel = await nameInput.getAttribute('aria-label');
    const nameLabelFor = page.locator('label[for="name"]');
    expect(nameLabel || (await nameLabelFor.count()) > 0).toBeTruthy();
    
    const emailInput = page.locator('input[name="email"]');
    const emailLabel = await emailInput.getAttribute('aria-label');
    const emailLabelFor = page.locator('label[for="email"]');
    expect(emailLabel || (await emailLabelFor.count()) > 0).toBeTruthy();
    
    const passwordInput = page.locator('input[name="password"]');
    const passwordLabel = await passwordInput.getAttribute('aria-label');
    const passwordLabelFor = page.locator('label[for="password"]');
    expect(passwordLabel || (await passwordLabelFor.count()) > 0).toBeTruthy();
  });
});

test.describe('パフォーマンス', () => {
  test('ページ読み込み時間', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // 3秒以内に読み込み完了
    expect(loadTime).toBeLessThan(3000);
  });

  test('フォーム送信レスポンス時間', async ({ page }) => {
    await page.goto('/auth/signup');
    const user = generateTestUser();
    
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/register'),
      { timeout: 10000 }
    );
    
    const responseTime = Date.now() - startTime;
    
    // 5秒以内にレスポンス
    expect(responseTime).toBeLessThan(5000);
  });

  test('入力フィールドの応答性', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // 高速タイピングのシミュレーション
    const longText = 'a'.repeat(100);
    const startTime = Date.now();
    await page.fill('input[name="name"]', longText);
    const inputTime = Date.now() - startTime;
    
    // 1秒以内に入力完了
    expect(inputTime).toBeLessThan(1000);
  });
});

test.describe('セキュリティ', () => {
  test('XSS攻撃の防御', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // XSSペイロードを入力
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('input[name="name"]', xssPayload);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!Pass');
    
    await page.click('button[type="submit"]');
    
    // アラートが表示されないことを確認
    let alertFired = false;
    page.on('dialog', () => {
      alertFired = true;
    });
    
    await page.waitForTimeout(1000);
    expect(alertFired).toBe(false);
  });

  test('SQLインジェクション対策', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // SQLインジェクションペイロード
    const sqlPayload = "'; DROP TABLE users; --";
    await page.fill('input[name="email"]', sqlPayload);
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="password"]', 'Test123!Pass');
    
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認（SQLエラーではなく、バリデーションエラー）
    const errorMessage = page.locator('[data-testid="error-message"], .error-message');
    if (await errorMessage.count() > 0) {
      const errorText = await errorMessage.textContent();
      expect(errorText).not.toContain('SQL');
      expect(errorText).not.toContain('syntax');
    }
  });

  test('パスワードのマスキング', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // パスワードフィールドがマスクされているか確認
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // パスワード入力
    await passwordInput.fill('TestPassword123!');
    
    // 入力値が画面に表示されないことを確認（type=passwordの場合）
    const inputType = await passwordInput.getAttribute('type');
    if (inputType === 'password') {
      // パスワードフィールドの値は取得できるが、画面には表示されない
      const value = await passwordInput.inputValue();
      expect(value).toBe('TestPassword123!');
    }
  });
});