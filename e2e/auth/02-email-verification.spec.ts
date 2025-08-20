/**
 * メール確認フローのE2Eテスト
 */

import { test, expect, AuthPage } from '../fixtures/auth.fixture';
import { TEST_TOKENS } from '../helpers/test-data';
import { 
  createTestUser, 
  deleteTestUser, 
  setVerificationToken,
  findUser 
} from '../helpers/db-helper';
import { generateTestEmail } from '../helpers/email-helper';
import crypto from 'crypto';

test.describe('メール確認フロー', () => {
  let authPage: AuthPage;
  let testEmail: string;
  let validToken: string;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    testEmail = generateTestEmail();
    validToken = crypto.randomBytes(32).toString('hex');
  });
  
  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestUser(testEmail);
    }
  });
  
  test('有効なトークンでメール確認が成功する', async ({ page }) => {
    // テストユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: false,
    });
    
    // 有効なトークンを設定
    await setVerificationToken(testEmail, validToken);
    
    // メール確認ページへアクセス
    await authPage.gotoVerifyEmail(validToken);
    
    // 成功メッセージを確認
    await page.waitForSelector('.success-message, .MuiAlert-standardSuccess', {
      timeout: 10000
    });
    
    const successMessage = await authPage.getSuccessMessage();
    expect(successMessage).toContain('確認が完了');
    
    // データベースで確認状態をチェック
    const user = await findUser(testEmail);
    expect(user.emailVerified).toBe(true);
    expect(user.emailVerificationToken).toBeUndefined();
  });
  
  test('無効なトークンでエラーが表示される', async ({ page }) => {
    // 無効なトークンでアクセス
    await authPage.gotoVerifyEmail('invalid-token-12345');
    
    // エラーメッセージを確認
    await page.waitForSelector('.error-message, .MuiAlert-standardError', {
      timeout: 10000
    });
    
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('無効なトークン');
  });
  
  test('期限切れトークンで適切なエラーが表示される', async ({ page }) => {
    // テストユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: false,
    });
    
    // 期限切れトークンを設定（過去の日時）
    const expiredToken = crypto.randomBytes(32).toString('hex');
    await setVerificationToken(testEmail, expiredToken);
    
    // MongoDBで直接有効期限を過去に設定
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://yamagishi:password123@cluster0.1gofz.mongodb.net/board-app?retryWrites=true&w=majority&appName=Cluster0');
    
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      email: String,
      emailVerificationTokenExpiry: Date,
    }));
    
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 25); // 25時間前
    
    await User.updateOne(
      { email: testEmail },
      { emailVerificationTokenExpiry: pastDate }
    );
    
    // 期限切れトークンでアクセス
    await authPage.gotoVerifyEmail(expiredToken);
    
    // エラーメッセージを確認
    await page.waitForSelector('.error-message, .MuiAlert-standardError', {
      timeout: 10000
    });
    
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('期限切れ');
    
    // 再送信ボタンが表示されることを確認
    const resendButton = await page.$('button:has-text("再送信"), [data-action="resend"]');
    expect(resendButton).toBeTruthy();
  });
  
  test('既に確認済みのユーザーで適切なメッセージが表示される', async ({ page }) => {
    // 確認済みユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: true, // 既に確認済み
    });
    
    // トークンを設定（通常は存在しないが、テスト用）
    await setVerificationToken(testEmail, validToken);
    
    // メール確認ページへアクセス
    await authPage.gotoVerifyEmail(validToken);
    
    // 情報メッセージを確認
    await page.waitForSelector('.info-message, .MuiAlert-standardInfo', {
      timeout: 10000
    });
    
    const message = await page.textContent('.info-message, .MuiAlert-root');
    expect(message).toContain('既に確認済み');
  });
  
  test('トークンなしでアクセスするとエラーが表示される', async ({ page }) => {
    // トークンなしでアクセス
    await page.goto('/auth/verify');
    
    // エラーメッセージを確認
    await page.waitForSelector('.error-message, .MuiAlert-standardError', {
      timeout: 10000
    });
    
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('トークン');
  });
  
  test('確認後にログインページへのリンクが表示される', async ({ page }) => {
    // テストユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: false,
    });
    
    // 有効なトークンを設定
    await setVerificationToken(testEmail, validToken);
    
    // メール確認実行
    await authPage.gotoVerifyEmail(validToken);
    
    // 成功を待つ
    await page.waitForSelector('.success-message, .MuiAlert-standardSuccess', {
      timeout: 10000
    });
    
    // ログインリンクを確認
    const loginLink = await page.$('a[href*="/auth/signin"], a:has-text("ログイン")');
    expect(loginLink).toBeTruthy();
    
    // リンクをクリック
    if (loginLink) {
      await loginLink.click();
      await page.waitForURL(/\/auth\/signin/);
      expect(page.url()).toContain('/auth/signin');
    }
  });
  
  test('メール確認の進行状況表示', async ({ page }) => {
    // テストユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: false,
    });
    
    await setVerificationToken(testEmail, validToken);
    
    // メール確認ページへアクセス
    await page.goto(`/auth/verify?token=${validToken}`, {
      waitUntil: 'domcontentloaded'
    });
    
    // ローディング表示を確認
    const loadingIndicator = await page.$('.loading, .MuiCircularProgress-root');
    expect(loadingIndicator).toBeTruthy();
    
    // 処理完了を待つ
    await page.waitForSelector('.success-message, .error-message', {
      timeout: 10000
    });
    
    // ローディング表示が消えることを確認
    await expect(page.locator('.loading, .MuiCircularProgress-root')).toBeHidden();
  });
});