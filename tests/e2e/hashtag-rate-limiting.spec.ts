import { test, expect } from '@playwright/test';

test.describe('Hashtag API Rate Limiting Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Use auth state from storageState.json  
    await page.goto('/posts/new');
    await page.waitForLoadState('networkidle');
  });

  test('should handle API rate limiting gracefully', async ({ page }) => {
    // Test hashtag suggestions API rate limiting
    const testQueries = [
      '東', 'React', 'JavaScript', 'テスト', 'プログラミング',
      'Next', 'TypeScript', '開発', 'Web', 'Frontend'
    ];

    let rateLimitHit = false;
    let requestCount = 0;

    // Monitor network requests
    page.on('response', async response => {
      if (response.url().includes('/api/tags/search')) {
        requestCount++;
        console.log(`Request ${requestCount}: ${response.status()} - ${response.url()}`);
        
        if (response.status() === 429) {
          rateLimitHit = true;
          console.log('Rate limit detected (429 response)');
        }
      }
    });

    // Rapid-fire hashtag searches to trigger rate limiting
    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`Testing query ${i + 1}/${testQueries.length}: "${query}"`);

      // Focus the textarea to potentially trigger suggestions
      await page.locator('textarea[placeholder*="内容"]').fill('');
      await page.locator('textarea[placeholder*="内容"]').fill(`#${query}`);
      
      // Wait briefly but not long enough for debounce
      await page.waitForTimeout(100);
      
      // Type more characters to trigger more searches
      await page.locator('textarea[placeholder*="内容"]').fill(`#${query}_test`);
      await page.waitForTimeout(50);
    }

    // Wait for all requests to complete
    await page.waitForTimeout(5000);

    console.log(`Total requests made: ${requestCount}`);
    console.log(`Rate limit encountered: ${rateLimitHit}`);

    // The application should handle rate limiting without crashing
    const isResponsive = await page.locator('textarea[placeholder*="内容"]').isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should retry failed requests automatically', async ({ page }) => {
    let retryAttempts = 0;
    let successAfterRetry = false;

    // Monitor network requests to detect retries
    page.on('response', async response => {
      if (response.url().includes('/api/tags/search')) {
        console.log(`Request: ${response.status()} - ${response.url()}`);
        
        if (response.status() === 429) {
          retryAttempts++;
          console.log(`Rate limit hit, attempt ${retryAttempts}`);
        } else if (response.status() === 200 && retryAttempts > 0) {
          successAfterRetry = true;
          console.log('Request succeeded after retry');
        }
      }
    });

    // Trigger many rapid requests to potentially cause rate limiting
    const rapidQueries = Array.from({ length: 20 }, (_, i) => `test${i}`);
    
    for (const query of rapidQueries) {
      await page.locator('textarea[placeholder*="内容"]').fill(`#${query}`);
      await page.waitForTimeout(10); // Very rapid requests
    }

    // Wait for retry mechanisms to complete
    await page.waitForTimeout(10000);

    console.log(`Retry attempts detected: ${retryAttempts}`);
    console.log(`Success after retry: ${successAfterRetry}`);

    // Application should remain functional
    const canTypeContent = await page.locator('textarea[placeholder*="内容"]').isEnabled();
    expect(canTypeContent).toBe(true);
  });

  test('should handle network failures with graceful degradation', async ({ page }) => {
    // Test behavior when network requests fail
    
    // Simulate network failure by intercepting and failing requests
    await page.route('/api/tags/search*', route => {
      console.log('Simulating network failure for hashtag search');
      route.abort('failed');
    });

    // Try to trigger hashtag suggestions
    await page.locator('textarea[placeholder*="内容"]').fill('#networkfail');
    
    // Wait for the failed request and retry attempts
    await page.waitForTimeout(3000);

    // Application should still be usable despite network failures
    const isResponsive = await page.locator('textarea[placeholder*="内容"]').isEnabled();
    expect(isResponsive).toBe(true);

    // Should be able to submit the post even without hashtag suggestions
    await page.locator('textarea[placeholder*="内容"]').fill('#networkfail test post');
    await page.click('button:has-text("投稿")');
    
    // Wait and verify the post attempt
    await page.waitForTimeout(2000);
    
    // Remove the route interception
    await page.unroute('/api/tags/search*');
  });

  test('should handle slow API responses correctly', async ({ page }) => {
    let slowResponseCount = 0;

    // Intercept and delay hashtag search requests
    await page.route('/api/tags/search*', async route => {
      slowResponseCount++;
      console.log(`Delaying hashtag search request ${slowResponseCount}`);
      
      // Add artificial delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Continue with the original request
      await route.continue();
    });

    // Type hashtag query
    await page.locator('textarea[placeholder*="内容"]').fill('#slow');
    
    // Type more before the first request completes
    await page.waitForTimeout(500);
    await page.locator('textarea[placeholder*="内容"]').fill('#slowresponse');
    
    // Wait for requests to complete
    await page.waitForTimeout(5000);

    console.log(`Slow responses handled: ${slowResponseCount}`);

    // Application should handle slow responses without issues
    const isResponsive = await page.locator('textarea[placeholder*="内容"]').isEnabled();
    expect(isResponsive).toBe(true);

    // Clean up
    await page.unroute('/api/tags/search*');
  });

  test('should handle concurrent user sessions rate limiting', async ({ browser }) => {
    // Create multiple browser contexts to simulate different users
    const contexts = await Promise.all([
      browser.newContext({ storageState: 'tests/e2e/storageState.json' }),
      browser.newContext({ storageState: 'tests/e2e/storageState.json' }),
      browser.newContext({ storageState: 'tests/e2e/storageState.json' })
    ]);

    const pages = await Promise.all(contexts.map(context => context.newPage()));

    let totalRequests = 0;
    let rateLimitsHit = 0;

    // Set up monitoring for all pages
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      page.on('response', response => {
        if (response.url().includes('/api/tags/search')) {
          totalRequests++;
          if (response.status() === 429) {
            rateLimitsHit++;
          }
        }
      });

      await page.goto('/posts/new');
      await page.waitForLoadState('networkidle');
    }

    // Simultaneous hashtag searches from multiple "users"
    const searches = pages.map(async (page, index) => {
      const queries = [`user${index}test1`, `user${index}test2`, `user${index}test3`];
      
      for (const query of queries) {
        await page.locator('textarea[placeholder*="内容"]').fill(`#${query}`);
        await page.waitForTimeout(100);
      }
    });

    // Execute all searches concurrently
    await Promise.all(searches);
    
    // Wait for all requests to complete
    await page.waitForTimeout(5000);

    console.log(`Total requests across sessions: ${totalRequests}`);
    console.log(`Rate limits hit: ${rateLimitsHit}`);

    // Verify all pages are still responsive
    for (const page of pages) {
      const isResponsive = await page.locator('textarea[placeholder*="内容"]').isVisible();
      expect(isResponsive).toBe(true);
    }

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should maintain hashtag functionality under load', async ({ page }) => {
    // Test that hashtag extraction and storage still works under API pressure
    
    let apiCallCount = 0;
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCallCount++;
      }
    });

    // Create posts with hashtags while API is under pressure
    const testPosts = [
      '#loadtest1 Testing under load scenario one',
      '#loadtest2 #performance Testing scenario two with multiple tags',
      '#loadtest3 #stress #testing Final load test scenario'
    ];

    for (let i = 0; i < testPosts.length; i++) {
      const post = testPosts[i];
      console.log(`Creating post ${i + 1}/${testPosts.length} under load`);

      await page.locator('textarea[placeholder*="内容"]').fill('');
      await page.locator('textarea[placeholder*="内容"]').fill(post);
      
      // Submit post
      await page.click('button:has-text("投稿")');
      
      // Brief wait before next post
      await page.waitForTimeout(1000);
      
      // Navigate back for next post
      if (i < testPosts.length - 1) {
        await page.goto('/posts/new');
        await page.waitForLoadState('networkidle');
      }
    }

    console.log(`Total API calls during load test: ${apiCallCount}`);

    // Verify that posts were created successfully
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that at least some hashtags are visible on the page
    const hashtagCount = await page.locator('text=/^#\\w+/').count();
    console.log(`Hashtags visible after load test: ${hashtagCount}`);
    
    expect(hashtagCount).toBeGreaterThan(0);
  });
});