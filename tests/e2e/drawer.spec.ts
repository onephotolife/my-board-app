import { test, expect } from '@playwright/test';

test.describe('ハンバーガーメニュー（Drawer）のテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ハンバーガーメニューボタンがヘッダーの右側に表示される', async ({ page }) => {
    const menuButton = page.locator('[aria-label="メニューを開く"]');
    await expect(menuButton).toBeVisible();
    
    // ボタンの位置を確認
    const toolbar = page.locator('.MuiToolbar-root');
    const toolbarBox = await toolbar.boundingBox();
    const buttonBox = await menuButton.boundingBox();
    
    if (toolbarBox && buttonBox) {
      // ボタンが右側にあることを確認（右端から100px以内）
      expect(buttonBox.x + buttonBox.width).toBeGreaterThan(toolbarBox.x + toolbarBox.width - 100);
    }
  });

  test('ハンバーガーメニューをクリックすると280px幅のDrawerが開く', async ({ page }) => {
    const menuButton = page.locator('[aria-label="メニューを開く"]');
    await menuButton.click();
    
    // Drawerが表示されるまで待つ
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();
    
    // Drawerの幅を確認
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox?.width).toBe(280);
    
    // Drawerが全画面でないことを確認
    const viewportSize = page.viewportSize();
    if (viewportSize && drawerBox) {
      expect(drawerBox.width).toBeLessThan(viewportSize.width);
    }
  });

  test('Drawerに正しいメニュー項目が表示される（未ログイン時）', async ({ page }) => {
    const menuButton = page.locator('[aria-label="メニューを開く"]');
    await menuButton.click();
    
    // メニュー項目の確認
    await expect(page.getByText('ホーム', { exact: true })).toBeVisible();
    await expect(page.getByText('ログイン', { exact: true })).toBeVisible();
    
    // ログイン時のみ表示される項目が表示されていないことを確認
    await expect(page.getByText('ダッシュボード', { exact: true })).not.toBeVisible();
    await expect(page.getByText('掲示板', { exact: true })).not.toBeVisible();
    await expect(page.getByText('プロフィール', { exact: true })).not.toBeVisible();
  });

  test('Drawerの背景（Backdrop）をクリックするとDrawerが閉じる', async ({ page }) => {
    const menuButton = page.locator('[aria-label="メニューを開く"]');
    await menuButton.click();
    
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();
    
    // Backdropをクリック
    await page.locator('.MuiBackdrop-root').click();
    
    // Drawerが閉じることを確認
    await expect(drawer).not.toBeVisible();
  });

  test('Drawer内の閉じるボタンをクリックするとDrawerが閉じる', async ({ page }) => {
    const menuButton = page.locator('[aria-label="メニューを開く"]');
    await menuButton.click();
    
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();
    
    // 閉じるボタンをクリック
    const closeButton = drawer.locator('button').filter({ hasText: '' }).first();
    await closeButton.click();
    
    // Drawerが閉じることを確認
    await expect(drawer).not.toBeVisible();
  });

  test('メニュー項目をクリックすると該当ページに遷移しDrawerが閉じる', async ({ page }) => {
    const menuButton = page.locator('[aria-label="メニューを開く"]');
    await menuButton.click();
    
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();
    
    // ログインページへ遷移
    await page.getByText('ログイン', { exact: true }).click();
    
    // URLが変更されることを確認
    await expect(page).toHaveURL('/auth/signin');
    
    // Drawerが閉じることを確認
    await expect(drawer).not.toBeVisible();
  });

  test('モバイル画面でもDrawerが正しく動作する', async ({ page }) => {
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });
    
    const menuButton = page.locator('[aria-label="メニューを開く"]');
    await menuButton.click();
    
    const drawer = page.locator('.MuiDrawer-paper');
    await expect(drawer).toBeVisible();
    
    // モバイルでも280px幅であることを確認
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox?.width).toBe(280);
  });
});