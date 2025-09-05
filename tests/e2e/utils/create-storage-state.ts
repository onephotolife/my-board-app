import { chromium } from '@playwright/test';
import path from 'path';

/**
 * Create authenticated storage state for Playwright tests
 * Uses direct API authentication approach for stability
 */
async function createStorageState() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔐 [STORAGE-STATE] Starting authentication flow...');
    
    // Navigate to signin page first to establish CSRF token
    await page.goto('http://localhost:3000/auth/signin');
    console.log('📄 [STORAGE-STATE] Navigated to signin page');
    
    // Use test credentials from environment or fallback
    const email = process.env.AUTH_EMAIL || 'one.photolife+1@gmail.com';
    const password = process.env.AUTH_PASSWORD || 'thc1234567890THC';
    
    console.log('🔍 [STORAGE-STATE] Using credentials:', { 
      email, 
      hasPassword: !!password,
      environment: process.env.NODE_ENV || 'test'
    });

    // Fill in the authentication form (using testid selectors for stability)
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    
    console.log('✍️  [STORAGE-STATE] Filled authentication form');
    
    // Submit the form and wait for navigation
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 15000 }),
      page.getByRole('button', { name: /sign in|ログイン/i }).click()
    ]);
    
    console.log('✅ [STORAGE-STATE] Authentication successful, redirected to dashboard');
    
    // Verify session is established by checking for user-specific content
    await page.waitForLoadState('networkidle');
    
    // Check if we have a valid session by looking for common dashboard elements
    const isDashboardLoaded = await page.locator('body').count() > 0;
    if (!isDashboardLoaded) {
      throw new Error('Dashboard failed to load after authentication');
    }
    
    console.log('🎯 [STORAGE-STATE] Dashboard loaded successfully');
    
    // Save the storage state (cookies, localStorage, etc.)
    const storagePath = path.join(__dirname, '../storageState.json');
    await context.storageState({ path: storagePath });
    
    console.log('💾 [STORAGE-STATE] Storage state saved to:', storagePath);
    
    // Verify the saved state contains session information
    const fs = await import('fs/promises');
    const storageContent = JSON.parse(await fs.readFile(storagePath, 'utf-8'));
    const hasSessionCookie = storageContent.cookies.some((cookie: any) => 
      cookie.name.includes('session') || cookie.name.includes('auth')
    );
    
    if (!hasSessionCookie) {
      console.warn('⚠️ [STORAGE-STATE] No session cookies found in storage state');
    } else {
      console.log('✅ [STORAGE-STATE] Session cookies verified in storage state');
    }
    
    // Test the authentication by checking protected routes
    await page.goto('http://localhost:3000/posts/new');
    await page.waitForLoadState('networkidle');
    
    const isPostFormAvailable = await page.locator('form').count() > 0;
    if (!isPostFormAvailable) {
      throw new Error('Post form not accessible - authentication may have failed');
    }
    
    console.log('🔒 [STORAGE-STATE] Verified access to protected routes');
    
  } catch (error) {
    console.error('❌ [STORAGE-STATE] Authentication failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('🎉 [STORAGE-STATE] Authentication storage state created successfully');
}

// Run if called directly
if (require.main === module) {
  createStorageState().catch(console.error);
}

export default createStorageState;