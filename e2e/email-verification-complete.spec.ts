import { test, expect } from '@playwright/test';

test.describe('本番環境 - メール確認必須フロー完全検証', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  
  test('メール未確認ユーザーのログイン拒否とダッシュボードアクセス制限', async ({ page }) => {
    console.log('========================================');
    console.log('📊 テスト開始: メール確認必須フロー');
    console.log('========================================');
    
    // Step 1: 新規登録
    const timestamp = Date.now();
    const testEmail = `verify_test_${timestamp}@example.com`;
    const testPassword = 'SecurePassword123!';
    
    console.log('Step 1️⃣: 新規登録');
    console.log(`📧 テストメール: ${testEmail}`);
    
    await page.goto(`${prodUrl}/auth/signup`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // 登録フォーム入力
    await page.fill('input[name="name"]', 'Verify Test User');
    await page.fill('input[type="email"]', testEmail);
    
    const passwordFields = await page.locator('input[type="password"]').all();
    if (passwordFields.length >= 2) {
      await passwordFields[0].fill(testPassword);
      await passwordFields[1].fill(testPassword);
    }
    
    // 登録実行
    await page.click('button[type="submit"]');
    
    // 成功メッセージ待機
    const successMessage = page.locator('.success-message, [role="status"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ 登録成功');
    
    // サインインページへリダイレクト待機
    await page.waitForTimeout(3500);
    
    // Step 2: メール確認前のログイン試行
    console.log('\nStep 2️⃣: メール確認前のログイン試行');
    
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // ログイン前のスクリーンショット
    await page.screenshot({ 
      path: 'test-results/verify-before-login.png',
      fullPage: true 
    });
    
    await page.click('button[type="submit"]');
    
    // ログイン結果を待機
    await page.waitForTimeout(5000);
    
    const afterLoginUrl = page.url();
    console.log(`📍 ログイン試行後のURL: ${afterLoginUrl}`);
    
    // ログイン後のスクリーンショット
    await page.screenshot({ 
      path: 'test-results/verify-after-login.png',
      fullPage: true 
    });
    
    // 検証1: ダッシュボードへアクセスできないこと
    if (afterLoginUrl.includes('/dashboard')) {
      throw new Error('❌ 重大なセキュリティ問題: メール未確認でログイン成功');
    }
    
    // 検証2: エラーパラメータ確認
    expect(afterLoginUrl).toContain('error=CredentialsSignin');
    console.log('✅ ログイン拒否確認');
    
    // Step 3: ダッシュボードへの直接アクセス試行
    console.log('\nStep 3️⃣: ダッシュボードへの直接アクセス試行');
    
    await page.goto(`${prodUrl}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    
    const dashboardUrl = page.url();
    console.log(`📍 ダッシュボード直接アクセス後のURL: ${dashboardUrl}`);
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'test-results/verify-dashboard-direct.png',
      fullPage: true 
    });
    
    // 検証3: ダッシュボードアクセス制限
    expect(dashboardUrl).not.toContain('/dashboard');
    expect(dashboardUrl).toContain('/auth/signin');
    console.log('✅ ダッシュボードアクセス制限確認');
    
    // Step 4: セッション確認（APIエンドポイントテスト）
    console.log('\nStep 4️⃣: セッション確認');
    
    const sessionResponse = await page.request.get(`${prodUrl}/api/auth/session`);
    const sessionData = await sessionResponse.json();
    
    console.log('📊 セッション状態:', sessionData);
    
    if (sessionData.user) {
      throw new Error('❌ セッションが存在します（不正）');
    }
    
    console.log('✅ セッションが存在しないことを確認');
    
    // 最終結果
    console.log('\n========================================');
    console.log('🎉 すべての検証に合格');
    console.log('✅ メール未確認ユーザーのログイン拒否: 正常');
    console.log('✅ ダッシュボードアクセス制限: 正常');
    console.log('✅ セッション未作成: 正常');
    console.log('========================================');
  });
  
  test('既存のメール確認済みユーザーのログイン成功', async ({ page }) => {
    const existingEmail = 'one.photolife+2@gmail.com';
    const existingPassword = '?@thc123THC@?';
    
    console.log('========================================');
    console.log('📊 テスト: メール確認済みユーザーログイン');
    console.log('========================================');
    
    await page.goto(`${prodUrl}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', existingEmail);
    await page.fill('input[type="password"]', existingPassword);
    
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクト待機
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard');
    
    console.log('✅ メール確認済みユーザーのログイン成功');
    console.log(`📍 現在のURL: ${currentUrl}`);
    
    // セッション確認
    const sessionResponse = await page.request.get(`${prodUrl}/api/auth/session`);
    const sessionData = await sessionResponse.json();
    
    console.log('📊 セッション確認:', {
      hasUser: !!sessionData.user,
      email: sessionData.user?.email
    });
    
    expect(sessionData.user).toBeDefined();
    expect(sessionData.user.email).toBe(existingEmail);
    
    console.log('========================================');
    console.log('🎉 メール確認済みユーザーログイン検証完了');
    console.log('========================================');
  });
});