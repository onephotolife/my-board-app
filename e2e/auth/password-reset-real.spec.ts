import { test, expect, Page, BrowserContext } from '@playwright/test';

// テストユーザー情報
const TEST_USER = {
  email: 'pw-reset-test@example.com', 
  originalPassword: 'Original123!',
  newPassword: 'NewSecure456!',
  name: 'PW Reset Test User'
};

test.describe('パスワードリセット実装テスト', () => {
  let context: BrowserContext;
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });
  
  test.afterEach(async () => {
    await context.close();
  });

  test('実際のパスワードリセットフロー', async () => {
    console.log('🔐 パスワードリセット実装テスト開始');
    
    // Step 1: ユーザー登録（メール確認をスキップ）
    console.log('📝 テストユーザー登録');
    await page.goto('/auth/signup');
    
    await page.fill('input[name="name"]', TEST_USER.name);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.originalPassword);
    await page.fill('input[name="confirmPassword"]', TEST_USER.originalPassword);
    
    await page.click('button[type="submit"]');
    
    // 登録成功またはメール確認ページを待つ
    await page.waitForURL('**/auth/**', { timeout: 10000 });
    console.log('✅ ユーザー登録完了');
    
    // Step 2: パスワードリセットリクエスト
    console.log('📧 パスワードリセットリクエスト送信');
    await page.goto('/auth/signin');
    await page.click('a[href="/auth/reset-password"]'); // "パスワードを忘れた方"リンク
    
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.click('button[type="submit"]');
    
    // 成功メッセージを待つ
    await expect(page.locator('text=パスワードリセットメールを送信しました')).toBeVisible({ timeout: 10000 });
    console.log('✅ リセットメール送信完了');
    
    // Step 3: リセットトークンを取得（開発環境のAPIから）
    console.log('🔑 リセットトークン取得');
    const tokenResponse = await page.evaluate(async (email) => {
      // 開発用エンドポイントから最新のトークンを取得
      const response = await fetch('/api/auth/get-latest-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        throw new Error('Failed to get reset token');
      }
      return await response.json();
    }, TEST_USER.email);
    
    if (!tokenResponse.token) {
      throw new Error('Reset token not found');
    }
    
    const resetToken = tokenResponse.token;
    console.log(`✅ トークン取得: ${resetToken.substring(0, 10)}...`);
    
    // Step 4: リセットページにアクセス
    console.log('🔄 パスワードリセットページアクセス');
    await page.goto(`/auth/reset-password/${resetToken}`);
    
    // フォームが表示されることを確認
    await expect(page.locator('h1')).toContainText('新しいパスワード');
    
    // Step 5: 新しいパスワードを設定
    console.log('✏️ 新しいパスワード入力');
    await page.fill('input[name="password"]', TEST_USER.newPassword);
    await page.fill('input[name="confirmPassword"]', TEST_USER.newPassword);
    
    await page.click('button[type="submit"]');
    
    // 成功メッセージを待つ
    await expect(page.locator('text=パスワードリセット完了')).toBeVisible({ timeout: 10000 });
    console.log('✅ パスワードリセット成功');
    
    // Step 6: 新しいパスワードでログイン
    console.log('🔑 新しいパスワードでログイン');
    await page.click('a[href="/auth/signin"]'); // ログインページへのリンク
    
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.newPassword);
    await page.click('button[type="submit"]');
    
    // ログイン成功を確認（email-not-verifiedページではない）
    await page.waitForURL('**', { timeout: 10000 });
    const currentUrl = page.url();
    console.log(`現在のURL: ${currentUrl}`);
    
    // email-not-verifiedページに遷移していないことを確認  
    expect(currentUrl).not.toContain('/auth/email-not-verified');
    
    // ダッシュボードまたはホームページに遷移していることを確認
    expect(
      currentUrl.endsWith('/dashboard') || 
      currentUrl.endsWith('/posts') || 
      currentUrl.endsWith('/')
    ).toBeTruthy();
    
    console.log('✅ 新しいパスワードでのログイン成功！');
  });

  test('古いパスワードでログインできないことを確認', async () => {
    console.log('🔒 古いパスワード無効化テスト');
    
    await page.goto('/auth/signin');
    
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.originalPassword);
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されることを確認
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません')
    ).toBeVisible({ timeout: 5000 });
    
    console.log('✅ 古いパスワードが無効化されています');
  });
});

// 開発用のトークン取得エンドポイントも作成する必要があります
test.describe('開発用APIエンドポイント', () => {
  test.skip('開発用トークン取得API実装', async () => {
    // このテストは実行しない - 実装の参考として記載
    /*
    // src/app/api/auth/get-latest-reset-token/route.ts に以下を実装：
    
    export async function POST(request: NextRequest) {
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
      }
      
      const { email } = await request.json();
      await dbConnect();
      
      const passwordReset = await PasswordReset.findOne({
        email,
        used: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });
      
      if (!passwordReset) {
        return NextResponse.json({ error: 'No valid reset token found' }, { status: 404 });
      }
      
      return NextResponse.json({ token: passwordReset.token });
    }
    */
  });
});