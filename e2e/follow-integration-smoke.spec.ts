import { test, expect } from '@playwright/test';

test.describe('Follow Integration Smoke Test', () => {
  test('Follow button integration in board page', async ({ page }) => {
    // Skip cookie banner if exists
    page.on('dialog', dialog => dialog.accept());
    
    // Navigate to signin
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // Login
    const emailInput = page.locator('input[name="email"]').first();
    const passwordInput = page.locator('input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('testmain@example.com');
    await passwordInput.fill('Test123!');
    await submitButton.click();
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Navigate to board page
    await page.goto('http://localhost:3000/board');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: 'test-results/board-follow-integration.png',
      fullPage: true 
    });
    
    // Check if posts exist
    const postCards = page.locator('[data-testid*="post-card"]');
    const postCount = await postCards.count();
    console.log(`Found ${postCount} posts on board`);
    
    if (postCount > 0) {
      // Check first post for follow button or author area
      const firstPost = postCards.first();
      const authorArea = firstPost.locator('[data-testid*="post-author"]');
      const hasAuthorArea = await authorArea.isVisible();
      
      if (hasAuthorArea) {
        const authorText = await authorArea.textContent();
        console.log(`Post author: ${authorText}`);
        
        // Look for follow button near author
        const followButton = firstPost.locator('button:has-text("フォロー"), button:has-text("フォロー中")');
        const hasFollowButton = await followButton.isVisible().catch(() => false);
        
        console.log(`Follow button visible: ${hasFollowButton}`);
        
        if (hasFollowButton) {
          console.log('✅ Follow button found and visible');
        } else {
          console.log('⚠️ Follow button not found - could be own post');
        }
        
        // Test clicking follow button if exists
        if (hasFollowButton) {
          await followButton.click();
          await page.waitForTimeout(1000);
          
          const buttonTextAfterClick = await followButton.textContent();
          console.log(`Follow button after click: ${buttonTextAfterClick}`);
        }
      }
    }
    
    // Check console for any errors
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`❌ Console Error: ${msg.text()}`);
      } else if (msg.text().includes('Follow Status')) {
        logs.push(`📡 Follow API: ${msg.text()}`);
      }
    });
    
    // Wait a bit more for any async operations
    await page.waitForTimeout(2000);
    
    // Log collected messages
    logs.forEach(log => console.log(log));
  });
  
  test('API endpoint accessibility', async ({ page }) => {
    // Check if batch API is accessible
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/follow/status/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: ['507f1f77bcf86cd799439001'] }),
          credentials: 'include'
        });
        return {
          status: res.status,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        };
      } catch (err) {
        return { error: err.message };
      }
    });
    
    console.log('Batch API Response:', JSON.stringify(response, null, 2));
    
    // API should return 401 (unauthorized) or a proper response
    expect([200, 401, 403]).toContain(response.status || 0);
  });
});