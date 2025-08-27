import { test, expect } from '@playwright/test';

test.describe('test-follow Page Simple Check', () => {
  test('【OK】ページが読み込まれ、404エラーがないことを確認', async ({ page }) => {
    // Arrange
    const consoleMessages: { type: string; text: string }[] = [];
    const apiRequests: { url: string; status: number }[] = [];
    
    // Console monitoring
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Network monitoring for API calls
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiRequests.push({
          url: url,
          status: response.status()
        });
      }
    });
    
    // Act
    await page.goto('http://localhost:3000/test-follow', {
      waitUntil: 'domcontentloaded', // More lenient than networkidle
      timeout: 10000
    });
    
    // Wait briefly for any immediate API calls
    await page.waitForTimeout(3000);
    
    // Evidence collection
    console.log('=== Test Evidence ===');
    console.log('Total console messages:', consoleMessages.length);
    console.log('Total API requests:', apiRequests.length);
    
    // Check for errors
    const errorMessages = consoleMessages.filter(m => m.type === 'error');
    const fourOhFourErrors = errorMessages.filter(m => 
      m.text.includes('404') || m.text.includes('Not Found')
    );
    const websocketErrors = errorMessages.filter(m => 
      m.text.toLowerCase().includes('websocket') || 
      m.text.toLowerCase().includes('socket')
    );
    
    console.log('\n=== Error Analysis ===');
    console.log('Error messages count:', errorMessages.length);
    console.log('404 errors count:', fourOhFourErrors.length);
    console.log('WebSocket errors count:', websocketErrors.length);
    
    // API status analysis
    const api404s = apiRequests.filter(r => r.status === 404);
    const api401s = apiRequests.filter(r => r.status === 401);
    const api403s = apiRequests.filter(r => r.status === 403);
    const api200s = apiRequests.filter(r => r.status === 200);
    
    console.log('\n=== API Status Codes ===');
    console.log('200 OK:', api200s.length);
    console.log('401 Unauthorized:', api401s.length);
    console.log('403 Forbidden:', api403s.length);
    console.log('404 Not Found:', api404s.length);
    
    // Details if there are issues
    if (errorMessages.length > 0) {
      console.log('\n=== Error Details ===');
      errorMessages.forEach((msg, i) => {
        console.log(`${i+1}. ${msg.text}`);
      });
    }
    
    if (api404s.length > 0) {
      console.log('\n=== 404 API Calls ===');
      api404s.forEach((req, i) => {
        console.log(`${i+1}. ${req.url}`);
      });
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: './test-results/test-follow-simple-check.png',
      fullPage: false 
    });
    
    // Assertions - main focus on 404 errors
    expect(fourOhFourErrors.length).toBe(0);
    expect(api404s.length).toBe(0);
    expect(websocketErrors.length).toBe(0);
    
    // Page should have loaded
    const title = await page.title();
    expect(title).toBeTruthy();
    
    console.log('\n=== Test Result ===');
    console.log('✅ No 404 errors detected');
    console.log('✅ No WebSocket errors detected');
    console.log('Page title:', title);
  });
});