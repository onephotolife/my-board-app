/**
 * MongoDB統合 - ユーザー登録E2Eテスト
 * 14人天才会議 - 天才12
 */

import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';

// テスト用の設定
const TEST_USER = {
  email: `playwright-test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Playwright Test User'
};

// MongoDB接続設定
const getMongoUri = () => {
  const mongoEnv = process.env.MONGODB_ENV || 'local';
  
  if (mongoEnv === 'atlas' && process.env.MONGODB_URI_PRODUCTION) {
    console.log('[Test] Using MongoDB Atlas');
    return process.env.MONGODB_URI_PRODUCTION;
  }
  
  console.log('[Test] Using Local MongoDB');
  return process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';
};

test.describe('MongoDB統合 - ユーザー登録フロー', () => {
  let mongoClient: MongoClient;
  let db: any;
  
  test.beforeAll(async () => {
    // MongoDB接続
    const mongoUri = getMongoUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db();
    
    console.log(`[Test] Connected to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);
    
    // 既存のテストユーザーをクリーンアップ
    await db.collection('users').deleteMany({
      email: { $regex: '^playwright-test-' }
    });
  });
  
  test.afterAll(async () => {
    // テストユーザーをクリーンアップ
    if (db) {
      await db.collection('users').deleteMany({
        email: { $regex: '^playwright-test-' }
      });
    }
    
    // MongoDB接続を閉じる
    if (mongoClient) {
      await mongoClient.close();
    }
  });
  
  test('新規ユーザー登録がMongoDBに保存される', async ({ page }) => {
    // 1. 登録ページへ移動
    await page.goto('/auth/signup');
    await expect(page).toHaveURL('/auth/signup');
    
    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('新規登録');
    
    // 2. 登録フォームに入力
    await page.fill('input[name="name"]', TEST_USER.name);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    
    // 3. 登録ボタンをクリック
    await page.click('button[type="submit"]');
    
    // 4. 登録成功の確認（確認メール送信画面へ遷移）
    await page.waitForTimeout(2000); // 処理待ち
    
    // エラーメッセージが表示されていないことを確認
    const errorMessage = page.locator('.alert-error, [role="alert"]');
    const errorCount = await errorMessage.count();
    if (errorCount > 0) {
      const errorText = await errorMessage.first().textContent();
      console.log(`[Test] Error found: ${errorText}`);
    }
    
    // 5. MongoDBでユーザーが作成されたことを確認
    const user = await db.collection('users').findOne({ 
      email: TEST_USER.email 
    });
    
    expect(user).toBeTruthy();
    expect(user.email).toBe(TEST_USER.email);
    expect(user.name).toBe(TEST_USER.name);
    expect(user.emailVerified).toBe(false); // 初期状態は未確認
    expect(user.password).toBeTruthy(); // ハッシュ化されたパスワード
    expect(user.password).not.toBe(TEST_USER.password); // 平文ではない
    
    console.log('[Test] ✅ User created in MongoDB:', {
      id: user._id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    });
  });
  
  test('既存ユーザーでの登録が拒否される', async ({ page }) => {
    // 事前にユーザーを作成
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
    
    await db.collection('users').insertOne({
      email: TEST_USER.email,
      password: hashedPassword,
      name: TEST_USER.name,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 1. 登録ページへ移動
    await page.goto('/auth/signup');
    
    // 2. 同じメールアドレスで登録を試みる
    await page.fill('input[name="name"]', 'Another User');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    
    // 3. 登録ボタンをクリック
    await page.click('button[type="submit"]');
    
    // 4. エラーメッセージが表示されることを確認
    await page.waitForTimeout(2000);
    
    const errorMessage = page.locator('text=/このメールアドレスは既に登録されています|already registered|already exists/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    console.log('[Test] ✅ Duplicate email registration prevented');
  });
  
  test('MongoDBの接続状態を確認', async ({ request }) => {
    // APIエンドポイントを通じて接続状態を確認（オプション）
    // この部分は実際のAPIエンドポイントに応じて調整
    
    // MongoDB直接確認
    const stats = await db.stats();
    
    expect(stats).toBeTruthy();
    expect(stats.db).toBeTruthy();
    expect(stats.collections).toBeGreaterThanOrEqual(0);
    
    console.log('[Test] ✅ MongoDB Stats:', {
      database: stats.db,
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexes: stats.indexes
    });
    
    // ユーザーコレクションの統計
    const userCount = await db.collection('users').countDocuments();
    console.log(`[Test] Total users in database: ${userCount}`);
  });
  
  test('ユーザー登録後のデータ整合性', async ({ page }) => {
    const uniqueEmail = `integrity-test-${Date.now()}@example.com`;
    
    // 1. 新規ユーザー登録
    await page.goto('/auth/signup');
    await page.fill('input[name="name"]', 'Integrity Test');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'IntegrityTest123!');
    await page.fill('input[name="confirmPassword"]', 'IntegrityTest123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // 2. MongoDBでデータを確認
    const user = await db.collection('users').findOne({ email: uniqueEmail });
    
    // 3. 必須フィールドの存在を確認
    expect(user).toBeTruthy();
    expect(user._id).toBeTruthy(); // MongoDB ObjectID
    expect(user.email).toBe(uniqueEmail);
    expect(user.name).toBe('Integrity Test');
    expect(user.password).toBeTruthy();
    expect(user.emailVerified).toBe(false);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
    
    // 4. パスワードがbcryptでハッシュ化されていることを確認
    const bcrypt = require('bcryptjs');
    const isValidHash = await bcrypt.compare('IntegrityTest123!', user.password);
    expect(isValidHash).toBe(true);
    
    console.log('[Test] ✅ Data integrity verified for user:', uniqueEmail);
    
    // クリーンアップ
    await db.collection('users').deleteOne({ email: uniqueEmail });
  });
});

test.describe('MongoDB Atlas接続確認', () => {
  test('MongoDB接続設定の表示', async () => {
    const mongoUri = getMongoUri();
    const isAtlas = mongoUri.includes('mongodb+srv') || mongoUri.includes('mongodb.net');
    
    console.log('[Test] ========================================');
    console.log('[Test] MongoDB Connection Configuration:');
    console.log(`[Test] Type: ${isAtlas ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB'}`);
    console.log(`[Test] URI: ${mongoUri.replace(/\/\/.*@/, '//***@').substring(0, 60)}...`);
    console.log(`[Test] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Test] MONGODB_ENV: ${process.env.MONGODB_ENV || 'not set'}`);
    console.log('[Test] ========================================');
    
    if (!isAtlas) {
      console.log('[Test] 💡 To use MongoDB Atlas:');
      console.log('[Test]    1. Set MONGODB_URI_PRODUCTION in .env.local');
      console.log('[Test]    2. Run with: MONGODB_ENV=atlas npm test');
      console.log('[Test]    3. See MONGODB_ATLAS_SETUP.md for details');
    }
  });
});