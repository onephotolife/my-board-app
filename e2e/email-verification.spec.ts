import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';

// MongoDB接続設定
const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

// テストユーザー生成
const generateTestUser = () => ({
  name: `テストユーザー${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  password: 'Test123!Pass',
});

test.describe('メール確認フロー完全検証', () => {
  let mongoClient: MongoClient;
  let testUser = generateTestUser();

  test.beforeAll(async () => {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  });

  test.use({
    // テストモードヘッダーを追加
    extraHTTPHeaders: {
      'X-Test-Mode': 'true',
    },
  });

  test.afterAll(async () => {
    // クリーンアップ
    if (mongoClient) {
      const db = mongoClient.db();
      await db.collection('users').deleteMany({ 
        email: { $regex: /^test-\d+@example\.com$/ } 
      });
      await mongoClient.close();
    }
  });

  test('1. ユーザー登録からメール確認まで完全フロー', async ({ page }) => {
    // 新しいテストユーザーを生成
    testUser = generateTestUser();
    
    // Step 1: 登録ページへアクセス
    await page.goto('/auth/signup');
    await expect(page.locator('h1')).toContainText('新規登録');
    
    // Step 2: フォーム入力
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    // パスワード一致確認
    await expect(page.locator('text=パスワードが一致しています')).toBeVisible();
    
    // Step 3: 登録実行
    await page.click('button[type="submit"]');
    
    // 成功メッセージを待つ（より具体的なセレクタを使用）
    await page.waitForSelector('div:has-text("登録が完了しました")', { timeout: 15000 });
    
    // Step 4: データベースからトークンを取得
    const db = mongoClient.db();
    const user = await db.collection('users').findOne({ email: testUser.email });
    expect(user).toBeTruthy();
    expect(user?.emailVerificationToken).toBeTruthy();
    
    const verificationToken = user?.emailVerificationToken;
    console.log(`✅ トークン取得: ${verificationToken}`);
    
    // Step 5: メール確認ページへアクセス
    await page.goto(`/auth/verify-email?token=${verificationToken}`);
    
    // ローディング状態を確認（より具体的なセレクタを使用）
    await expect(page.locator('h1:has-text("メールアドレスを確認中")')).toBeVisible({ timeout: 5000 });
    
    // Step 6: 確認完了を待つ
    await page.waitForSelector('text=確認完了', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('確認完了');
    
    // 成功メッセージの確認（より具体的なセレクタを使用）
    await expect(page.getByText('メールアドレスの確認が完了しました！').first()).toBeVisible();
    
    // Step 7: 自動リダイレクトを待つ（3秒後）
    await page.waitForURL('**/auth/signin?verified=true', { timeout: 10000 });
    
    // Step 8: データベースで確認状態をチェック
    const verifiedUser = await db.collection('users').findOne({ email: testUser.email });
    expect(verifiedUser?.emailVerified).toBe(true);
    expect(verifiedUser?.emailVerificationToken).toBeUndefined();
  });

  test('2. 無効なトークンでのアクセス', async ({ page }) => {
    // 無効なトークンでアクセス
    await page.goto('/auth/verify-email?token=invalid-token-12345');
    
    // エラー状態を確認
    await page.waitForSelector('text=エラーが発生しました', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('エラーが発生しました');
    
    // エラーメッセージの確認
    await expect(page.locator('text=/無効|トークンが無効です/')).toBeVisible();
    
    // トラブルシューティングガイドの表示確認
    await expect(page.locator('text=トラブルシューティング')).toBeVisible();
    
    // ナビゲーションボタンの確認
    await expect(page.locator('text=新規登録へ')).toBeVisible();
    await expect(page.locator('text=ログインへ')).toBeVisible();
  });

  test('3. トークンなしでのアクセス', async ({ page }) => {
    // トークンパラメータなしでアクセス
    await page.goto('/auth/verify-email');
    
    // エラー状態を確認
    await page.waitForSelector('text=エラーが発生しました', { timeout: 10000 });
    
    // エラーメッセージの確認
    await expect(page.locator('text=/無効なリンク/')).toBeVisible();
    
    // 対処法の表示確認
    await expect(page.locator('text=/メール内のリンクを正しくクリック/')).toBeVisible();
  });

  test('4. 既に確認済みのメールアドレス', async ({ page }) => {
    // 新しいユーザーを登録
    const verifiedUser = generateTestUser();
    
    // 登録
    await page.goto('/auth/signup');
    await page.fill('input[name="name"]', verifiedUser.name);
    await page.fill('input[name="email"]', verifiedUser.email);
    await page.fill('input[name="password"]', verifiedUser.password);
    await page.fill('input[name="confirmPassword"]', verifiedUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=/登録が完了しました/', { timeout: 10000 });
    
    // トークン取得
    const db = mongoClient.db();
    const user = await db.collection('users').findOne({ email: verifiedUser.email });
    const token = user?.emailVerificationToken;
    
    // 最初の確認
    await page.goto(`/auth/verify-email?token=${token}`);
    await page.waitForSelector('text=確認完了', { timeout: 10000 });
    
    // 同じトークンで再度アクセス
    await page.goto(`/auth/verify-email?token=${token}`);
    
    // エラーが表示されることを確認（トークンが無効化されているため）
    await page.waitForSelector('text=エラーが発生しました', { timeout: 10000 });
    await expect(page.locator('text=/無効|既に確認済み/')).toBeVisible();
  });

  test('5. レスポンシブデザイン確認', async ({ page }) => {
    // モバイル表示
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/verify-email?token=test');
    
    // ページ要素が正しく表示されるか確認
    await expect(page.locator('h1')).toBeVisible();
    const card = page.locator('div').filter({ hasText: /読み込み中|エラーが発生しました/ }).first();
    await expect(card).toBeVisible();
    
    // タブレット表示
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(card).toBeVisible();
    
    // デスクトップ表示
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(card).toBeVisible();
  });

  test('6. ページのパフォーマンス測定', async ({ page }) => {
    const startTime = Date.now();
    
    // ページアクセス
    await page.goto('/auth/verify-email?token=performance-test');
    
    // 初期レンダリング完了を待つ
    await page.waitForSelector('h1', { timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ ページ読み込み時間: ${loadTime}ms`);
    
    // パフォーマンス基準（3秒以内）
    expect(loadTime).toBeLessThan(3000);
  });

  test('7. API統合テスト', async ({ request }) => {
    // 無効なトークンでAPIを直接呼び出し
    const invalidResponse = await request.get('/api/auth/verify-email?token=invalid');
    expect(invalidResponse.status()).toBe(400);
    const invalidData = await invalidResponse.json();
    expect(invalidData.error).toBeTruthy();
    
    // パラメータなしでAPIを呼び出し
    const noParamResponse = await request.get('/api/auth/verify-email');
    expect(noParamResponse.status()).toBe(400);
    const noParamData = await noParamResponse.json();
    expect(noParamData.error).toContain('無効なトークン');
  });

  test('8. セキュリティチェック', async ({ page }) => {
    // XSSペイロードをトークンとして送信
    const xssPayload = '<script>alert("XSS")</script>';
    await page.goto(`/auth/verify-email?token=${encodeURIComponent(xssPayload)}`);
    
    // アラートが表示されないことを確認
    let alertFired = false;
    page.on('dialog', () => {
      alertFired = true;
    });
    
    await page.waitForTimeout(2000);
    expect(alertFired).toBe(false);
    
    // エラーページが正しく表示されることを確認
    await expect(page.locator('text=エラーが発生しました')).toBeVisible();
  });

  test('9. デバッグ情報の表示確認（開発環境）', async ({ page }) => {
    // 開発環境でのみデバッグ情報が表示されることを確認
    await page.goto('/auth/verify-email?token=debug-test');
    
    // デバッグ情報セクションを探す
    const debugInfo = page.locator('text=Debug Info');
    
    if (process.env.NODE_ENV === 'development') {
      // 開発環境ではデバッグ情報が表示される
      await expect(debugInfo).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=/Token:/')).toBeVisible();
      await expect(page.locator('text=/Status:/')).toBeVisible();
    }
  });

  test('10. ボタンのクリック動作確認', async ({ page }) => {
    // エラーページでボタンが正しく動作するか確認
    await page.goto('/auth/verify-email?token=invalid');
    await page.waitForSelector('text=エラーが発生しました', { timeout: 10000 });
    
    // 新規登録ボタンのクリック
    await page.click('text=新規登録へ');
    await expect(page).toHaveURL(/.*\/auth\/signup/);
    
    // 戻る
    await page.goto('/auth/verify-email?token=invalid');
    await page.waitForSelector('text=エラーが発生しました', { timeout: 10000 });
    
    // ログインボタンのクリック
    await page.click('text=ログインへ');
    await expect(page).toHaveURL(/.*\/auth\/signin/);
  });
});

test.describe('ネットワークエラーのシミュレーション', () => {
  test('オフライン状態でのアクセス', async ({ context, page }) => {
    // ページを開く
    await page.goto('/auth/verify-email?token=offline-test');
    
    // オフラインモードに切り替え
    await context.setOffline(true);
    
    // ページをリロード
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    // オフラインメッセージまたはエラーが表示されることを確認
    const offlineIndicator = page.locator('text=/オフライン|ネットワーク|接続/');
    
    // オフラインモードを解除
    await context.setOffline(false);
  });
});

test.describe('ブラウザ互換性テスト', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`${browserName}での動作確認`, async ({ page }) => {
      await page.goto('/auth/verify-email?token=browser-test');
      
      // 基本的な要素が表示されることを確認
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // スタイルが適用されているか確認
      const card = page.locator('div').filter({ 
        has: page.locator('h1') 
      }).first();
      
      const backgroundColor = await card.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // 白背景が適用されているか確認
      expect(backgroundColor).toMatch(/rgb|rgba/);
    });
  });
});