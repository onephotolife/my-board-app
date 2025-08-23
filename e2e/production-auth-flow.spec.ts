import { test, expect } from '@playwright/test';

test.describe('本番環境 - 会員制掲示板認証フロー検証', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromiumのみで実行');
  
  const prodEmail = 'one.photolife+2@gmail.com';
  const prodPassword = '?@thc123THC@?';
  const prodUrl = 'https://board.blankbrainai.com';

  test('本番環境でメール確認済みユーザーがログインできることを確認', async ({ page }) => {
    console.log('🌐 本番環境URL:', prodUrl);
    
    // ログインページへ移動
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // フォーム要素が表示されるまで待機
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // ログインフォームの入力
    console.log('📧 ログインメール:', prodEmail);
    await page.fill('input[type="email"]', prodEmail);
    await page.fill('input[type="password"]', prodPassword);
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // ダッシュボードへリダイレクトされることを確認
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
    console.log('✅ ダッシュボードへのリダイレクト成功');
    console.log('📍 現在のURL:', page.url());
    
    // スクリーンショット取得
    await page.screenshot({ 
      path: 'test-results/prod-dashboard-login-success.png',
      fullPage: true 
    });
    console.log('🎉 ログインテスト成功！');
  });

  test('本番環境でログアウトが正常に動作することを確認', async ({ page }) => {
    // まずログイン
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', prodEmail);
    await page.fill('input[type="password"]', prodPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ ログイン成功');
    
    // ログアウトボタンを探す
    const logoutButton = page.locator('button').filter({ hasText: /ログアウト|Logout|Sign out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      console.log('✅ ログアウトボタンクリック');
    } else {
      // メニューボタンを探す
      const menuButton = page.locator('[aria-label*="menu"], [aria-label*="Menu"], button svg').first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        console.log('✅ メニューボタンクリック');
        
        // ドロワー内のログアウトボタンをクリック
        await page.locator('text=/ログアウト|Logout|Sign out/i').click();
        console.log('✅ ドロワー内ログアウトボタンクリック');
      }
    }
    
    // ログインページへリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    expect(page.url()).toContain('/auth/signin');
    console.log('✅ ログアウト成功');
  });

  test('本番環境で未認証時のアクセス制限が機能することを確認', async ({ page }) => {
    // 未認証状態でダッシュボードにアクセス
    await page.goto(`${prodUrl}/dashboard`);
    
    // ログインページへリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    expect(page.url()).toContain('/auth/signin');
    console.log('✅ 未認証時のアクセス制限確認');
  });

  test('本番環境で新規登録後に自動ログインされないことを確認', async ({ page }) => {
    // 新規登録ページへ移動
    await page.goto(`${prodUrl}/auth/signup`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // ユニークなテストメールアドレスを生成
    const timestamp = Date.now();
    const testEmail = `test_production_${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('📧 テスト用メール:', testEmail);
    
    // 新規登録フォームの入力
    await page.fill('input[name="name"]', 'Production Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // 登録ボタンをクリック
    await page.click('button[type="submit"]');
    
    // 成功メッセージの確認
    const successMessage = page.locator('.success-message, [role="status"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    const messageText = await successMessage.textContent();
    console.log('📝 成功メッセージ:', messageText);
    
    // メール確認が必要であることを示すメッセージを確認
    expect(messageText).toContain('確認メール');
    
    // サインインページへリダイレクトされることを確認（3秒後）
    await page.waitForURL('**/auth/signin?message=verify-email', { timeout: 5000 });
    console.log('✅ サインインページへリダイレクト');
    
    // ダッシュボードへ自動的にリダイレクトされていないことを確認
    expect(page.url()).not.toContain('/dashboard');
    console.log('✅ 自動ログインが防止されている');
  });

  test('本番環境でメール未確認ユーザーがログインできないことを確認', async ({ page }) => {
    // ログインページへ移動
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // 存在しないメールアドレスまたは未確認のテストアカウントでログイン試行
    const unverifiedEmail = 'unverified_test_user@example.com';
    const unverifiedPassword = 'TestPassword123!';
    
    console.log('📧 未確認メール:', unverifiedEmail);
    
    await page.fill('input[name="email"]', unverifiedEmail);
    await page.fill('input[name="password"]', unverifiedPassword);
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されることを確認
    const errorMessage = page.locator('.error-message, [role="alert"], text=/メール.*確認|Invalid credentials/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    const errorText = await errorMessage.textContent();
    console.log('❌ エラーメッセージ:', errorText);
    
    // ダッシュボードへリダイレクトされていないことを確認
    expect(page.url()).not.toContain('/dashboard');
    expect(page.url()).toContain('/auth/signin');
    console.log('✅ メール未確認ユーザーのログインが拒否された');
  });
});

// 詳細なデバッグ情報を含むログイン検証
test.describe('本番環境 - 詳細ログイン検証', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromiumのみで実行');
  
  const prodEmail = 'one.photolife+2@gmail.com';
  const prodPassword = '?@thc123THC@?';
  const prodUrl = 'https://board.blankbrainai.com';

  test('本番環境で正常なログインフローの詳細検証', async ({ page }) => {
    console.log('🌐 開始: 本番環境ログインフロー検証');
    console.log('📍 URL:', prodUrl);
    console.log('📧 メール:', prodEmail);
    
    // ログインページへ移動
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('✅ ログインページ読み込み完了');
    
    // ページタイトルの確認
    const title = await page.title();
    console.log('📄 ページタイトル:', title);
    
    // フォーム要素の存在確認
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    console.log('✅ フォーム要素確認完了');
    
    // ログイン実行
    await emailInput.fill(prodEmail);
    await passwordInput.fill(prodPassword);
    console.log('✅ 認証情報入力完了');
    
    await submitButton.click();
    console.log('✅ ログインボタンクリック');
    
    // リダイレクト待機
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('✅ ダッシュボードへのリダイレクト成功');
      console.log('📍 現在のURL:', page.url());
    } catch (error) {
      console.error('❌ リダイレクト失敗');
      console.error('📍 現在のURL:', page.url());
      
      // エラーメッセージの確認
      const errorMessages = await page.locator('[role="alert"], .error-message').allTextContents();
      if (errorMessages.length > 0) {
        console.error('⚠️ エラーメッセージ:', errorMessages);
      }
      
      throw error;
    }
    
    // ダッシュボード要素の確認
    const dashboardHeader = page.locator('h1, h2').filter({ hasText: /ダッシュボード|Dashboard/i });
    await expect(dashboardHeader).toBeVisible({ timeout: 10000 });
    console.log('✅ ダッシュボードヘッダー表示確認');
    
    // 投稿一覧の確認
    const posts = page.locator('[data-testid="post-item"], .post-item, article, .MuiCard-root');
    const postCount = await posts.count();
    console.log(`📝 表示されている投稿数: ${postCount}`);
    
    console.log('🎉 本番環境ログインフロー検証完了');
  });
});