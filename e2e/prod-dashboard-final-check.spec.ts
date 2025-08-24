import { test, expect } from '@playwright/test';

test.describe('Production Dashboard Final Check', () => {
  const PROD_URL = 'https://board.blankbrainai.com';
  const TEST_EMAIL = 'one.photolife+2@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';

  test('verify dashboard displays content correctly', async ({ page }) => {
    // 本番環境のログインページへアクセス
    await page.goto(`${PROD_URL}/auth/signin`);
    
    // ログイン
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // 主要セクションの表示確認
    const statsCard = await page.locator('text=総投稿数').first();
    await expect(statsCard).toBeVisible();
    
    const quickActions = await page.locator('text=クイックアクション').first();
    await expect(quickActions).toBeVisible();
    
    const latestPosts = await page.locator('text=最新の投稿').first();
    await expect(latestPosts).toBeVisible();
    
    // 掲示板へのナビゲーションリンクを確認
    const boardLink = await page.locator('text=掲示板を見る').first();
    await expect(boardLink).toBeVisible();
    
    // 新規投稿へのナビゲーションリンクを確認
    const newPostLink = await page.locator('text=新規投稿').first();
    await expect(newPostLink).toBeVisible();
    
    // スクリーンショットを撮影してレイアウトを視覚的に確認
    await page.screenshot({ 
      path: 'test-results/prod-dashboard-final.png',
      fullPage: true 
    });
    
    console.log('✅ ダッシュボードのコンテンツが正しく表示されています');
  });
});