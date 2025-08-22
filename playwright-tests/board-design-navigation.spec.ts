import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'one.photolife+2@gmail.com';
const TEST_PASSWORD = '?@thc123THC@?';

test.describe('投稿一覧ページ - デザイン統一とナビゲーション機能', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    // ログインフォームの入力
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('統一されたデザインテーマの表示確認', async ({ page }) => {
    // 投稿一覧ページへ遷移
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    // ヘッダーの存在確認
    const header = page.locator('div').filter({ 
      hasText: '掲示板リアルタイムで更新される投稿一覧' 
    }).first();
    await expect(header).toBeVisible();
    
    // グラデーション背景の確認（スタイル検査）
    const headerBox = page.locator('div[style*="linear-gradient"]').first();
    await expect(headerBox).toBeVisible();
    
    // サイドバーの存在確認（デスクトップビュー）
    if (await page.viewportSize()?.width! >= 900) {
      const sidebar = page.locator('div').filter({ 
        has: page.locator('text="ダッシュボード"') 
      }).filter({
        has: page.locator('text="掲示板"')
      }).first();
      await expect(sidebar).toBeVisible();
    }
  });

  test('サイドバーナビゲーションの動作確認', async ({ page }) => {
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    // デスクトップビューでのテスト
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // ナビゲーションアイテムの存在確認
    const navItems = [
      'ホーム',
      'ダッシュボード',
      '掲示板',
      '新規投稿',
      '自分の投稿',
      '検索',
      'プロフィール'
    ];
    
    for (const item of navItems) {
      const navLink = page.locator('text=' + item).first();
      await expect(navLink).toBeVisible();
    }
    
    // ユーザー情報の表示確認
    await expect(page.locator('text=' + TEST_EMAIL)).toBeVisible();
    
    // ログアウトボタンの存在確認
    const logoutButton = page.locator('button:has-text("ログアウト")');
    await expect(logoutButton).toBeVisible();
  });

  test('ページ間のナビゲーション動作', async ({ page }) => {
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    // ダッシュボードへの遷移
    await page.click('text=ダッシュボード');
    await page.waitForURL(/\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
    
    // 投稿一覧へ戻る
    await page.click('text=掲示板');
    await page.waitForURL(/\/board/);
    await expect(page).toHaveURL(/\/board/);
    
    // プロフィールページへの遷移
    await page.click('text=プロフィール');
    await page.waitForURL(/\/profile/);
    await expect(page).toHaveURL(/\/profile/);
  });

  test('投稿一覧の表示とカードデザイン', async ({ page }) => {
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    // 検索フィールドの存在確認
    const searchField = page.locator('input[placeholder*="検索"]');
    await expect(searchField).toBeVisible();
    
    // カテゴリーセレクトの存在確認
    const categorySelect = page.locator('text=カテゴリー').first();
    await expect(categorySelect).toBeVisible();
    
    // 新規投稿ボタンの確認
    const newPostButton = page.locator('button:has-text("新規投稿")');
    await expect(newPostButton).toBeVisible();
    
    // ボタンのグラデーションスタイル確認
    const buttonStyle = await newPostButton.getAttribute('style');
    expect(buttonStyle).toContain('linear-gradient');
  });

  test('モバイルレスポンシブデザイン', async ({ page }) => {
    // モバイルビューに切り替え
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    // モバイルメニューボタンの存在確認
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg') 
    }).first();
    await expect(menuButton).toBeVisible();
    
    // メニューボタンクリックでドロワー表示
    await menuButton.click();
    await page.waitForTimeout(500); // アニメーション待機
    
    // ドロワー内のナビゲーション確認
    const drawer = page.locator('[role="presentation"]');
    await expect(drawer).toBeVisible();
    
    // ドロワー内のナビゲーションアイテム確認
    await expect(page.locator('text=ダッシュボード')).toBeVisible();
    await expect(page.locator('text=掲示板')).toBeVisible();
  });

  test('ログアウト機能の動作確認', async ({ page }) => {
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    // ログアウトボタンクリック
    await page.click('button:has-text("ログアウト")');
    
    // サインインページへのリダイレクト確認
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});