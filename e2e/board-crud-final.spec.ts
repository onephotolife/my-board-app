import { test, expect, Page } from '@playwright/test';

// テストユーザー情報
const testUser1 = {
  email: `test1-${Date.now()}@example.com`,
  username: `user1_${Date.now()}`,
  password: 'Test@123456',
};

const testUser2 = {
  email: `test2-${Date.now()}@example.com`,
  username: `user2_${Date.now()}`,
  password: 'Test@123456',
};

// 認証ヘルパー関数
async function signUp(page: Page, user: typeof testUser1) {
  await page.goto('/auth/signup');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);
  await page.click('button[type="submit"]:has-text("登録")');
  
  // 登録成功を待機
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function signIn(page: Page, user: typeof testUser1) {
  await page.goto('/auth/signin');
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]:has-text("ログイン")');
  
  // ログイン成功を待機
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function signOut(page: Page) {
  // アバターアイコンをクリック
  await page.click('button[aria-label="Account menu"], img[alt="User Avatar"]');
  await page.click('text=ログアウト');
  await page.waitForURL('/auth/signin', { timeout: 5000 });
}

test.describe('掲示板CRUD機能テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('1. 未ログイン時のアクセス制限', async ({ page }) => {
    // ダッシュボードへのアクセス試行
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/auth\/signin/);
    
    // プロフィールページへのアクセス試行
    await page.goto('/profile');
    await expect(page).toHaveURL(/auth\/signin/);
  });

  test('2. ユーザー登録とログイン', async ({ page }) => {
    // ユーザー1の登録
    await signUp(page, testUser1);
    
    // ダッシュボードが表示されることを確認
    await expect(page.locator('h4:has-text("ダッシュボード")')).toBeVisible();
    
    // ログアウト
    await signOut(page);
    
    // ユーザー2の登録
    await signUp(page, testUser2);
    await expect(page.locator('h4:has-text("ダッシュボード")')).toBeVisible();
  });

  test('3. 投稿の作成と表示', async ({ page }) => {
    // ユーザー1でログイン
    await signIn(page, testUser1);
    
    // 投稿フォームが表示されることを確認
    await expect(page.locator('textarea[placeholder*="200文字以内"]')).toBeVisible();
    
    // 投稿作成
    const postContent = `テスト投稿 ${Date.now()}\\nこれはE2Eテストです。`;
    
    await page.fill('textarea[placeholder*="200文字以内"]', postContent);
    await page.click('button:has-text("投稿")');
    
    // 投稿が表示されるまで待機
    await page.waitForTimeout(1000);
    
    // 投稿が表示されていることを確認
    const lines = postContent.split('\\n');
    await expect(page.locator(`text="${lines[0]}"`)).toBeVisible();
    
    // フォームがクリアされていることを確認
    await expect(page.locator('textarea[placeholder*="200文字以内"]')).toHaveValue('');
  });

  test('4. 投稿一覧の表示（新着順）', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 3つの投稿を作成
    const posts = [];
    for (let i = 1; i <= 3; i++) {
      const content = `投稿${i} - ${Date.now()}`;
      
      await page.fill('textarea[placeholder*="200文字以内"]', content);
      await page.click('button:has-text("投稿")');
      await page.waitForTimeout(1000);
      
      posts.push(content);
    }
    
    // 最新の投稿が上に表示されているか確認
    const postElements = page.locator('[class*="MuiPaper-root"]:has([class*="MuiTypography-body"])');
    const firstPost = await postElements.first().textContent();
    
    // 最後に投稿したものが最初に表示されることを確認
    expect(firstPost).toContain(posts[2]);
  });

  test('5. 自分の投稿の編集', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 投稿を作成
    const originalContent = `編集前 ${Date.now()}`;
    await page.fill('textarea[placeholder*="200文字以内"]', originalContent);
    await page.click('button:has-text("投稿")');
    await page.waitForTimeout(1000);
    
    // 編集ボタンをクリック
    const postWithContent = page.locator(`text="${originalContent}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper")]').first();
    await postWithContent.locator('button[aria-label="edit"]').click();
    
    // 編集ダイアログが表示されるまで待機
    await page.waitForSelector('text=投稿を編集');
    
    // 内容を編集
    const editedContent = `編集後 ${Date.now()}`;
    const editTextarea = page.locator('[role="dialog"] textarea, [role="presentation"] textarea').first();
    await editTextarea.clear();
    await editTextarea.fill(editedContent);
    
    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');
    
    // ダイアログが閉じるまで待機
    await page.waitForTimeout(1000);
    
    // 編集後の内容が表示されていることを確認
    await expect(page.locator(`text="${editedContent}"`)).toBeVisible();
    await expect(page.locator(`text="${originalContent}"`)).not.toBeVisible();
  });

  test('6. 自分の投稿の削除', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 投稿を作成
    const deleteContent = `削除予定 ${Date.now()}`;
    await page.fill('textarea[placeholder*="200文字以内"]', deleteContent);
    await page.click('button:has-text("投稿")');
    await page.waitForTimeout(1000);
    
    // 削除前の投稿が存在することを確認
    await expect(page.locator(`text="${deleteContent}"`)).toBeVisible();
    
    // 削除ボタンをクリック
    const postWithContent = page.locator(`text="${deleteContent}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper")]').first();
    
    // 確認ダイアログを受け入れる
    page.on('dialog', dialog => dialog.accept());
    await postWithContent.locator('button[aria-label="delete"]').click();
    
    // 投稿が削除されるまで待機
    await page.waitForTimeout(2000);
    
    // 投稿が削除されたことを確認
    await expect(page.locator(`text="${deleteContent}"`)).not.toBeVisible();
  });

  test('7. 他人の投稿の編集・削除不可', async ({ page, browser }) => {
    // ユーザー1で投稿作成
    await signIn(page, testUser1);
    
    const user1Post = `ユーザー1の投稿 ${Date.now()}`;
    await page.fill('textarea[placeholder*="200文字以内"]', user1Post);
    await page.click('button:has-text("投稿")');
    await page.waitForTimeout(1000);
    
    // ログアウト
    await signOut(page);
    
    // ユーザー2でログイン
    await signIn(page, testUser2);
    
    // ユーザー1の投稿を確認
    await expect(page.locator(`text="${user1Post}"`)).toBeVisible();
    
    // 編集・削除ボタンが表示されないことを確認
    const user1PostElement = page.locator(`text="${user1Post}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper")]').first();
    const editButton = user1PostElement.locator('button[aria-label="edit"]');
    const deleteButton = user1PostElement.locator('button[aria-label="delete"]');
    
    // ボタンが存在しないか、非表示であることを確認
    const editCount = await editButton.count();
    const deleteCount = await deleteButton.count();
    
    expect(editCount).toBe(0);
    expect(deleteCount).toBe(0);
    
    // ユーザー2自身の投稿を作成
    const user2Post = `ユーザー2の投稿 ${Date.now()}`;
    await page.fill('textarea[placeholder*="200文字以内"]', user2Post);
    await page.click('button:has-text("投稿")');
    await page.waitForTimeout(1000);
    
    // ユーザー2の投稿には編集・削除ボタンが表示されることを確認
    const user2PostElement = page.locator(`text="${user2Post}"`).locator('xpath=ancestor::*[contains(@class, "MuiPaper")]').first();
    await expect(user2PostElement.locator('button[aria-label="edit"]')).toBeVisible();
    await expect(user2PostElement.locator('button[aria-label="delete"]')).toBeVisible();
  });

  test('8. 文字数制限の動作', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 200文字の投稿
    const content200 = 'あ'.repeat(200);
    await page.fill('textarea[placeholder*="200文字以内"]', content200);
    
    // 文字数カウントの確認
    await expect(page.locator('text=200/200')).toBeVisible();
    
    // 投稿ボタンが有効であることを確認
    const submitButton = page.locator('button:has-text("投稿")');
    await expect(submitButton).toBeEnabled();
    
    // 201文字目を入力しようとする（入力されないはず）
    const textarea = page.locator('textarea[placeholder*="200文字以内"]');
    await textarea.press('End');
    await page.keyboard.type('あ');
    
    // まだ200文字であることを確認
    const value = await textarea.inputValue();
    expect(value.length).toBeLessThanOrEqual(200);
  });

  test('9. 空のフィールドでは投稿できない', async ({ page }) => {
    await signIn(page, testUser1);
    
    // 投稿ボタンが無効であることを確認
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

  test('10. セッションタイムアウト後の動作', async ({ page, context }) => {
    await signIn(page, testUser1);
    
    // セッションCookieを削除
    await context.clearCookies();
    
    // ページをリロード
    await page.reload();
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/auth\/signin/);
  });
});

test.describe('XSSセキュリティテスト', () => {
  test('XSS攻撃の防御', async ({ page }) => {
    await signIn(page, testUser1);
    
    // XSSペイロードを含む投稿を作成
    const xssContent = '<script>alert("XSS")</script><img src=x onerror="alert(\'XSS\')">';
    
    await page.fill('textarea[placeholder*="200文字以内"]', xssContent);
    await page.click('button:has-text("投稿")');
    
    // 投稿が表示されるまで待機
    await page.waitForTimeout(2000);
    
    // スクリプトが実行されないことを確認（アラートが表示されない）
    // HTMLがエスケープされて表示されることを確認
    const postContent = await page.locator('[class*="MuiPaper-root"]:has-text("<script>")').first().textContent();
    expect(postContent).toContain('<script>');
    
    // 実際のscriptタグが存在しないことを確認
    const scriptTags = await page.locator('script:has-text("alert")').count();
    expect(scriptTags).toBe(0);
  });
});

test.describe('パフォーマンステスト', () => {
  test('投稿作成のレスポンス時間', async ({ page }) => {
    await signIn(page, testUser1);
    
    // パフォーマンス計測
    const startTime = Date.now();
    
    // 5件の投稿を作成
    for (let i = 1; i <= 5; i++) {
      await page.fill('textarea[placeholder*="200文字以内"]', `パフォーマンステスト${i}`);
      await page.click('button:has-text("投稿")');
      await page.waitForTimeout(500);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // 5件の投稿が15秒以内に完了することを確認
    expect(totalTime).toBeLessThan(15000);
  });
});

test.describe('アクセシビリティテスト', () => {
  test('キーボードナビゲーション', async ({ page }) => {
    await signIn(page, testUser1);
    
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // テキストエリアにフォーカスが当たるまでTabを押す
    for (let i = 0; i < 10; i++) {
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused === 'TEXTAREA') break;
      await page.keyboard.press('Tab');
    }
    
    // フォームに入力
    await page.keyboard.type('キーボード操作テスト');
    
    // 投稿ボタンにフォーカスを移動
    await page.keyboard.press('Tab');
    
    // Enterキーで投稿
    await page.keyboard.press('Enter');
    
    // 投稿が作成されることを確認
    await page.waitForTimeout(1000);
    await expect(page.locator('text=キーボード操作テスト')).toBeVisible();
  });
});