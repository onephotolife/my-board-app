import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

test.describe('メール確認セキュリティテスト', () => {
  let mongoClient: MongoClient;
  let db: any;

  test.beforeAll(async () => {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db();
  });

  test.afterAll(async () => {
    // クリーンアップ
    if (mongoClient) {
      await mongoClient.close();
    }
  });

  test('メール未確認ユーザーはログインできない', async ({ page }) => {
    // テストユーザー作成
    const testEmail = `playwright-unverified-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    await db.collection('users').insertOne({
      email: testEmail,
      password: hashedPassword,
      name: 'Playwright Test User',
      emailVerified: false, // メール未確認
      createdAt: new Date(),
      updatedAt: new Date()
    });

    try {
      // ログインページへ移動
      await page.goto('http://localhost:3000/auth/signin');
      
      // ログインフォームに入力
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      
      // ログインボタンをクリック
      await page.click('button[type="submit"]');
      
      // エラーメッセージまたはリダイレクトを確認
      await page.waitForURL('**/auth/signin**', { timeout: 5000 });
      
      // URLにエラーパラメータが含まれることを確認
      const url = page.url();
      expect(url).toContain('error=CredentialsSignin');
      
      // ダッシュボードにアクセスできないことを確認
      await page.goto('http://localhost:3000/board');
      await page.waitForURL('**/auth/signin**', { timeout: 5000 });
      
      console.log('✅ メール未確認ユーザーのログイン拒否: 成功');
    } finally {
      // クリーンアップ
      await db.collection('users').deleteOne({ email: testEmail });
    }
  });

  test('メール確認済みユーザーはログインできる', async ({ page }) => {
    // テストユーザー作成
    const testEmail = `playwright-verified-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    await db.collection('users').insertOne({
      email: testEmail,
      password: hashedPassword,
      name: 'Playwright Verified User',
      emailVerified: true, // メール確認済み
      createdAt: new Date(),
      updatedAt: new Date()
    });

    try {
      // ログインページへ移動
      await page.goto('http://localhost:3000/auth/signin');
      
      // ログインフォームに入力
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      
      // ログインボタンをクリック
      await page.click('button[type="submit"]');
      
      // ログイン成功後のリダイレクトを確認
      await page.waitForURL('http://localhost:3000/**', { 
        timeout: 5000,
        waitUntil: 'networkidle' 
      });
      
      // エラーがないことを確認
      const url = page.url();
      expect(url).not.toContain('error=');
      
      console.log('✅ メール確認済みユーザーのログイン: 成功');
    } finally {
      // クリーンアップ
      await db.collection('users').deleteOne({ email: testEmail });
    }
  });

  test('完全な登録フロー', async ({ page }) => {
    const testEmail = `playwright-flow-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Playwright Flow Test';

    try {
      // 1. 新規登録
      await page.goto('http://localhost:3000/auth/signup');
      
      await page.fill('input[name="name"]', testName);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      
      await page.click('button[type="submit"]');
      
      // 登録成功メッセージを確認
      await page.waitForSelector('text=/確認メール|登録が完了/i', { timeout: 5000 });
      
      // 2. メール確認前のログイン試行
      await page.goto('http://localhost:3000/auth/signin');
      
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      
      await page.click('button[type="submit"]');
      
      // ログイン失敗を確認
      await page.waitForURL('**/auth/signin**', { timeout: 5000 });
      const url1 = page.url();
      expect(url1).toContain('error=CredentialsSignin');
      
      // 3. メール確認処理（データベースで直接確認）
      const user = await db.collection('users').findOne({ email: testEmail });
      if (user && user.emailVerificationToken) {
        await page.goto(`http://localhost:3000/auth/verify-email?token=${user.emailVerificationToken}`);
        
        // 確認成功メッセージを確認
        await page.waitForSelector('text=/確認が完了|verified/i', { timeout: 5000 });
      }
      
      // 4. メール確認後のログイン試行
      await page.goto('http://localhost:3000/auth/signin');
      
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      
      await page.click('button[type="submit"]');
      
      // ログイン成功を確認
      await page.waitForURL('http://localhost:3000/**', { 
        timeout: 5000,
        waitUntil: 'networkidle' 
      });
      
      const url2 = page.url();
      expect(url2).not.toContain('error=');
      expect(url2).not.toContain('/auth/signin');
      
      console.log('✅ 完全な登録フロー: 成功');
    } finally {
      // クリーンアップ
      await db.collection('users').deleteOne({ email: testEmail });
    }
  });
});