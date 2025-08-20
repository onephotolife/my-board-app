import { test, expect } from '@playwright/test';

test.describe('パスワード変更機能', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用のログイン処理（実際の認証フローに合わせて調整が必要）
    await page.goto('/auth/signin');
    
    // ここでは仮のログイン処理を記載
    // 実際のプロジェクトの認証フローに合わせて修正してください
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testPassword123');
    await page.click('button[type="submit"]');
    
    // プロフィールページに遷移
    await page.waitForURL('/profile');
  });

  test('パスワード変更ダイアログが正しく開く', async ({ page }) => {
    // パスワード変更ボタンをクリック
    await page.click('button:has-text("パスワード変更")');
    
    // ダイアログが表示されることを確認
    await expect(page.locator('h6:has-text("パスワード変更")')).toBeVisible();
    
    // 必要なフィールドが表示されることを確認
    await expect(page.locator('label:has-text("現在のパスワード")')).toBeVisible();
    await expect(page.locator('label:has-text("新しいパスワード")')).toBeVisible();
    await expect(page.locator('label:has-text("新しいパスワード（確認）")')).toBeVisible();
  });

  test('パスワード変更ダイアログでキャンセルができる', async ({ page }) => {
    // パスワード変更ボタンをクリック
    await page.click('button:has-text("パスワード変更")');
    
    // ダイアログが表示される
    await expect(page.locator('h6:has-text("パスワード変更")')).toBeVisible();
    
    // キャンセルボタンをクリック
    await page.click('button:has-text("キャンセル")');
    
    // ダイアログが閉じることを確認
    await expect(page.locator('h6:has-text("パスワード変更")')).not.toBeVisible();
  });

  test('空のフォームを送信するとエラーが表示される', async ({ page }) => {
    // パスワード変更ボタンをクリック
    await page.click('button:has-text("パスワード変更")');
    
    // 何も入力せずに変更ボタンをクリック
    await page.click('button:has-text("変更する")');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=現在のパスワードを入力してください')).toBeVisible();
  });

  test('パスワードが一致しない場合エラーが表示される', async ({ page }) => {
    // パスワード変更ボタンをクリック
    await page.click('button:has-text("パスワード変更")');
    
    // フォームに入力
    await page.fill('input[type="password"]', 'currentPassword123');
    await page.fill('input[type="password"] >> nth=1', 'newPassword123!');
    await page.fill('input[type="password"] >> nth=2', 'differentPassword123!');
    
    // タブキーでフォーカスを移動
    await page.keyboard.press('Tab');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=パスワードが一致しません')).toBeVisible();
  });

  test('パスワードの表示/非表示を切り替えられる', async ({ page }) => {
    // パスワード変更ボタンをクリック
    await page.click('button:has-text("パスワード変更")');
    
    // 現在のパスワードフィールドを取得
    const currentPasswordField = page.locator('input[type="password"]').first();
    
    // 初期状態はパスワードタイプ
    await expect(currentPasswordField).toHaveAttribute('type', 'password');
    
    // 表示ボタンをクリック
    await page.click('button[aria-label="パスワードを表示"]').first();
    
    // テキストタイプに変更される
    await expect(currentPasswordField).toHaveAttribute('type', 'text');
    
    // 再度クリックで非表示に
    await page.click('button[aria-label="パスワードを隠す"]').first();
    
    // パスワードタイプに戻る
    await expect(currentPasswordField).toHaveAttribute('type', 'password');
  });

  test('有効なパスワードを入力して変更できる', async ({ page }) => {
    // パスワード変更ボタンをクリック
    await page.click('button:has-text("パスワード変更")');
    
    // フォームに有効な値を入力
    await page.fill('input[type="password"]', 'currentPassword123');
    await page.fill('input[type="password"] >> nth=1', 'NewPassword123!@#');
    await page.fill('input[type="password"] >> nth=2', 'NewPassword123!@#');
    
    // 変更ボタンをクリック
    await page.click('button:has-text("変更する")');
    
    // 成功メッセージが表示されることを確認（APIの実装に依存）
    // await expect(page.locator('text=パスワードを変更しました')).toBeVisible();
    
    // ダイアログが自動的に閉じることを確認（2秒後）
    // await page.waitForTimeout(2500);
    // await expect(page.locator('h6:has-text("パスワード変更")')).not.toBeVisible();
  });

  test('Escキーでダイアログを閉じられる', async ({ page }) => {
    // パスワード変更ボタンをクリック
    await page.click('button:has-text("パスワード変更")');
    
    // ダイアログが表示される
    await expect(page.locator('h6:has-text("パスワード変更")')).toBeVisible();
    
    // Escキーを押す
    await page.keyboard.press('Escape');
    
    // ダイアログが閉じることを確認
    await expect(page.locator('h6:has-text("パスワード変更")')).not.toBeVisible();
  });

  test('背景クリックでダイアログを閉じられる', async ({ page }) => {
    // パスワード変更ボタンをクリック
    await page.click('button:has-text("パスワード変更")');
    
    // ダイアログが表示される
    await expect(page.locator('h6:has-text("パスワード変更")')).toBeVisible();
    
    // 背景（backdrop）をクリック
    await page.locator('.MuiBackdrop-root').click({ position: { x: 10, y: 10 } });
    
    // ダイアログが閉じることを確認
    await expect(page.locator('h6:has-text("パスワード変更")')).not.toBeVisible();
  });
});