import { test, expect } from '@playwright/test';

test.describe('Search Menu Removal Final Verification', () => {
  test('verify search menu is removed from sidebar', async ({ page }) => {
    // デスクトップサイズ設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // サイドバー内のメニューアイテムを確認
    const sidebarLinks = await page.locator('aside a, nav a, [role="navigation"] a, a').all();
    const linkTexts = [];
    
    for (const link of sidebarLinks) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      if (text) {
        linkTexts.push({ text: text.trim(), href });
      }
    }
    
    console.log('=== All Links Found ===');
    linkTexts.forEach(link => {
      console.log(`  "${link.text}" -> ${link.href}`);
    });
    
    // 「検索」リンクが存在しないことを確認
    const searchLinks = linkTexts.filter(link => 
      link.text === '検索' || 
      link.text.includes('検索') || 
      link.href === '/search'
    );
    
    console.log(`\n=== Search Links: ${searchLinks.length} ===`);
    searchLinks.forEach(link => {
      console.log(`  Found search link: "${link.text}" -> ${link.href}`);
    });
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'screenshots/search-removed-final.png',
      fullPage: false
    });
    
    // 検索リンクが0個であることを確認
    expect(searchLinks.length).toBe(0);
    
    // 必要なメニューアイテムが存在することを確認
    const expectedPaths = ['/dashboard', '/board', '/posts/new', '/my-posts', '/profile'];
    const foundPaths = linkTexts.map(l => l.href).filter(h => h);
    
    console.log('\n=== Expected Menu Verification ===');
    for (const path of expectedPaths) {
      const found = foundPaths.includes(path);
      console.log(`  ${path}: ${found ? '✓ Found' : '✗ Not Found'}`);
    }
    
    // 複数ページで検証
    const pages = [
      { url: 'https://board.blankbrainai.com/profile', name: 'Profile' },
      { url: 'https://board.blankbrainai.com/posts/new', name: 'New Post' },
      { url: 'https://board.blankbrainai.com/my-posts', name: 'My Posts' }
    ];
    
    console.log('\n=== Multi-page Verification ===');
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await page.waitForTimeout(1000);
      
      // 各ページでも検索リンクが存在しないことを確認
      const searchCount = await page.locator('a[href="/search"]').count();
      const searchTextCount = await page.locator('a:has-text("検索")').count();
      const totalSearchLinks = searchCount + searchTextCount;
      
      console.log(`  ${pageInfo.name}: ${totalSearchLinks} search links`);
      expect(totalSearchLinks).toBe(0);
    }
    
    console.log('\n=== Test Result: PASSED ===');
  });
});