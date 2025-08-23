import { test, expect } from '@playwright/test';

test.describe('ローカル: モバイル表示修正の検証', () => {
  const baseURL = 'http://localhost:3000';
  
  // iPhone SE サイズでテスト
  test.use({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    // 認証をスキップしてテストユーザーでログイン済み状態を想定
    await page.goto(baseURL);
  });

  test('Profile page - mobile padding fix verification', async ({ page }) => {
    await page.goto(`${baseURL}/profile`);
    await page.waitForTimeout(2000);
    
    // モバイル AppBar が表示されていることを確認
    const appBar = page.locator('[class*="MuiAppBar"]').first();
    await expect(appBar).toBeVisible();
    
    // プロフィールタイトルがAppBarの下に正しく表示されていることを確認
    const profileTitle = page.locator('text=プロフィール').first();
    await expect(profileTitle).toBeVisible();
    
    // タイトルの位置がAppBar（64px）より下にあることを確認
    const titlePosition = await page.evaluate(() => {
      const titleElement = document.querySelector('*:has-text("プロフィール")');
      return titleElement ? titleElement.getBoundingClientRect().top : 0;
    });
    
    console.log('プロフィールタイトル位置:', titlePosition, 'px');
    expect(titlePosition).toBeGreaterThan(64); // AppBarの高さより下
    
    // スクリーンショット撮影
    await page.screenshot({ 
      path: 'test-results/local-profile-mobile-fix.png', 
      fullPage: true 
    });
  });

  test('Posts new page - mobile padding fix verification', async ({ page }) => {
    await page.goto(`${baseURL}/posts/new`);
    await page.waitForTimeout(2000);
    
    // モバイル AppBar が表示されていることを確認
    const appBar = page.locator('[class*="MuiAppBar"]').first();
    await expect(appBar).toBeVisible();
    
    // 新規投稿タイトルがAppBarの下に正しく表示されていることを確認
    const newPostTitle = page.locator('text=新規投稿').first();
    await expect(newPostTitle).toBeVisible();
    
    // タイトルの位置がAppBar（64px）より下にあることを確認
    const titlePosition = await page.evaluate(() => {
      const titleElement = document.querySelector('*:has-text("新規投稿")');
      return titleElement ? titleElement.getBoundingClientRect().top : 0;
    });
    
    console.log('新規投稿タイトル位置:', titlePosition, 'px');
    expect(titlePosition).toBeGreaterThan(64); // AppBarの高さより下
    
    // フォーム要素が正しく表示されていることも確認
    const titleInput = page.locator('input[placeholder*="タイトル"], label:has-text("タイトル") + div input').first();
    await expect(titleInput).toBeVisible();
    
    // スクリーンショット撮影
    await page.screenshot({ 
      path: 'test-results/local-posts-new-mobile-fix.png', 
      fullPage: true 
    });
  });

  test('My posts page - mobile padding fix verification', async ({ page }) => {
    await page.goto(`${baseURL}/my-posts`);
    await page.waitForTimeout(2000);
    
    // モバイル AppBar が表示されていることを確認
    const appBar = page.locator('[class*="MuiAppBar"]').first();
    await expect(appBar).toBeVisible();
    
    // マイポストタイトルがAppBarの下に正しく表示されていることを確認
    const myPostsTitle = page.locator('text=自分の投稿').first();
    await expect(myPostsTitle).toBeVisible();
    
    // タイトルの位置がAppBar（64px）より下にあることを確認  
    const titlePosition = await page.evaluate(() => {
      const titleElement = document.querySelector('*:has-text("自分の投稿")');
      return titleElement ? titleElement.getBoundingClientRect().top : 0;
    });
    
    console.log('自分の投稿タイトル位置:', titlePosition, 'px');
    expect(titlePosition).toBeGreaterThan(64); // AppBarの高さより下
    
    // 統計カードが表示されていることを確認
    const statsCard = page.locator('text=総投稿数').first();
    await expect(statsCard).toBeVisible();
    
    // スクリーンショット撮影
    await page.screenshot({ 
      path: 'test-results/local-my-posts-mobile-fix.png', 
      fullPage: true 
    });
  });

  test('Mobile hamburger menu functionality', async ({ page }) => {
    await page.goto(`${baseURL}/profile`);
    await page.waitForTimeout(2000);
    
    // ハンバーガーメニューボタンが表示されていることを確認
    const menuButton = page.locator('button[aria-label="open drawer"]');
    await expect(menuButton).toBeVisible();
    
    // メニューボタンをクリック
    await menuButton.click();
    
    // サイドバードロワーが表示されることを確認
    const drawer = page.locator('.MuiDrawer-root .MuiDrawer-paper');
    await expect(drawer).toBeVisible();
    
    // アバターとユーザー情報が表示されることを確認
    const avatar = page.locator('.MuiDrawer-root .MuiAvatar-root').first();
    await expect(avatar).toBeVisible();
    
    // メニュー項目が表示されることを確認
    const menuItem = page.locator('.MuiDrawer-root text=自分の投稿').first();
    await expect(menuItem).toBeVisible();
    
    // 閉じるボタンが表示されることを確認
    const closeButton = page.locator('.MuiDrawer-root button').first();
    await expect(closeButton).toBeVisible();
    
    // スクリーンショット撮影
    await page.screenshot({ 
      path: 'test-results/local-mobile-drawer-fix.png', 
      fullPage: true 
    });
    
    // ドロワーを閉じる
    await closeButton.click();
    await expect(drawer).not.toBeVisible();
  });

  test('All pages - mobile responsive layout check', async ({ page }) => {
    const testPages = [
      { path: '/profile', title: 'プロフィール' },
      { path: '/posts/new', title: '新規投稿' },
      { path: '/my-posts', title: '自分の投稿' }
    ];

    for (const testPage of testPages) {
      await page.goto(`${baseURL}${testPage.path}`);
      await page.waitForTimeout(2000);
      
      console.log(`Testing page: ${testPage.path}`);
      
      // ページコンテンツがビューポート内で正しく表示されることを確認
      const pageContent = await page.evaluate(() => {
        const body = document.body;
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        
        return {
          bodyWidth: body.scrollWidth,
          bodyHeight: body.scrollHeight,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          hasHorizontalScroll: body.scrollWidth > viewport.width
        };
      });
      
      console.log(`${testPage.title} - Body Width: ${pageContent.bodyWidth}px, Viewport: ${pageContent.viewportWidth}px`);
      
      // 水平スクロールが発生していないことを確認（モバイル最適化）
      expect(pageContent.bodyWidth).toBeLessThanOrEqual(pageContent.viewportWidth + 20); // 20pxの誤差を許容
      expect(pageContent.hasHorizontalScroll).toBeFalsy();
      
      // AppBarの高さとz-indexが正しく設定されていることを確認
      const appBarInfo = await page.evaluate(() => {
        const appBar = document.querySelector('[class*="MuiAppBar"]');
        if (!appBar) return { height: 0, zIndex: 0 };
        
        const styles = getComputedStyle(appBar);
        return {
          height: appBar.getBoundingClientRect().height,
          zIndex: parseInt(styles.zIndex || '0', 10)
        };
      });
      
      console.log(`${testPage.title} - AppBar Height: ${appBarInfo.height}px, Z-Index: ${appBarInfo.zIndex}`);
      expect(appBarInfo.height).toBeGreaterThan(56); // 最低限のAppBar高さ
      expect(appBarInfo.zIndex).toBeGreaterThan(1000); // 適切なz-index
    }
  });
});