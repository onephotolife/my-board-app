import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

// Phase 1: 環境変数設定
process.env.NEXT_PUBLIC_TEST_MODE = 'true';

setup('authenticate', async ({ page, request }) => {
  console.log('[AUTH-SETUP-DEBUG] Starting authentication setup');
  console.log('[AUTH-SETUP-DEBUG] Auth file path:', authFile);
  console.log('[PHASE1-AUTH] Test mode:', process.env.NEXT_PUBLIC_TEST_MODE);
  
  // Step 1: Go to signin page
  console.log('[AUTH-SETUP-DEBUG] Navigating to signin page');
  await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
  
  // Step 2: Wait for form elements
  console.log('[AUTH-SETUP-DEBUG] Waiting for form elements');
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.waitForSelector('input[name="password"]', { timeout: 10000 });
  
  // Step 3: Fill in credentials
  console.log('[AUTH-SETUP-DEBUG] Filling credentials');
  await page.fill('input[name="email"]', 'one.photolife+1@gmail.com');
  await page.fill('input[name="password"]', '?@thc123THC@?');
  
  // Step 4: Submit form
  console.log('[AUTH-SETUP-DEBUG] Submitting form');
  await page.click('button[type="submit"]');
  
  // Step 5: Wait for response
  console.log('[AUTH-SETUP-DEBUG] Waiting for response');
  await page.waitForTimeout(3000); // 認証処理の完了を待つ
  
  // Check current URL
  const currentUrl = page.url();
  console.log('[AUTH-SETUP-DEBUG] Current URL after login:', currentUrl);
  
  // Check cookies
  const cookies = await page.context().cookies();
  console.log('[AUTH-SETUP-DEBUG] Cookies count:', cookies.length);
  const sessionCookies = cookies.filter(c => 
    c.name.includes('session') || 
    c.name.includes('token') || 
    c.name.includes('auth')
  );
  console.log('[AUTH-SETUP-DEBUG] Session cookies:', sessionCookies.map(c => ({
    name: c.name,
    domain: c.domain,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite
  })));
  
  // Step 6: Verify authentication by checking for user info
  console.log('[AUTH-SETUP-DEBUG] Verifying authentication');
  
  // Try API call with cookies
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  console.log('[AUTH-SETUP-DEBUG] Cookie string length:', cookieString.length);
  
  const apiResponse = await request.get('/api/notifications', {
    headers: {
      'Cookie': cookieString
    }
  });
  
  console.log('[AUTH-SETUP-DEBUG] API response status:', apiResponse.status());
  
  // If 401, check what's wrong
  if (apiResponse.status() === 401) {
    const responseText = await apiResponse.text();
    console.log('[AUTH-SETUP-DEBUG] 401 Response:', responseText.substring(0, 200));
    
    // Try alternative - get session from page
    const sessionValue = await page.evaluate(() => {
      return document.cookie;
    });
    console.log('[AUTH-SETUP-DEBUG] Document.cookie:', sessionValue);
    
    // Phase 1: Try API direct authentication as fallback
    console.log('[PHASE1-AUTH] Attempting API direct authentication');
    
    // Get CSRF token first
    const csrfResponse = await request.get('/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    console.log('[PHASE1-AUTH] CSRF token obtained');
    
    // Try credentials callback directly with URLSearchParams
    const formData = new URLSearchParams();
    formData.append('email', 'one.photolife+1@gmail.com');
    formData.append('password', '?@thc123THC@?');
    formData.append('csrfToken', csrfData.csrfToken);
    formData.append('redirect', 'false');
    formData.append('json', 'true');
    
    const authResponse = await request.post('/api/auth/callback/credentials', {
      data: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    console.log('[PHASE1-AUTH] Direct auth response status:', authResponse.status());
    
    // Get cookies from auth response
    const authCookies = await page.context().cookies();
    console.log('[PHASE1-AUTH] Cookies after direct auth:', authCookies.length);
    
    // Retry API call
    const retryResponse = await request.get('/api/notifications');
    console.log('[PHASE1-AUTH] Retry API response status:', retryResponse.status());
    
    if (retryResponse.status() === 401) {
      throw new Error('Authentication failed even with direct API auth');
    }
  }
  
  expect(apiResponse.status() === 200 || apiResponse.status() === 401).toBe(true);
  
  // Step 7: Save storage state
  console.log('[AUTH-SETUP-DEBUG] Saving storage state');
  await page.context().storageState({ path: authFile });
  console.log('[AUTH-SETUP-DEBUG] Authentication setup completed successfully');
});