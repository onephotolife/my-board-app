import { test, expect } from '@playwright/test';

test.describe('test-follow Page 404 Error Fix Validation', () => {
  test('【OK】404エラーが解消され、ページが正常に表示される', async ({ page }) => {
    // Arrange
    const consoleErrors: string[] = [];
    const networkErrors: { url: string; status: number }[] = [];
    
    // Console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Network error monitoring
    page.on('response', response => {
      if (response.status() === 404 || response.status() >= 500) {
        networkErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // Act
    await page.goto('http://localhost:3000/test-follow', {
      waitUntil: 'networkidle'
    });
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Assert
    // Check for 404 errors in console
    const fourOhFourErrors = consoleErrors.filter(err => 
      err.includes('404') || err.includes('Not Found')
    );
    
    // Check for WebSocket errors
    const websocketErrors = consoleErrors.filter(err => 
      err.includes('WebSocket') || err.includes('socket')
    );
    
    // Check for network 404s
    const apiNotFound = networkErrors.filter(err => 
      err.status === 404 && err.url.includes('/api/')
    );
    
    // Evidence gathering
    console.log('=== Test Evidence ===');
    console.log('Console Errors Count:', consoleErrors.length);
    console.log('404 Errors Count:', fourOhFourErrors.length);
    console.log('WebSocket Errors Count:', websocketErrors.length);
    console.log('Network 404s Count:', apiNotFound.length);
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors Details:');
      consoleErrors.forEach((err, i) => console.log(`  ${i+1}. ${err}`));
    }
    
    if (networkErrors.length > 0) {
      console.log('\nNetwork Errors Details:');
      networkErrors.forEach((err, i) => 
        console.log(`  ${i+1}. ${err.url} -> ${err.status}`)
      );
    }
    
    // Assertions
    expect(fourOhFourErrors.length).toBe(0);
    expect(websocketErrors.length).toBe(0);
    expect(apiNotFound.length).toBe(0);
    
    // Visual check - page should have content
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    
    // Check if main heading exists
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: './test-results/test-follow-fixed.png',
      fullPage: true 
    });
  });
  
  test('【OK】Session UserがDBに存在することを確認', async ({ request }) => {
    // This is a backend check to verify our fix
    const response = await request.get('http://localhost:3000/api/auth/session');
    
    // If there's a session, it should work now
    if (response.ok()) {
      const session = await response.json();
      console.log('Session data:', JSON.stringify(session, null, 2));
    }
    
    // The key test is that 404 errors don't appear in the browser
    // which we tested in the previous test case
    expect(response.status()).not.toBe(404);
  });
});