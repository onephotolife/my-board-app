import { test, expect } from '@playwright/test';

test.describe('Simple Auth Test', () => {
  test.setTimeout(60000);

  test('Basic signup and login flow', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `Test User ${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'TestPass123!'
    };

    console.log('Testing with user:', testUser.email);

    // Step 1: Go to signup page
    await page.goto('http://localhost:3000/auth/signup');
    await page.waitForLoadState('domcontentloaded');
    console.log('✓ Signup page loaded');

    // Step 2: Fill signup form
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    console.log('✓ Form filled');

    // Step 3: Submit form
    await page.click('button[type="submit"]');
    console.log('✓ Form submitted');

    // Step 4: Wait for navigation (with longer timeout)
    await page.waitForTimeout(3000); // Give it time to process
    
    const currentUrl = page.url();
    console.log('Current URL after signup:', currentUrl);
    
    // Check if we're on dashboard or signin page
    if (currentUrl.includes('/dashboard')) {
      console.log('✓ Auto-login successful! On dashboard');
      
      // Verify dashboard content
      const hasTextarea = await page.locator('textarea').isVisible().catch(() => false);
      expect(hasTextarea).toBe(true);
      console.log('✓ Dashboard content verified');
      
    } else if (currentUrl.includes('/auth/signin')) {
      console.log('→ Redirected to signin, attempting manual login');
      
      // Manual login
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      
      // Wait for dashboard
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('✓ Manual login successful');
      
      // Verify dashboard
      const hasTextarea = await page.locator('textarea').isVisible().catch(() => false);
      expect(hasTextarea).toBe(true);
      console.log('✓ Dashboard verified');
      
    } else {
      // Check for success message
      const successMsg = await page.locator('text=/登録が完了/').isVisible().catch(() => false);
      if (successMsg) {
        console.log('✓ Registration completed, waiting for redirect');
        await page.waitForTimeout(5000);
        
        const newUrl = page.url();
        console.log('URL after waiting:', newUrl);
        
        if (newUrl.includes('/auth/signin')) {
          // Try manual login
          await page.goto('http://localhost:3000/auth/signin');
          await page.fill('input[name="email"]', testUser.email);
          await page.fill('input[name="password"]', testUser.password);
          await page.click('button[type="submit"]');
          await page.waitForURL('**/dashboard', { timeout: 15000 });
          console.log('✓ Manual login after registration successful');
        }
      }
    }
    
    // Final verification
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    expect(finalUrl).toContain('/dashboard');
  });
});