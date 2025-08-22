import { test, expect, Page } from '@playwright/test';

// テストユーザー情報
const testUser1 = {
  name: `テストユーザー1_${Date.now()}`,
  email: `test1-${Date.now()}@example.com`,
  password: 'Test@123456',
};

const testUser2 = {
  name: `テストユーザー2_${Date.now()}`,
  email: `test2-${Date.now()}@example.com`,
  password: 'Test@123456',
};

// 認証ヘルパー関数
async function signUp(page: Page, user: typeof testUser1) {
  await page.goto('/auth/signup');
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);
  await page.click('button[type="submit"]:has-text("新規登録")');
  
  // 登録成功を待機（ダッシュボードへのリダイレクト）
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function signIn(page: Page, user: typeof testUser1) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]:has-text("ログイン")');
  
  // ログイン成功を待機
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function signOut(page: Page) {
  // アバターアイコンをクリック（MUIアバターのボタン）
  await page.click('[class*="MuiAvatar-root"]');
  await page.click('text=ログアウト');
  await page.waitForURL('/auth/signin', { timeout: 5000 });
}

test.describe('掲示板CRUD機能テスト - 正しいセレクタ版', () => {
  test.describe.configure({ mode: 'serial' });

  test('TEST-01: 未ログイン時のアクセス制限', async ({ page }) => {
    // ダッシュボードへのアクセス試行
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/auth\/signin/);
    
    // プロフィールページへのアクセス試行
    await page.goto('/profile');
    await expect(page).toHaveURL(/auth\/signin/);
  });

  test('TEST-02: ユーザー登録', async ({ page }) => {
    // ユーザー1の登録
    await signUp(page, testUser1);
    
    // ダッシュボードが表示されることを確認
    await expect(page.locator('h4:has-text("ダッシュボード")')).toBeVisible();
  });

  test('TEST-03: ログアウトと再ログイン', async ({ page }) => {
    // ユーザー1でログイン
    await signIn(page, testUser1);
    
    // ログアウト
    await signOut(page);
    
    // 再度ログイン
    await signIn(page, testUser1);
    await expect(page.locator('h4:has-text("ダッシュボード")')).toBeVisible();
  });

  test('TEST-04: 投稿の作成と表示', async ({ page }) => {
    // ユーザー1でログイン
    await signIn(page, testUser1);
    
    // 投稿フォームが表示されることを確認
    await expect(page.locator('textarea[placeholder*="200文字以内"]')).toBeVisible();
    
    // 投稿作成
    const postContent = `テスト投稿 ${Date.now()}`;
    
    await page.fill('textarea[placeholder*="200文字以内"]', postContent);
    await page.click('button:has-text("投稿")');
    
    // 投稿が表示されるまで待機
    await page.waitForTimeout(2000);
    
    // 投稿が表示されていることを確認
    await expect(page.locator(`text="${postContent}"`)).toBeVisible();
    
    // フォームがクリアされていることを確認
    await expect(page.locator('textarea[placeholder*="200文字以内"]')).toHaveValue('');
  });

  test('TEST-05: 投稿一覧の表示（新着順）', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 3つの投稿を作成
    const posts = [];
    for (let i = 1; i <= 3; i++) {
      const content = `順序テスト投稿${i}_${Date.now()}`;
      
      await page.fill('textarea[placeholder*="200文字以内"]', content);
      await page.click('button:has-text("投稿")');
      await page.waitForTimeout(1500);
      
      posts.push(content);
    }
    
    // ページをリロードして最新の状態を取得
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 投稿要素を取得
    const postElements = page.locator('[class*="MuiPaper-root"]:has([class*="MuiTypography"])');
    const postCount = await postElements.count();
    
    // 最新の投稿が上に表示されているか確認
    if (postCount >= 3) {
      const firstPostText = await postElements.first().textContent();
      expect(firstPostText).toContain(posts[2]); // 最後に投稿したものが最初に表示
    }
  });

  test('TEST-06: 自分の投稿の編集', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 投稿を作成
    const originalContent = `編集前の投稿_${Date.now()}`;
    await page.fill('textarea[placeholder*="200文字以内"]', originalContent);
    await page.click('button:has-text("投稿")');
    await page.waitForTimeout(2000);
    
    // 編集ボタンをクリック
    const postElement = page.locator(`text="${originalContent}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper")]').first();
    await postElement.locator('button[aria-label="edit"]').click();
    
    // 編集ダイアログが表示されるまで待機
    await page.waitForSelector('text=投稿を編集');
    
    // 内容を編集
    const editedContent = `編集後の投稿_${Date.now()}`;
    const editTextarea = page.locator('[role="dialog"] textarea, [role="presentation"] textarea').first();
    await editTextarea.clear();
    await editTextarea.fill(editedContent);
    
    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');
    
    // ダイアログが閉じるまで待機
    await page.waitForTimeout(2000);
    
    // 編集後の内容が表示されていることを確認
    await expect(page.locator(`text="${editedContent}"`)).toBeVisible();
    await expect(page.locator(`text="${originalContent}"`)).not.toBeVisible();
  });

  test('TEST-07: 自分の投稿の削除', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 投稿を作成
    const deleteContent = `削除予定の投稿_${Date.now()}`;
    await page.fill('textarea[placeholder*="200文字以内"]', deleteContent);
    await page.click('button:has-text("投稿")');
    await page.waitForTimeout(2000);
    
    // 削除前の投稿が存在することを確認
    await expect(page.locator(`text="${deleteContent}"`)).toBeVisible();
    
    // 削除ボタンをクリック
    const postElement = page.locator(`text="${deleteContent}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper")]').first();
    
    // 確認ダイアログを受け入れる
    page.on('dialog', dialog => dialog.accept());
    await postElement.locator('button[aria-label="delete"]').click();
    
    // 投稿が削除されるまで待機
    await page.waitForTimeout(2000);
    
    // 投稿が削除されたことを確認
    await expect(page.locator(`text="${deleteContent}"`)).not.toBeVisible();
  });

  test('TEST-08: 他人の投稿の編集・削除不可', async ({ page }) => {
    // ユーザー1で投稿作成
    await signIn(page, testUser1);
    
    const user1Post = `ユーザー1の投稿_${Date.now()}`;
    await page.fill('textarea[placeholder*="200文字以内"]', user1Post);
    await page.click('button:has-text("投稿")');
    await page.waitForTimeout(2000);
    
    // ログアウト
    await signOut(page);
    
    // ユーザー2を登録してログイン
    await signUp(page, testUser2);
    
    // ユーザー1の投稿を確認
    await expect(page.locator(`text="${user1Post}"`)).toBeVisible();
    
    // ユーザー1の投稿の編集・削除ボタンが表示されないことを確認
    const user1PostElement = page.locator(`text="${user1Post}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper")]').first();
    const editButton = user1PostElement.locator('button[aria-label="edit"]');
    const deleteButton = user1PostElement.locator('button[aria-label="delete"]');
    
    // ボタンが存在しないことを確認
    await expect(editButton).toHaveCount(0);
    await expect(deleteButton).toHaveCount(0);
    
    // ユーザー2自身の投稿を作成
    const user2Post = `ユーザー2の投稿_${Date.now()}`;
    await page.fill('textarea[placeholder*="200文字以内"]', user2Post);
    await page.click('button:has-text("投稿")');
    await page.waitForTimeout(2000);
    
    // ユーザー2の投稿には編集・削除ボタンが表示されることを確認
    const user2PostElement = page.locator(`text="${user2Post}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper")]').first();
    await expect(user2PostElement.locator('button[aria-label="edit"]')).toBeVisible();
    await expect(user2PostElement.locator('button[aria-label="delete"]')).toBeVisible();
  });

  test('TEST-09: 文字数制限の動作', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 200文字の投稿
    const content200 = 'あ'.repeat(200);
    const textarea = page.locator('textarea[placeholder*="200文字以内"]');
    await textarea.fill(content200);
    
    // 文字数カウントの確認
    await expect(page.locator('text=/200\\/200/')).toBeVisible();
    
    // 投稿ボタンが有効であることを確認
    const submitButton = page.locator('button:has-text("投稿")');
    await expect(submitButton).toBeEnabled();
    
    // 201文字目を入力しようとする
    await textarea.press('End');
    await page.keyboard.type('あ');
    
    // まだ200文字であることを確認
    const value = await textarea.inputValue();
    expect(value.length).toBeLessThanOrEqual(200);
  });

  test('TEST-10: 空のフィールドでは投稿できない', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 投稿ボタンと入力欄を取得
    const submitButton = page.locator('button:has-text("投稿")');
    const textarea = page.locator('textarea[placeholder*="200文字以内"]');
    
    // 空の状態で投稿ボタンが無効
    await expect(textarea).toHaveValue('');
    await expect(submitButton).toBeDisabled();
    
    // 内容を入力
    await textarea.fill('テスト投稿');
    await expect(submitButton).toBeEnabled();
    
    // 内容をクリア
    await textarea.clear();
    await expect(submitButton).toBeDisabled();
  });

  test('TEST-11: セッションタイムアウト後の動作', async ({ page, context }) => {
    await signIn(page, testUser1);
    
    // セッションCookieを削除
    await context.clearCookies();
    
    // ページをリロード
    await page.reload();
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/auth\/signin/);
  });
});

test.describe('セキュリティテスト', () => {
  test('TEST-12: XSS攻撃の防御', async ({ page }) => {
    // ユーザー1でログイン
    await signIn(page, testUser1);
    
    // XSSペイロードを含む投稿を作成
    const xssContent = '<script>alert("XSS")</script>';
    
    await page.fill('textarea[placeholder*="200文字以内"]', xssContent);
    await page.click('button:has-text("投稿")');
    
    // 投稿が表示されるまで待機
    await page.waitForTimeout(2000);
    
    // スクリプトが実行されないことを確認
    // エスケープされたHTMLが表示されることを確認
    await expect(page.locator(`text="${xssContent}"`)).toBeVisible();
    
    // 実際のscriptタグが存在しないことを確認
    const scriptTags = await page.locator('script:has-text("alert")').count();
    expect(scriptTags).toBe(0);
  });
});

test.describe('パフォーマンステスト', () => {
  test('TEST-13: 投稿作成のレスポンス時間', async ({ page }) => {
    await signIn(page, testUser1);
    
    // パフォーマンス計測
    const startTime = Date.now();
    
    // 3件の投稿を作成
    for (let i = 1; i <= 3; i++) {
      await page.fill('textarea[placeholder*="200文字以内"]', `パフォーマンステスト${i}`);
      await page.click('button:has-text("投稿")');
      await page.waitForTimeout(1000);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // 3件の投稿が10秒以内に完了することを確認
    expect(totalTime).toBeLessThan(10000);
    
    console.log(`パフォーマンステスト: 3件の投稿作成時間 = ${totalTime}ms`);
  });
});

test.describe('アクセシビリティテスト', () => {
  test('TEST-14: キーボードナビゲーション', async ({ page }) => {
    await signIn(page, testUser1);
    
    // テキストエリアにフォーカスを当てる
    const textarea = page.locator('textarea[placeholder*="200文字以内"]');
    await textarea.focus();
    
    // キーボードで入力
    await page.keyboard.type('キーボード操作テスト');
    
    // Tabキーで投稿ボタンにフォーカスを移動
    await page.keyboard.press('Tab');
    
    // Enterキーで投稿
    await page.keyboard.press('Enter');
    
    // 投稿が作成されることを確認
    await page.waitForTimeout(2000);
    await expect(page.locator('text=キーボード操作テスト')).toBeVisible();
  });
});