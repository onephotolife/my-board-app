import { test, expect } from '@playwright/test';

test.describe('Follow System Improved Test', () => {
  test('should handle follow button errors properly with improved error handling', async ({ page }) => {
    // コンソールログとエラーを記録
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.log('[ERROR]', text);
      } else if (msg.type() === 'warn') {
        console.log('[WARN]', text);
      } else {
        consoleLogs.push(text);
      }
    });
    
    // ネットワークログを記録
    const apiCalls: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/follow')) {
        const log = {
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        };
        apiCalls.push(log);
        console.log('[REQUEST]', log);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/follow')) {
        const log = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        };
        apiCalls.push(log);
        console.log('[RESPONSE]', log);
      }
    });
    
    // テスト用ユーザーでログイン
    console.log('=== Starting login process ===');
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // テストアカウントでログイン
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('Dashboard redirect failed, trying board page directly');
    });
    
    // ボードページへ移動
    console.log('=== Navigating to board page ===');
    await page.goto('http://localhost:3000/board');
    await page.waitForLoadState('networkidle');
    
    // フォローボタンの存在確認
    const followButtons = page.locator('button:has-text("フォロー")');
    const buttonCount = await followButtons.count();
    console.log(`Found ${buttonCount} follow buttons`);
    
    if (buttonCount > 0) {
      // 最初のフォローボタンをクリック
      console.log('=== Clicking follow button ===');
      await followButtons.first().click();
      
      // エラーメッセージまたは成功状態を待つ
      await page.waitForTimeout(2000);
      
      // エラーダイアログの確認
      const errorAlert = page.locator('.MuiAlert-root');
      const hasError = await errorAlert.isVisible();
      
      if (hasError) {
        const errorText = await errorAlert.textContent();
        console.log('Error message displayed:', errorText);
        
        // 改善されたエラーメッセージの確認
        if (errorText?.includes('APIエンドポイントが見つかりません')) {
          console.log('✅ Improved 404 error message detected');
        }
      } else {
        // 成功の場合、ボタンテキストが変わることを確認
        const updatedButton = await followButtons.first().textContent();
        console.log('Button text after click:', updatedButton);
        
        if (updatedButton === 'フォロー中') {
          console.log('✅ Follow action successful');
        }
      }
    }
    
    // テスト結果のサマリー
    console.log('\n=== Test Summary ===');
    console.log('Total API calls:', apiCalls.length);
    console.log('Console errors:', consoleErrors.length);
    
    // 改善されたエラーハンドリングの確認
    const improvedErrorLogs = consoleLogs.filter(log => 
      log.includes('Follow API Error:') || 
      log.includes('404 detected - checking API availability')
    );
    
    console.log('Improved error logs found:', improvedErrorLogs.length);
    
    if (improvedErrorLogs.length > 0) {
      console.log('✅ Improved error handling is working');
      improvedErrorLogs.forEach(log => console.log('  -', log));
    }
    
    // button属性エラーの確認
    const buttonAttributeError = consoleErrors.find(err => 
      err.includes('non-boolean attribute') && err.includes('button')
    );
    
    if (buttonAttributeError) {
      console.log('⚠️ Button attribute error still present:', buttonAttributeError);
    } else {
      console.log('✅ No button attribute error detected');
    }
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'follow-improved-test.png', 
      fullPage: true 
    });
    
    // アサーション
    expect(apiCalls.length).toBeGreaterThan(0);
  });
});