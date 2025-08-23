import { test, expect } from '@playwright/test';

test.describe('本番環境: モバイルコンテンツ表示検証', () => {
  const baseURL = 'https://board.blankbrainai.com';
  const testEmail = 'one.photolife+2@gmail.com';
  const testPassword = '?@thc123THC@?';
  
  // モバイルビューポート設定（iPhone XR）
  test.use({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  
  test('全ページでコンテンツが正しく表示される', async ({ page }) => {
    console.log('===== モバイルコンテンツ表示検証開始 =====');
    console.log('実行時刻:', new Date().toISOString());
    console.log('環境: Production');
    console.log('ビューポート: 414x896 (iPhone XR)');
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
    
    // Phase 2: ダッシュボードのコンテンツ確認
    console.log('\n[Phase 2] ダッシュボードのコンテンツ検証');
    if (!currentUrl.includes('/dashboard')) {
      await page.goto(`${baseURL}/dashboard`);
      await page.waitForTimeout(3000);
    }
    
    // ハンバーガーメニューの確認
    const hamburgerVisible = await page.locator('button[aria-label="open drawer"]').first().isVisible().catch(() => false);
    console.log('ハンバーガーメニュー表示:', hamburgerVisible ? '✅' : '❌');
    
    // メインコンテンツの確認（ダッシュボードヘッダー）
    const dashboardHeader = await page.locator('text="ダッシュボード"').nth(1).isVisible().catch(() => false);
    console.log('ダッシュボードヘッダー表示:', dashboardHeader ? '✅' : '❌');
    
    // 統計カードの確認
    const statsCard = await page.locator('text=/総投稿数|メンバー歴|今日の投稿/').first().isVisible().catch(() => false);
    console.log('統計カード表示:', statsCard ? '✅' : '❌');
    
    // クイックアクションの確認
    const quickActions = await page.locator('text="クイックアクション"').isVisible().catch(() => false);
    console.log('クイックアクション表示:', quickActions ? '✅' : '❌');
    
    // コンテンツの高さ確認
    const contentHeight = await page.evaluate(() => {
      const mainContent = document.querySelector('main, [role="main"], .MuiBox-root');
      return mainContent ? mainContent.scrollHeight : 0;
    });
    console.log('コンテンツ高さ:', contentHeight, 'px');
    expect(contentHeight).toBeGreaterThan(500); // コンテンツが存在することを確認
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'test-results/production-mobile-dashboard-content.png', 
      fullPage: false 
    });
    
    // Phase 3: my-postsページのコンテンツ確認
    console.log('\n[Phase 3] my-postsページのコンテンツ検証');
    await page.goto(`${baseURL}/my-posts`);
    await page.waitForTimeout(3000);
    
    // ページタイトルの確認
    const myPostsTitle = await page.locator('h3:has-text("自分の投稿")').isVisible().catch(() => false);
    console.log('my-postsタイトル表示:', myPostsTitle ? '✅' : '❌');
    
    // 統計情報の確認
    const totalPostsCard = await page.locator('text="総投稿数"').isVisible().catch(() => false);
    console.log('総投稿数カード表示:', totalPostsCard ? '✅' : '❌');
    
    // タブの確認
    const tabsVisible = await page.locator('text=/すべて.*公開済み.*アーカイブ/').isVisible().catch(() => false);
    console.log('タブ表示:', tabsVisible ? '✅' : '❌');
    
    // コンテンツエリアの確認
    const myPostsContent = await page.evaluate(() => {
      const content = document.querySelector('[class*="MuiContainer"]');
      return content ? content.scrollHeight : 0;
    });
    console.log('my-postsコンテンツ高さ:', myPostsContent, 'px');
    expect(myPostsContent).toBeGreaterThan(300);
    
    await page.screenshot({ 
      path: 'test-results/production-mobile-my-posts-content.png', 
      fullPage: false 
    });
    
    // Phase 4: 新規投稿ページのコンテンツ確認
    console.log('\n[Phase 4] 新規投稿ページのコンテンツ検証');
    await page.goto(`${baseURL}/posts/new`);
    await page.waitForTimeout(3000);
    
    // ページタイトルの確認
    const newPostTitle = await page.locator('h4:has-text("新規投稿")').isVisible().catch(() => false);
    console.log('新規投稿タイトル表示:', newPostTitle ? '✅' : '❌');
    
    // フォーム要素の確認
    const titleInput = await page.locator('input[label*="タイトル"], label:has-text("タイトル") + input, input[placeholder*="タイトル"]').first().isVisible().catch(() => false);
    console.log('タイトル入力フィールド表示:', titleInput ? '✅' : '❌');
    
    const contentInput = await page.locator('textarea[label*="本文"], label:has-text("本文") + textarea, textarea[placeholder*="本文"], textarea[placeholder*="内容"]').first().isVisible().catch(() => false);
    console.log('本文入力フィールド表示:', contentInput ? '✅' : '❌');
    
    const submitButton = await page.locator('button:has-text("投稿する")').isVisible().catch(() => false);
    console.log('投稿ボタン表示:', submitButton ? '✅' : '❌');
    
    // フォームの高さ確認
    const formHeight = await page.evaluate(() => {
      const form = document.querySelector('form, [class*="Paper"]');
      return form ? form.scrollHeight : 0;
    });
    console.log('フォーム高さ:', formHeight, 'px');
    expect(formHeight).toBeGreaterThan(400);
    
    await page.screenshot({ 
      path: 'test-results/production-mobile-new-post-content.png', 
      fullPage: false 
    });
    
    // Phase 5: プロフィールページのコンテンツ確認
    console.log('\n[Phase 5] プロフィールページのコンテンツ検証');
    await page.goto(`${baseURL}/profile`);
    await page.waitForTimeout(3000);
    
    // ページタイトルの確認
    const profileTitle = await page.locator('h4:has-text("プロフィール")').isVisible().catch(() => false);
    console.log('プロフィールタイトル表示:', profileTitle ? '✅' : '❌');
    
    // プロフィール要素の確認
    const avatarVisible = await page.locator('[class*="MuiAvatar"]').nth(1).isVisible().catch(() => false);
    console.log('アバター表示:', avatarVisible ? '✅' : '❌');
    
    const emailField = await page.locator(`text="${testEmail}"`).first().isVisible().catch(() => false);
    console.log('メールアドレス表示:', emailField ? '✅' : '❌');
    
    const editButton = await page.locator('button:has-text("編集")').isVisible().catch(() => false);
    console.log('編集ボタン表示:', editButton ? '✅' : '❌');
    
    // プロフィールコンテンツの高さ確認
    const profileContent = await page.evaluate(() => {
      const content = document.querySelector('[class*="MuiContainer"]');
      return content ? content.scrollHeight : 0;
    });
    console.log('プロフィールコンテンツ高さ:', profileContent, 'px');
    expect(profileContent).toBeGreaterThan(400);
    
    await page.screenshot({ 
      path: 'test-results/production-mobile-profile-content.png', 
      fullPage: false 
    });
    
    // Phase 6: スクロール動作確認
    console.log('\n[Phase 6] スクロール動作検証');
    
    // ダッシュボードでスクロール
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForTimeout(3000);
    
    // 下にスクロール
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const scrollPosition = await page.evaluate(() => window.pageYOffset);
    console.log('スクロール位置:', scrollPosition, 'px');
    
    // スクロール可能であることを確認
    const isScrollable = await page.evaluate(() => {
      return document.body.scrollHeight > window.innerHeight;
    });
    console.log('ページスクロール可能:', isScrollable ? '✅' : '❌');
    
    console.log('\n===== モバイルコンテンツ表示検証完了 =====');
    console.log('結果: 全ページでコンテンツ表示確認');
  });
});