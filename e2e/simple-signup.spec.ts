import { test, expect } from '@playwright/test';

test.describe('シンプルなサインアップテスト', () => {
  test('新規ユーザー登録', async ({ page }) => {
    // タイムアウトを長めに設定
    test.setTimeout(60000);
    
    const timestamp = Date.now();
    const testUser = {
      name: `Test User ${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'TestPass123!'
    };

    console.log('テストユーザー:', testUser.email);

    // 1. サインアップページへ（networkidleを待たない）
    await page.goto('http://localhost:3000/auth/signup');
    console.log('ページ遷移完了');

    // フォームが表示されるまで待つ
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });
    console.log('フォーム表示確認');

    // 2. フォーム入力
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    console.log('フォーム入力完了');

    // 3. 登録ボタンをクリック
    await page.click('button[type="submit"]');
    console.log('登録ボタンクリック');

    // 4. 登録完了を待つ（成功メッセージまたはページ遷移）
    await page.waitForTimeout(5000); // 5秒待機
    
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // 成功メッセージを確認
    const successVisible = await page.locator('text=/登録が完了/').isVisible().catch(() => false);
    if (successVisible) {
      console.log('✅ 登録成功メッセージ表示');
    }
    
    // エラーメッセージを確認
    const errorVisible = await page.locator('[role="alert"]').isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.locator('[role="alert"]').textContent();
      console.log('❌ エラー:', errorText);
    }
    
    // ダッシュボードへの遷移を確認
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ ダッシュボードへ遷移成功');
      expect(currentUrl).toContain('/dashboard');
    } else {
      console.log('⚠️ ダッシュボードへ遷移していません');
      
      // 手動でサインインページへ移動してログイン
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      
      // ダッシュボードへの遷移を待つ
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('✅ 手動ログイン成功');
      
      const finalUrl = page.url();
      expect(finalUrl).toContain('/dashboard');
    }
  });
});