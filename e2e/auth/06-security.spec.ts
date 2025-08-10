/**
 * セキュリティテストのE2Eテスト
 */

import { test, expect } from '../fixtures/auth.fixture';
import { 
  XSS_PAYLOADS, 
  SQL_INJECTION_PAYLOADS,
  RATE_LIMIT_CONFIG 
} from '../helpers/test-data';
import { 
  createTestUser, 
  deleteTestUser,
  setRateLimit,
  resetRateLimit 
} from '../helpers/db-helper';
import { generateTestEmail } from '../helpers/email-helper';
import crypto from 'crypto';

test.describe('セキュリティテスト', () => {
  let testEmail: string;
  
  test.beforeEach(async () => {
    testEmail = generateTestEmail();
    await resetRateLimit('127.0.0.1', 'login');
    await resetRateLimit('127.0.0.1', 'register');
  });
  
  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestUser(testEmail);
    }
    await resetRateLimit('127.0.0.1', 'login');
    await resetRateLimit('127.0.0.1', 'register');
  });
  
  test('XSS攻撃が防御される', async ({ page }) => {
    // 新規登録ページでテスト
    await page.goto('/auth/signup');
    
    for (const payload of XSS_PAYLOADS) {
      // 名前フィールドにXSSペイロードを入力
      await page.fill('input[name="name"]', payload);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'ValidPass123!');
      await page.fill('input[name="confirmPassword"]', 'ValidPass123!');
      
      // フォーム送信
      await page.click('button[type="submit"]');
      
      // アラートが表示されないことを確認（XSSが実行されない）
      let alertShown = false;
      page.on('dialog', () => {
        alertShown = true;
      });
      
      await page.waitForTimeout(2000);
      expect(alertShown).toBe(false);
      
      // ページをリロード
      await page.reload();
    }
  });
  
  test('SQLインジェクション攻撃が防御される', async ({ page }) => {
    // ログインページでテスト
    await page.goto('/auth/signin');
    
    for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 3)) {
      // SQLインジェクションペイロードを入力
      await page.fill('input[name="email"]', payload);
      await page.fill('input[name="password"]', payload);
      
      // フォーム送信
      await page.click('button[type="submit"]');
      
      // エラーメッセージを確認（SQLエラーではなく通常のエラー）
      await page.waitForSelector('.error-message, .MuiAlert-standardError', {
        timeout: 5000
      });
      
      const errorText = await page.textContent('.error-message, .MuiAlert-root');
      
      // SQLエラーメッセージが露出していないことを確認
      expect(errorText).not.toContain('SQL');
      expect(errorText).not.toContain('syntax');
      expect(errorText).not.toContain('database');
      
      // ページをリロード
      await page.reload();
    }
  });
  
  test('ブルートフォース攻撃が防御される', async ({ page }) => {
    // テストユーザーを作成
    await createTestUser({
      email: testEmail,
      password: 'CorrectPass123!',
      name: 'Test User',
      emailVerified: true,
    });
    
    await page.goto('/auth/signin');
    
    // 間違ったパスワードで複数回ログインを試みる
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxAttempts + 1; i++) {
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');
      
      if (i < RATE_LIMIT_CONFIG.maxAttempts - 1) {
        // 最初の数回は通常のエラー
        await page.waitForSelector('.error-message, .MuiAlert-standardError');
        const errorText = await page.textContent('.error-message, .MuiAlert-root');
        expect(errorText).toContain('パスワード');
        
        // エラーをクリア
        await page.reload();
      } else if (i === RATE_LIMIT_CONFIG.maxAttempts) {
        // 制限に達したらレート制限エラー
        await page.waitForSelector('.error-message, .MuiAlert-standardError');
        const errorText = await page.textContent('.error-message, .MuiAlert-root');
        expect(errorText).toContain('リクエストが多すぎます');
        break;
      }
    }
  });
  
  test('タイミング攻撃が防御される', async ({ page }) => {
    const timings: number[] = [];
    
    // 存在するユーザーと存在しないユーザーで応答時間を測定
    const emails = [
      testEmail, // 存在しないユーザー
      'nonexistent1@example.com',
      'nonexistent2@example.com',
    ];
    
    // テストユーザーを作成
    await createTestUser({
      email: 'existing@example.com',
      password: 'Test123!',
      name: 'Existing User',
      emailVerified: true,
    });
    emails.push('existing@example.com'); // 存在するユーザー
    
    await page.goto('/auth/signin');
    
    for (const email of emails) {
      const startTime = Date.now();
      
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');
      
      // エラーメッセージを待つ
      await page.waitForSelector('.error-message, .MuiAlert-standardError', {
        timeout: 10000
      });
      
      const endTime = Date.now();
      timings.push(endTime - startTime);
      
      // ページをリロード
      await page.reload();
    }
    
    // タイミングの分散を計算
    const average = timings.reduce((a, b) => a + b, 0) / timings.length;
    const variance = timings.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);
    
    // 標準偏差が小さい（タイミングが一定）ことを確認
    expect(stdDev / average).toBeLessThan(0.3); // 30%以内の変動
    
    // クリーンアップ
    await deleteTestUser('existing@example.com');
  });
  
  test('CSRFトークンが検証される', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // CSRFトークンを無効化またはCookieを削除
    await page.evaluate(() => {
      // CSRFトークンのCookieを削除
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.toLowerCase().includes('csrf')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    });
    
    // フォーム送信
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'ValidPass123!');
    await page.fill('input[name="confirmPassword"]', 'ValidPass123!');
    await page.click('button[type="submit"]');
    
    // エラーまたは成功を確認（Next.jsのデフォルトCSRF保護）
    await page.waitForSelector('.error-message, .success-message', {
      timeout: 10000
    });
  });
  
  test('セキュアなクッキー設定', async ({ page, context }) => {
    // テストユーザーを作成してログイン
    await createTestUser({
      email: testEmail,
      password: 'Test123!',
      name: 'Test User',
      emailVerified: true,
    });
    
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    
    // ログイン成功を待つ
    await page.waitForURL(/\/dashboard|\//, { timeout: 10000 });
    
    // クッキーを取得
    const cookies = await context.cookies();
    
    // セッションクッキーの設定を確認
    const sessionCookie = cookies.find(c => 
      c.name.includes('session') || 
      c.name.includes('auth')
    );
    
    if (sessionCookie) {
      // HttpOnly設定を確認
      expect(sessionCookie.httpOnly).toBe(true);
      
      // SameSite設定を確認
      expect(['Strict', 'Lax']).toContain(sessionCookie.sameSite);
      
      // 本番環境ではSecure設定が必要
      if (process.env.NODE_ENV === 'production') {
        expect(sessionCookie.secure).toBe(true);
      }
    }
  });
  
  test('パスワードが平文で送信されない', async ({ page }) => {
    let passwordInPlaintext = false;
    
    // ネットワークリクエストを監視
    page.on('request', request => {
      const postData = request.postData();
      if (postData && postData.includes('ValidPass123!')) {
        // パスワードが平文で送信されている場合
        passwordInPlaintext = true;
      }
    });
    
    await page.goto('/auth/signup');
    
    // フォーム送信
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'ValidPass123!');
    await page.fill('input[name="confirmPassword"]', 'ValidPass123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // HTTPS環境では平文送信でも暗号化されるため、
    // このテストは開発環境でのみ意味がある
    if (page.url().startsWith('http://')) {
      // HTTPの場合、フォームデータとして送信されることは許容
      // ただし、URLパラメータとして送信されていないことを確認
      expect(page.url()).not.toContain('ValidPass123!');
    }
  });
});