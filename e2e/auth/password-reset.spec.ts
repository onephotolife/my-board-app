import { test, expect, Page, BrowserContext } from '@playwright/test';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import PasswordReset from '@/models/PasswordReset';
import crypto from 'crypto';

// テストユーザー情報
const TEST_USER = {
  email: 'reset-test@example.com',
  password: 'OldPassword123!',
  newPassword: 'NewPassword456!',
  name: 'Reset Test User'
};

// テストセットアップ：ユーザーとリセットトークンの作成
async function setupTestUser() {
  await dbConnect();
  
  // 既存ユーザーを削除
  await User.deleteOne({ email: TEST_USER.email });
  await PasswordReset.deleteMany({ email: TEST_USER.email });
  
  // テストユーザーを作成（メール未確認）
  const user = await User.create({
    email: TEST_USER.email,
    password: TEST_USER.password,
    name: TEST_USER.name,
    emailVerified: false, // メール未確認として作成
    role: 'user'
  });
  
  // パスワードリセットトークンを生成
  const token = crypto.randomBytes(32).toString('hex');
  await PasswordReset.create({
    email: TEST_USER.email,
    token: token,
    expiresAt: new Date(Date.now() + 3600000), // 1時間後
    used: false
  });
  
  return { user, token };
}

// テストクリーンアップ
async function cleanupTestData() {
  await dbConnect();
  await User.deleteOne({ email: TEST_USER.email });
  await PasswordReset.deleteMany({ email: TEST_USER.email });
}

test.describe('パスワードリセット機能のE2Eテスト', () => {
  let context: BrowserContext;
  let page: Page;
  let resetToken: string;
  
  test.beforeAll(async () => {
    const setup = await setupTestUser();
    resetToken = setup.token;
  });
  
  test.afterAll(async () => {
    await cleanupTestData();
  });
  
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });
  
  test.afterEach(async () => {
    await context.close();
  });
  
  test('パスワードリセット完了後、新しいパスワードでログインできる', async () => {
    console.log('🔐 パスワードリセットE2Eテスト開始');
    
    // Step 1: パスワードリセットページにアクセス
    console.log(`📍 リセットページアクセス: /auth/reset-password/${resetToken}`);
    await page.goto(`/auth/reset-password/${resetToken}`);
    
    // パスワードリセットフォームが表示されることを確認
    await expect(page.locator('h1')).toContainText('パスワードリセット');
    
    // Step 2: 新しいパスワードを入力
    console.log('✏️ 新しいパスワード入力');
    await page.fill('input[name="password"]', TEST_USER.newPassword);
    await page.fill('input[name="confirmPassword"]', TEST_USER.newPassword);
    
    // Step 3: リセットボタンをクリック
    console.log('🔄 パスワードリセット実行');
    await page.click('button[type="submit"]');
    
    // 成功メッセージを待つ
    await expect(page.locator('text=パスワードが正常にリセットされました')).toBeVisible({ timeout: 10000 });
    
    // Step 4: ログインページにリダイレクトされることを確認
    await page.waitForURL('**/auth/signin**', { timeout: 5000 });
    console.log('✅ ログインページにリダイレクト完了');
    
    // Step 5: 新しいパスワードでログイン
    console.log('🔑 新しいパスワードでログイン試行');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.newPassword);
    await page.click('button[type="submit"]');
    
    // Step 6: ログイン成功を確認（email-not-verifiedページではなくダッシュボードへ）
    console.log('📊 ログイン後のナビゲーション確認');
    
    // エラーがないことを確認
    const errorElement = page.locator('text=メールアドレスまたはパスワードが正しくありません');
    await expect(errorElement).not.toBeVisible();
    
    // URLを確認（email-not-verifiedではないこと）
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
    
    console.log('✅ パスワードリセット後のログイン成功！');
  });
  
  test('古いパスワードではログインできないことを確認', async () => {
    console.log('🔒 古いパスワードでのログイン拒否テスト');
    
    // ログインページにアクセス
    await page.goto('/auth/signin');
    
    // 古いパスワードでログイン試行
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password); // 古いパスワード
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されることを確認
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません')
    ).toBeVisible({ timeout: 5000 });
    
    console.log('✅ 古いパスワードでのログインが適切に拒否されました');
  });
  
  test('リセット済みトークンの再利用防止', async () => {
    console.log('🔐 使用済みトークンの再利用防止テスト');
    
    // 同じトークンで再度リセットページにアクセス
    await page.goto(`/auth/reset-password/${resetToken}`);
    
    // エラーメッセージが表示されることを確認
    const errorText = await page.locator('text=このリセットリンクは既に使用されています').or(
      page.locator('text=無効なパスワードリセットリンクです')
    );
    
    await expect(errorText).toBeVisible({ timeout: 10000 });
    
    console.log('✅ 使用済みトークンの再利用が適切に防止されました');
  });
});

test.describe('メール確認済みフラグの検証', () => {
  test('パスワードリセット後、emailVerifiedがtrueに設定される', async ({ page }) => {
    console.log('📧 emailVerifiedフラグ検証テスト開始');
    
    // テストユーザーのセットアップ
    await dbConnect();
    const testEmail = 'verify-test@example.com';
    
    // 既存データクリーンアップ
    await User.deleteOne({ email: testEmail });
    await PasswordReset.deleteMany({ email: testEmail });
    
    // メール未確認ユーザーを作成
    const user = await User.create({
      email: testEmail,
      password: 'InitialPass123!',
      name: 'Verify Test User',
      emailVerified: false, // 明示的にfalse
      role: 'user'
    });
    
    console.log(`作成前のemailVerified: ${user.emailVerified}`);
    expect(user.emailVerified).toBe(false);
    
    // リセットトークン生成
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({
      email: testEmail,
      token: token,
      expiresAt: new Date(Date.now() + 3600000),
      used: false
    });
    
    // パスワードリセット実行
    await page.goto(`/auth/reset-password/${token}`);
    await page.fill('input[name="password"]', 'NewSecurePass456!');
    await page.fill('input[name="confirmPassword"]', 'NewSecurePass456!');
    await page.click('button[type="submit"]');
    
    // 成功を待つ
    await expect(page.locator('text=パスワードが正常にリセットされました')).toBeVisible({ timeout: 10000 });
    
    // データベースから更新後のユーザーを取得
    const updatedUser = await User.findOne({ email: testEmail });
    console.log(`更新後のemailVerified: ${updatedUser?.emailVerified}`);
    
    // emailVerifiedがtrueになっていることを確認
    expect(updatedUser?.emailVerified).toBe(true);
    
    // クリーンアップ
    await User.deleteOne({ email: testEmail });
    await PasswordReset.deleteMany({ email: testEmail });
    
    console.log('✅ emailVerifiedフラグが正しくtrueに設定されました');
  });
});