import { test, expect } from '@playwright/test';

test.describe('CSRF Token Improved Initialization', () => {
  test.beforeEach(async ({ page }) => {
    // デバッグ用にコンソールログを記録
    page.on('console', msg => {
      if (msg.text().includes('[CSRF]')) {
        console.log(`Browser: ${msg.text()}`);
      }
    });

    // エラーを監視
    page.on('pageerror', error => {
      console.error(`Page error: ${error.message}`);
    });
  });

  test('初回フォローボタンクリック成功', async ({ page }) => {
    // test-followページへ移動
    await page.goto('http://localhost:3000/test-follow');
    
    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle');
    
    // CSRFトークン取得のAPIコールを確認
    const csrfResponse = await page.waitForResponse(
      response => response.url().includes('/api/csrf') && response.ok(),
      { timeout: 10000 }
    );
    console.log('✅ CSRF token API called:', csrfResponse.status());
    
    // フォローボタンの存在を確認
    const followButton = page.locator('button:has-text("フォロー")').first();
    await expect(followButton).toBeVisible({ timeout: 5000 });
    
    // ネットワークリクエストを監視
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/follow'),
      { timeout: 10000 }
    );
    
    // フォローボタンをクリック
    console.log('🖱️ Clicking follow button...');
    await followButton.click();
    
    // APIレスポンスを待つ
    const response = await responsePromise;
    console.log(`📡 Follow API response: ${response.status()}`);
    
    // 成功ステータスを期待
    expect([200, 201, 204, 401]).toContain(response.status());
    
    // 401の場合は認証が必要（期待される動作）
    if (response.status() === 401) {
      console.log('⚠️ 401 Unauthorized - Authentication required (expected)');
    }
    // 403でなければ成功（CSRFトークンエラーが解消）
    else if (response.status() !== 403) {
      console.log('✅ CSRF token successfully attached!');
    }
    
    // 403エラーが出ないことを確認
    expect(response.status()).not.toBe(403);
  });

  test('高速連続クリックでのCSRF処理', async ({ page }) => {
    await page.goto('http://localhost:3000/test-follow');
    await page.waitForLoadState('networkidle');
    
    // CSRFトークン取得を待つ
    await page.waitForResponse(
      response => response.url().includes('/api/csrf') && response.ok(),
      { timeout: 10000 }
    );
    
    const buttons = await page.locator('button:has-text("フォロー")').all();
    
    if (buttons.length < 2) {
      console.log('⚠️ Not enough follow buttons for concurrent test');
      return;
    }
    
    // 複数ボタンを同時にクリック
    const clickPromises = buttons.slice(0, Math.min(3, buttons.length)).map(async (button, index) => {
      console.log(`🖱️ Clicking button ${index + 1}`);
      await button.click();
    });
    
    await Promise.all(clickPromises);
    
    // 短い待機時間
    await page.waitForTimeout(2000);
    
    // ネットワークエラーが発生していないことを確認
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/follow')) {
        responses.push(response);
        console.log(`📡 Follow API response: ${response.status()} for ${response.url()}`);
      }
    });
    
    await page.waitForTimeout(1000);
    
    // 少なくとも1つのリクエストが403でないことを確認
    const non403Responses = responses.filter(r => r.status() !== 403);
    expect(non403Responses.length).toBeGreaterThan(0);
  });

  test('CSRFトークン待機ログ確認', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[CSRF]')) {
        consoleLogs.push(text);
      }
    });
    
    await page.goto('http://localhost:3000/test-follow');
    await page.waitForLoadState('networkidle');
    
    // CSRFトークン取得を待つ
    await page.waitForResponse(
      response => response.url().includes('/api/csrf') && response.ok(),
      { timeout: 10000 }
    );
    
    // 少し待機してからボタンクリック
    await page.waitForTimeout(500);
    
    const followButton = page.locator('button:has-text("フォロー")').first();
    if (await followButton.isVisible()) {
      await followButton.click();
      
      // ログを待つ
      await page.waitForTimeout(1000);
      
      // ログの検証
      const tokenLogs = consoleLogs.filter(log => 
        log.includes('トークン取得成功') || 
        log.includes('トークンをリクエストに添付') ||
        log.includes('トークン初期化待機中')
      );
      
      console.log('📝 CSRF Logs:', tokenLogs);
      
      // トークン関連のログが記録されていることを確認
      expect(tokenLogs.length).toBeGreaterThan(0);
    }
  });
});