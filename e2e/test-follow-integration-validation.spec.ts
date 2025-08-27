import { test, expect } from '@playwright/test';

test.describe('Follow Integration Validation', () => {
  test('Verify integration requirements and constraints', async ({ page }) => {
    
    // Login first
    await test.step('Login with test user', async () => {
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'testmain@example.com');
      await page.fill('input[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    // Test 1: Check board page post author section
    await test.step('Analyze post author section structure', async () => {
      await page.goto('http://localhost:3000/board');
      await page.waitForLoadState('networkidle');
      
      const postCards = page.locator('[data-testid*="post-card"]');
      const postCount = await postCards.count();
      console.log(`Found ${postCount} posts on board page`);
      
      if (postCount > 0) {
        // Check first post structure
        const firstPost = postCards.first();
        
        // Check author name element
        const authorElement = firstPost.locator('[data-testid*="post-author"]');
        const hasAuthor = await authorElement.isVisible().catch(() => false);
        
        if (hasAuthor) {
          const authorText = await authorElement.textContent();
          console.log(`Post author: ${authorText}`);
          
          // Check if there's space near author for follow button
          const authorParent = authorElement.locator('..');
          const authorParentHTML = await authorParent.innerHTML();
          console.log('Author parent HTML:', authorParentHTML.substring(0, 200));
        }
        
        // Check CardActions area
        const cardActions = firstPost.locator('.MuiCardActions-root');
        const hasCardActions = await cardActions.isVisible().catch(() => false);
        console.log(`Has CardActions: ${hasCardActions}`);
        
        // Screenshot the post card
        await firstPost.screenshot({ 
          path: 'test-results/post-card-structure.png' 
        });
      }
    });

    // Test 2: Check follow button component compatibility
    await test.step('Test follow button in isolation', async () => {
      await page.goto('http://localhost:3000/test-follow');
      
      // Test follow button functionality
      const followButton = page.locator('button:has-text("フォロー")').first();
      if (await followButton.isVisible()) {
        await followButton.click();
        await page.waitForTimeout(1000);
        
        // Check if button state changed
        const buttonText = await followButton.textContent();
        console.log(`Follow button after click: ${buttonText}`);
        
        // Check for errors
        const errorAlert = page.locator('.MuiAlert-root');
        const hasError = await errorAlert.isVisible().catch(() => false);
        if (hasError) {
          const errorText = await errorAlert.textContent();
          console.log(`Follow button error: ${errorText}`);
        }
      }
    });

    // Test 3: Check navigation integration points
    await test.step('Check navigation and routing', async () => {
      await page.goto('http://localhost:3000');
      
      // Check main navigation
      const navLinks = page.locator('nav a, [role="navigation"] a');
      const linkCount = await navLinks.count();
      console.log(`Found ${linkCount} navigation links`);
      
      // Check for profile/user pages
      const profileLink = page.locator('a[href*="profile"]');
      const hasProfileLink = await profileLink.isVisible().catch(() => false);
      console.log(`Has profile link: ${hasProfileLink}`);
      
      // Check for dashboard
      const dashboardBtn = page.locator('button:has-text("掲示板へ移動")');
      const hasDashboardBtn = await dashboardBtn.isVisible().catch(() => false);
      console.log(`Has dashboard button: ${hasDashboardBtn}`);
    });

    // Test 4: API integration check
    await test.step('Check API endpoints availability', async () => {
      // Get session cookies
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session'));
      
      if (sessionCookie) {
        // Test follow status endpoint
        const statusResponse = await page.evaluate(async () => {
          try {
            const res = await fetch('/api/follow/status', {
              method: 'GET',
              credentials: 'include'
            });
            return { 
              status: res.status, 
              ok: res.ok,
              data: res.ok ? await res.json() : null
            };
          } catch (err) {
            return { error: err.message };
          }
        });
        console.log('Follow status API:', JSON.stringify(statusResponse));
        
        // Test follow action endpoint
        const followResponse = await page.evaluate(async () => {
          try {
            const res = await fetch('/api/follow/507f1f77bcf86cd799439001', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            return { 
              status: res.status,
              ok: res.ok
            };
          } catch (err) {
            return { error: err.message };
          }
        });
        console.log('Follow action API:', JSON.stringify(followResponse));
      }
    });

    // Test 5: Check User model extension
    await test.step('Check User data structure', async () => {
      // Check if user info includes follow counts
      const userInfo = await page.evaluate(async () => {
        // Try to get user info from session or API
        try {
          const res = await fetch('/api/auth/session', {
            credentials: 'include'
          });
          const session = await res.json();
          return session.user || null;
        } catch (err) {
          return null;
        }
      });
      
      if (userInfo) {
        console.log('User info structure:', JSON.stringify(userInfo));
        console.log('Has followingCount:', 'followingCount' in userInfo);
        console.log('Has followersCount:', 'followersCount' in userInfo);
      }
    });
  });

  test('Integration placement analysis', async ({ page }) => {
    await test.step('Login', async () => {
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'testmain@example.com');
      await page.fill('input[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Analyze optimal follow button placement', async () => {
      await page.goto('http://localhost:3000/board');
      await page.waitForLoadState('networkidle');
      
      // Inject follow button into post card for testing
      await page.evaluate(() => {
        // Find author elements
        const authorElements = document.querySelectorAll('[data-testid*="post-author"]');
        
        authorElements.forEach((authorEl, index) => {
          // Create test follow button
          const testBtn = document.createElement('button');
          testBtn.textContent = 'Follow (Test)';
          testBtn.style.marginLeft = '8px';
          testBtn.style.padding = '2px 8px';
          testBtn.style.fontSize = '12px';
          testBtn.style.border = '1px solid #ccc';
          testBtn.style.borderRadius = '4px';
          testBtn.style.cursor = 'pointer';
          testBtn.setAttribute('data-test-follow', `test-${index}`);
          
          // Insert after author name
          if (authorEl.parentElement) {
            authorEl.parentElement.appendChild(testBtn);
          }
        });
        
        console.log(`Injected ${authorElements.length} test follow buttons`);
      });
      
      // Take screenshot with test buttons
      await page.screenshot({ 
        path: 'test-results/board-with-test-follow-buttons.png',
        fullPage: true
      });
      
      // Check visual appearance
      const testButtons = page.locator('[data-test-follow]');
      const testButtonCount = await testButtons.count();
      console.log(`Successfully injected ${testButtonCount} test buttons`);
    });

    await test.step('Test main page integration', async () => {
      await page.goto('http://localhost:3000');
      
      // Check if we can add follow suggestions section
      await page.evaluate(() => {
        // Find feature grid or similar section
        const mainContent = document.querySelector('main');
        if (mainContent) {
          // Create test follow suggestions section
          const suggestionSection = document.createElement('div');
          suggestionSection.innerHTML = `
            <div style="padding: 20px; margin: 20px; border: 2px dashed #667eea; border-radius: 8px;">
              <h3 style="color: #667eea;">フォロー推奨 (Test Integration)</h3>
              <p>This is where follow suggestions would appear</p>
              <button style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px;">
                View All Users
              </button>
            </div>
          `;
          
          // Insert after welcome section
          const welcomeSection = mainContent.querySelector('[class*="Paper"]');
          if (welcomeSection && welcomeSection.parentElement) {
            welcomeSection.parentElement.insertBefore(
              suggestionSection, 
              welcomeSection.nextSibling
            );
          }
        }
      });
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/main-page-with-follow-section.png',
        fullPage: true
      });
    });
  });
});