// E2Eテストスクリプト - Playwright用
// 会員制掲示板の主要機能をEnd-to-Endでテスト

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
};

test.describe('会員制掲示板 E2Eテスト', () => {
  
  test.describe('認証フロー', () => {
    
    test('ユーザー登録フロー', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // フォーム入力
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.fill('input[name="name"]', TEST_USER.name);
      
      // パスワード強度チェック
      const strengthIndicator = await page.locator('.password-strength');
      await expect(strengthIndicator).toContainText('強');
      
      // 利用規約同意
      await page.check('input[name="terms"]');
      
      // 登録実行
      await page.click('button[type="submit"]');
      
      // 成功メッセージ確認
      await expect(page.locator('.success-message')).toContainText('登録完了');
    });
    
    test('ログインフロー', async ({ page }) => {
      await page.goto(`${BASE_URL}/signin`);
      
      // 認証情報入力
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      
      // ログイン実行
      await page.click('button[type="submit"]');
      
      // ダッシュボードへのリダイレクト確認
      await page.waitForURL(`${BASE_URL}/dashboard`);
      
      // セッション確認
      const userMenu = await page.locator('.user-menu');
      await expect(userMenu).toBeVisible();
    });
    
    test('ログアウトフロー', async ({ page }) => {
      // ログイン状態から開始
      await loginUser(page, TEST_USER);
      
      // ユーザーメニューを開く
      await page.click('.user-menu');
      
      // ログアウト実行
      await page.click('button[data-testid="logout"]');
      
      // ホームページへのリダイレクト確認
      await page.waitForURL(BASE_URL);
      
      // セッション破棄確認
      await expect(page.locator('.user-menu')).not.toBeVisible();
    });
  });
  
  test.describe('投稿機能', () => {
    
    test.beforeEach(async ({ page }) => {
      await loginUser(page, TEST_USER);
    });
    
    test('新規投稿作成', async ({ page }) => {
      await page.goto(`${BASE_URL}/posts/new`);
      
      // 投稿内容入力
      const title = `テスト投稿 ${Date.now()}`;
      await page.fill('input[name="title"]', title);
      await page.fill('textarea[name="content"]', 'これはテスト投稿の本文です。');
      
      // タグ追加
      await page.fill('input[name="tags"]', 'テスト');
      await page.keyboard.press('Enter');
      
      // 投稿実行
      await page.click('button[type="submit"]');
      
      // 投稿一覧での表示確認
      await page.waitForURL(`${BASE_URL}/posts`);
      await expect(page.locator(`text="${title}"`)).toBeVisible();
    });
    
    test('投稿編集', async ({ page }) => {
      // 既存投稿の編集ページへ
      await page.goto(`${BASE_URL}/posts`);
      await page.click('.post-item:first-child .edit-button');
      
      // 内容変更
      await page.fill('textarea[name="content"]', '編集されたコンテンツ');
      
      // 更新実行
      await page.click('button[data-testid="update-post"]');
      
      // 成功メッセージ確認
      await expect(page.locator('.toast')).toContainText('更新しました');
    });
    
    test('投稿削除', async ({ page }) => {
      await page.goto(`${BASE_URL}/posts`);
      
      // 削除ボタンクリック
      await page.click('.post-item:first-child .delete-button');
      
      // 確認ダイアログ
      await page.click('button[data-testid="confirm-delete"]');
      
      // 削除完了確認
      await expect(page.locator('.toast')).toContainText('削除しました');
    });
  });
  
  test.describe('セキュリティテスト', () => {
    
    test('XSS攻撃防御', async ({ page }) => {
      await loginUser(page, TEST_USER);
      await page.goto(`${BASE_URL}/posts/new`);
      
      // XSSペイロード投稿
      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('input[name="title"]', xssPayload);
      await page.fill('textarea[name="content"]', xssPayload);
      await page.click('button[type="submit"]');
      
      // スクリプトが実行されないことを確認
      await page.goto(`${BASE_URL}/posts`);
      const content = await page.locator('.post-content').first().innerHTML();
      expect(content).not.toContain('<script>');
    });
    
    test('認証なしでのAPI拒否', async ({ page }) => {
      const response = await page.request.get(`${BASE_URL}/api/posts`);
      expect(response.status()).toBe(401);
    });
    
    test('他ユーザー投稿の編集拒否', async ({ page }) => {
      await loginUser(page, TEST_USER);
      
      // 他ユーザーの投稿IDを使用
      const response = await page.request.put(`${BASE_URL}/api/posts/other-user-post-id`, {
        data: { content: 'Unauthorized edit' }
      });
      
      expect(response.status()).toBe(403);
    });
  });
  
  test.describe('パフォーマンステスト', () => {
    
    test('ページロード時間測定', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // 3秒以内
    });
    
    test('API応答時間測定', async ({ page }) => {
      const startTime = Date.now();
      await page.request.get(`${BASE_URL}/api/health`);
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(500); // 500ms以内
    });
  });
  
  test.describe('レスポンシブデザイン', () => {
    
    test('モバイル表示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      
      // ハンバーガーメニュー表示確認
      await expect(page.locator('.mobile-menu-button')).toBeVisible();
      
      // コンテンツの横スクロールなし確認
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(375);
    });
    
    test('タブレット表示', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      
      // レイアウト確認
      await expect(page.locator('.container')).toBeVisible();
    });
  });
});

// ヘルパー関数
async function loginUser(page, user) {
  await page.goto(`${BASE_URL}/signin`);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}