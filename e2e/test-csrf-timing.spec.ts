import { test, expect } from '@playwright/test';

test.describe('CSRF Token Timing Test', () => {
  test('CSRF token initialization and follow button interaction', async ({ page }) => {
    const logs: string[] = [];
    
    // ブラウザコンソールログを収集
    page.on('console', msg => {
      if (msg.text().includes('CSRF') || msg.text().includes('Follow')) {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    
    // ネットワークリクエストを監視
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        const headers = request.headers();
        requests.push({
          url: request.url(),
          method: request.method(),
          csrfToken: headers['x-csrf-token'] || headers['app-csrf-token'] || 'NONE'
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`Response: ${response.url()} - ${response.status()}`);
      }
    });
    
    // ページアクセス
    await page.goto('http://localhost:3000/test-follow');
    
    // ページロード待機
    await page.waitForSelector('text=フォローボタン テストページ', { timeout: 10000 });
    
    // CSRFトークン取得を待つ
    await page.waitForTimeout(2000);
    
    // CSRFトークンの状態を確認
    const csrfToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="app-csrf-token"]');
      return meta?.getAttribute('content');
    });
    
    console.log('CSRFトークン（メタタグ）:', csrfToken);
    
    // Cookie確認
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name === 'app-csrf-token');
    console.log('CSRFトークン（Cookie）:', csrfCookie?.value);
    
    // フォローボタンクリック
    const followButton = page.locator('button:has-text("フォロー")').first();
    await followButton.click();
    
    // 少し待つ
    await page.waitForTimeout(1000);
    
    // ログ出力
    console.log('\n=== コンソールログ ===');
    logs.forEach(log => console.log(log));
    
    console.log('\n=== APIリクエスト ===');
    requests.forEach(req => {
      console.log(`${req.method} ${req.url}`);
      console.log(`  CSRFトークン: ${req.csrfToken}`);
    });
    
    // アサーション
    expect(csrfToken).toBeTruthy();
    expect(csrfCookie).toBeTruthy();
  });
});