import { test, expect } from '@playwright/test';

test.describe('Debug Authentication Timing', () => {
  test('verify mock authentication works with retry', async ({ page }) => {
    console.log('🔧 [DEBUG-TIMING] Starting authentication timing debug test');
    
    // Navigate to protected page
    await page.goto('/posts/new');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a bit for authentication to resolve
    await page.waitForTimeout(2000);
    
    let currentUrl = page.url();
    console.log('🔧 [DEBUG-TIMING] Initial URL:', currentUrl);
    
    // If we're on signin page, wait a bit more and check again
    if (currentUrl.includes('/auth/signin')) {
      console.log('🔧 [DEBUG-TIMING] On signin page initially, waiting for potential redirect...');
      
      // Wait for potential redirect
      await page.waitForTimeout(3000);
      currentUrl = page.url();
      console.log('🔧 [DEBUG-TIMING] URL after waiting:', currentUrl);
      
      // If still on signin, try navigating to posts/new again
      if (currentUrl.includes('/auth/signin')) {
        console.log('🔧 [DEBUG-TIMING] Still on signin, trying navigation again...');
        await page.goto('/posts/new');
        await page.waitForTimeout(2000);
        currentUrl = page.url();
        console.log('🔧 [DEBUG-TIMING] URL after second attempt:', currentUrl);
      }
    }
    
    if (currentUrl.includes('/auth/signin')) {
      // Try to check the session status directly
      const response = await page.goto('/api/auth/session');
      const sessionData = await response?.json();
      console.log('🔧 [DEBUG-TIMING] Session API response:', sessionData);
      
      // Try navigating one more time
      await page.goto('/posts/new');
      await page.waitForTimeout(3000);
      currentUrl = page.url();
      console.log('🔧 [DEBUG-TIMING] Final URL:', currentUrl);
      
      if (currentUrl.includes('/auth/signin')) {
        console.log('❌ [DEBUG-TIMING] Authentication bypass failed after all attempts');
        throw new Error('Authentication bypass not working after retries');
      }
    }
    
    console.log('✅ [DEBUG-TIMING] Authentication bypass working - on /posts/new');
    
    // Check for form elements
    const formExists = await page.locator('form').count();
    console.log('🔧 [DEBUG-TIMING] Number of forms found:', formExists);
    
    if (formExists === 0) {
      console.log('❌ [DEBUG-TIMING] No form found on page');
      const pageContent = await page.content();
      console.log('🔧 [DEBUG-TIMING] Page title:', await page.title());
      console.log('🔧 [DEBUG-TIMING] Page contains loading:', pageContent.includes('loading') || pageContent.includes('Loading'));
    }
  });
});