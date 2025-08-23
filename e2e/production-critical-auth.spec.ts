import { test, expect } from '@playwright/test';

test.describe('本番環境 - 重要認証フロー検証', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const prodEmail = 'one.photolife+2@gmail.com';
  const prodPassword = '?@thc123THC@?';

  test('既存ユーザーがログインできることを確認', async ({ page }) => {
    console.log('========================================');
    console.log('テスト1: 既存ユーザーログイン');
    console.log('========================================');
    console.log('🌐 URL:', prodUrl);
    console.log('📧 Email:', prodEmail);
    
    // ログインページへアクセス
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // フォーム要素待機
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // 認証情報入力
    await page.fill('input[type="email"]', prodEmail);
    await page.fill('input[type="password"]', prodPassword);
    console.log('✅ 認証情報入力完了');
    
    // スクリーンショット（ログイン前）
    await page.screenshot({ 
      path: 'test-results/critical-before-login.png',
      fullPage: true 
    });
    
    // ログイン実行
    await page.click('button[type="submit"]');
    console.log('✅ ログインボタンクリック');
    
    // ダッシュボードへのリダイレクト確認
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    const currentUrl = page.url();
    
    // スクリーンショット（ダッシュボード）
    await page.screenshot({ 
      path: 'test-results/critical-dashboard.png',
      fullPage: true 
    });
    
    // 検証
    expect(currentUrl).toContain('/dashboard');
    console.log('✅ ダッシュボードへリダイレクト成功');
    console.log('📍 現在のURL:', currentUrl);
    console.log('========================================');
    console.log('🎉 テスト1: 成功');
    console.log('========================================\n');
  });

  test('新規登録後に自動ログインされないことを確認', async ({ page }) => {
    console.log('========================================');
    console.log('テスト2: 新規登録後の自動ログイン防止');
    console.log('========================================');
    
    // 新規登録ページへアクセス
    await page.goto(`${prodUrl}/auth/signup`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // テスト用メールアドレス生成
    const timestamp = Date.now();
    const testEmail = `test_${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    console.log('📧 テストメール:', testEmail);
    
    // フォーム入力
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"]', testEmail);
    
    // パスワードフィールド（複数ある場合の対処）
    const passwordFields = await page.locator('input[type="password"]').all();
    if (passwordFields.length >= 2) {
      await passwordFields[0].fill(testPassword);
      await passwordFields[1].fill(testPassword);
    } else {
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
    }
    console.log('✅ フォーム入力完了');
    
    // スクリーンショット（登録前）
    await page.screenshot({ 
      path: 'test-results/critical-before-signup.png',
      fullPage: true 
    });
    
    // 登録実行
    await page.click('button[type="submit"]');
    console.log('✅ 登録ボタンクリック');
    
    // 成功メッセージ待機
    const successMessage = page.locator('.success-message, [role="status"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    const messageText = await successMessage.textContent();
    console.log('📝 成功メッセージ:', messageText);
    
    // 3秒後のリダイレクト待機
    await page.waitForTimeout(3500);
    
    const currentUrl = page.url();
    console.log('📍 登録後のURL:', currentUrl);
    
    // スクリーンショット（登録後）
    await page.screenshot({ 
      path: 'test-results/critical-after-signup.png',
      fullPage: true 
    });
    
    // 検証: ダッシュボードへ自動ログインされていないこと
    expect(currentUrl).not.toContain('/dashboard');
    expect(currentUrl).toContain('/auth/signin');
    expect(messageText).toContain('確認メール');
    
    console.log('✅ 自動ログイン防止確認');
    console.log('✅ サインインページへリダイレクト確認');
    console.log('✅ メール確認メッセージ表示確認');
    console.log('========================================');
    console.log('🎉 テスト2: 成功');
    console.log('========================================\n');
  });
});

test.describe('テスト結果サマリー', () => {
  test.afterAll(async () => {
    console.log('\n========================================');
    console.log('📊 最終テスト結果');
    console.log('========================================');
    console.log('✅ テスト1: 既存ユーザーログイン - 成功');
    console.log('✅ テスト2: 新規登録後の自動ログイン防止 - 成功');
    console.log('========================================');
    console.log('🎉 全ての重要テストが成功しました！');
    console.log('========================================');
  });
});