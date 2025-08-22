import { test, expect } from '@playwright/test';

test.describe('認証フロー（メール確認込み）', () => {
  test('新規登録→メール未確認ページ→再ログイン', async ({ page }) => {
    test.setTimeout(60000);
    
    const timestamp = Date.now();
    const testUser = {
      name: `Test User ${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'TestPass123!'
    };

    console.log('🧪 テストユーザー:', testUser.email);

    // 1. サインアップページへ
    await page.goto('http://localhost:3000/auth/signup');
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });
    console.log('✅ サインアップページ表示');

    // 2. フォーム入力
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    console.log('✅ フォーム入力完了');

    // 3. 登録ボタンをクリック
    await page.click('button[type="submit"]');
    console.log('✅ 登録ボタンクリック');

    // 4. メール未確認ページへの遷移を待つ（これが正常な動作）
    await page.waitForURL('**/auth/email-not-verified', { timeout: 15000 });
    console.log('✅ メール未確認ページへ遷移（期待通り）');
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/email-not-verified');
    
    // メール未確認ページの内容を確認
    await expect(page.locator('text=/メール確認が必要です/')).toBeVisible();
    console.log('✅ メール確認メッセージ表示');
    
    // 登録メールアドレスが表示されているか確認
    const emailDisplay = await page.locator(`text=${testUser.email}`).isVisible().catch(() => false);
    if (emailDisplay) {
      console.log('✅ 登録メールアドレス表示確認');
    }
    
    // 5. ログアウトボタンをクリック
    await page.click('button:has-text("ログアウト")');
    console.log('✅ ログアウト実行');
    
    // 6. サインインページへリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    console.log('✅ サインインページへリダイレクト');
    
    // 7. 作成したアカウントでログインを試みる
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    console.log('✅ ログイン試行');
    
    // 8. 再度メール未確認ページへ遷移することを確認（メール未確認のため）
    await page.waitForURL('**/auth/email-not-verified', { timeout: 10000 });
    console.log('✅ メール未確認のためダッシュボードアクセス不可（期待通り）');
    
    // テスト成功
    console.log('✅✅✅ 認証フロー正常動作確認完了');
  });

  test('未ログイン時のダッシュボードアクセス制限', async ({ page }) => {
    // ダッシュボードへ直接アクセス
    await page.goto('http://localhost:3000/dashboard');
    
    // サインインページへリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/signin');
    console.log('✅ 未ログイン時のアクセス制限確認');
  });

  test('プロフィールページのアクセス制限', async ({ page }) => {
    // プロフィールページへ直接アクセス
    await page.goto('http://localhost:3000/profile');
    
    // サインインページへリダイレクトされることを確認
    await page.waitForURL('**/auth/signin', { timeout: 10000 });
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/signin');
    console.log('✅ プロフィールページのアクセス制限確認');
  });
});