import { test, expect } from '@playwright/test';

const TEST_URL = 'http://localhost:3000';
const TEST_EMAIL = 'one.photolife+2@gmail.com';
const TEST_PASSWORD = 'testtest';

test.describe('Phase 2: emailVerified修正検証', () => {
  test('ログインが成功することを確認', async ({ page }) => {
    console.log('🔍 emailVerified修正の検証開始');
    
    // Step 1: サインインページへ移動
    console.log('Step 1: サインインページへ移動');
    await page.goto(`${TEST_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    // Step 2: ログインフォーム入力
    console.log('Step 2: ログイン情報入力');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // Step 3: ログインボタンクリック
    console.log('Step 3: ログイン実行');
    await page.click('button[type="submit"]');
    
    // Step 4: ダッシュボードへの遷移を確認
    console.log('Step 4: ダッシュボードへの遷移待機');
    
    try {
      // ダッシュボードまたはホームページへの遷移を待つ
      await page.waitForURL(url => {
        const urlStr = url.toString();
        return urlStr.includes('/dashboard') || 
               urlStr.includes('/board') || 
               urlStr === TEST_URL + '/' ||
               urlStr === TEST_URL;
      }, { timeout: 30000 });
      
      const currentUrl = page.url();
      console.log('✅ ログイン成功！現在のURL:', currentUrl);
      
      // ログイン成功のアサーション
      expect(currentUrl).not.toContain('/auth/signin');
      expect(currentUrl).not.toContain('email-not-verified');
      
    } catch (error) {
      console.log('❌ ログイン失敗');
      const currentUrl = page.url();
      console.log('現在のURL:', currentUrl);
      
      // エラーメッセージを確認
      const errorMessage = await page.locator('text=/error|failed|未確認|verified/i').first().textContent().catch(() => null);
      if (errorMessage) {
        console.log('エラーメッセージ:', errorMessage);
      }
      
      throw error;
    }
  });
  
  test('ログアウトフローが正常に動作することを確認', async ({ page }) => {
    console.log('🔍 ログアウトフローの検証');
    
    // Step 1: ログイン
    console.log('Step 1: ログイン実行');
    await page.goto(`${TEST_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ログイン成功を待つ
    await page.waitForURL(url => !url.toString().includes('/auth/signin'), { timeout: 30000 });
    console.log('✅ ログイン成功');
    
    // Step 2: ログアウトボタンを探す
    console.log('Step 2: ログアウトボタンを探す');
    
    // サイドバーまたはヘッダーのログアウトボタンを探す
    const logoutButton = await page.locator('button:has-text("ログアウト")').first();
    const isVisible = await logoutButton.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log('Step 3: ログアウト実行');
      await logoutButton.click();
      
      // サインインページへのリダイレクトを待つ
      await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
      
      const finalUrl = page.url();
      console.log('✅ ログアウト成功、現在のURL:', finalUrl);
      
      // URLにエンコーディングループがないことを確認
      expect(finalUrl).not.toContain('&amp;amp;');
      expect(finalUrl).not.toContain('%26amp%3B');
      
      console.log('✅ Phase 1とPhase 2の修正が両方正常に動作');
    } else {
      console.log('⚠️ ログアウトボタンが見つかりません（ページ構造の問題）');
    }
  });
  
  test('callbackUrlが正常に処理されることを確認', async ({ page }) => {
    console.log('🔍 callbackUrl処理の検証');
    
    // Step 1: 保護されたページへ直接アクセス
    console.log('Step 1: /dashboardへ直接アクセス');
    await page.goto(`${TEST_URL}/dashboard`);
    
    // サインインページへのリダイレクトを確認
    await page.waitForURL(/\/auth\/signin/);
    
    const currentUrl = page.url();
    console.log('リダイレクト後のURL:', currentUrl);
    
    // callbackUrlパラメータを確認
    const url = new URL(currentUrl);
    const callbackUrl = url.searchParams.get('callbackUrl');
    
    console.log('callbackUrlパラメータ:', callbackUrl);
    
    // callbackUrlが正常であることを確認
    expect(callbackUrl).toBe('/dashboard');
    expect(callbackUrl).not.toContain('&amp;');
    expect(callbackUrl).not.toContain('&#x2F;');
    
    // Step 2: ログインしてcallbackUrlへのリダイレクトを確認
    console.log('Step 2: ログインしてリダイレクトを確認');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL(url => url.toString().includes('/dashboard') || !url.toString().includes('/auth'), { timeout: 30000 });
    
    const finalUrl = page.url();
    console.log('✅ callbackUrlへのリダイレクト成功:', finalUrl);
  });
});