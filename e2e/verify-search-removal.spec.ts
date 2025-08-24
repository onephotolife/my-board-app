import { test, expect } from '@playwright/test';

test.describe('Search Menu Removal Verification', () => {
  test('verify search menu item is removed', async ({ page }) => {
    // デスクトップサイズ設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // サイドバーメニューアイテムの確認
    const menuItems = await page.locator('nav a, aside a, [role="navigation"] a').all();
    const menuTexts = [];
    
    for (const item of menuItems) {
      const text = await item.textContent();
      if (text) {
        menuTexts.push(text.trim());
      }
    }
    
    console.log('=== Menu Items Found ===');
    console.log(menuTexts.join(', '));
    
    // 「検索」メニューが存在しないことを確認
    const hasSearchMenu = menuTexts.some(text => text === '検索' || text.includes('検索'));
    expect(hasSearchMenu).toBe(false);
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'screenshots/search-removed-verification.png',
      fullPage: false
    });
    
    // 必要なメニューアイテムが存在することを確認
    const expectedMenus = ['ダッシュボード', '掲示板', '新規投稿', '自分の投稿', 'プロフィール'];
    for (const expectedMenu of expectedMenus) {
      const hasMenu = menuTexts.some(text => text.includes(expectedMenu));
      console.log(`${expectedMenu}: ${hasMenu ? 'Found' : 'Not Found'}`);
      expect(hasMenu).toBe(true);
    }
    
    // 複数ページで検証
    const pages = [
      'https://board.blankbrainai.com/profile',
      'https://board.blankbrainai.com/posts/new',
      'https://board.blankbrainai.com/my-posts'
    ];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForTimeout(1000);
      
      // 各ページでも検索メニューが存在しないことを確認
      const searchLink = await page.locator('a[href="/search"], a:has-text("検索")').count();
      console.log(`${url}: Search links found = ${searchLink}`);
      expect(searchLink).toBe(0);
    }
  });
});