import { test, expect } from '@playwright/test';

test.describe('Follow System Integration Analysis', () => {
  test('Check current state of main page and test-follow page', async ({ page }) => {
    // 1. Main page structure check
    await test.step('Check main page structure', async () => {
      await page.goto('http://localhost:3000');
      
      // Check if page loads
      await expect(page).toHaveTitle(/会員制掲示板/);
      
      // Check for auth buttons (non-authenticated state)
      const loginButton = page.getByRole('link', { name: /ログイン/i });
      const signupButton = page.getByRole('link', { name: /新規登録/i });
      
      if (await loginButton.isVisible()) {
        console.log('Main page: Login/Signup buttons visible (not authenticated)');
      } else {
        console.log('Main page: User might be authenticated');
      }
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'test-results/main-page-current.png',
        fullPage: true 
      });
    });

    // 2. Test-follow page structure check
    await test.step('Check test-follow page structure', async () => {
      await page.goto('http://localhost:3000/test-follow');
      
      // Wait for page load
      await page.waitForLoadState('networkidle');
      
      // Check page title
      const pageTitle = page.locator('h1');
      await expect(pageTitle).toContainText('フォローボタン テストページ');
      
      // Check for follow buttons
      const followButtons = page.locator('button:has-text("フォロー"), button:has-text("フォロー中")');
      const buttonCount = await followButtons.count();
      console.log(`Test-follow page: Found ${buttonCount} follow buttons`);
      
      // Check auth status display
      const authStatus = page.locator('text=/ログイン中|未ログイン/');
      const authText = await authStatus.textContent();
      console.log(`Test-follow page auth status: ${authText}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/test-follow-page-current.png',
        fullPage: true 
      });
    });

    // 3. Board page structure check (where integration should happen)
    await test.step('Check board page structure', async () => {
      // First login if needed
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'testmain@example.com');
      await page.fill('input[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      
      // Wait for redirect
      await page.waitForURL(/\/(board|$)/);
      
      // Go to board page
      await page.goto('http://localhost:3000/board');
      await page.waitForLoadState('networkidle');
      
      // Check for posts
      const posts = page.locator('[class*="Card"]').first();
      const hasCards = await posts.isVisible().catch(() => false);
      console.log(`Board page: Has posts/cards: ${hasCards}`);
      
      // Check for user info in posts
      const authorInfo = page.locator('text=/投稿者|作成者|by/i').first();
      const hasAuthorInfo = await authorInfo.isVisible().catch(() => false);
      console.log(`Board page: Has author information: ${hasAuthorInfo}`);
      
      // Look for any follow-related UI
      const followElements = page.locator('button:has-text("フォロー"), button:has-text("Follow")');
      const hasFollowButtons = await followElements.count() > 0;
      console.log(`Board page: Currently has follow buttons: ${hasFollowButtons}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/board-page-current.png',
        fullPage: true 
      });
    });

    // 4. Check authenticated main page
    await test.step('Check authenticated main page', async () => {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      
      // Check welcome section
      const welcomeSection = page.locator('text=/おかえりなさい/');
      const hasWelcome = await welcomeSection.isVisible().catch(() => false);
      console.log(`Authenticated main page: Has welcome section: ${hasWelcome}`);
      
      // Check for board button
      const boardButton = page.locator('button:has-text("掲示板へ移動")');
      const hasBoardButton = await boardButton.isVisible().catch(() => false);
      console.log(`Authenticated main page: Has board button: ${hasBoardButton}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/main-page-authenticated.png',
        fullPage: true 
      });
    });
  });

  test('Analyze integration points', async ({ page }) => {
    await test.step('Login first', async () => {
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'testmain@example.com');
      await page.fill('input[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(board|$)/);
    });

    await test.step('Check board page post structure', async () => {
      await page.goto('http://localhost:3000/board');
      await page.waitForLoadState('networkidle');
      
      // Analyze post card structure
      const postCard = page.locator('[class*="Card"]').first();
      if (await postCard.isVisible()) {
        // Check what elements exist in a post card
        const cardHTML = await postCard.innerHTML();
        console.log('Post card structure sample:', cardHTML.substring(0, 500));
        
        // Check for author section
        const authorSection = postCard.locator('[class*="author"], [class*="Author"], text=/投稿者/')
        const hasAuthorSection = await authorSection.isVisible().catch(() => false);
        console.log(`Post has dedicated author section: ${hasAuthorSection}`);
        
        // Check for action buttons area
        const actionButtons = postCard.locator('[class*="CardActions"], [class*="actions"]');
        const hasActionArea = await actionButtons.isVisible().catch(() => false);
        console.log(`Post has action buttons area: ${hasActionArea}`);
      }
    });

    await test.step('Check user profile integration points', async () => {
      // Check if there's a profile page
      await page.goto('http://localhost:3000/profile').catch(() => {
        console.log('No profile page found at /profile');
      });
      
      // Check dashboard
      await page.goto('http://localhost:3000/dashboard').catch(() => {
        console.log('No dashboard page found at /dashboard');
      });
    });
  });
});