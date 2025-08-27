import { test, expect } from '@playwright/test';

test.describe('Follow System Error Investigation', () => {
  test('should check follow button API endpoint', async ({ page, context }) => {
    // コンソールログを記録
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else {
        consoleLogs.push(msg.text());
      }
    });
    
    // ネットワークログを記録
    const networkLogs: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/follow')) {
        networkLogs.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/follow')) {
        networkLogs.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // /boardページにアクセス
    await page.goto('http://localhost:3000/board');
    
    // ページのロード完了を待つ
    await page.waitForLoadState('networkidle');
    
    // 投稿が存在するか確認
    const posts = page.locator('[role="article"], .MuiCard-root');
    const postCount = await posts.count();
    console.log('投稿数:', postCount);
    
    // フォローボタンを探す
    const followButtons = page.locator('button:has-text("フォロー")');
    const buttonCount = await followButtons.count();
    console.log('フォローボタン数:', buttonCount);
    
    if (buttonCount > 0) {
      // 最初のフォローボタンをクリック
      await followButtons.first().click();
      
      // 少し待つ
      await page.waitForTimeout(2000);
    }
    
    // ログを出力
    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
    
    console.log('\n=== Console Errors ===');
    consoleErrors.forEach(err => console.log(err));
    
    console.log('\n=== Network Logs ===');
    networkLogs.forEach(log => console.log(JSON.stringify(log, null, 2)));
    
    // エラーがあるか確認
    const has404Error = networkLogs.some(log => log.status === 404);
    const hasButtonError = consoleErrors.some(err => err.includes('non-boolean attribute'));
    
    console.log('\n=== Error Summary ===');
    console.log('404 Error found:', has404Error);
    console.log('Button attribute error found:', hasButtonError);
    
    // スクリーンショットを保存
    await page.screenshot({ path: 'follow-error-test.png', fullPage: true });
  });
});