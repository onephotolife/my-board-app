/**
 * 認証テスト用のフィクスチャ
 */

import { test as base, Page } from '@playwright/test';
import { 
  createTestUser, 
  deleteTestUser, 
  cleanupTestUsers,
  resetRateLimit 
} from '../helpers/db-helper';
import { TEST_USERS } from '../helpers/test-data';

// カスタムフィクスチャの型定義
type AuthFixtures = {
  authenticatedPage: Page;
  testUser: typeof TEST_USERS.existingUser;
  cleanupAfterTest: () => Promise<void>;
};

// カスタムテストフィクスチャ
export const test = base.extend<AuthFixtures>({
  // 認証済みページ
  authenticatedPage: async ({ page }, use) => {
    // 既存ユーザーを作成
    await createTestUser({
      ...TEST_USERS.existingUser,
      emailVerified: true,
    });
    
    // ログインページへ移動
    await page.goto('/auth/signin');
    
    // ログイン実行
    await page.fill('input[name="email"]', TEST_USERS.existingUser.email);
    await page.fill('input[name="password"]', TEST_USERS.existingUser.password);
    await page.click('button[type="submit"]');
    
    // ログイン成功を待つ
    await page.waitForURL('/dashboard', { timeout: 5000 });
    
    // 認証済みページを提供
    await use(page);
    
    // クリーンアップ
    await deleteTestUser(TEST_USERS.existingUser.email);
  },
  
  // テストユーザー
  testUser: async ({}, use) => {
    await use(TEST_USERS.existingUser);
  },
  
  // テスト後のクリーンアップ
  cleanupAfterTest: async ({}, use) => {
    const cleanup = async () => {
      // テストユーザーをすべて削除
      await cleanupTestUsers();
      
      // レート制限をリセット
      await resetRateLimit('127.0.0.1', 'email-resend');
      await resetRateLimit('127.0.0.1', 'login');
      await resetRateLimit('127.0.0.1', 'register');
    };
    
    await use(cleanup);
    
    // テスト後に必ずクリーンアップ
    await cleanup();
  },
});

export { expect } from '@playwright/test';

// ページオブジェクトモデル（POM）
export class AuthPage {
  constructor(private page: Page) {}
  
  // 新規登録ページへ移動
  async gotoSignup() {
    await this.page.goto('/auth/signup');
  }
  
  // ログインページへ移動
  async gotoSignin() {
    await this.page.goto('/auth/signin');
  }
  
  // メール確認ページへ移動
  async gotoVerifyEmail(token: string) {
    await this.page.goto(`/auth/verify?token=${token}`);
  }
  
  // 新規登録フォーム入力
  async fillSignupForm(email: string, password: string, name: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.fill('input[name="confirmPassword"]', password);
    await this.page.fill('input[name="name"]', name);
  }
  
  // ログインフォーム入力
  async fillSigninForm(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
  }
  
  // フォーム送信
  async submitForm() {
    await this.page.click('button[type="submit"]');
  }
  
  // エラーメッセージ取得
  async getErrorMessage(): Promise<string | null> {
    const errorElement = await this.page.$('.error-message, [role="alert"]');
    if (errorElement) {
      return await errorElement.textContent();
    }
    return null;
  }
  
  // 成功メッセージ取得
  async getSuccessMessage(): Promise<string | null> {
    const successElement = await this.page.$('.success-message, .MuiAlert-standardSuccess');
    if (successElement) {
      return await successElement.textContent();
    }
    return null;
  }
  
  // ローディング状態を待つ
  async waitForLoading() {
    await this.page.waitForSelector('.loading, .MuiCircularProgress-root', { 
      state: 'hidden',
      timeout: 10000 
    });
  }
  
  // フィールドエラー取得
  async getFieldError(fieldName: string): Promise<string | null> {
    const errorElement = await this.page.$(`[data-field="${fieldName}"] .error, #${fieldName}-helper-text`);
    if (errorElement) {
      return await errorElement.textContent();
    }
    return null;
  }
}