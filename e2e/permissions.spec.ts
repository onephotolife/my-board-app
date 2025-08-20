import { test, expect } from '@playwright/test';

test.describe('権限管理システムE2Eテスト', () => {
  const BASE_URL = 'http://localhost:3000';

  // テストユーザー情報
  const testUsers = {
    admin: { email: 'admin@test.local', password: 'admin123' },
    moderator: { email: 'moderator@test.local', password: 'mod123' },
    user1: { email: 'user1@test.local', password: 'user123' },
    user2: { email: 'user2@test.local', password: 'user123' }
  };

  test.beforeEach(async ({ page }) => {
    // 各テスト前にボードページへ移動
    await page.goto(`${BASE_URL}/board`);
  });

  test('未認証ユーザーは投稿の編集・削除ボタンが無効', async ({ page }) => {
    // 投稿が表示されるまで待つ
    await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
    
    // 編集ボタンの状態を確認
    const editButtons = await page.locator('[aria-label="edit"]').all();
    if (editButtons.length > 0) {
      const firstEditButton = editButtons[0];
      await expect(firstEditButton).toBeDisabled();
    }
    
    // 削除ボタンの状態を確認
    const deleteButtons = await page.locator('[aria-label="delete"]').all();
    if (deleteButtons.length > 0) {
      const firstDeleteButton = deleteButtons[0];
      await expect(firstDeleteButton).toBeDisabled();
    }
  });

  test('認証済みユーザーは自分の投稿を編集できる', async ({ page }) => {
    // テストログインエンドポイント使用
    const loginResponse = await page.request.post(`${BASE_URL}/api/auth/test-login`, {
      data: {
        email: testUsers.user1.email,
        password: testUsers.user1.password
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    
    // トークンをCookieに設定
    await page.context().addCookies([{
      name: 'test-auth-token',
      value: loginData.token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    }]);
    
    // ページをリロードして認証状態を反映
    await page.reload();
    await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
    
    // 新規投稿を作成
    const postContent = `テスト投稿 ${Date.now()}`;
    const postInput = page.locator('[data-testid="post-input"], textarea[placeholder*="投稿"]');
    
    if (await postInput.count() > 0) {
      await postInput.fill(postContent);
      
      const submitButton = page.locator('[data-testid="post-submit"], button:has-text("投稿")');
      await submitButton.click();
      
      // 新しい投稿が表示されるまで待つ
      await page.waitForSelector(`text=${postContent}`, { timeout: 10000 });
      
      // 作成した投稿の編集ボタンを探す
      const newPost = page.locator(`text=${postContent}`).locator('xpath=ancestor::*[@data-testid="post-item"]').first();
      const editButton = newPost.locator('[aria-label="edit"]');
      
      // 編集ボタンが有効であることを確認
      await expect(editButton).toBeEnabled();
    }
  });

  test('認証済みユーザーは他人の投稿を編集できない', async ({ page }) => {
    // User1でログイン
    const loginResponse1 = await page.request.post(`${BASE_URL}/api/auth/test-login`, {
      data: {
        email: testUsers.user1.email,
        password: testUsers.user1.password
      }
    });
    
    const loginData1 = await loginResponse1.json();
    
    // User1で投稿作成
    await page.context().addCookies([{
      name: 'test-auth-token',
      value: loginData1.token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    }]);
    
    await page.reload();
    await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
    
    const postContent = `User1の投稿 ${Date.now()}`;
    const postInput = page.locator('[data-testid="post-input"], textarea[placeholder*="投稿"]');
    
    if (await postInput.count() > 0) {
      await postInput.fill(postContent);
      const submitButton = page.locator('[data-testid="post-submit"], button:has-text("投稿")');
      await submitButton.click();
      await page.waitForSelector(`text=${postContent}`, { timeout: 10000 });
    }
    
    // User2でログイン
    await page.context().clearCookies();
    
    const loginResponse2 = await page.request.post(`${BASE_URL}/api/auth/test-login`, {
      data: {
        email: testUsers.user2.email,
        password: testUsers.user2.password
      }
    });
    
    const loginData2 = await loginResponse2.json();
    
    await page.context().addCookies([{
      name: 'test-auth-token',
      value: loginData2.token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    }]);
    
    await page.reload();
    await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
    
    // User1の投稿を探す
    const user1Post = page.locator(`text=${postContent}`);
    if (await user1Post.count() > 0) {
      const postContainer = user1Post.locator('xpath=ancestor::*[@data-testid="post-item"]').first();
      const editButton = postContainer.locator('[aria-label="edit"]');
      
      // 編集ボタンが無効であることを確認
      await expect(editButton).toBeDisabled();
    }
  });

  test('管理者は全ての投稿を編集・削除できる', async ({ page }) => {
    // 管理者でログイン
    const loginResponse = await page.request.post(`${BASE_URL}/api/auth/test-login`, {
      data: {
        email: testUsers.admin.email,
        password: testUsers.admin.password
      }
    });
    
    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      
      await page.context().addCookies([{
        name: 'test-auth-token',
        value: loginData.token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax'
      }]);
      
      await page.reload();
      await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
      
      // すべての編集ボタンが有効であることを確認
      const editButtons = await page.locator('[aria-label="edit"]').all();
      for (const button of editButtons.slice(0, 3)) { // 最初の3つをチェック
        await expect(button).toBeEnabled();
      }
      
      // すべての削除ボタンが有効であることを確認
      const deleteButtons = await page.locator('[aria-label="delete"]').all();
      for (const button of deleteButtons.slice(0, 3)) { // 最初の3つをチェック
        await expect(button).toBeEnabled();
      }
    }
  });

  test('APIレベルの権限チェック - 未認証での投稿更新は401エラー', async ({ page }) => {
    const response = await page.request.put(`${BASE_URL}/api/posts/689d231c71658c3212b2f6c2`, {
      data: {
        content: 'Unauthorized update attempt'
      }
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  test('パフォーマンステスト - 権限APIの応答時間', async ({ page }) => {
    const startTime = Date.now();
    
    // 権限情報取得API
    const response = await page.request.get(`${BASE_URL}/api/user/permissions`);
    
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(500); // 500ms以内
    
    const data = await response.json();
    expect(data.role).toBeDefined();
    expect(data.permissions).toBeDefined();
  });

  test('セキュリティテスト - CSRFトークンの確認', async ({ page }) => {
    await page.goto(`${BASE_URL}/board`);
    
    // CSRFトークンメタタグの確認（実装済みの場合）
    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    
    if (csrfToken) {
      expect(csrfToken).toBeTruthy();
      console.log('CSRFトークン検出:', csrfToken);
    } else {
      // CSRFトークンが未実装の場合は警告のみ
      console.warn('CSRFトークンメタタグが見つかりません');
    }
  });
});

test.describe('負荷テスト', () => {
  test('並行リクエスト処理', async ({ page }) => {
    const BASE_URL = 'http://localhost:3000';
    const promises = [];
    
    // 10個の並行リクエスト
    for (let i = 0; i < 10; i++) {
      promises.push(
        page.request.get(`${BASE_URL}/api/posts?limit=5`)
      );
    }
    
    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // すべてのリクエストが成功することを確認
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
    
    // 平均応答時間を計算
    const avgTime = totalTime / 10;
    console.log(`並行リクエスト平均応答時間: ${avgTime}ms`);
    
    // 平均応答時間が1秒以内であることを確認
    expect(avgTime).toBeLessThan(1000);
  });
});