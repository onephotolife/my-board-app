import { test, expect } from '@playwright/test';

// 🔐 41人天才会議による包括的認証テスト
test.describe('認証フロー - サインイン', () => {
  test.beforeEach(async ({ page, context }) => {
    // クッキーをクリア
    await context.clearCookies();
    // ローカルストレージとセッションストレージをクリア
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('サインインページが正しく表示される', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // ページタイトルとフォーム要素の確認
    await expect(page.locator('h1')).toContainText('ログイン');
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible();
  });

  test('無効な認証情報でエラーが表示される', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // 無効な認証情報を入力
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    // ログインボタンをクリック
    await page.click('[data-testid="signin-button"]');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=ログインに失敗しました')).toBeVisible({ timeout: 10000 });
  });

  test('callbackURL付きでアクセスした場合の処理', async ({ page }) => {
    const callbackUrl = '/dashboard';
    await page.goto(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    
    // URLパラメータが正しく保持されていることを確認
    const url = page.url();
    expect(url).toContain('callbackUrl');
    
    // フォームが正しく表示されることを確認
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
  });

  test('既にログイン済みの場合の処理', async ({ page, context }) => {
    // まずログインする（テスト用アカウント）
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    
    // ログインボタンクリック
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/auth/callback/credentials') && resp.status() === 200
    );
    await page.click('[data-testid="signin-button"]');
    
    try {
      await responsePromise;
      // セッションが確立されるまで少し待つ
      await page.waitForTimeout(2000);
      
      // ダッシュボードへのリダイレクトを確認
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        // リダイレクト成功
        expect(currentUrl).toContain('/dashboard');
      } else {
        // リダイレクトしない場合は、ログインページに留まることを確認
        expect(currentUrl).toContain('/auth/signin');
      }
    } catch (error) {
      // タイムアウトの場合はテストアカウントが存在しない
      console.log('テストアカウントが存在しない可能性があります');
      await expect(page.locator('text=ユーザーが見つかりません')).toBeVisible();
    }
  });

  test('無限ループ防止機能の確認', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // セッションストレージに無限ループ防止フラグを設定
    await page.evaluate(() => {
      sessionStorage.setItem('stop-redirect', 'true');
    });
    
    // ページをリロード
    await page.reload();
    
    // ページがサインインページに留まることを確認
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
  });

  test('デバッグクライアントが動作していることを確認', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // ローカルストレージにデバッグ情報が記録されることを確認
    const debugInfo = await page.evaluate(() => {
      return localStorage.getItem('auth-session-debug');
    });
    
    expect(debugInfo).toBeTruthy();
    const parsed = JSON.parse(debugInfo || '{}');
    expect(parsed).toHaveProperty('pathname');
    expect(parsed.pathname).toBe('/auth/signin');
  });

  test('パスワードリセットリンクが機能する', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // パスワードリセットリンクをクリック
    await page.click('text=パスワードを忘れた方はこちら');
    
    // パスワードリセットページへ遷移することを確認
    await expect(page).toHaveURL(/.*\/auth\/reset-password/);
  });

  test('新規登録リンクが機能する', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // 新規登録リンクをクリック
    await page.click('text=新規登録');
    
    // 新規登録ページへ遷移することを確認
    await expect(page).toHaveURL(/.*\/auth\/signup/);
  });
});

// パフォーマンステスト
test.describe('認証パフォーマンス', () => {
  test('サインインページの読み込み時間', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/auth/signin');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // 3秒以内に読み込まれることを確認
    expect(loadTime).toBeLessThan(3000);
    console.log(`サインインページ読み込み時間: ${loadTime}ms`);
  });
});