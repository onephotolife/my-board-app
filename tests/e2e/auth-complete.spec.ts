import { test, expect } from '@playwright/test';

/**
 * 🔐 41人天才会議による包括的認証テスト
 * 無限ループ問題の完全解決を検証
 */
test.describe('包括的認証フロー', () => {
  test.beforeEach(async ({ page, context }) => {
    // クッキーとストレージを完全にクリア
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('認証済みユーザーの自動リダイレクト（無限ループ防止）', async ({ page }) => {
    // まずログインする
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    
    // ログインボタンをクリック
    await Promise.all([
      page.waitForNavigation({ url: '**/dashboard', timeout: 10000 }),
      page.click('[data-testid="signin-button"]')
    ]);
    
    // ダッシュボードに到達することを確認
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 再度サインインページにアクセス
    await page.goto('/auth/signin');
    
    // 自動的にダッシュボードにリダイレクトされることを確認
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // コンソールログを確認（無限ループが発生していないこと）
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // 3回目のアクセスでも正常にリダイレクト
    await page.goto('/auth/signin');
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    // 無限ループエラーメッセージが出ていないことを確認
    const hasLoopError = logs.some(log => 
      log.includes('リダイレクト試行回数超過') || 
      log.includes('無限ループ防止')
    );
    expect(hasLoopError).toBe(false);
  });

  test('callbackURL付きリダイレクト', async ({ page }) => {
    // callbackURL付きでサインインページにアクセス
    await page.goto('/auth/signin?callbackUrl=%2Fprofile');
    
    // ログイン
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    
    // ログイン後、指定されたURLにリダイレクト
    await Promise.all([
      page.waitForNavigation({ url: '**/profile', timeout: 10000 }),
      page.click('[data-testid="signin-button"]')
    ]);
    
    await expect(page).toHaveURL(/.*\/profile/);
  });

  test('認証エラーメッセージの表示', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // 無効な認証情報を入力
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    // ログインボタンをクリック
    await page.click('[data-testid="signin-button"]');
    
    // エラーメッセージが表示されることを確認
    const errorLocator = page.locator('text=ユーザーが見つかりません').or(
      page.locator('text=ログインに失敗しました')
    );
    await expect(errorLocator).toBeVisible({ timeout: 10000 });
  });

  test('セッションストレージのクリア確認', async ({ page }) => {
    // サインインページにアクセス
    await page.goto('/auth/signin');
    
    // セッションストレージにテストデータを設定
    await page.evaluate(() => {
      sessionStorage.setItem('test-key', 'test-value');
      sessionStorage.setItem('redirect-count', '5');
      sessionStorage.setItem('stop-redirect', 'true');
    });
    
    // ログイン
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    // ダッシュボードに遷移後、セッションストレージがクリアされていることを確認
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    const storageData = await page.evaluate(() => {
      return {
        testKey: sessionStorage.getItem('test-key'),
        redirectCount: sessionStorage.getItem('redirect-count'),
        stopRedirect: sessionStorage.getItem('stop-redirect')
      };
    });
    
    expect(storageData.testKey).toBeNull();
    expect(storageData.redirectCount).toBeNull();
    expect(storageData.stopRedirect).toBeNull();
  });

  test('ログアウト後の再ログイン', async ({ page }) => {
    // ログイン
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    // ダッシュボードに到達
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // ログアウト（APIを直接呼び出し）
    await page.evaluate(() => {
      return fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });
    
    // セッションをクリア
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // サインインページに戻る
    await page.goto('/auth/signin');
    
    // ダッシュボードにリダイレクトされないことを確認
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    
    // 再度ログイン可能であることを確認
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('複数タブでの同時アクセス', async ({ browser }) => {
    // 2つのコンテキスト（タブ）を作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // 両方のタブでサインインページにアクセス
      await page1.goto('/auth/signin');
      await page2.goto('/auth/signin');
      
      // 最初のタブでログイン
      await page1.fill('[data-testid="email-input"]', 'test@example.com');
      await page1.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page1.click('[data-testid="signin-button"]');
      
      // 最初のタブがダッシュボードに遷移
      await page1.waitForURL('**/dashboard', { timeout: 10000 });
      
      // 2番目のタブはまだサインインページにいる
      await expect(page2).toHaveURL(/.*\/auth\/signin/);
      
      // 2番目のタブでも同じユーザーでログイン可能
      await page2.fill('[data-testid="email-input"]', 'test@example.com');
      await page2.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page2.click('[data-testid="signin-button"]');
      
      // 2番目のタブもダッシュボードに遷移
      await page2.waitForURL('**/dashboard', { timeout: 10000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('パフォーマンステスト - リダイレクト速度', async ({ page }) => {
    // ログイン
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    // ダッシュボードに到達
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // サインインページに再アクセスして、リダイレクト時間を計測
    const startTime = Date.now();
    await page.goto('/auth/signin');
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    const redirectTime = Date.now() - startTime;
    
    console.log(`リダイレクト時間: ${redirectTime}ms`);
    
    // 3秒以内にリダイレクトされることを確認
    expect(redirectTime).toBeLessThan(3000);
  });
});

test.describe('エッジケーステスト', () => {
  test('ネットワークエラー時の処理', async ({ page, context }) => {
    await page.goto('/auth/signin');
    
    // ネットワークエラーをシミュレート
    await context.route('**/api/auth/callback/credentials', route => {
      route.abort('failed');
    });
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="signin-button"]');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=エラーが発生しました')).toBeVisible({ timeout: 10000 });
  });

  test('同時複数リクエストの処理', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // ログインボタンを複数回クリック
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    
    // 複数回クリックを同時に実行
    await Promise.all([
      page.click('[data-testid="signin-button"]'),
      page.click('[data-testid="signin-button"]'),
      page.click('[data-testid="signin-button"]')
    ]);
    
    // 正常にダッシュボードに遷移することを確認
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);
  });
});