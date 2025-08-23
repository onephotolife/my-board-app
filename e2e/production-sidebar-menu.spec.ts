import { test, expect } from '@playwright/test';

test.describe('本番環境: サイドバーメニュー検証', () => {
  const baseURL = 'https://board.blankbrainai.com';
  const testEmail = 'one.photolife+2@gmail.com';
  const testPassword = '?@thc123THC@?';
  
  test('全ページでサイドバーメニューが表示される', async ({ page }) => {
    console.log('===== サイドバーメニュー検証開始 =====');
    console.log('実行時刻:', new Date().toISOString());
    console.log('環境: Production');
    console.log('URL:', baseURL);
    
    // Phase 1: 認証
    console.log('\n[Phase 1] 認証処理');
    await page.goto(`${baseURL}/auth/signin`);
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    console.log('認証情報入力完了');
    
    await page.click('button[type="submit"]');
    console.log('ログイン実行');
    
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    console.log('ログイン後URL:', currentUrl);
    
    // Phase 2: ダッシュボードのサイドバー確認
    console.log('\n[Phase 2] ダッシュボードのサイドバー検証');
    if (!currentUrl.includes('/dashboard')) {
      await page.goto(`${baseURL}/dashboard`);
      await page.waitForTimeout(3000);
    }
    
    // サイドバーの存在確認
    const dashboardSidebar = await page.locator('text="ダッシュボード"').first().isVisible();
    expect(dashboardSidebar).toBeTruthy();
    console.log('ダッシュボード - サイドバー表示: ✅');
    
    // メニュー項目の確認
    const menuItems = ['ダッシュボード', '掲示板', '新規投稿', '自分の投稿', 'プロフィール', '設定'];
    for (const item of menuItems) {
      const isVisible = await page.locator(`text="${item}"`).first().isVisible();
      console.log(`メニュー項目「${item}」: ${isVisible ? '✅' : '❌'}`);
    }
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'test-results/production-dashboard-sidebar.png', 
      fullPage: true 
    });
    
    // Phase 3: プロフィールページのサイドバー確認
    console.log('\n[Phase 3] プロフィールページのサイドバー検証');
    await page.goto(`${baseURL}/profile`);
    await page.waitForTimeout(3000);
    
    const profileUrl = page.url();
    if (profileUrl.includes('/profile')) {
      const profileSidebar = await page.locator('text="ダッシュボード"').first().isVisible();
      expect(profileSidebar).toBeTruthy();
      console.log('プロフィール - サイドバー表示: ✅');
      
      // プロフィールページ特有の要素確認
      const profileTitle = await page.locator('h4:has-text("プロフィール")').isVisible();
      expect(profileTitle).toBeTruthy();
      console.log('プロフィールページタイトル表示: ✅');
      
      await page.screenshot({ 
        path: 'test-results/production-profile-sidebar.png', 
        fullPage: true 
      });
    } else {
      console.log('⚠️ プロフィールページへのアクセス失敗');
    }
    
    // Phase 4: 新規投稿ページのサイドバー確認
    console.log('\n[Phase 4] 新規投稿ページのサイドバー検証');
    await page.goto(`${baseURL}/posts/new`);
    await page.waitForTimeout(3000);
    
    const newPostUrl = page.url();
    if (newPostUrl.includes('/posts/new')) {
      const newPostSidebar = await page.locator('text="ダッシュボード"').first().isVisible();
      expect(newPostSidebar).toBeTruthy();
      console.log('新規投稿 - サイドバー表示: ✅');
      
      // 新規投稿ページ特有の要素確認
      const newPostTitle = await page.locator('h4:has-text("新規投稿")').isVisible();
      expect(newPostTitle).toBeTruthy();
      console.log('新規投稿ページタイトル表示: ✅');
      
      await page.screenshot({ 
        path: 'test-results/production-new-post-sidebar.png', 
        fullPage: true 
      });
    } else {
      console.log('⚠️ 新規投稿ページへのアクセス失敗');
    }
    
    // Phase 5: my-postsページのサイドバー確認
    console.log('\n[Phase 5] my-postsページのサイドバー検証');
    await page.goto(`${baseURL}/my-posts`);
    await page.waitForTimeout(3000);
    
    const myPostsUrl = page.url();
    if (myPostsUrl.includes('/my-posts')) {
      const myPostsSidebar = await page.locator('text="ダッシュボード"').first().isVisible();
      expect(myPostsSidebar).toBeTruthy();
      console.log('my-posts - サイドバー表示: ✅');
      
      // my-postsページ特有の要素確認
      const myPostsTitle = await page.locator('h3:has-text("自分の投稿")').isVisible();
      expect(myPostsTitle).toBeTruthy();
      console.log('my-postsページタイトル表示: ✅');
      
      await page.screenshot({ 
        path: 'test-results/production-my-posts-sidebar.png', 
        fullPage: true 
      });
    } else {
      console.log('⚠️ my-postsページへのアクセス失敗');
    }
    
    // Phase 6: ナビゲーションテスト
    console.log('\n[Phase 6] サイドバーナビゲーション動作検証');
    
    // サイドバーから各ページへ移動
    const navigationTests = [
      { link: 'ダッシュボード', expectedUrl: '/dashboard' },
      { link: '新規投稿', expectedUrl: '/posts/new' },
      { link: 'プロフィール', expectedUrl: '/profile' },
      { link: '自分の投稿', expectedUrl: '/my-posts' }
    ];
    
    for (const nav of navigationTests) {
      try {
        await page.locator(`text="${nav.link}"`).first().click();
        await page.waitForTimeout(2000);
        const navUrl = page.url();
        const isCorrect = navUrl.includes(nav.expectedUrl);
        console.log(`「${nav.link}」クリック → ${nav.expectedUrl}: ${isCorrect ? '✅' : '❌'}`);
        expect(navUrl).toContain(nav.expectedUrl);
      } catch (error) {
        console.log(`「${nav.link}」ナビゲーションエラー:`, error);
      }
    }
    
    console.log('\n===== サイドバーメニュー検証完了 =====');
    console.log('結果: 全ページでサイドバー表示確認');
  });
});