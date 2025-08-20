/**
 * メール再送信機能のE2Eテスト
 */

import { test, expect, AuthPage } from '../fixtures/auth.fixture';
import { RATE_LIMIT_CONFIG } from '../helpers/test-data';
import { 
  createTestUser, 
  deleteTestUser,
  setVerificationToken,
  setRateLimit,
  resetRateLimit 
} from '../helpers/db-helper';
import { generateTestEmail } from '../helpers/email-helper';
import crypto from 'crypto';

test.describe('メール再送信機能', () => {
  let authPage: AuthPage;
  let testEmail: string;
  
  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    testEmail = generateTestEmail();
    
    // レート制限をリセット
    await resetRateLimit(testEmail, 'email-resend');
    await resetRateLimit('127.0.0.1', 'email-resend');
  });
  
  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestUser(testEmail);
      await resetRateLimit(testEmail, 'email-resend');
      await resetRateLimit('127.0.0.1', 'email-resend');
    }
  });
  
  test('メール再送信が成功する', async ({ page }) => {
    // 未確認ユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: false,
    });
    
    // 期限切れトークンを設定
    const expiredToken = crypto.randomBytes(32).toString('hex');
    await setVerificationToken(testEmail, expiredToken);
    
    // 期限切れトークンでアクセス
    await authPage.gotoVerifyEmail(expiredToken);
    
    // エラーメッセージと再送信ボタンを確認
    await page.waitForSelector('.error-message, .MuiAlert-standardError');
    
    const resendButton = await page.waitForSelector(
      'button:has-text("再送信"), button[data-action="resend"]',
      { timeout: 5000 }
    );
    
    // 再送信ボタンをクリック
    await resendButton.click();
    
    // メールアドレス入力ダイアログが表示される場合
    const emailInput = await page.$('input[name="resend-email"], input[placeholder*="メール"]');
    if (emailInput) {
      await emailInput.fill(testEmail);
      await page.click('button[type="submit"], button:has-text("送信")');
    }
    
    // 成功メッセージを確認
    await page.waitForSelector('.success-message, .MuiAlert-standardSuccess', {
      timeout: 10000
    });
    
    const successMessage = await page.textContent('.success-message, .MuiAlert-root');
    expect(successMessage).toContain('送信');
  });
  
  test('レート制限が正しく機能する', async ({ page }) => {
    // 未確認ユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: false,
    });
    
    // 再送信ページへ移動（または期限切れページ）
    await page.goto('/auth/verify-email/resend');
    
    // 3回連続で再送信を試みる
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxAttempts + 1; i++) {
      await page.fill('input[name="email"]', testEmail);
      await page.click('button[type="submit"]');
      
      if (i < RATE_LIMIT_CONFIG.maxAttempts) {
        // 最初の3回は成功
        await page.waitForSelector('.success-message, .MuiAlert-standardSuccess', {
          timeout: 5000
        });
        
        // 成功メッセージをクリア（存在する場合）
        const closeButton = await page.$('.MuiAlert-action button');
        if (closeButton) {
          await closeButton.click();
        }
        
        // クールダウン時間を待つ（テスト用に短縮）
        await page.waitForTimeout(1000);
      } else {
        // 4回目はレート制限エラー
        await page.waitForSelector('.error-message, .MuiAlert-standardError', {
          timeout: 5000
        });
        
        const errorMessage = await authPage.getErrorMessage();
        expect(errorMessage).toContain('リクエストが多すぎます');
      }
    }
  });
  
  test('存在しないメールアドレスでも成功メッセージが表示される（情報漏洩防止）', async ({ page }) => {
    const nonExistentEmail = 'nonexistent@example.com';
    
    // 再送信ページへ移動
    await page.goto('/auth/verify-email/resend');
    
    // 存在しないメールアドレスで再送信
    await page.fill('input[name="email"]', nonExistentEmail);
    await page.click('button[type="submit"]');
    
    // 成功メッセージが表示される（セキュリティのため）
    await page.waitForSelector('.success-message, .MuiAlert-standardSuccess', {
      timeout: 10000
    });
    
    const message = await page.textContent('.success-message, .MuiAlert-root');
    expect(message).toContain('送信');
  });
  
  test('既に確認済みのユーザーで適切なメッセージが表示される', async ({ page }) => {
    // 確認済みユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: true, // 既に確認済み
    });
    
    // 再送信ページへ移動
    await page.goto('/auth/verify-email/resend');
    
    // メールアドレスを入力して送信
    await page.fill('input[name="email"]', testEmail);
    await page.click('button[type="submit"]');
    
    // 情報メッセージを確認
    await page.waitForSelector('.info-message, .MuiAlert-standardInfo, .success-message', {
      timeout: 10000
    });
    
    const message = await page.textContent('.MuiAlert-root, .message');
    expect(message).toBeTruthy();
  });
  
  test('クールダウン期間中は再送信ボタンが無効化される', async ({ page }) => {
    // 未確認ユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'Test123!@#',
      name: 'Test User',
      emailVerified: false,
    });
    
    // 再送信ページへ移動
    await page.goto('/auth/verify-email/resend');
    
    // 最初の送信
    await page.fill('input[name="email"]', testEmail);
    await page.click('button[type="submit"]');
    
    // 成功メッセージを待つ
    await page.waitForSelector('.success-message, .MuiAlert-standardSuccess');
    
    // すぐに再送信を試みる
    const submitButton = await page.$('button[type="submit"]');
    
    // ボタンが無効化されているか、カウントダウンが表示されている
    const isDisabled = await submitButton?.isDisabled();
    const buttonText = await submitButton?.textContent();
    
    expect(isDisabled || buttonText?.includes('秒')).toBeTruthy();
    
    // カウントダウンが機能することを確認（5秒待機）
    await page.waitForTimeout(5000);
    
    // カウントダウンのテキストが変化することを確認
    const newButtonText = await submitButton?.textContent();
    expect(newButtonText).not.toBe(buttonText);
  });
  
  test('無効なメールアドレスでエラーが表示される', async ({ page }) => {
    // 再送信ページへ移動
    await page.goto('/auth/verify-email/resend');
    
    // 無効なメールアドレスを入力
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // バリデーションエラーを確認
    const fieldError = await authPage.getFieldError('email');
    expect(fieldError).toContain('メールアドレス');
  });
});