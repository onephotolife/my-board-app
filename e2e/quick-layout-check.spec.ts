import { test, expect } from '@playwright/test';

test.describe('Quick Layout Check', () => {
  test('verify layout alignment on desktop', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ログイン
    await page.goto('https://board.blankbrainai.com/auth/signin');
    await page.fill('input[name="email"]', 'one.photolife+2@gmail.com');
    await page.fill('input[name="password"]', '?@thc123THC@?');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // ダッシュボードのスクリーンショット
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'screenshots/dashboard-alignment.png',
      fullPage: false
    });
    
    // プロフィールページ
    await page.goto('https://board.blankbrainai.com/profile');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'screenshots/profile-alignment.png',
      fullPage: false
    });
    
    // 新規投稿ページ
    await page.goto('https://board.blankbrainai.com/posts/new');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'screenshots/new-post-alignment.png',
      fullPage: false
    });
    
    // マイ投稿ページ
    await page.goto('https://board.blankbrainai.com/my-posts');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'screenshots/my-posts-alignment.png',
      fullPage: false
    });
    
    console.log('Screenshots taken for all pages');
  });
});