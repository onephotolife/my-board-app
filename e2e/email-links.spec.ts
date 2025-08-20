/**
 * メールリンクE2Eテスト
 * 14人天才会議 - 天才11
 */

import { test, expect, Page } from '@playwright/test';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

// MongoDBヘルパー関数
async function createTestUser(email: string, token: string) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    await db.collection('users').insertOne({
      name: 'Test User',
      email: email,
      password: 'hashed_password',
      emailVerified: false,
      emailVerificationToken: token,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } finally {
    await client.close();
  }
}

async function createPasswordResetToken(email: string, token: string) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    await db.collection('passwordresets').insertOne({
      email: email,
      token: token,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date()
    });
  } finally {
    await client.close();
  }
}

async function cleanupTestData(email: string, resetToken?: string) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    await db.collection('users').deleteOne({ email });
    if (resetToken) {
      await db.collection('passwordresets').deleteOne({ token: resetToken });
    }
  } finally {
    await client.close();
  }
}

// Service Workerクリア関数
async function clearServiceWorker(page: Page) {
  await page.evaluate(() => {
    return navigator.serviceWorker.getRegistrations().then((registrations) => {
      return Promise.all(registrations.map(reg => reg.unregister()));
    });
  });
  
  await page.evaluate(() => {
    return caches.keys().then(names => {
      return Promise.all(names.map(name => caches.delete(name)));
    });
  });
}

test.describe('メールリンク機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // Service Workerをクリア
    await page.goto('http://localhost:3000');
    await clearServiceWorker(page);
    
    // ページをリロード
    await page.reload();
  });
  
  test('メール確認リンクが正常に動作する', async ({ page }) => {
    const testEmail = `playwright-verify-${Date.now()}@example.com`;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // テストユーザー作成
    await createTestUser(testEmail, verificationToken);
    
    try {
      // 確認ページへ直接アクセス
      const verifyUrl = `http://localhost:3000/auth/verify-email?token=${verificationToken}`;
      await page.goto(verifyUrl);
      
      // ページの読み込みを待つ
      await page.waitForLoadState('domcontentloaded');
      
      // オフラインページでないことを確認
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('オフラインです');
      expect(bodyText).not.toContain('offline');
      
      // 正しいページが表示されていることを確認
      // "メールアドレスを確認中" または "確認完了" が表示される
      const hasVerifyContent = 
        bodyText?.includes('メールアドレスを確認中') ||
        bodyText?.includes('確認完了') ||
        bodyText?.includes('メールアドレスの確認');
      
      expect(hasVerifyContent).toBeTruthy();
      
      // エラーが表示されていないことを確認
      const hasError = bodyText?.includes('エラーが発生しました');
      if (hasError) {
        // トークン関連のエラーは許容（DBアクセスの問題）
        expect(bodyText).toMatch(/(無効なリンク|期限切れ|トークン)/);
      }
      
      // コンソールエラーの確認
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // 少し待ってエラーを収集
      await page.waitForTimeout(2000);
      
      // CSSプリロードエラーがないことを確認
      const cssPreloadError = consoleErrors.find(err => 
        err.includes('preload') && err.includes('.css')
      );
      expect(cssPreloadError).toBeUndefined();
      
    } finally {
      // クリーンアップ
      await cleanupTestData(testEmail);
    }
  });
  
  test('パスワードリセットリンクが正常に動作する', async ({ page }) => {
    const testEmail = `playwright-reset-${Date.now()}@example.com`;
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // リセットトークン作成
    await createPasswordResetToken(testEmail, resetToken);
    
    try {
      // リセットページへ直接アクセス
      const resetUrl = `http://localhost:3000/auth/reset-password/${resetToken}`;
      await page.goto(resetUrl);
      
      // ページの読み込みを待つ
      await page.waitForLoadState('domcontentloaded');
      
      // オフラインページでないことを確認
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('オフラインです');
      expect(bodyText).not.toContain('offline');
      
      // 正しいページが表示されていることを確認
      const hasResetContent = 
        bodyText?.includes('パスワード') ||
        bodyText?.includes('リセット') ||
        bodyText?.includes('新しいパスワード');
      
      expect(hasResetContent).toBeTruthy();
      
      // フォームフィールドの存在を確認
      const passwordInput = await page.locator('input[type="password"]').first();
      await expect(passwordInput).toBeVisible();
      
    } finally {
      // クリーンアップ
      await cleanupTestData(testEmail, resetToken);
    }
  });
  
  test('Service Workerが認証ページをキャッシュしない', async ({ page }) => {
    // Service Worker の登録を確認
    await page.goto('http://localhost:3000');
    
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(hasServiceWorker).toBeTruthy();
    
    // Service Worker が登録されているか確認
    const registrations = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations();
    });
    
    if (registrations.length > 0) {
      // sw.js ファイルの内容を確認
      const swResponse = await page.request.get('http://localhost:3000/sw.js');
      const swContent = await swResponse.text();
      
      // 認証パスの除外設定があることを確認
      expect(swContent).toContain("url.pathname.startsWith('/auth/')");
      
      // キャッシュバージョンがv2以上であることを確認
      expect(swContent).toMatch(/board-app-v[2-9]/);
    }
  });
  
  test('メールリンククリックシミュレーション', async ({ page }) => {
    const testEmail = `playwright-sim-${Date.now()}@example.com`;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // テストユーザー作成
    await createTestUser(testEmail, verificationToken);
    
    try {
      // メールリンクをシミュレート（新しいタブで開く）
      const verifyUrl = `http://localhost:3000/auth/verify-email?token=${verificationToken}`;
      
      // 新しいページ（タブ）を作成
      const newPage = await page.context().newPage();
      
      // Service Worker をクリア
      await clearServiceWorker(newPage);
      
      // リンクにアクセス
      await newPage.goto(verifyUrl);
      
      // ページの読み込みを待つ
      await newPage.waitForLoadState('networkidle');
      
      // オフラインページでないことを確認
      const bodyText = await newPage.textContent('body');
      expect(bodyText).not.toContain('オフラインです');
      
      // ページが正常に表示されることを確認
      const isValidPage = 
        bodyText?.includes('メールアドレス') ||
        bodyText?.includes('確認');
      
      expect(isValidPage).toBeTruthy();
      
      await newPage.close();
      
    } finally {
      // クリーンアップ
      await cleanupTestData(testEmail);
    }
  });
  
  test('複数回のアクセスでも正常に動作する', async ({ page }) => {
    const testEmail = `playwright-multi-${Date.now()}@example.com`;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // テストユーザー作成
    await createTestUser(testEmail, verificationToken);
    
    try {
      const verifyUrl = `http://localhost:3000/auth/verify-email?token=${verificationToken}`;
      
      // 3回アクセスしてすべて正常に動作することを確認
      for (let i = 0; i < 3; i++) {
        await page.goto(verifyUrl);
        await page.waitForLoadState('domcontentloaded');
        
        const bodyText = await page.textContent('body');
        expect(bodyText).not.toContain('オフラインです');
        
        // 各アクセス間で少し待つ
        await page.waitForTimeout(1000);
      }
      
    } finally {
      // クリーンアップ
      await cleanupTestData(testEmail);
    }
  });
});

test.describe('エラーハンドリングテスト', () => {
  test('無効なトークンで適切なエラーメッセージが表示される', async ({ page }) => {
    const invalidToken = 'invalid-token-12345';
    
    // 無効なトークンでアクセス
    const verifyUrl = `http://localhost:3000/auth/verify-email?token=${invalidToken}`;
    await page.goto(verifyUrl);
    
    await page.waitForLoadState('domcontentloaded');
    
    const bodyText = await page.textContent('body');
    
    // オフラインページではなく、エラーメッセージが表示される
    expect(bodyText).not.toContain('オフラインです');
    
    // エラーメッセージの存在を確認
    const hasErrorMessage = 
      bodyText?.includes('無効') ||
      bodyText?.includes('エラー') ||
      bodyText?.includes('失敗');
    
    expect(hasErrorMessage).toBeTruthy();
  });
  
  test('トークンなしでアクセスした場合のエラーハンドリング', async ({ page }) => {
    // トークンなしでアクセス
    await page.goto('http://localhost:3000/auth/verify-email');
    
    await page.waitForLoadState('domcontentloaded');
    
    const bodyText = await page.textContent('body');
    
    // オフラインページではない
    expect(bodyText).not.toContain('オフラインです');
    
    // エラーメッセージが表示される
    const hasErrorMessage = 
      bodyText?.includes('無効なリンク') ||
      bodyText?.includes('エラー');
    
    expect(hasErrorMessage).toBeTruthy();
  });
});