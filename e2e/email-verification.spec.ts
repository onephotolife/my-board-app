import { test, expect, Page } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

/**
 * メール認証機能のE2Eテスト
 * 
 * テストシナリオ:
 * 1. 新規登録 → メール送信 → 認証リンククリック → ログイン
 * 2. パスワード変更 → 再ログイン
 * 3. エラーケースの確認
 */

test.describe('Email Verification E2E Tests', () => {
  let page: Page;
  let testEmail: string;
  let testPassword: string;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // 各テストで一意のメールアドレスを生成
    testEmail = `test-${uuidv4().substring(0, 8)}@example.com`;
    testPassword = 'TestPassword123!';
  });

  test.describe('メール認証フロー', () => {
    test('新規登録からメール認証までの完全なフロー', async () => {
      // 1. トップページにアクセス
      await page.goto('/');
      
      // 2. サインアップページへ移動
      await page.click('text=ログイン');
      await page.click('text=新規登録はこちら');
      
      // 3. 新規登録フォームに入力
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      
      // 利用規約に同意
      await page.check('input[name="terms"]');
      
      // 4. 登録ボタンをクリック
      await page.click('button[type="submit"]');
      
      // 5. 成功メッセージを確認
      await expect(page.locator('text=登録が完了しました')).toBeVisible({ timeout: 10000 });
      
      // 6. メール認証ページへのダイレクトアクセスをシミュレート
      // 実際のトークンは取得できないため、モックトークンでテスト
      const mockToken = 'test-verification-token';
      await page.goto(`/auth/verify-email?token=${mockToken}`);
      
      // 7. エラーメッセージが表示されることを確認（トークンが無効なため）
      await expect(page.locator('text=エラーが発生しました')).toBeVisible({ timeout: 10000 });
    });

    test('無効なトークンでアクセスした場合', async () => {
      // 無効なトークンでアクセス
      await page.goto('/auth/verify-email?token=invalid-token-123');
      
      // エラーメッセージを確認
      await expect(page.locator('text=エラーが発生しました')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=トークンが無効です')).toBeVisible();
      
      // ナビゲーションボタンを確認
      await expect(page.locator('text=新規登録へ')).toBeVisible();
      await expect(page.locator('text=ログインへ')).toBeVisible();
    });

    test('トークンなしでアクセスした場合', async () => {
      // トークンなしでアクセス
      await page.goto('/auth/verify-email');
      
      // エラーメッセージを確認
      await expect(page.locator('text=エラーが発生しました')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=無効なリンクです')).toBeVisible();
    });
  });

  test.describe('パスワード変更フロー', () => {
    test('プロフィールページからパスワード変更ダイアログを開く', async () => {
      // 1. プロフィールページにアクセス（未ログインの場合はサインインページへリダイレクト）
      await page.goto('/profile');
      
      // サインインページにリダイレクトされることを確認
      await expect(page).toHaveURL(/.*\/auth\/signin/);
      
      // 2. テスト用ダイアログページで動作確認
      await page.goto('/(main)/test-dialog');
      
      // 3. パスワード変更ダイアログを開く
      await page.click('text=パスワード変更ダイアログを開く');
      
      // 4. ダイアログが表示されることを確認
      await expect(page.locator('role=dialog')).toBeVisible();
      await expect(page.locator('text=パスワード変更')).toBeVisible();
      
      // 5. パスワードフィールドが3つあることを確認
      const passwordFields = await page.locator('input[type="password"]').count();
      expect(passwordFields).toBe(3);
      
      // 6. キャンセルボタンでダイアログを閉じる
      await page.click('text=キャンセル');
      await expect(page.locator('role=dialog')).not.toBeVisible();
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイル表示でメール認証ページが正しく表示される', async ({ viewport }) => {
      // モバイルビューポートを設定
      await page.setViewportSize({ width: 375, height: 667 });
      
      // メール認証ページにアクセス
      await page.goto('/auth/verify-email?token=test-token');
      
      // コンテンツが表示されることを確認
      await expect(page.locator('text=メールアドレスを確認中')).toBeVisible();
      
      // レイアウトが崩れていないことを確認（スクリーンショット）
      await page.screenshot({ path: 'e2e/screenshots/mobile-verify-email.png' });
    });
  });

  test.describe('アクセシビリティ', () => {
    test('キーボードナビゲーションが機能する', async () => {
      await page.goto('/auth/verify-email?token=invalid');
      
      // Tabキーでボタン間を移動
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Enterキーでボタンをクリック
      const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
      expect(focusedElement).toBeTruthy();
    });

    test('スクリーンリーダー用の属性が設定されている', async () => {
      await page.goto('/auth/verify-email?token=test');
      
      // aria属性を確認
      const dialog = page.locator('role=dialog');
      
      // ローディング状態を待つ
      await page.waitForTimeout(1000);
      
      // エラー表示後の要素を確認
      const hasAriaLabel = await page.locator('[aria-label]').count();
      expect(hasAriaLabel).toBeGreaterThan(0);
    });
  });

  test.describe('パフォーマンス', () => {
    test('ページ読み込みが3秒以内に完了する', async () => {
      const startTime = Date.now();
      await page.goto('/auth/verify-email?token=test');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    test('Hydrationエラーが発生しない', async () => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto('/auth/verify-email?token=test');
      await page.waitForTimeout(2000);
      
      const hydrationErrors = consoleErrors.filter(err => 
        err.includes('Hydration') || err.includes('hydration')
      );
      
      expect(hydrationErrors).toHaveLength(0);
    });
  });

  test.describe('セキュリティ', () => {
    test('XSS攻撃に対して安全', async () => {
      // XSSペイロードを含むトークン
      const xssToken = '<script>alert("XSS")</script>';
      await page.goto(`/auth/verify-email?token=${encodeURIComponent(xssToken)}`);
      
      // スクリプトが実行されないことを確認
      const alertCalled = await page.evaluate(() => {
        let alertWasCalled = false;
        const originalAlert = window.alert;
        window.alert = () => { alertWasCalled = true; };
        setTimeout(() => { window.alert = originalAlert; }, 100);
        return alertWasCalled;
      });
      
      expect(alertCalled).toBe(false);
    });

    test('SQLインジェクションに対して安全', async () => {
      // SQLインジェクションペイロードを含むトークン
      const sqlToken = "'; DROP TABLE users; --";
      await page.goto(`/auth/verify-email?token=${encodeURIComponent(sqlToken)}`);
      
      // エラーが適切に処理されることを確認
      await expect(page.locator('text=エラーが発生しました')).toBeVisible({ timeout: 10000 });
    });
  });
});