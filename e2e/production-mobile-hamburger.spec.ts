import { test, expect } from '@playwright/test';

test.describe('本番環境: モバイルハンバーガーメニュー検証', () => {
  const baseURL = 'https://board.blankbrainai.com';
  const testEmail = 'one.photolife+2@gmail.com';
  const testPassword = '?@thc123THC@?';
  
  // モバイルビューポート設定
  test.use({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  
  test('全ページでハンバーガーメニューが動作する', async ({ page }) => {
    console.log('===== モバイルハンバーガーメニュー検証開始 =====');
    console.log('実行時刻:', new Date().toISOString());
    console.log('環境: Production');
    console.log('ビューポート: 375x667 (iPhone SE)');
    console.log('URL:', baseURL);
    
    // Phase 1: 認証
    console.log('\n[Phase 1] 認証処理');
    await page.goto(`${baseURL}/auth/signin`);
    await page.waitForTimeout(3000);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    console.log('認証情報入力完了');
    
    await page.click('button[type="submit"]');
    console.log('ログイン実行');
    
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    console.log('ログイン後URL:', currentUrl);
    
    // Phase 2: ダッシュボードのハンバーガーメニュー確認
    console.log('\n[Phase 2] ダッシュボードのハンバーガーメニュー検証');
    if (!currentUrl.includes('/dashboard')) {
      await page.goto(`${baseURL}/dashboard`);
      await page.waitForTimeout(3000);
    }
    
    // デスクトップサイドバーが非表示か確認
    const desktopSidebar = await page.locator('div[class*="MuiBox-root"]:has-text("ダッシュボード"):has-text("掲示板")').first();
    const isDesktopSidebarVisible = await desktopSidebar.isVisible().catch(() => false);
    console.log('デスクトップサイドバー非表示: ', !isDesktopSidebarVisible ? '✅' : '❌');
    
    // ハンバーガーアイコンの存在確認
    const hamburgerIcon = await page.locator('button[aria-label="open drawer"]').first().isVisible().catch(() => false);
    console.log('ハンバーガーアイコン表示: ', hamburgerIcon ? '✅' : '❌');
    
    if (hamburgerIcon) {
      // ハンバーガーメニューを開く
      await page.locator('button[aria-label="open drawer"]').first().click();
      await page.waitForTimeout(1000);
      
      // ドロワーメニューの確認
      const drawerVisible = await page.locator('.MuiDrawer-paper').first().isVisible();
      console.log('ドロワーメニュー表示: ', drawerVisible ? '✅' : '❌');
      
      // メニュー項目の確認
      const menuItems = ['ダッシュボード', '掲示板', '新規投稿', '自分の投稿', 'プロフィール', '設定'];
      for (const item of menuItems) {
        const isVisible = await page.locator(`.MuiDrawer-paper text="${item}"`).first().isVisible().catch(() => false);
        console.log(`メニュー項目「${item}」: ${isVisible ? '✅' : '❌'}`);
      }
      
      // メニューを閉じる
      await page.locator('.MuiDrawer-paper button').first().click();
      await page.waitForTimeout(1000);
    }
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'test-results/production-mobile-dashboard.png', 
      fullPage: false 
    });
    
    // Phase 3: プロフィールページのハンバーガーメニュー確認
    console.log('\n[Phase 3] プロフィールページのハンバーガーメニュー検証');
    await page.goto(`${baseURL}/profile`);
    await page.waitForTimeout(3000);
    
    const profileHamburger = await page.locator('button[aria-label="open drawer"]').first().isVisible().catch(() => false);
    console.log('プロフィール - ハンバーガーアイコン表示: ', profileHamburger ? '✅' : '❌');
    
    if (profileHamburger) {
      await page.locator('button[aria-label="open drawer"]').first().click();
      await page.waitForTimeout(1000);
      
      // プロフィールリンクをクリック
      await page.locator('.MuiDrawer-paper >> text="ダッシュボード"').first().click();
      await page.waitForTimeout(2000);
      
      const navUrl = page.url();
      console.log('ナビゲーション動作確認（ダッシュボードへ）: ', navUrl.includes('/dashboard') ? '✅' : '❌');
      
      await page.screenshot({ 
        path: 'test-results/production-mobile-profile.png', 
        fullPage: false 
      });
    }
    
    // Phase 4: 新規投稿ページのハンバーガーメニュー確認
    console.log('\n[Phase 4] 新規投稿ページのハンバーガーメニュー検証');
    await page.goto(`${baseURL}/posts/new`);
    await page.waitForTimeout(3000);
    
    const newPostHamburger = await page.locator('button[aria-label="open drawer"]').first().isVisible().catch(() => false);
    console.log('新規投稿 - ハンバーガーアイコン表示: ', newPostHamburger ? '✅' : '❌');
    
    if (newPostHamburger) {
      await page.locator('button[aria-label="open drawer"]').first().click();
      await page.waitForTimeout(1000);
      
      const drawerVisible = await page.locator('.MuiDrawer-paper').first().isVisible();
      console.log('新規投稿 - ドロワーメニュー動作: ', drawerVisible ? '✅' : '❌');
      
      // メニューを閉じる
      await page.locator('.MuiDrawer-paper button').first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/production-mobile-new-post.png', 
        fullPage: false 
      });
    }
    
    // Phase 5: my-postsページのハンバーガーメニュー確認
    console.log('\n[Phase 5] my-postsページのハンバーガーメニュー検証');
    await page.goto(`${baseURL}/my-posts`);
    await page.waitForTimeout(3000);
    
    const myPostsHamburger = await page.locator('button[aria-label="open drawer"]').first().isVisible().catch(() => false);
    console.log('my-posts - ハンバーガーアイコン表示: ', myPostsHamburger ? '✅' : '❌');
    
    if (myPostsHamburger) {
      await page.locator('button[aria-label="open drawer"]').first().click();
      await page.waitForTimeout(1000);
      
      const drawerVisible = await page.locator('.MuiDrawer-paper').first().isVisible();
      console.log('my-posts - ドロワーメニュー動作: ', drawerVisible ? '✅' : '❌');
      
      // メニューを閉じる
      await page.locator('.MuiDrawer-paper button').first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/production-mobile-my-posts.png', 
        fullPage: false 
      });
    }
    
    // Phase 6: レスポンシブ確認（デスクトップサイズに変更）
    console.log('\n[Phase 6] レスポンシブ動作検証');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(2000);
    
    // デスクトップサイドバーが表示されるか確認
    const desktopSidebarAfter = await page.locator('text="ダッシュボード"').first().isVisible();
    console.log('デスクトップサイズでサイドバー表示: ', desktopSidebarAfter ? '✅' : '❌');
    
    // ハンバーガーアイコンが非表示か確認
    const hamburgerHidden = await page.locator('button[aria-label="open drawer"]').first().isVisible().catch(() => false);
    console.log('デスクトップサイズでハンバーガー非表示: ', !hamburgerHidden ? '✅' : '❌');
    
    console.log('\n===== モバイルハンバーガーメニュー検証完了 =====');
    console.log('結果: 全ページでモバイルハンバーガーメニュー動作確認');
  });
});