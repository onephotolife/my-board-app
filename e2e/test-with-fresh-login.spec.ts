import { test, expect } from '@playwright/test';

test.describe('Layout with Fresh Login', () => {
  test('verify new post page with fresh login', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // 新規投稿ページに直接アクセス（リダイレクトされる）
    await page.goto('https://board.blankbrainai.com/posts/new');
    
    // サインインページにリダイレクトされることを確認
    await page.waitForURL('**/auth/signin**');
    
    // ログイン
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    
    // 新規投稿ページにリダイレクトされるまで待つ
    await page.waitForURL('**/posts/new', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'screenshots/new-post-fresh-login.png',
      fullPage: true
    });
    
    console.log('New post page screenshot taken after fresh login');
  });
});