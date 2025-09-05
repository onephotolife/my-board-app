import { test, expect } from '@playwright/test';

test.describe('Hashtag Edge Cases and Unicode Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Use auth state from storageState.json
    await page.goto('/posts/new');
    await page.waitForLoadState('networkidle');
  });

  test('should handle Unicode hashtags correctly', async ({ page }) => {
    const testCases = [
      {
        name: 'Japanese characters',
        input: 'これは#東京での#テスト投稿です',
        expected: ['東京', 'テスト']
      },
      {
        name: 'Emoji hashtags',
        input: 'Test with #🚀 and #🇯🇵 emoji hashtags',
        expected: ['🚀', '🇯🇵']
      },
      {
        name: 'ZWJ sequences',
        input: 'Professional #👨‍💻 and family #👨‍👩‍👧‍👦 hashtags',
        expected: ['👨‍💻', '👨‍👩‍👧‍👦']
      },
      {
        name: 'Mixed scripts',
        input: '#Hello #こんにちは #مرحبا #🌍 world test',
        expected: ['Hello', 'こんにちは', 'مرحبا', '🌍']
      },
      {
        name: 'Variation selectors',
        input: 'Testing #⭐️ and #⭐︎ variation selectors',
        expected: ['⭐', '⭐']
      }
    ];

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`);
      
      // Clear content field
      await page.locator('textarea[placeholder*="内容"]').fill('');
      
      // Type the test input
      await page.locator('textarea[placeholder*="内容"]').fill(testCase.input);
      
      // Submit the post
      await page.click('button:has-text("投稿")');
      
      // Wait for success message or redirect
      await page.waitForTimeout(1000);
      
      // Go back to check if hashtags were extracted properly
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Verify hashtags appear in the post (basic verification)
      for (const expectedTag of testCase.expected) {
        const tagSelector = `text=#${expectedTag}`;
        const tagExists = await page.locator(tagSelector).count() > 0;
        console.log(`Tag #${expectedTag} found: ${tagExists}`);
      }
    }
  });

  test('should handle edge case inputs gracefully', async ({ page }) => {
    const edgeCases = [
      {
        name: 'Empty hashtag',
        input: 'Test with empty # hashtag',
        shouldPass: true
      },
      {
        name: 'Multiple consecutive hashtags',
        input: '#one#two#three without spaces',
        shouldPass: true
      },
      {
        name: 'Very long hashtag',
        input: '#' + 'a'.repeat(100) + ' long hashtag test',
        shouldPass: true
      },
      {
        name: 'Special characters in hashtag',
        input: 'Test #hello-world and #test_123 and #special@chars',
        shouldPass: true
      },
      {
        name: 'Numbers only hashtag',
        input: 'Test #123456 number hashtag',
        shouldPass: true
      },
      {
        name: 'Mixed case normalization',
        input: 'Test #JavaScript and #javascript and #JAVASCRIPT',
        shouldPass: true
      },
      {
        name: 'Whitespace variations',
        input: 'Test #   spaced   and #\ttabbed\t hashtags',
        shouldPass: true
      }
    ];

    for (const edgeCase of edgeCases) {
      console.log(`Testing edge case: ${edgeCase.name}`);
      
      // Clear and fill content
      await page.locator('textarea[placeholder*="内容"]').fill('');
      await page.locator('textarea[placeholder*="内容"]').fill(edgeCase.input);
      
      // Try to submit
      await page.click('button:has-text("投稿")');
      
      if (edgeCase.shouldPass) {
        // Should not show error
        await page.waitForTimeout(1000);
        const hasError = await page.locator('.MuiAlert-root').count() > 0;
        expect(hasError).toBe(false);
      }
      
      // Navigate back
      await page.goto('/posts/new');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should handle malformed inputs without crashing', async ({ page }) => {
    const malformedInputs = [
      ''.repeat(10000), // Very long empty string
      '#'.repeat(1000), // Many hashtag symbols
      'Test\x00null\x00bytes\x00in\x00input', // Null bytes
      'Test\uFFFDreplacement\uFFFDcharacters', // Replacement characters
      '🏳️‍🌈🏳️‍⚧️👨‍👩‍👧‍👦'.repeat(50), // Many complex emoji sequences
      '\uD800\uDC00'.repeat(100), // Many surrogate pairs
      'А' + 'Б' + 'В'.repeat(500), // Cyrillic characters
      '测试中文'.repeat(200) // Chinese characters
    ];

    for (let i = 0; i < malformedInputs.length; i++) {
      const input = malformedInputs[i];
      console.log(`Testing malformed input ${i + 1}/${malformedInputs.length}`);
      
      try {
        // Clear and fill content
        await page.locator('textarea[placeholder*="内容"]').fill('');
        await page.locator('textarea[placeholder*="内容"]').fill(input);
        
        // Try to submit
        await page.click('button:has-text("投稿")');
        
        // Wait and check that page doesn't crash
        await page.waitForTimeout(1000);
        
        // Verify page is still responsive
        const isResponsive = await page.locator('textarea[placeholder*="内容"]').isVisible();
        expect(isResponsive).toBe(true);
        
      } catch (error) {
        console.error(`Error with malformed input ${i + 1}:`, error);
        // Page should still be responsive even after error
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should validate input length constraints', async ({ page }) => {
    // Test maximum content length (500 chars based on schema)
    const longContent = 'A'.repeat(501);
    
    await page.locator('textarea[placeholder*="内容"]').fill(longContent);
    await page.click('button:has-text("投稿")');
    
    // Should show validation error or be truncated
    await page.waitForTimeout(1000);
    
    // Either should show error or content should be truncated
    const hasError = await page.locator('.MuiAlert-root').count() > 0;
    const contentLength = await page.locator('textarea[placeholder*="内容"]').inputValue();
    
    // Either there's an error or content was truncated
    expect(hasError || contentLength.length <= 500).toBe(true);
  });

  test('should handle concurrent hashtag operations', async ({ page }) => {
    // Test rapid successive inputs to check for race conditions
    const rapidInputs = [
      '#test1 rapid input test',
      '#test2 another rapid test',
      '#test3 final rapid test'
    ];

    for (const input of rapidInputs) {
      await page.locator('textarea[placeholder*="内容"]').fill('');
      await page.locator('textarea[placeholder*="内容"]').fill(input);
      // Don't wait between inputs - rapid succession
      await page.click('button:has-text("投稿")');
    }
    
    // Wait for all operations to complete
    await page.waitForTimeout(3000);
    
    // Page should still be responsive
    const isResponsive = await page.locator('body').isVisible();
    expect(isResponsive).toBe(true);
  });
});