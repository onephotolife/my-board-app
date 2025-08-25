import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://board.blankbrainai.com';
const TEST_EMAIL = 'one.photolife+2@gmail.com';
const TEST_PASSWORD = '?@thc123THC@?';

test.describe('本番環境：ダッシュボード文字列変更の検証', () => {
  test('ダッシュボードページの文字列が正しく変更されているか', async ({ page }) => {
    console.log('📊 本番環境でのテスト開始...');
    
    // ログイン
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    console.log('🔑 ログイン処理中...');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(`${PRODUCTION_URL}/dashboard`, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    console.log('✅ ダッシュボードページに到達');
    
    // メインカラムのタイトルを確認
    const mainTitle = await page.locator('h4').filter({ hasText: 'ダッシュボード' }).count();
    console.log(`📝 メインカラムに「ダッシュボード」: ${mainTitle > 0 ? '✅ 表示されている' : '❌ 表示されていない'}`);
    expect(mainTitle).toBeGreaterThan(0);
    
    // 「会員制掲示板」が表示されていないことを確認
    const oldMainTitle = await page.locator('h4').filter({ hasText: '会員制掲示板' }).count();
    console.log(`📝 メインカラムに「会員制掲示板」: ${oldMainTitle === 0 ? '✅ 表示されていない' : '❌ まだ表示されている'}`);
    expect(oldMainTitle).toBe(0);
    
    // サイドバーメニューの確認
    const menuItems = await page.locator('span.MuiListItemText-primary').allTextContents();
    console.log(`📋 メニュー項目: ${menuItems.join(', ')}`);
    
    const dashboardMenuItem = menuItems.includes('ダッシュボード');
    const oldMenuItem = menuItems.includes('会員制掲示板');
    
    console.log(`📝 メニューに「ダッシュボード」: ${dashboardMenuItem ? '✅ 表示されている' : '❌ 表示されていない'}`);
    console.log(`📝 メニューに「会員制掲示板」: ${oldMenuItem ? '❌ まだ表示されている' : '✅ 表示されていない'}`);
    
    expect(dashboardMenuItem).toBe(true);
    expect(oldMenuItem).toBe(false);
    
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: 'production-dashboard-after-change.png',
      fullPage: true
    });
    console.log('📸 スクリーンショットを保存: production-dashboard-after-change.png');
  });

  test('他のページでのメニュー表示確認', async ({ page }) => {
    console.log('📄 他のページでのメニュー確認開始...');
    
    // ログイン
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${PRODUCTION_URL}/dashboard`, { timeout: 30000 });
    
    // 掲示板ページへ移動
    await page.goto(`${PRODUCTION_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    const boardPageMenuItems = await page.locator('span.MuiListItemText-primary').allTextContents();
    const hasDashboardInMenu = boardPageMenuItems.includes('ダッシュボード');
    
    console.log(`📝 掲示板ページのメニューに「ダッシュボード」: ${hasDashboardInMenu ? '✅ 表示されている' : '❌ 表示されていない'}`);
    expect(hasDashboardInMenu).toBe(true);
    
    // プロフィールページへ移動
    await page.goto(`${PRODUCTION_URL}/profile`);
    await page.waitForLoadState('networkidle');
    
    const profilePageMenuItems = await page.locator('span.MuiListItemText-primary').allTextContents();
    const hasDashboardInProfileMenu = profilePageMenuItems.includes('ダッシュボード');
    
    console.log(`📝 プロフィールページのメニューに「ダッシュボード」: ${hasDashboardInProfileMenu ? '✅ 表示されている' : '❌ 表示されていない'}`);
    expect(hasDashboardInProfileMenu).toBe(true);
  });
});