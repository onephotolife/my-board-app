import { test, expect } from '@playwright/test';

test('Basic debug test', async ({ page }) => {
  console.log('Starting test...');
  
  await page.goto('http://localhost:3000');
  console.log('Page loaded');
  
  // Take a screenshot first
  await page.screenshot({ path: 'tests/screenshots/debug-homepage.png', fullPage: true });
  
  // Get page content
  const title = await page.title();
  console.log('Page title:', title);
  
  // Look for any links with auth paths
  const authLinks = await page.locator('a[href*="auth"]').all();
  console.log('Found auth links:', authLinks.length);
  
  for (let i = 0; i < authLinks.length; i++) {
    const href = await authLinks[i].getAttribute('href');
    const text = await authLinks[i].textContent();
    const isVisible = await authLinks[i].isVisible();
    console.log(`Auth link ${i + 1}: href="${href}", text="${text}", visible=${isVisible}`);
  }
  
  // Look specifically for signin and signup buttons
  const signinButtons = await page.locator('a[href="/auth/signin"]').all();
  const signupButtons = await page.locator('a[href="/auth/signup"]').all();
  
  console.log(`Found ${signinButtons.length} signin buttons`);
  console.log(`Found ${signupButtons.length} signup buttons`);
  
  // Check if we're authenticated or not
  const sessionStatus = await page.evaluate(() => {
    return (window as any).next?.auth?.status || 'unknown';
  });
  console.log('Session status:', sessionStatus);
});