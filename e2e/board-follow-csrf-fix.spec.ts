import { test, expect } from '@playwright/test';

test.describe('Board Follow CSRF Fix Verification', () => {
  test('TC-E2E-CSRF-001: フォロー状態取得時にCSRFトークンが送信される', async ({ page }) => {
    // ログイン処理
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+111@gmail.com');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Boardページへ遷移
    await page.goto('/board');
    
    // ネットワークリクエストを監視
    const followStatusRequest = page.waitForRequest(request => 
      request.url().includes('/api/follow/status/batch') && 
      request.method() === 'POST'
    );
    
    // ページロード待機
    await page.waitForSelector('[data-testid="post-list"]', {
      state: 'visible',
      timeout: 10000
    });
    
    // フォロー状態APIリクエストの検証
    const request = await followStatusRequest;
    
    // CSRFトークンヘッダーの存在確認
    const csrfToken = request.headers()['x-csrf-token'];
    console.log('🔍 CSRF Token sent:', csrfToken ? 'Yes' : 'No');
    console.log('📝 Token preview:', csrfToken?.substring(0, 20) + '...');
    
    expect(csrfToken).toBeTruthy();
    expect(csrfToken.length).toBeGreaterThan(32);
    
    // レスポンスの確認
    const response = await request.response();
    console.log('📡 Response status:', response?.status());
    
    // 200 OK（認証済み）または401（未認証）を期待
    // 403（CSRF失敗）でないことを確認
    const status = response?.status() || 0;
    expect([200, 401]).toContain(status);
    expect(status).not.toBe(403);
  });
  
  test('TC-E2E-CSRF-002: フォローボタン操作が正常に動作する', async ({ page }) => {
    // ログイン
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+111@gmail.com'); 
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Boardページへ
    await page.goto('/board');
    await page.waitForSelector('[data-testid="post-list"]');
    
    // フォローボタンが存在する場合のみテスト
    const followButton = page.locator('[data-testid="follow-button"]').first();
    const buttonCount = await followButton.count();
    
    if (buttonCount > 0) {
      const initialText = await followButton.textContent();
      console.log('🔘 Initial button state:', initialText);
      
      // フォローAPIリクエストを監視
      const followRequest = page.waitForRequest(request =>
        request.url().match(/\/api\/follow\/[a-f0-9]{24}/) !== null &&
        (request.method() === 'POST' || request.method() === 'DELETE')
      );
      
      // ボタンクリック
      await followButton.click();
      
      // リクエスト検証
      const request = await followRequest;
      const csrfToken = request.headers()['x-csrf-token'];
      
      expect(csrfToken).toBeTruthy();
      console.log('✅ Follow API called with CSRF token');
      
      // レスポンス確認
      const response = await request.response();
      const status = response?.status() || 0;
      
      // 403でないことを確認
      expect(status).not.toBe(403);
      console.log('✅ No CSRF error (status:', status, ')');
      
      // ボタンテキストの変更確認（成功時のみ）
      if (status === 200) {
        await page.waitForTimeout(1000);
        const newText = await followButton.textContent();
        console.log('🔘 New button state:', newText);
        expect(newText).not.toBe(initialText);
      }
    } else {
      console.log('⚠️ No follow buttons found, skipping interaction test');
    }
  });
});