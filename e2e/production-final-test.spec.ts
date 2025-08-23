import { test, expect } from '@playwright/test';

test.describe('本番環境 - 認証フロー最終検証', () => {
  const prodEmail = 'one.photolife+2@gmail.com';
  const prodPassword = '?@thc123THC@?';
  
  // 複数の本番URLパターンを試行
  const productionUrls = [
    'https://my-board-app.vercel.app',
    'https://my-board-app-git-main.vercel.app',
    'https://my-board-app-onephotolife.vercel.app',
    'https://my-board-app-git-main-onephotolife.vercel.app'
  ];

  test('本番環境URL探索とログインテスト', async ({ page }) => {
    let validUrl = null;
    
    // 有効なURLを探索
    for (const url of productionUrls) {
      console.log(`🔍 試行中: ${url}`);
      try {
        await page.goto(`${url}/auth/signin`, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        
        // ページタイトルまたはフォーム要素で確認
        const hasLoginForm = await page.locator('input[name="email"]').isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasLoginForm) {
          validUrl = url;
          console.log(`✅ 有効なURL発見: ${url}`);
          break;
        }
      } catch (error) {
        console.log(`❌ 接続失敗: ${url}`);
      }
    }
    
    if (!validUrl) {
      throw new Error('本番環境のURLが見つかりません');
    }
    
    // ログインテスト実行
    console.log(`📧 ログイン試行: ${prodEmail}`);
    
    await page.fill('input[name="email"]', prodEmail);
    await page.fill('input[name="password"]', prodPassword);
    
    // スクリーンショット（証拠）
    await page.screenshot({ 
      path: 'test-results/production-login-before.png',
      fullPage: true 
    });
    
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクト確認
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('✅ ダッシュボードへリダイレクト成功');
      
      // ダッシュボードのスクリーンショット（証拠）
      await page.screenshot({ 
        path: 'test-results/production-dashboard.png',
        fullPage: true 
      });
      
      const currentUrl = page.url();
      console.log(`📍 現在のURL: ${currentUrl}`);
      expect(currentUrl).toContain('/dashboard');
      
    } catch (error) {
      // エラー時のスクリーンショット
      await page.screenshot({ 
        path: 'test-results/production-login-error.png',
        fullPage: true 
      });
      
      const currentUrl = page.url();
      console.log(`❌ リダイレクト失敗。現在のURL: ${currentUrl}`);
      
      // エラーメッセージの取得
      const errorMessages = await page.locator('.error-message, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('⚠️ エラーメッセージ:', errorMessages);
      }
      
      throw error;
    }
  });

  test('新規登録後の自動ログイン防止確認', async ({ page }) => {
    let validUrl = null;
    
    // 有効なURLを探索
    for (const url of productionUrls) {
      try {
        await page.goto(`${url}/auth/signup`, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        const hasSignupForm = await page.locator('input[name="email"]').isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasSignupForm) {
          validUrl = url;
          console.log(`✅ 新規登録ページ確認: ${url}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!validUrl) {
      console.log('⚠️ 新規登録ページが見つかりません。スキップ');
      test.skip();
      return;
    }
    
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
    
    // スクリーンショット（証拠）
    await page.screenshot({ 
      path: 'test-results/production-signup-form.png',
      fullPage: true 
    });
    
    // 登録実行
    await page.click('button[type="submit"]');
    
    // 成功メッセージまたはリダイレクト待機
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`📍 登録後のURL: ${currentUrl}`);
    
    // スクリーンショット（証拠）
    await page.screenshot({ 
      path: 'test-results/production-after-signup.png',
      fullPage: true 
    });
    
    // ダッシュボードへ自動リダイレクトされていないことを確認
    expect(currentUrl).not.toContain('/dashboard');
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('✅ サインインページへリダイレクト（正常）');
      
      // メール確認メッセージの確認
      const infoMessage = await page.locator('[style*="dbeafe"], .MuiAlert-standardInfo, text=/登録.*メール/i').isVisible().catch(() => false);
      if (infoMessage) {
        console.log('✅ メール確認メッセージ表示確認');
      }
    }
  });
});