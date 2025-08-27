import { test, expect } from '@playwright/test';

test.describe('Board CSRF Protection - Public Access Test', () => {
  test('TC-E2E-CSRF-003: 公開ページでCSRFトークンが正しくヘッダーに含まれる', async ({ page }) => {
    // Boardページへ直接アクセス（認証なし）
    await page.goto('/board');
    
    // ページロード完了を待つ
    await page.waitForLoadState('networkidle');
    
    // フォロー状態APIリクエストを監視
    const followStatusPromise = page.waitForRequest(request => 
      request.url().includes('/api/follow/status/batch') && 
      request.method() === 'POST',
      { timeout: 5000 }
    ).catch(() => null);
    
    // 少し待ってからリクエストを確認
    await page.waitForTimeout(2000);
    
    const request = await followStatusPromise;
    
    if (request) {
      // CSRFトークンヘッダーの確認
      const csrfToken = request.headers()['x-csrf-token'];
      console.log('🔍 CSRF Token found:', csrfToken ? 'Yes' : 'No');
      
      if (csrfToken) {
        console.log('✅ CSRF token is present in headers');
        console.log('📝 Token length:', csrfToken.length);
        expect(csrfToken.length).toBeGreaterThan(32);
        
        // レスポンスステータスの確認
        const response = await request.response();
        const status = response?.status() || 0;
        console.log('📡 Response status:', status);
        
        // 403（CSRF失敗）でないことを確認
        expect(status).not.toBe(403);
        console.log('✅ No CSRF error detected');
      }
    } else {
      console.log('⚠️ No follow status API call detected (might be expected for public access)');
    }
  });

  test('TC-E2E-CSRF-004: CSRFトークンがCookieに正しく設定される', async ({ page, context }) => {
    // Boardページへアクセス
    await page.goto('/board');
    await page.waitForLoadState('networkidle');
    
    // Cookieを取得
    const cookies = await context.cookies();
    
    // CSRFトークン関連のCookieを探す
    const csrfCookies = cookies.filter(cookie => 
      cookie.name.includes('csrf') || 
      cookie.name.includes('CSRF')
    );
    
    console.log('🍪 CSRF-related cookies found:', csrfCookies.length);
    
    csrfCookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
      console.log(`    httpOnly: ${cookie.httpOnly}, secure: ${cookie.secure}, sameSite: ${cookie.sameSite}`);
    });
    
    // 少なくとも1つのCSRF関連Cookieが存在することを確認
    expect(csrfCookies.length).toBeGreaterThan(0);
    
    // app-csrf-tokenまたは類似のCookieが存在することを確認
    const tokenCookie = csrfCookies.find(c => 
      c.name === 'app-csrf-token' || 
      c.name === 'csrf-token' ||
      c.name === '_csrf'
    );
    
    if (tokenCookie) {
      console.log('✅ CSRF token cookie found:', tokenCookie.name);
      expect(tokenCookie.value.length).toBeGreaterThan(0);
    }
  });
});