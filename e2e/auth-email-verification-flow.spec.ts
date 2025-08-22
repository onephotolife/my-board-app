import { test, expect } from '@playwright/test';
import crypto from 'crypto';

// テスト用のユニークなメールアドレスを生成
const generateTestEmail = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `test_${timestamp}_${random}@example.com`;
};

test.describe('会員制掲示板 - 認証フロー検証', () => {
  let testEmail: string;
  let testPassword: string;
  let verificationToken: string;

  test.beforeEach(async () => {
    testEmail = generateTestEmail();
    testPassword = 'TestPassword123!';
  });

  test('新規登録後に自動ログインされないことを確認', async ({ page }) => {
    console.log('📧 テストメール:', testEmail);
    
    // 新規登録ページへ移動
    await page.goto('/auth/signup');
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
    await expect(page.locator('.success-message')).toContainText('メール内のリンクをクリックしてアカウントを有効化');

    // サインインページへリダイレクトされることを確認（3秒後）
    await page.waitForURL('**/auth/signin?message=verify-email', { timeout: 5000 });
    
    // サインインページにメッセージが表示されることを確認
    await expect(page.locator('text=登録が完了しました！メールを確認してアカウントを有効化してください。')).toBeVisible();

    // ダッシュボードへリダイレクトされていないことを確認
    expect(page.url()).not.toContain('/dashboard');
  });

  test('メール未確認のユーザーがログインできないことを確認', async ({ page, request }) => {
    // まず新規登録
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        name: 'Test User',
        email: testEmail,
        password: testPassword
      }
    });
    
    expect(registerResponse.ok()).toBeTruthy();
    const registerData = await registerResponse.json();
    console.log('📝 登録結果:', registerData);

    // トークンを取得（テスト用エンドポイントを使用）
    const tokenResponse = await request.post('/api/test/get-token', {
      data: { email: testEmail }
    });
    
    if (tokenResponse.ok()) {
      const tokenData = await tokenResponse.json();
      verificationToken = tokenData.token;
      console.log('🔑 検証トークン取得:', verificationToken);
    }

    // ログインページへ移動
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // ログイン試行
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    await expect(page.locator('.error-message, [role="alert"]')).toContainText(
      /メールアドレスが確認されていません|メール未確認|Invalid credentials/i
    );

    // ダッシュボードへリダイレクトされていないことを確認
    expect(page.url()).not.toContain('/dashboard');
    expect(page.url()).toContain('/auth/signin');
  });

  test('メール確認後にログインできることを確認', async ({ page, request }) => {
    // まず新規登録
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        name: 'Test User',
        email: testEmail,
        password: testPassword
      }
    });
    
    expect(registerResponse.ok()).toBeTruthy();

    // トークンを取得
    const tokenResponse = await request.post('/api/test/get-token', {
      data: { email: testEmail }
    });
    
    if (tokenResponse.ok()) {
      const tokenData = await tokenResponse.json();
      verificationToken = tokenData.token;
      console.log('🔑 検証トークン取得:', verificationToken);

      // メール確認を実行
      const verifyResponse = await request.get(`/api/auth/verify-email?token=${verificationToken}`);
      expect(verifyResponse.ok()).toBeTruthy();
      const verifyData = await verifyResponse.json();
      console.log('✅ メール確認結果:', verifyData);
    }

    // ログインページへ移動
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // ログイン試行
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // ダッシュボードへリダイレクトされることを確認
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    // ダッシュボードが表示されることを確認
    await expect(page.locator('h1, h2').filter({ hasText: /ダッシュボード|Dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('メール確認リンクからの確認フロー', async ({ page, request }) => {
    // まず新規登録
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        name: 'Test User',
        email: testEmail,
        password: testPassword
      }
    });
    
    expect(registerResponse.ok()).toBeTruthy();

    // トークンを取得
    const tokenResponse = await request.post('/api/test/get-token', {
      data: { email: testEmail }
    });
    
    if (tokenResponse.ok()) {
      const tokenData = await tokenResponse.json();
      verificationToken = tokenData.token;
      console.log('🔑 検証トークン取得:', verificationToken);

      // メール確認ページへ直接アクセス
      await page.goto(`/auth/verify-email?token=${verificationToken}`);
      await page.waitForLoadState('networkidle');

      // 確認成功メッセージの確認
      await expect(page.locator('text=確認完了！')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=メールアドレスの確認が完了しました')).toBeVisible();

      // 自動的にサインインページへリダイレクトされることを確認
      await page.waitForURL('**/auth/signin?verified=true', { timeout: 5000 });
      
      // サインインページに確認完了メッセージが表示されることを確認
      await expect(page.locator('text=メールアドレスが確認されました。ログインしてください。')).toBeVisible();
    }
  });

  test('ログアウト機能の確認', async ({ page, request }) => {
    // 事前にメール確認済みユーザーを作成
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        name: 'Test User',
        email: testEmail,
        password: testPassword
      }
    });
    
    expect(registerResponse.ok()).toBeTruthy();

    // トークンを取得してメール確認
    const tokenResponse = await request.post('/api/test/get-token', {
      data: { email: testEmail }
    });
    
    if (tokenResponse.ok()) {
      const tokenData = await tokenResponse.json();
      verificationToken = tokenData.token;
      await request.get(`/api/auth/verify-email?token=${verificationToken}`);
    }

    // ログイン
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // ログアウトボタンをクリック
    const logoutButton = page.locator('button').filter({ hasText: /ログアウト|Logout|Sign out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // ドロップダウンメニューの場合
      const userMenu = page.locator('[aria-label*="user"], [aria-label*="account"], button:has-text("User")');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.locator('text=/ログアウト|Logout|Sign out/i').click();
      }
    }

    // ログインページへリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    expect(page.url()).toContain('/auth/signin');

    // ダッシュボードにアクセスできないことを確認
    await page.goto('/dashboard');
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    expect(page.url()).toContain('/auth/signin');
  });

  test.afterEach(async ({ request }) => {
    // テスト後のクリーンアップ
    if (testEmail) {
      try {
        await request.post('/api/test/cleanup', {
          data: { email: testEmail }
        });
        console.log('🧹 テストユーザークリーンアップ完了:', testEmail);
      } catch (error) {
        console.error('クリーンアップエラー:', error);
      }
    }
  });
});

test.describe('本番環境 - 認証フロー検証', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromiumのみで実行');
  
  const prodEmail = 'one.photolife+2@gmail.com';
  const prodPassword = '?@thc123THC@?';
  const prodUrl = process.env.PRODUCTION_URL || 'https://my-board-app.vercel.app';

  test('本番環境でログイン・ログアウトフローを確認', async ({ page }) => {
    // 本番環境のURLを使用
    await page.goto(`${prodUrl}/auth/signin`);
    await page.waitForLoadState('networkidle');

    // ログイン
    await page.fill('input[name="email"]', prodEmail);
    await page.fill('input[name="password"]', prodPassword);
    await page.click('button[type="submit"]');

    // ダッシュボードへリダイレクトされることを確認
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');

    // ダッシュボードが表示されることを確認
    await expect(page.locator('h1, h2').filter({ hasText: /ダッシュボード|Dashboard/i })).toBeVisible({ timeout: 10000 });

    // 投稿が表示されることを確認（会員制掲示板の機能確認）
    const posts = page.locator('[data-testid="post-item"], .post-item, article');
    const postCount = await posts.count();
    console.log(`📝 表示されている投稿数: ${postCount}`);

    // ログアウト
    const logoutButton = page.locator('button').filter({ hasText: /ログアウト|Logout|Sign out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // ドロップダウンメニューの場合
      const userMenu = page.locator('[aria-label*="user"], [aria-label*="account"], button:has-text("User")');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.locator('text=/ログアウト|Logout|Sign out/i').click();
      }
    }

    // ログインページへリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    expect(page.url()).toContain('/auth/signin');

    console.log('✅ 本番環境での認証フロー検証完了');
  });

  test('本番環境で未認証時のアクセス制限を確認', async ({ page }) => {
    // 未認証状態でダッシュボードにアクセス
    await page.goto(`${prodUrl}/dashboard`);
    
    // ログインページへリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    expect(page.url()).toContain('/auth/signin');
    
    console.log('✅ 未認証時のアクセス制限確認完了');
  });
});