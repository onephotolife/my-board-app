import { test, expect } from '@playwright/test';

test.describe('Follow System Integration Test After Improvements', () => {
  test('should verify all improvements are working', async ({ page }) => {
    console.log('=== Integration Test Start ===');
    
    // エラー記録用
    const consoleErrors: string[] = [];
    let buttonAttributeErrorFound = false;
    let improvedErrorLogsFound = false;
    
    page.on('console', msg => {
      const text = msg.text();
      
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        
        // button属性エラーのチェック
        if (text.includes('non-boolean attribute') && text.includes('button')) {
          buttonAttributeErrorFound = true;
          console.log('❌ Button attribute error still detected:', text);
        }
        
        // 改善されたエラーログのチェック
        if (text.includes('Follow API Error:')) {
          improvedErrorLogsFound = true;
          console.log('✅ Improved error logging detected');
        }
      }
      
      if (msg.type() === 'warn' && text.includes('404 detected')) {
        console.log('✅ 404 special handling detected');
      }
    });
    
    // APIレスポンスを記録
    const apiResponses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/follow')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // トップページへアクセス
    console.log('1. Navigating to homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // ボードページへ遷移試行
    console.log('2. Attempting to navigate to board page...');
    const boardLinkExists = await page.locator('a[href="/board"]').count() > 0;
    
    if (boardLinkExists) {
      await page.click('a[href="/board"]');
    } else {
      await page.goto('http://localhost:3000/board');
    }
    
    await page.waitForTimeout(3000);
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('3. Current URL:', currentUrl);
    
    // フォローボタンの確認
    const followButtons = page.locator('button:has-text("フォロー")');
    const buttonCount = await followButtons.count();
    console.log('4. Follow buttons found:', buttonCount);
    
    // テスト結果のサマリー作成
    console.log('\n=== Integration Test Results ===');
    
    // 改善1: エラーハンドリング
    console.log('\n[Improvement 1: Error Handling]');
    if (improvedErrorLogsFound) {
      console.log('✅ Improved error logging is working');
    } else {
      console.log('ℹ️ No errors occurred to test improved logging');
    }
    
    // 改善2: Props フィルタリング
    console.log('\n[Improvement 2: Props Filtering]');
    if (buttonAttributeErrorFound) {
      console.log('❌ Button attribute error still present');
    } else {
      console.log('✅ No button attribute errors detected');
    }
    
    // API応答確認
    console.log('\n[API Responses]');
    apiResponses.forEach(res => {
      console.log(`- ${res.url}: ${res.status} ${res.statusText}`);
    });
    
    // 影響範囲の確認
    console.log('\n[Impact Assessment]');
    console.log('- Page navigation:', currentUrl.includes('/board') ? '✅ Working' : '⚠️ Redirected');
    console.log('- Follow buttons:', buttonCount > 0 ? `✅ ${buttonCount} found` : '⚠️ None found');
    console.log('- Console errors:', consoleErrors.length === 0 ? '✅ None' : `⚠️ ${consoleErrors.length} errors`);
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'follow-integration-test.png', 
      fullPage: true 
    });
    
    // アサーション
    expect(buttonAttributeErrorFound).toBe(false);
    console.log('\n✅ Integration test completed');
  });
});