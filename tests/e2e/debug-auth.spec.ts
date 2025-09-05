import { test, expect } from '@playwright/test';

test.describe('Debug Authentication', () => {
  test('verify mock authentication works', async ({ page }) => {
    console.log('🔧 [DEBUG] Starting authentication debug test');
    
    // Navigate directly to protected page
    await page.goto('/posts/new');
    await page.waitForLoadState('domcontentloaded');
    
    // Check if we're on the correct page or redirected
    const currentUrl = page.url();
    console.log('🔧 [DEBUG] Current URL:', currentUrl);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-auth-test.png' });
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('❌ [DEBUG] Authentication bypass failed - still redirected to signin');
      throw new Error('Authentication bypass not working');
    }
    
    console.log('✅ [DEBUG] Authentication bypass working - stayed on /posts/new');
    
    // Check for form elements
    const formExists = await page.locator('form').count();
    console.log('🔧 [DEBUG] Number of forms found:', formExists);
    
    const titleInput = await page.getByTestId('title-input').count();
    console.log('🔧 [DEBUG] Title input count:', titleInput);
    
    const authorInput = await page.getByTestId('author-input').count();
    console.log('🔧 [DEBUG] Author input count:', authorInput);
    
    const contentInput = await page.getByTestId('content-input').count();
    console.log('🔧 [DEBUG] Content input count:', contentInput);
    
    if (titleInput > 0 && authorInput > 0 && contentInput > 0) {
      console.log('✅ [DEBUG] All form fields found successfully');
    } else {
      console.log('❌ [DEBUG] Missing form fields');
      
      // Get page content for debugging
      const pageContent = await page.content();
      console.log('🔧 [DEBUG] Page title:', await page.title());
      console.log('🔧 [DEBUG] Page has forms:', pageContent.includes('<form'));
      console.log('🔧 [DEBUG] Page has title input:', pageContent.includes('data-testid="title-input"'));
    }
  });
});