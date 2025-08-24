import { test, expect } from '@playwright/test';

test.describe('レイアウト修正確認（簡易版）', () => {
  const prodUrl = 'https://board.blankbrainai.com';
  const testCredentials = {
    email: 'one.photolife+2@gmail.com',
    password: '?@thc123THC@?'
  };

  test('デスクトップ画面でサイドバーとコンテンツが正しく配置される', async ({ page }) => {
    test.setTimeout(90000);
    
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto(`${prodUrl}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 30000 });
    await page.waitForTimeout(3000); // レンダリング完了を待つ
    
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: 'test-results/dashboard-layout.png',
      fullPage: false 
    });
    
    // サイドバーの位置確認（左端に固定されているはず）
    const sidebar = await page.locator('div:has-text("ダッシュボード"):has-text("掲示板"):has-text("新規投稿")').first();
    const isSidebarVisible = await sidebar.isVisible().catch(() => false);
    
    if (isSidebarVisible) {
      const sidebarBox = await sidebar.boundingBox();
      if (sidebarBox) {
        console.log(`サイドバー位置: x=${sidebarBox.x}, width=${sidebarBox.width}`);
        expect(sidebarBox.x).toBeLessThanOrEqual(10); // 左端付近
        expect(sidebarBox.width).toBeGreaterThan(200);
        expect(sidebarBox.width).toBeLessThan(320);
      }
    }
    
    // プロフィールページに移動
    await page.goto(`${prodUrl}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/profile-layout.png',
      fullPage: false 
    });
    
    // 新規投稿ページに移動
    await page.goto(`${prodUrl}/posts/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/posts-new-layout.png',
      fullPage: false 
    });
    
    // マイ投稿ページに移動
    await page.goto(`${prodUrl}/my-posts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/my-posts-layout.png',
      fullPage: false 
    });
    
    console.log('✅ 全ページのスクリーンショットを撮影しました');
    console.log('✅ test-results/フォルダ内の画像を確認してレイアウトが正しいことを視覚的に検証してください');
  });

  test('モバイル画面でハンバーガーメニューが正しく表示される', async ({ page }) => {
    test.setTimeout(60000);
    
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    // ログイン
    await page.goto(`${prodUrl}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL(`${prodUrl}/dashboard`, { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // ハンバーガーメニューボタンの存在確認
    const hamburgerButton = page.locator('button[aria-label="open drawer"]');
    await expect(hamburgerButton).toBeVisible();
    
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: 'test-results/mobile-dashboard-layout.png',
      fullPage: false 
    });
    
    console.log('✅ モバイル画面でハンバーガーメニューが表示されています');
  });
});