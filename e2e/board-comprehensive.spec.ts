import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

// テストユーザー情報
const testUser1 = {
  email: `test-user1-${Date.now()}@example.com`,
  username: `TestUser1_${Date.now()}`,
  password: 'Test@123456',
  displayName: 'テストユーザー1'
};

const testUser2 = {
  email: `test-user2-${Date.now()}@example.com`,
  username: `TestUser2_${Date.now()}`,
  password: 'Test@123456',
  displayName: 'テストユーザー2'
};

// 認証ヘルパー関数
async function registerAndLogin(page: Page, user: typeof testUser1) {
  await page.goto('/signup');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);
  await page.click('button[type="submit"]');
  
  // 登録成功を待機
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await expect(page.locator('text=ダッシュボード')).toBeVisible();
}

async function login(page: Page, user: typeof testUser1) {
  await page.goto('/login');
  await page.fill('input[name="identifier"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  
  // ログイン成功を待機
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function logout(page: Page) {
  await page.click('button[aria-label="ユーザーメニュー"]');
  await page.click('text=ログアウト');
  await page.waitForURL('/login', { timeout: 5000 });
}

test.describe('掲示板CRUD機能 - 包括的テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('1. 未ログイン時のアクセス制限', async ({ page }) => {
    // ダッシュボードへのアクセス試行
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=ログインが必要です')).toBeVisible();
    
    // プロフィールページへのアクセス試行
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');
    
    // 掲示板ページへのアクセス試行
    await page.goto('/board');
    await expect(page).toHaveURL('/login');
  });

  test('2. ユーザー登録とログイン', async ({ page }) => {
    // ユーザー1の登録
    await registerAndLogin(page, testUser1);
    
    // ユーザー名が表示されているか確認
    await expect(page.locator(`text=${testUser1.username}`)).toBeVisible();
    
    // ログアウト
    await logout(page);
    
    // ユーザー2の登録
    await registerAndLogin(page, testUser2);
    await expect(page.locator(`text=${testUser2.username}`)).toBeVisible();
  });

  test('3. 投稿の作成と表示', async ({ page }) => {
    // ユーザー1でログイン
    await login(page, testUser1);
    
    // 掲示板ページへ移動
    await page.goto('/board');
    await page.waitForLoadState('networkidle');
    
    // 投稿作成
    const postTitle = `テスト投稿_${Date.now()}`;
    const postContent = 'これはE2Eテストで作成された投稿です。\n改行も含みます。';
    
    await page.fill('input[name="title"]', postTitle);
    await page.fill('textarea[name="content"]', postContent);
    await page.click('button:has-text("投稿する")');
    
    // 投稿が表示されるまで待機
    await page.waitForSelector(`text=${postTitle}`, { timeout: 5000 });
    
    // 投稿が正しく表示されているか確認
    await expect(page.locator(`text=${postTitle}`)).toBeVisible();
    await expect(page.locator(`text=${postContent.split('\\n')[0]}`)).toBeVisible();
    await expect(page.locator(`text=${testUser1.username}`)).toBeVisible();
    
    // フォームがクリアされているか確認
    await expect(page.locator('input[name="title"]')).toHaveValue('');
    await expect(page.locator('textarea[name="content"]')).toHaveValue('');
  });

  test('4. 投稿一覧の表示（新着順）', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // 3つの投稿を作成
    const posts = [];
    for (let i = 1; i <= 3; i++) {
      const title = `投稿${i}_${Date.now()}`;
      const content = `これは${i}番目の投稿です。`;
      
      await page.fill('input[name="title"]', title);
      await page.fill('textarea[name="content"]', content);
      await page.click('button:has-text("投稿する")');
      await page.waitForSelector(`text=${title}`);
      
      posts.push({ title, content });
      await page.waitForTimeout(1000); // 投稿間隔を確保
    }
    
    // 投稿リストを取得
    const postElements = page.locator('[data-testid="post-item"]');
    const postCount = await postElements.count();
    
    if (postCount >= 3) {
      // 最新の投稿が上に表示されているか確認（降順）
      await expect(postElements.nth(0)).toContainText(posts[2].title);
      await expect(postElements.nth(1)).toContainText(posts[1].title);
      await expect(postElements.nth(2)).toContainText(posts[0].title);
    }
  });

  test('5. 自分の投稿の編集', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // 投稿を作成
    const originalTitle = `編集前_${Date.now()}`;
    const originalContent = '編集前の内容です。';
    
    await page.fill('input[name="title"]', originalTitle);
    await page.fill('textarea[name="content"]', originalContent);
    await page.click('button:has-text("投稿する")');
    await page.waitForSelector(`text=${originalTitle}`);
    
    // 編集ボタンをクリック
    const postItem = page.locator(`text=${originalTitle}`).locator('xpath=ancestor::*[@data-testid="post-item"]');
    await postItem.locator('button[aria-label="編集"]').click();
    
    // 編集ダイアログが表示されるまで待機
    await page.waitForSelector('text=投稿を編集');
    
    // 内容を編集
    const editedContent = '編集後の内容です。\nこれは更新されました。';
    const editTextarea = page.locator('[role="dialog"] textarea');
    await editTextarea.clear();
    await editTextarea.fill(editedContent);
    
    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');
    
    // ダイアログが閉じるまで待機
    await page.waitForSelector('text=投稿を編集', { state: 'hidden' });
    
    // 編集後の内容が表示されているか確認
    await expect(page.locator(`text=${editedContent.split('\\n')[0]}`)).toBeVisible();
    await expect(page.locator(`text=${originalContent}`)).not.toBeVisible();
  });

  test('6. 自分の投稿の削除', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // 投稿を作成
    const deleteTitle = `削除予定_${Date.now()}`;
    const deleteContent = 'この投稿は削除されます。';
    
    await page.fill('input[name="title"]', deleteTitle);
    await page.fill('textarea[name="content"]', deleteContent);
    await page.click('button:has-text("投稿する")');
    await page.waitForSelector(`text=${deleteTitle}`);
    
    // 削除前の投稿が存在することを確認
    await expect(page.locator(`text=${deleteTitle}`)).toBeVisible();
    
    // 削除ボタンをクリック
    const postItem = page.locator(`text=${deleteTitle}`).locator('xpath=ancestor::*[@data-testid="post-item"]');
    
    // 確認ダイアログを受け入れる
    page.on('dialog', dialog => dialog.accept());
    await postItem.locator('button[aria-label="削除"]').click();
    
    // 投稿が削除されるまで待機
    await page.waitForSelector(`text=${deleteTitle}`, { state: 'hidden', timeout: 5000 });
    
    // 投稿が削除されたことを確認
    await expect(page.locator(`text=${deleteTitle}`)).not.toBeVisible();
  });

  test('7. 他人の投稿の編集・削除不可', async ({ page }) => {
    // ユーザー1で投稿作成
    await login(page, testUser1);
    await page.goto('/board');
    
    const user1PostTitle = `ユーザー1の投稿_${Date.now()}`;
    await page.fill('input[name="title"]', user1PostTitle);
    await page.fill('textarea[name="content"]', 'ユーザー1が作成した投稿');
    await page.click('button:has-text("投稿する")');
    await page.waitForSelector(`text=${user1PostTitle}`);
    
    // ログアウト
    await logout(page);
    
    // ユーザー2でログイン
    await login(page, testUser2);
    await page.goto('/board');
    
    // ユーザー1の投稿を確認
    await expect(page.locator(`text=${user1PostTitle}`)).toBeVisible();
    
    // 編集・削除ボタンが表示されないことを確認
    const user1PostItem = page.locator(`text=${user1PostTitle}`).locator('xpath=ancestor::*[@data-testid="post-item"]');
    await expect(user1PostItem.locator('button[aria-label="編集"]')).not.toBeVisible();
    await expect(user1PostItem.locator('button[aria-label="削除"]')).not.toBeVisible();
    
    // ユーザー2自身の投稿を作成
    const user2PostTitle = `ユーザー2の投稿_${Date.now()}`;
    await page.fill('input[name="title"]', user2PostTitle);
    await page.fill('textarea[name="content"]', 'ユーザー2が作成した投稿');
    await page.click('button:has-text("投稿する")');
    await page.waitForSelector(`text=${user2PostTitle}`);
    
    // ユーザー2の投稿には編集・削除ボタンが表示されることを確認
    const user2PostItem = page.locator(`text=${user2PostTitle}`).locator('xpath=ancestor::*[@data-testid="post-item"]');
    await expect(user2PostItem.locator('button[aria-label="編集"]')).toBeVisible();
    await expect(user2PostItem.locator('button[aria-label="削除"]')).toBeVisible();
  });

  test('8. 文字数制限の動作', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // タイトルの文字数制限（100文字）
    const title100 = 'あ'.repeat(100);
    await page.fill('input[name="title"]', title100);
    await expect(page.locator('text=100/100文字')).toBeVisible();
    
    // 101文字目を入力しようとする
    await page.locator('input[name="title"]').press('End');
    await page.keyboard.type('あ');
    await expect(page.locator('text=100/100文字')).toBeVisible(); // まだ100文字
    
    // 内容の文字数制限（500文字）
    const content500 = 'い'.repeat(500);
    await page.fill('textarea[name="content"]', content500);
    await expect(page.locator('text=500/500文字')).toBeVisible();
    
    // 501文字目を入力しようとする
    await page.locator('textarea[name="content"]').press('End');
    await page.keyboard.type('い');
    await expect(page.locator('text=500/500文字')).toBeVisible(); // まだ500文字
    
    // 投稿ボタンが有効であることを確認
    const submitButton = page.locator('button:has-text("投稿する")');
    await expect(submitButton).toBeEnabled();
    
    // 投稿を実行
    await submitButton.click();
    await page.waitForSelector(`text=${title100.substring(0, 20)}`); // 最初の20文字で確認
  });

  test('9. 空のフィールドでは投稿できない', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // 投稿ボタンが無効であることを確認
    const submitButton = page.locator('button:has-text("投稿する")');
    await expect(submitButton).toBeDisabled();
    
    // タイトルのみ入力
    await page.fill('input[name="title"]', 'タイトルのみ');
    await expect(submitButton).toBeDisabled();
    
    // タイトルをクリアして内容のみ入力
    await page.fill('input[name="title"]', '');
    await page.fill('textarea[name="content"]', '内容のみ');
    await expect(submitButton).toBeDisabled();
    
    // 両方入力
    await page.fill('input[name="title"]', 'タイトル');
    await page.fill('textarea[name="content"]', '内容');
    await expect(submitButton).toBeEnabled();
  });

  test('10. セッションタイムアウト後の動作', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // セッションCookieを削除してタイムアウトをシミュレート
    await page.context().clearCookies();
    
    // ページをリロード
    await page.reload();
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=ログインが必要です')).toBeVisible();
  });

  test('11. 同時編集の競合処理', async ({ browser }) => {
    // 2つのブラウザコンテキストを作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // 両方のページでユーザー1としてログイン
      await login(page1, testUser1);
      await login(page2, testUser1);
      
      // 投稿を作成
      await page1.goto('/board');
      const conflictTitle = `競合テスト_${Date.now()}`;
      await page1.fill('input[name="title"]', conflictTitle);
      await page1.fill('textarea[name="content"]', '初期内容');
      await page1.click('button:has-text("投稿する")');
      await page1.waitForSelector(`text=${conflictTitle}`);
      
      // 両方のページで同じ投稿を編集
      await page2.goto('/board');
      await page2.reload(); // 最新の投稿を取得
      
      // ページ1で編集開始
      const postItem1 = page1.locator(`text=${conflictTitle}`).locator('xpath=ancestor::*[@data-testid="post-item"]');
      await postItem1.locator('button[aria-label="編集"]').click();
      await page1.waitForSelector('text=投稿を編集');
      
      // ページ2でも編集開始
      const postItem2 = page2.locator(`text=${conflictTitle}`).locator('xpath=ancestor::*[@data-testid="post-item"]');
      await postItem2.locator('button[aria-label="編集"]').click();
      await page2.waitForSelector('text=投稿を編集');
      
      // ページ1で更新
      const editTextarea1 = page1.locator('[role="dialog"] textarea');
      await editTextarea1.clear();
      await editTextarea1.fill('ページ1から更新');
      await page1.click('button:has-text("更新")');
      await page1.waitForSelector('text=投稿を編集', { state: 'hidden' });
      
      // ページ2で更新（競合が発生）
      const editTextarea2 = page2.locator('[role="dialog"] textarea');
      await editTextarea2.clear();
      await editTextarea2.fill('ページ2から更新');
      await page2.click('button:has-text("更新")');
      
      // エラーメッセージまたは競合解決の確認
      // 実装に応じて適切な動作を確認
      await page2.waitForTimeout(1000);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('12. XSS攻撃の防御', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // XSSペイロードを含む投稿を作成
    const xssTitle = '<script>alert("XSS")</script>';
    const xssContent = '<img src=x onerror="alert(\'XSS\')">';
    
    await page.fill('input[name="title"]', xssTitle);
    await page.fill('textarea[name="content"]', xssContent);
    await page.click('button:has-text("投稿する")');
    
    // 投稿が表示されるまで待機
    await page.waitForTimeout(2000);
    
    // スクリプトが実行されないことを確認（アラートが表示されない）
    // HTMLがエスケープされて表示されることを確認
    await expect(page.locator('text=<script>alert("XSS")</script>')).toBeVisible();
    await expect(page.locator('text=<img src=x onerror="alert(\'XSS\')">')).toBeVisible();
    
    // 実際のscriptタグやimgタグが存在しないことを確認
    await expect(page.locator('script:has-text("alert")')).not.toBeVisible();
    await expect(page.locator('img[src="x"]')).not.toBeVisible();
  });
});

test.describe('パフォーマンステスト', () => {
  test('大量投稿時のパフォーマンス', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // パフォーマンス計測開始
    const startTime = Date.now();
    
    // 10件の投稿を連続作成
    for (let i = 1; i <= 10; i++) {
      await page.fill('input[name="title"]', `パフォーマンステスト${i}`);
      await page.fill('textarea[name="content"]', `投稿${i}の内容`);
      await page.click('button:has-text("投稿する")');
      await page.waitForSelector(`text=パフォーマンステスト${i}`);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // 10件の投稿が30秒以内に完了することを確認
    expect(totalTime).toBeLessThan(30000);
    
    // ページのロード時間を計測
    const reloadStart = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const reloadEnd = Date.now();
    const reloadTime = reloadEnd - reloadStart;
    
    // リロードが5秒以内に完了することを確認
    expect(reloadTime).toBeLessThan(5000);
  });
});

test.describe('アクセシビリティテスト', () => {
  test('キーボードナビゲーション', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab'); // タイトル入力欄へ
    await expect(page.locator('input[name="title"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // 内容入力欄へ
    await expect(page.locator('textarea[name="content"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // 投稿ボタンへ
    await expect(page.locator('button:has-text("投稿する")')).toBeFocused();
    
    // フォームに入力
    await page.locator('input[name="title"]').focus();
    await page.keyboard.type('キーボード操作テスト');
    await page.keyboard.press('Tab');
    await page.keyboard.type('キーボードのみで投稿');
    
    // Enterキーで投稿（Ctrl+Enter or Cmd+Enter）
    await page.keyboard.press('Control+Enter');
    
    // 投稿が作成されることを確認
    await page.waitForSelector('text=キーボード操作テスト');
  });

  test('スクリーンリーダー対応', async ({ page }) => {
    await login(page, testUser1);
    await page.goto('/board');
    
    // ARIA属性の確認
    await expect(page.locator('input[name="title"]')).toHaveAttribute('aria-label', /タイトル/);
    await expect(page.locator('textarea[name="content"]')).toHaveAttribute('aria-label', /内容|投稿/);
    
    // ボタンのaria-label確認
    await expect(page.locator('button:has-text("投稿する")')).toHaveAttribute('aria-label', /投稿|送信/);
    
    // 投稿を作成
    await page.fill('input[name="title"]', 'アクセシビリティテスト');
    await page.fill('textarea[name="content"]', 'スクリーンリーダー対応確認');
    await page.click('button:has-text("投稿する")');
    await page.waitForSelector('text=アクセシビリティテスト');
    
    // 編集・削除ボタンのaria-label確認
    const postItem = page.locator('text=アクセシビリティテスト').locator('xpath=ancestor::*[@data-testid="post-item"]');
    await expect(postItem.locator('button[aria-label="編集"]')).toHaveAttribute('aria-label', '編集');
    await expect(postItem.locator('button[aria-label="削除"]')).toHaveAttribute('aria-label', '削除');
  });
});