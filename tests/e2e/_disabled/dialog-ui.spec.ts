import { test, expect } from '@playwright/test';

test.describe('投稿ダイアログUI/UXテスト', () => {
  // テスト前の準備
  test.beforeEach(async ({ page }) => {
    // ログイン済み状態をシミュレート（実際のプロジェクトに応じて調整）
    await page.goto('http://localhost:3000/board');
    // 必要に応じてログイン処理を追加
  });

  test('FABボタンが表示され、クリック可能である', async ({ page }) => {
    // FABボタンの存在確認
    const fabButton = page.locator('.MuiFab-root');
    await expect(fabButton).toBeVisible();
    
    // FABボタンのz-indexを確認
    const fabZIndex = await fabButton.evaluate(el => 
      window.getComputedStyle(el).zIndex
    );
    expect(parseInt(fabZIndex)).toBeLessThanOrEqual(1100);
  });

  test('ダイアログが正しく開閉する', async ({ page }) => {
    // FABボタンをクリック
    await page.click('.MuiFab-root');
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible();
    
    // ダイアログのタイトルを確認
    const dialogTitle = page.locator('#post-dialog-title');
    await expect(dialogTitle).toContainText('新規投稿');
    
    // キャンセルボタンをクリック
    await page.click('button:has-text("キャンセル")');
    
    // ダイアログが閉じることを確認
    await expect(dialog).not.toBeVisible();
  });

  test('ダイアログのz-indexが正しく設定されている', async ({ page }) => {
    // FABボタンをクリック
    await page.click('.MuiFab-root');
    
    // ダイアログと背景のz-indexを確認
    const dialogPaper = page.locator('.MuiDialog-paper');
    const backdrop = page.locator('.MuiBackdrop-root');
    
    await expect(dialogPaper).toBeVisible();
    await expect(backdrop).toBeVisible();
    
    const dialogZIndex = await dialogPaper.evaluate(el => 
      window.getComputedStyle(el).zIndex
    );
    const backdropZIndex = await backdrop.evaluate(el => 
      window.getComputedStyle(el).zIndex
    );
    
    // ダイアログが背景より前面にあることを確認
    expect(parseInt(dialogZIndex)).toBeGreaterThan(parseInt(backdropZIndex));
  });

  test('aria-hidden エラーが発生しない', async ({ page }) => {
    // コンソールエラーを監視
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // FABボタンをクリック
    await page.click('.MuiFab-root');
    
    // ダイアログが表示されるまで待機
    await page.waitForSelector('.MuiDialog-root', { state: 'visible' });
    
    // aria-hiddenエラーがないことを確認
    const ariaErrors = consoleErrors.filter(error => 
      error.includes('aria-hidden') || error.includes('Blocked aria-hidden')
    );
    expect(ariaErrors).toHaveLength(0);
  });

  test('フォーカス管理が正しく動作する', async ({ page }) => {
    // FABボタンをクリック
    await page.click('.MuiFab-root');
    
    // ダイアログが開いた時、最初の入力フィールドにフォーカスがあることを確認
    const firstInput = page.locator('input[aria-label="タイトル"]');
    await expect(firstInput).toBeFocused();
    
    // Tabキーでフォーカスが移動することを確認
    await page.keyboard.press('Tab');
    const contentInput = page.locator('textarea[aria-label="内容"]');
    await expect(contentInput).toBeFocused();
  });

  test('背景クリックでダイアログが閉じる', async ({ page }) => {
    // FABボタンをクリック
    await page.click('.MuiFab-root');
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.MuiDialog-root');
    await expect(dialog).toBeVisible();
    
    // 背景をクリック
    await page.locator('.MuiBackdrop-root').click();
    
    // ダイアログが閉じることを確認
    await expect(dialog).not.toBeVisible();
  });

  test('レスポンシブデザインが正しく動作する', async ({ page }) => {
    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });
    
    // FABボタンが表示される
    const fabButton = page.locator('.MuiFab-root');
    await expect(fabButton).toBeVisible();
    
    // ダイアログを開く
    await fabButton.click();
    
    // ダイアログが全幅で表示される
    const dialog = page.locator('.MuiDialog-paper');
    await expect(dialog).toBeVisible();
    
    const dialogWidth = await dialog.evaluate(el => el.clientWidth);
    expect(dialogWidth).toBeLessThanOrEqual(375);
    
    // デスクトップビューポート
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // ダイアログの最大幅が制限されている
    const desktopDialogWidth = await dialog.evaluate(el => el.clientWidth);
    expect(desktopDialogWidth).toBeLessThanOrEqual(600); // sm maxWidth
  });
});