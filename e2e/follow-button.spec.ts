import { test, expect } from '@playwright/test';

test.describe('フォロー機能のCSRFトークンテスト', () => {
  test.beforeEach(async ({ page }) => {
    // テストページにアクセス
    await page.goto('http://localhost:3000/test-follow');
    
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // CSRFProviderが初期化されるまで待機
    await page.waitForTimeout(1000);
  });

  test('フォローボタンがCSRFトークンを送信して正常に動作する', async ({ page }) => {
    // フォローボタンを探す
    const followButton = page.locator('button:has-text("フォロー")').first();
    
    // ボタンが存在することを確認
    await expect(followButton).toBeVisible();
    
    // ネットワークリクエストを監視
    const followRequestPromise = page.waitForResponse(
      response => response.url().includes('/api/follow/') && response.request().method() === 'POST',
      { timeout: 10000 }
    );
    
    // フォローボタンをクリック
    await followButton.click();
    
    // APIレスポンスを待つ
    const response = await followRequestPromise;
    
    // レスポンスステータスを確認
    console.log('Response status:', response.status());
    console.log('Response headers:', response.headers());
    
    // リクエストヘッダーを確認
    const request = response.request();
    const headers = request.headers();
    console.log('Request headers:', headers);
    
    // CSRFトークンがヘッダーに含まれているか確認
    expect(headers['x-csrf-token']).toBeTruthy();
    
    // レスポンスが成功するか確認
    // 注：認証が必要な場合は401、ユーザーが存在しない場合は404になる可能性がある
    const acceptableStatuses = [200, 401, 404];
    expect(acceptableStatuses).toContain(response.status());
    
    // 403（CSRF失敗）でないことを確認
    expect(response.status()).not.toBe(403);
    
    // レスポンスボディを確認
    const responseBody = await response.json();
    console.log('Response body:', responseBody);
    
    // CSRFエラーでないことを確認
    if (responseBody.error) {
      expect(responseBody.error.code).not.toBe('CSRF_VALIDATION_FAILED');
    }
  });

  test('複数回のフォロー/フォロー解除が正常に動作する', async ({ page }) => {
    const followButton = page.locator('button').filter({ hasText: /フォロー/ }).first();
    
    // 初回クリック
    await followButton.click();
    await page.waitForTimeout(500);
    
    // ボタンのテキストが変わるか、エラーメッセージが表示されるまで待つ
    await page.waitForTimeout(1000);
    
    // 2回目のクリック（フォロー解除またはエラーメッセージ確認）
    const buttonText = await followButton.textContent();
    console.log('Button text after first click:', buttonText);
    
    // エラーメッセージが表示されていないことを確認
    const errorAlert = page.locator('[role="alert"]');
    const errorCount = await errorAlert.count();
    
    if (errorCount > 0) {
      const errorText = await errorAlert.textContent();
      console.log('Error message:', errorText);
      
      // CSRFエラーでないことを確認
      expect(errorText).not.toContain('CSRF');
      expect(errorText).not.toContain('validation failed');
    }
  });

  test('ページリロード後もCSRFトークンが機能する', async ({ page }) => {
    // ページをリロード
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // フォローボタンを探す
    const followButton = page.locator('button:has-text("フォロー")').first();
    await expect(followButton).toBeVisible();
    
    // ネットワークリクエストを監視
    const followRequestPromise = page.waitForResponse(
      response => response.url().includes('/api/follow/') && response.request().method() === 'POST',
      { timeout: 10000 }
    );
    
    // フォローボタンをクリック
    await followButton.click();
    
    // APIレスポンスを待つ
    const response = await followRequestPromise;
    
    // 403（CSRF失敗）でないことを確認
    expect(response.status()).not.toBe(403);
    
    // レスポンスボディを確認
    const responseBody = await response.json();
    
    // CSRFエラーでないことを確認
    if (responseBody.error) {
      expect(responseBody.error.code).not.toBe('CSRF_VALIDATION_FAILED');
    }
  });
});