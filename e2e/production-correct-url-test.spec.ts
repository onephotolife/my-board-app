import { test, expect } from '@playwright/test';

test.describe('本番環境 - https://board.blankbrainai.com 認証フロー検証', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const prodEmail = 'one.photolife+2@gmail.com';
  const prodPassword = '?@thc123THC@?';

  test('本番環境でログインテスト実行', async ({ page }) => {
    console.log(`🌐 本番環境URL: ${prodUrl}`);
    console.log(`📧 ログインメール: ${prodEmail}`);
    console.log(`🕐 テスト開始時刻: ${new Date().toISOString()}`);
    
    // ログインページへ移動
    await page.goto(`${prodUrl}/auth/signin`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ ログインページ読み込み完了');
    
    // スクリーンショット取得（証拠1）
    await page.screenshot({ 
      path: 'test-results/prod-signin-page.png',
      fullPage: true 
    });
    
    // ログインフォーム入力
    await page.fill('input[name="email"]', prodEmail);
    await page.fill('input[name="password"]', prodPassword);
    
    console.log('✅ 認証情報入力完了');
    
    // スクリーンショット取得（証拠2）
    await page.screenshot({ 
      path: 'test-results/prod-before-login.png',
      fullPage: true 
    });
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    console.log('✅ ログインボタンクリック');
    
    // ダッシュボードへのリダイレクト待機
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('✅ ダッシュボードへリダイレクト成功');
      
      const currentUrl = page.url();
      console.log(`📍 現在のURL: ${currentUrl}`);
      
      // スクリーンショット取得（証拠3）
      await page.screenshot({ 
        path: 'test-results/prod-dashboard-success.png',
        fullPage: true 
      });
      
      // ダッシュボードの要素確認
      const dashboardHeader = await page.locator('h1, h2').filter({ hasText: /ダッシュボード|Dashboard/i }).isVisible();
      console.log(`📊 ダッシュボードヘッダー表示: ${dashboardHeader}`);
      
      expect(currentUrl).toContain('/dashboard');
      console.log('✅ ログインテスト成功');
      
    } catch (error) {
      // エラー時のスクリーンショット（証拠4）
      await page.screenshot({ 
        path: 'test-results/prod-login-error.png',
        fullPage: true 
      });
      
      const currentUrl = page.url();
      console.log(`❌ エラー発生。現在のURL: ${currentUrl}`);
      
      // エラーメッセージ取得
      const errorMessages = await page.locator('.error-message, [role="alert"]').allTextContents();
      console.log('⚠️ エラーメッセージ:', errorMessages);
      
      throw error;
    }
  });

  test('新規登録後に自動ログインされないことを確認', async ({ page }) => {
    console.log(`🌐 本番環境URL: ${prodUrl}`);
    
    // 新規登録ページへ移動
    await page.goto(`${prodUrl}/auth/signup`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ 新規登録ページ読み込み完了');
    
    // テスト用メールアドレス生成
    const timestamp = Date.now();
    const testEmail = `test_prod_${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`📧 テストメール: ${testEmail}`);
    
    // 新規登録フォーム入力
    await page.fill('input[name="name"]', 'Production Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // スクリーンショット取得（証拠5）
    await page.screenshot({ 
      path: 'test-results/prod-signup-form.png',
      fullPage: true 
    });
    
    // 登録ボタンクリック
    await page.click('button[type="submit"]');
    console.log('✅ 登録ボタンクリック');
    
    // 成功メッセージまたはリダイレクト待機
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`📍 登録後のURL: ${currentUrl}`);
    
    // スクリーンショット取得（証拠6）
    await page.screenshot({ 
      path: 'test-results/prod-after-signup.png',
      fullPage: true 
    });
    
    // 検証：ダッシュボードへ自動リダイレクトされていない
    if (currentUrl.includes('/dashboard')) {
      console.log('❌ エラー: ダッシュボードへ自動ログインされました');
      throw new Error('新規登録後に自動ログインされています（不正）');
    }
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('✅ サインインページへリダイレクト（正常）');
      
      // メール確認メッセージの確認
      const hasInfoMessage = await page.locator('text=/登録.*完了.*メール/i').isVisible({ timeout: 3000 }).catch(() => false);
      if (hasInfoMessage) {
        console.log('✅ メール確認メッセージ表示確認');
      }
    }
    
    console.log('✅ 新規登録後の自動ログイン防止確認完了');
  });
});