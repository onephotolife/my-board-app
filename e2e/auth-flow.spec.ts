import { test, expect } from '@playwright/test';

// 🔐 41人天才会議による包括的認証フローテスト
test.describe('認証フロー - 無限ループ防止テスト', () => {
  // テスト用アカウント情報
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User'
  };

  test.beforeEach(async ({ page }) => {
    // テスト前にクッキーをクリア
    await page.context().clearCookies();
  });

  test('ログイン成功後の適切なリダイレクト', async ({ page }) => {
    // サインインページにアクセス
    await page.goto('/auth/signin?callbackUrl=%2Fdashboard');
    
    // ログインフォームが表示されることを確認
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    
    // ログイン情報を入力
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    
    // コンソールログを監視
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    // ログインボタンをクリック
    await page.click('[data-testid="signin-button"]');
    
    // セッション確立を待つ（最大10秒）
    await page.waitForFunction(
      () => {
        // セッション確認のログが出力されるまで待機
        const logs = window.console.log.toString();
        return logs.includes('セッション確認') || logs.includes('リダイレクト実行');
      },
      { timeout: 10000 }
    );
    
    // ダッシュボードへのリダイレクトを確認（最大15秒待機）
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // ダッシュボードページが正しく表示されることを確認
    const currentURL = page.url();
    expect(currentURL).toContain('/dashboard');
    
    // 無限ループが発生していないことを確認
    // （サインインページにリダイレクトされないこと）
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/auth/signin');
    
    // コンソールログに無限ループの兆候がないことを確認
    const loopIndicators = consoleLogs.filter(log => 
      log.includes('callbackUrlが認証ページ') || 
      log.includes('無限ループ')
    );
    expect(loopIndicators.length).toBeLessThanOrEqual(1);
  });

  test('メール未確認ユーザーの適切な処理', async ({ page }) => {
    // サインインページにアクセス
    await page.goto('/auth/signin');
    
    // メール未確認のテストユーザーでログイン
    const unverifiedUser = {
      email: 'unverified@example.com',
      password: 'TestPassword123!'
    };
    
    await page.fill('[data-testid="email-input"]', unverifiedUser.email);
    await page.fill('[data-testid="password-input"]', unverifiedUser.password);
    await page.click('[data-testid="signin-button"]');
    
    // エラーメッセージまたはメール確認ページへのリダイレクトを待つ
    await page.waitForSelector('.error-message, [data-page="email-not-verified"]', { 
      timeout: 10000 
    });
    
    // 無限ループが発生していないことを確認
    const urlAfterLogin = page.url();
    await page.waitForTimeout(2000);
    expect(page.url()).toBe(urlAfterLogin);
  });

  test('既にログイン済みユーザーのリダイレクト', async ({ page, context }) => {
    // まずログインする
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="signin-button"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // セッションクッキーが設定されていることを確認
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => 
      c.name.includes('next-auth.session-token') || 
      c.name.includes('__Secure-next-auth.session-token')
    );
    expect(sessionCookie).toBeDefined();
    
    // サインインページに再度アクセスを試みる
    await page.goto('/auth/signin');
    
    // ダッシュボードに自動リダイレクトされることを確認
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('保護されたページアクセス時の認証チェック', async ({ page }) => {
    // 未認証状態で保護されたページにアクセス
    await page.goto('/profile');
    
    // サインインページにリダイレクトされることを確認
    await page.waitForURL('**/auth/signin?callbackUrl=%2Fprofile', { timeout: 5000 });
    expect(page.url()).toContain('/auth/signin');
    expect(page.url()).toContain('callbackUrl=%2Fprofile');
    
    // ログイン
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="signin-button"]');
    
    // 元のページ（プロフィール）にリダイレクトされることを確認
    await page.waitForURL('**/profile', { timeout: 15000 });
    expect(page.url()).toContain('/profile');
  });

  test('複数タブでのセッション同期', async ({ browser }) => {
    // 最初のタブでログイン
    const context = await browser.newContext();
    const page1 = await context.newPage();
    
    await page1.goto('/auth/signin');
    await page1.fill('[data-testid="email-input"]', testUser.email);
    await page1.fill('[data-testid="password-input"]', testUser.password);
    await page1.click('[data-testid="signin-button"]');
    await page1.waitForURL('**/dashboard', { timeout: 15000 });
    
    // 2番目のタブを開く
    const page2 = await context.newPage();
    await page2.goto('/dashboard');
    
    // 2番目のタブでもログイン状態が維持されていることを確認
    await expect(page2).toHaveURL(/.*dashboard/);
    
    // サインインページにアクセスしても自動リダイレクトされることを確認
    await page2.goto('/auth/signin');
    await page2.waitForURL('**/dashboard', { timeout: 5000 });
    
    await context.close();
  });

  test('ログアウト後の適切な処理', async ({ page }) => {
    // ログイン
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // ログアウト処理（APIを直接呼び出す）
    await page.evaluate(async () => {
      await fetch('/api/auth/signout', { method: 'POST' });
    });
    
    // セッションがクリアされるまで待つ
    await page.waitForTimeout(1000);
    
    // 保護されたページにアクセスを試みる
    await page.goto('/dashboard');
    
    // サインインページにリダイレクトされることを確認
    await page.waitForURL('**/auth/signin?callbackUrl=%2Fdashboard', { timeout: 5000 });
    expect(page.url()).toContain('/auth/signin');
  });
});

// パフォーマンステスト
test.describe('認証パフォーマンステスト', () => {
  test('ログイン処理の応答時間', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    
    // ログインボタンクリックから画面遷移までの時間を計測
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    const endTime = Date.now();
    const loginTime = endTime - startTime;
    
    // ログイン処理が5秒以内に完了することを確認
    expect(loginTime).toBeLessThan(5000);
    
    console.log(`ログイン処理時間: ${loginTime}ms`);
  });
});