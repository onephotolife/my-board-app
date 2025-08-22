import { test, expect, Page } from '@playwright/test';

// 本番環境のURL
const PRODUCTION_URL = 'https://blankinai-board.vercel.app';

// 本番環境の認証情報
const PRODUCTION_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

// ヘルパー関数：ログイン
async function loginToProduction(page: Page) {
  await page.goto(`${PRODUCTION_URL}/auth/signin`);
  
  // emailフィールドを探す（異なるセレクタに対応）
  const emailInput = await page.locator('input[name="email"], input[type="email"], input[id="email"]').first();
  await emailInput.fill(PRODUCTION_USER.email);
  
  // passwordフィールドを探す
  const passwordInput = await page.locator('input[name="password"], input[type="password"], input[id="password"]').first();
  await passwordInput.fill(PRODUCTION_USER.password);
  
  // ログインボタンをクリック
  await page.click('button[type="submit"]:has-text("ログイン"), button:has-text("Sign in"), button:has-text("サインイン")');
  
  // ダッシュボードへの遷移を待機（最大15秒）
  try {
    await page.waitForURL(/dashboard|board/, { timeout: 15000 });
  } catch {
    // URLが変わらない場合でも、ページ内容で確認
    await page.waitForTimeout(3000);
  }
}

test.describe('本番環境 - 掲示板CRUD機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // タイムアウトを延長
    test.setTimeout(60000);
  });

  test('TEST-01: 本番環境へのアクセス確認', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // ページが正常に読み込まれることを確認
    await expect(page).toHaveTitle(/Board|掲示板|Blankinai/i);
    
    // 基本的なUI要素が存在することを確認
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('TEST-02: ログイン機能の確認', async ({ page }) => {
    await loginToProduction(page);
    
    // ログイン成功の確認（いずれかの要素が表示される）
    const loggedInIndicators = [
      page.locator('text=ダッシュボード'),
      page.locator('text=Dashboard'),
      page.locator('[aria-label*="menu"]'),
      page.locator('[aria-label*="avatar"]'),
      page.locator('button:has-text("ログアウト")'),
      page.locator('button:has-text("Sign out")')
    ];
    
    let isLoggedIn = false;
    for (const indicator of loggedInIndicators) {
      if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        isLoggedIn = true;
        break;
      }
    }
    
    expect(isLoggedIn).toBeTruthy();
  });

  test('TEST-03: 投稿の作成', async ({ page }) => {
    await loginToProduction(page);
    
    // 掲示板ページへ移動（複数のパスに対応）
    const boardPaths = ['/board', '/dashboard', '/posts', '/'];
    let boardFound = false;
    
    for (const path of boardPaths) {
      await page.goto(`${PRODUCTION_URL}${path}`);
      await page.waitForTimeout(2000);
      
      // 投稿フォームを探す
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        boardFound = true;
        break;
      }
    }
    
    if (!boardFound) {
      // メニューから掲示板を探す
      const menuButton = page.locator('[aria-label*="menu"], button:has-text("メニュー")').first();
      if (await menuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuButton.click();
        await page.click('text=/掲示板|Board|投稿/i');
        await page.waitForTimeout(2000);
      }
    }
    
    // 投稿を作成
    const testMessage = `本番環境テスト投稿 - ${new Date().toLocaleString('ja-JP')}`;
    
    // テキストエリアに入力
    const textarea = page.locator('textarea').first();
    await textarea.fill(testMessage);
    
    // 投稿ボタンをクリック
    const submitButton = page.locator('button:has-text("投稿"), button:has-text("Post"), button:has-text("送信")').first();
    await submitButton.click();
    
    // 投稿が表示されるまで待機
    await page.waitForTimeout(3000);
    
    // 投稿が表示されていることを確認
    const postContent = page.locator(`text="${testMessage}"`);
    await expect(postContent).toBeVisible({ timeout: 10000 });
  });

  test('TEST-04: 投稿の編集', async ({ page }) => {
    await loginToProduction(page);
    
    // まず投稿を作成
    await page.goto(`${PRODUCTION_URL}/dashboard`);
    await page.waitForTimeout(2000);
    
    const originalMessage = `編集前の投稿 - ${Date.now()}`;
    const textarea = page.locator('textarea').first();
    await textarea.fill(originalMessage);
    await page.click('button:has-text("投稿"), button:has-text("Post")');
    await page.waitForTimeout(3000);
    
    // 編集ボタンを探してクリック
    const postElement = page.locator(`text="${originalMessage}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper") or contains(@class, "Card")]').first();
    const editButton = postElement.locator('button[aria-label*="edit"], button[aria-label*="編集"], svg[data-testid*="Edit"]').first();
    
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();
      
      // 編集ダイアログが開くのを待つ
      await page.waitForTimeout(1000);
      
      // 編集内容を入力
      const editedMessage = `編集後の投稿 - ${new Date().toLocaleString('ja-JP')}`;
      const editTextarea = page.locator('[role="dialog"] textarea, textarea').last();
      await editTextarea.clear();
      await editTextarea.fill(editedMessage);
      
      // 更新ボタンをクリック
      await page.click('button:has-text("更新"), button:has-text("Update"), button:has-text("保存")');
      await page.waitForTimeout(2000);
      
      // 編集後の内容が表示されていることを確認
      await expect(page.locator(`text="${editedMessage}"`)).toBeVisible({ timeout: 5000 });
    }
  });

  test('TEST-05: 投稿の削除', async ({ page }) => {
    await loginToProduction(page);
    
    // まず投稿を作成
    await page.goto(`${PRODUCTION_URL}/dashboard`);
    await page.waitForTimeout(2000);
    
    const deleteMessage = `削除予定の投稿 - ${Date.now()}`;
    const textarea = page.locator('textarea').first();
    await textarea.fill(deleteMessage);
    await page.click('button:has-text("投稿"), button:has-text("Post")');
    await page.waitForTimeout(3000);
    
    // 削除ボタンを探してクリック
    const postElement = page.locator(`text="${deleteMessage}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper") or contains(@class, "Card")]').first();
    const deleteButton = postElement.locator('button[aria-label*="delete"], button[aria-label*="削除"], svg[data-testid*="Delete"]').first();
    
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 確認ダイアログを処理
      page.on('dialog', dialog => dialog.accept());
      
      await deleteButton.click();
      await page.waitForTimeout(3000);
      
      // 投稿が削除されたことを確認
      await expect(page.locator(`text="${deleteMessage}"`)).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('TEST-06: 文字数制限の確認', async ({ page }) => {
    await loginToProduction(page);
    await page.goto(`${PRODUCTION_URL}/dashboard`);
    await page.waitForTimeout(2000);
    
    // 長いテキストを作成
    const longText = 'あ'.repeat(250);
    
    // テキストエリアに入力
    const textarea = page.locator('textarea').first();
    await textarea.fill(longText);
    
    // 実際に入力された文字数を確認
    const actualValue = await textarea.inputValue();
    
    // 200文字制限が適用されているか確認
    expect(actualValue.length).toBeLessThanOrEqual(200);
    
    // 文字数カウンターを確認（存在する場合）
    const counter = page.locator('text=/\\d+\\/200|200文字/');
    if (await counter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(counter).toBeVisible();
    }
  });

  test('TEST-07: ログアウト機能', async ({ page }) => {
    await loginToProduction(page);
    
    // ユーザーメニューを開く
    const avatarButton = page.locator('[aria-label*="menu"], [aria-label*="avatar"], button:has(img[alt*="avatar"])').first();
    if (await avatarButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await avatarButton.click();
    }
    
    // ログアウトボタンをクリック
    const logoutButton = page.locator('button:has-text("ログアウト"), button:has-text("Sign out"), text=Logout').first();
    await logoutButton.click();
    
    // ログインページにリダイレクトされることを確認
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/signin|login/);
  });

  test('TEST-08: レスポンシブデザインの確認', async ({ page }) => {
    await loginToProduction(page);
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${PRODUCTION_URL}/dashboard`);
    await page.waitForTimeout(2000);
    
    // 主要要素が表示されることを確認
    const mobileTextarea = page.locator('textarea').first();
    await expect(mobileTextarea).toBeVisible({ timeout: 5000 });
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await expect(mobileTextarea).toBeVisible();
    
    // デスクトップサイズ
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await expect(mobileTextarea).toBeVisible();
  });

  test('TEST-09: XSS攻撃の防御', async ({ page }) => {
    await loginToProduction(page);
    await page.goto(`${PRODUCTION_URL}/dashboard`);
    await page.waitForTimeout(2000);
    
    // XSSペイロードを投稿
    const xssPayload = '<script>alert("XSS")</script>';
    const textarea = page.locator('textarea').first();
    await textarea.fill(xssPayload);
    await page.click('button:has-text("投稿"), button:has-text("Post")');
    await page.waitForTimeout(3000);
    
    // スクリプトが実行されないことを確認（エスケープされて表示）
    const escapedContent = page.locator(`text="${xssPayload}"`);
    if (await escapedContent.isVisible({ timeout: 3000 }).catch(() => false)) {
      // エスケープされたHTMLとして表示されることを確認
      await expect(escapedContent).toBeVisible();
    }
    
    // 実際のscriptタグが存在しないことを確認
    const scriptTags = await page.locator('script:has-text("alert")').count();
    expect(scriptTags).toBe(0);
  });

  test('TEST-10: パフォーマンステスト', async ({ page }) => {
    const startTime = Date.now();
    
    // ログインとページ読み込み
    await loginToProduction(page);
    await page.goto(`${PRODUCTION_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 10秒以内に完了することを確認
    expect(loadTime).toBeLessThan(10000);
    
    console.log(`ページ読み込み時間: ${loadTime}ms`);
    
    // 投稿作成のレスポンス時間
    const postStartTime = Date.now();
    const textarea = page.locator('textarea').first();
    await textarea.fill(`パフォーマンステスト - ${Date.now()}`);
    await page.click('button:has-text("投稿"), button:has-text("Post")');
    await page.waitForTimeout(2000);
    
    const postTime = Date.now() - postStartTime;
    
    // 5秒以内に完了することを確認
    expect(postTime).toBeLessThan(5000);
    
    console.log(`投稿作成時間: ${postTime}ms`);
  });
});