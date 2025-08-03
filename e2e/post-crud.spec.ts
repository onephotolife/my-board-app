import { test, expect } from '@playwright/test';

test.describe('投稿のCRUD操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // ページが完全にロードされるまで待機
    await page.waitForLoadState('networkidle');
  });

  test('投稿の作成フロー', async ({ page }) => {
    // 初期状態の確認
    await expect(page.locator('h1')).toContainText('オープン掲示板');
    
    // フォームフィールドに入力
    await page.fill('input[aria-label="タイトル"]', 'E2Eテスト投稿');
    await page.fill('input[aria-label="投稿者名"]', 'テストユーザー');
    await page.fill('textarea[aria-label="投稿内容"]', 'これはE2Eテストで作成された投稿です。\n改行も含みます。');
    
    // 文字数カウントの確認
    await expect(page.locator('text=/10\\/100文字/')).toBeVisible();
    await expect(page.locator('text=/9\\/50文字/')).toBeVisible();
    await expect(page.locator('text=/32\\/200文字/')).toBeVisible();
    
    // 投稿ボタンをクリック
    await page.click('button:has-text("投稿する")');
    
    // 投稿が表示されるまで待機
    await page.waitForSelector('text=E2Eテスト投稿', { timeout: 5000 });
    
    // 投稿が正しく表示されているか確認
    await expect(page.locator('text=E2Eテスト投稿')).toBeVisible();
    await expect(page.locator('text=テストユーザー')).toBeVisible();
    await expect(page.locator('text=これはE2Eテストで作成された投稿です。')).toBeVisible();
    
    // フォームがクリアされているか確認
    const titleInput = page.locator('input[aria-label="タイトル"]');
    await expect(titleInput).toHaveValue('');
    const authorInput = page.locator('input[aria-label="投稿者名"]');
    await expect(authorInput).toHaveValue('');
    const contentInput = page.locator('textarea[aria-label="投稿内容"]');
    await expect(contentInput).toHaveValue('');
  });

  test('投稿の編集フロー', async ({ page }) => {
    // まず投稿を作成
    await page.fill('input[aria-label="タイトル"]', '編集前の投稿');
    await page.fill('input[aria-label="投稿者名"]', '編集テスター');
    await page.fill('textarea[aria-label="投稿内容"]', '編集前の内容です。');
    await page.click('button:has-text("投稿する")');
    await page.waitForSelector('text=編集前の投稿');
    
    // 編集ボタンをクリック
    const postItem = page.locator('text=編集前の内容です。').locator('..');
    await postItem.locator('button[aria-label="edit"]').click();
    
    // 編集ダイアログが表示されるまで待機
    await page.waitForSelector('text=投稿を編集');
    
    // 編集ダイアログ内のテキストフィールドを確認
    const editTextarea = page.locator('dialog textarea, [role="dialog"] textarea');
    await expect(editTextarea).toHaveValue('編集前の内容です。');
    
    // 内容を編集
    await editTextarea.clear();
    await editTextarea.fill('編集後の内容です。\nこれは更新されました。');
    
    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');
    
    // ダイアログが閉じるまで待機
    await page.waitForSelector('text=投稿を編集', { state: 'hidden' });
    
    // 編集後の内容が表示されているか確認
    await expect(page.locator('text=編集後の内容です。')).toBeVisible();
    await expect(page.locator('text=編集前の内容です。')).not.toBeVisible();
    
    // タイトルと投稿者名は変更されていないことを確認
    await expect(page.locator('text=編集前の投稿')).toBeVisible();
    await expect(page.locator('text=編集テスター')).toBeVisible();
  });

  test('投稿の削除フロー', async ({ page }) => {
    // まず投稿を作成
    await page.fill('input[aria-label="タイトル"]', '削除予定の投稿');
    await page.fill('input[aria-label="投稿者名"]', '削除テスター');
    await page.fill('textarea[aria-label="投稿内容"]', 'この投稿は削除されます。');
    await page.click('button:has-text("投稿する")');
    await page.waitForSelector('text=削除予定の投稿');
    
    // 削除前の投稿が存在することを確認
    await expect(page.locator('text=削除予定の投稿')).toBeVisible();
    await expect(page.locator('text=この投稿は削除されます。')).toBeVisible();
    
    // 削除ボタンをクリック
    const postItem = page.locator('text=この投稿は削除されます。').locator('..');
    
    // 確認ダイアログのモック
    page.on('dialog', dialog => dialog.accept());
    
    await postItem.locator('button[aria-label="delete"]').click();
    
    // 投稿が削除されるまで待機
    await page.waitForSelector('text=削除予定の投稿', { state: 'hidden', timeout: 5000 });
    
    // 投稿が削除されたことを確認
    await expect(page.locator('text=削除予定の投稿')).not.toBeVisible();
    await expect(page.locator('text=この投稿は削除されます。')).not.toBeVisible();
  });

  test('削除のキャンセル', async ({ page }) => {
    // まず投稿を作成
    await page.fill('input[aria-label="タイトル"]', 'キャンセルテスト');
    await page.fill('input[aria-label="投稿者名"]', 'キャンセルテスター');
    await page.fill('textarea[aria-label="投稿内容"]', 'この投稿は削除されません。');
    await page.click('button:has-text("投稿する")');
    await page.waitForSelector('text=キャンセルテスト');
    
    // 削除ボタンをクリック
    const postItem = page.locator('text=この投稿は削除されません。').locator('..');
    
    // 確認ダイアログをキャンセル
    page.on('dialog', dialog => dialog.dismiss());
    
    await postItem.locator('button[aria-label="delete"]').click();
    
    // 少し待機
    await page.waitForTimeout(1000);
    
    // 投稿がまだ存在することを確認
    await expect(page.locator('text=キャンセルテスト')).toBeVisible();
    await expect(page.locator('text=この投稿は削除されません。')).toBeVisible();
  });

  test('文字数制限の検証', async ({ page }) => {
    // 200文字の投稿（成功するはず）
    const content200 = 'あ'.repeat(200);
    await page.fill('input[aria-label="タイトル"]', '200文字テスト');
    await page.fill('input[aria-label="投稿者名"]', 'テスター');
    await page.fill('textarea[aria-label="投稿内容"]', content200);
    
    // 文字数カウントの確認
    await expect(page.locator('text=200/200文字')).toBeVisible();
    
    // 投稿ボタンが有効であることを確認
    const submitButton = page.locator('button:has-text("投稿する")');
    await expect(submitButton).toBeEnabled();
    
    // 201文字目を入力しようとする（入力されないはず）
    await page.keyboard.type('あ');
    await expect(page.locator('text=200/200文字')).toBeVisible(); // まだ200文字
  });

  test('空のフィールドでは投稿できない', async ({ page }) => {
    // 投稿ボタンが無効であることを確認
    const submitButton = page.locator('button:has-text("投稿する")');
    await expect(submitButton).toBeDisabled();
    
    // タイトルのみ入力
    await page.fill('input[aria-label="タイトル"]', 'タイトルのみ');
    await expect(submitButton).toBeDisabled();
    
    // 投稿者名も入力
    await page.fill('input[aria-label="投稿者名"]', '投稿者');
    await expect(submitButton).toBeDisabled();
    
    // 投稿内容も入力（すべて入力）
    await page.fill('textarea[aria-label="投稿内容"]', '内容');
    await expect(submitButton).toBeEnabled();
    
    // 内容をクリア
    await page.fill('textarea[aria-label="投稿内容"]', '');
    await expect(submitButton).toBeDisabled();
  });

  test('複数投稿の表示順序', async ({ page }) => {
    // 3つの投稿を作成
    for (let i = 1; i <= 3; i++) {
      await page.fill('input[aria-label="タイトル"]', `投稿${i}`);
      await page.fill('input[aria-label="投稿者名"]', `ユーザー${i}`);
      await page.fill('textarea[aria-label="投稿内容"]', `これは${i}番目の投稿です。`);
      await page.click('button:has-text("投稿する")');
      await page.waitForSelector(`text=投稿${i}`);
      // 少し待機して順序を保証
      await page.waitForTimeout(500);
    }
    
    // 投稿リストを取得
    const posts = page.locator('h6');
    const postCount = await posts.count();
    
    if (postCount >= 3) {
      // 最新の投稿が上に表示されているか確認（降順）
      await expect(posts.nth(0)).toContainText('投稿3');
      await expect(posts.nth(1)).toContainText('投稿2');
      await expect(posts.nth(2)).toContainText('投稿1');
    }
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 要素が正しく表示されているか確認
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[aria-label="タイトル"]')).toBeVisible();
    
    // タブレットサイズに変更
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();
    
    // デスクトップサイズに変更
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('h1')).toBeVisible();
  });
});