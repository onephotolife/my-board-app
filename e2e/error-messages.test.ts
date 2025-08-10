/**
 * エラーメッセージPlaywrightテスト
 * 14人天才会議 - 天才13
 */

import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

// テストユーザー情報
const TEST_USERS = {
  unverified: {
    email: 'test-unverified@example.com',
    password: 'TestPassword123!',
    name: 'Unverified User',
    emailVerified: false
  },
  verified: {
    email: 'test-verified@example.com',
    password: 'TestPassword123!',
    name: 'Verified User',
    emailVerified: true
  }
};

test.describe('認証エラーメッセージテスト', () => {
  let mongoClient: MongoClient;
  
  test.beforeAll(async () => {
    // MongoDB接続とテストユーザー作成
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // 既存のテストユーザーを削除
    await db.collection('users').deleteMany({
      email: { $in: [TEST_USERS.unverified.email, TEST_USERS.verified.email] }
    });
    
    // テストユーザーを作成
    for (const [key, user] of Object.entries(TEST_USERS)) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.collection('users').insertOne({
        email: user.email,
        password: hashedPassword,
        name: user.name,
        emailVerified: user.emailVerified,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });
  
  test.afterAll(async () => {
    // クリーンアップ
    if (mongoClient) {
      const db = mongoClient.db();
      await db.collection('users').deleteMany({
        email: { $in: [TEST_USERS.unverified.email, TEST_USERS.verified.email] }
      });
      await mongoClient.close();
    }
  });
  
  test('メール未確認ユーザーのログイン試行', async ({ page }) => {
    // サインインページに移動
    await page.goto('http://localhost:3000/auth/signin');
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', TEST_USERS.unverified.email);
    await page.fill('input[type="password"]', TEST_USERS.unverified.password);
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されるまで待機
    await page.waitForTimeout(1000);
    
    // エラーメッセージの確認
    const errorTitle = page.locator('text=メールアドレスの確認が必要です');
    await expect(errorTitle).toBeVisible();
    
    const errorMessage = page.locator('text=アカウントを有効化するため');
    await expect(errorMessage).toBeVisible();
    
    const errorAction = page.locator('text=迷惑メールフォルダ');
    await expect(errorAction).toBeVisible();
  });
  
  test('存在しないユーザーのログイン試行', async ({ page }) => {
    // サインインページに移動
    await page.goto('http://localhost:3000/auth/signin');
    
    // ログインフォームに入力（存在しないユーザー）
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'SomePassword123!');
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されるまで待機
    await page.waitForTimeout(1000);
    
    // エラーメッセージの確認
    const errorTitle = page.locator('text=ログインできませんでした');
    await expect(errorTitle).toBeVisible();
    
    const errorMessage = page.locator('text=メールアドレスまたはパスワードが正しくありません');
    await expect(errorMessage).toBeVisible();
  });
  
  test('間違ったパスワードでのログイン試行', async ({ page }) => {
    // サインインページに移動
    await page.goto('http://localhost:3000/auth/signin');
    
    // ログインフォームに入力（間違ったパスワード）
    await page.fill('input[type="email"]', TEST_USERS.verified.email);
    await page.fill('input[type="password"]', 'WrongPassword123!');
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されるまで待機
    await page.waitForTimeout(1000);
    
    // エラーメッセージの確認
    const errorTitle = page.locator('text=ログインできませんでした');
    await expect(errorTitle).toBeVisible();
    
    const errorMessage = page.locator('text=メールアドレスまたはパスワードが正しくありません');
    await expect(errorMessage).toBeVisible();
  });
  
  test('メール確認済みユーザーの正常ログイン', async ({ page }) => {
    // サインインページに移動
    await page.goto('http://localhost:3000/auth/signin');
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', TEST_USERS.verified.email);
    await page.fill('input[type="password"]', TEST_USERS.verified.password);
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // ボード画面への遷移を待機
    await page.waitForURL('**/board', { timeout: 5000 });
    
    // ボード画面に遷移したことを確認
    expect(page.url()).toContain('/board');
  });
  
  test('URLパラメータでのエラー表示（EmailNotVerified）', async ({ page }) => {
    // エラーパラメータ付きでサインインページに移動
    await page.goto('http://localhost:3000/auth/signin?error=EmailNotVerified');
    
    // エラーメッセージが表示されることを確認
    const errorTitle = page.locator('text=メールアドレスの確認が必要です');
    await expect(errorTitle).toBeVisible();
    
    const errorMessage = page.locator('text=アカウントを有効化するため');
    await expect(errorMessage).toBeVisible();
  });
  
  test('URLパラメータでのエラー表示（CredentialsSignin）', async ({ page }) => {
    // エラーパラメータ付きでサインインページに移動
    await page.goto('http://localhost:3000/auth/signin?error=CredentialsSignin');
    
    // エラーメッセージが表示されることを確認
    const errorTitle = page.locator('text=ログインできませんでした');
    await expect(errorTitle).toBeVisible();
    
    const errorMessage = page.locator('text=メールアドレスまたはパスワードが正しくありません');
    await expect(errorMessage).toBeVisible();
  });
});