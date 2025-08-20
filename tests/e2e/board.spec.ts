import { test, expect } from '@playwright/test';

// テストユーザー情報
const TEST_USER_1 = {
  email: 'test1@example.com',
  password: 'Test1234!',
  name: 'テストユーザー1'
};

const TEST_USER_2 = {
  email: 'test2@example.com',
  password: 'Test1234!',
  name: 'テストユーザー2'
};

// ヘルパー関数: ログイン
async function login(page: any, email: string, password: string) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('掲示板機能', () => {
  test.beforeEach(async ({ page }) => {
    // 各テストの前にクッキーをクリア
    await page.context().clearCookies();
  });

  test('未ログイン時は掲示板にアクセスできない', async ({ page }) => {
    await page.goto('/board');
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    
    // callbackUrlが設定されていることを確認
    const url = new URL(page.url());
    expect(url.searchParams.get('callbackUrl')).toContain('/board');
  });

  test('ログイン後、掲示板にアクセスできる', async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    await page.goto('/board');
    
    // ページタイトルと新規投稿ボタンの存在を確認
    await expect(page.locator('h1')).toContainText('掲示板');
    await expect(page.locator('text=新規投稿')).toBeVisible();
  });

  test('新規投稿を作成できる', async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    await page.goto('/board');
    
    // 新規投稿ボタンをクリック
    await page.click('text=新規投稿');
    await expect(page).toHaveURL('/board/new');
    
    // フォームに入力
    const timestamp = Date.now();
    const title = `E2Eテスト投稿 ${timestamp}`;
    const content = 'これはPlaywrightによる自動テストです。';
    
    await page.fill('input[label="タイトル"]', title);
    await page.fill('textarea[label="本文"]', content);
    
    // タグを追加
    await page.fill('input[label="タグを追加"]', 'E2E');
    await page.click('text=追加');
    await expect(page.locator('text=E2E')).toBeVisible();
    
    // 投稿を送信
    await page.click('button:has-text("投稿する")');
    
    // 一覧ページにリダイレクトされることを確認
    await expect(page).toHaveURL('/board');
    
    // 作成した投稿が表示されることを確認
    await expect(page.locator(`text=${title}`)).toBeVisible();
    await expect(page.locator(`text=${content}`)).toBeVisible();
  });

  test('文字数制限が機能する', async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    await page.goto('/board/new');
    
    // 100文字を超えるタイトルを入力
    const longTitle = 'あ'.repeat(101);
    await page.fill('input[label="タイトル"]', longTitle);
    
    // 入力値が100文字で切られることを確認
    const titleValue = await page.inputValue('input[label="タイトル"]');
    expect(titleValue.length).toBe(100);
    
    // 文字数カウンターの確認
    await expect(page.locator('text=100/100文字')).toBeVisible();
    
    // 1000文字を超える本文を入力
    const longContent = 'あ'.repeat(1001);
    await page.fill('textarea[label="本文"]', longContent);
    
    // 入力値が1000文字で切られることを確認
    const contentValue = await page.inputValue('textarea[label="本文"]');
    expect(contentValue.length).toBe(1000);
    
    // 文字数カウンターの確認
    await expect(page.locator('text=1000/1000文字')).toBeVisible();
  });

  test('自分の投稿を編集できる', async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    await page.goto('/board');
    
    // 最初の自分の投稿を見つける
    const postCard = page.locator('.MuiCard-root').first();
    
    // メニューを開く
    await postCard.locator('button[aria-label="メニュー"]').click();
    await page.click('text=編集');
    
    // 編集ページに遷移
    await expect(page).toHaveURL(/\/board\/.*\/edit/);
    
    // フォームに既存データが入っていることを確認
    const titleInput = page.locator('input[label="タイトル"]');
    await expect(titleInput).not.toBeEmpty();
    
    // 内容を変更
    const newTitle = `編集済み: ${Date.now()}`;
    await titleInput.clear();
    await titleInput.fill(newTitle);
    
    // 保存
    await page.click('button:has-text("更新する")');
    
    // 一覧ページに戻る
    await expect(page).toHaveURL('/board');
    
    // 変更が反映されていることを確認
    await expect(page.locator(`text=${newTitle}`)).toBeVisible();
  });

  test('自分の投稿を削除できる', async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    
    // まず投稿を作成
    await page.goto('/board/new');
    const deleteTitle = `削除テスト ${Date.now()}`;
    await page.fill('input[label="タイトル"]', deleteTitle);
    await page.fill('textarea[label="本文"]', '削除される投稿');
    await page.click('button:has-text("投稿する")');
    
    // 一覧ページで投稿を確認
    await expect(page.locator(`text=${deleteTitle}`)).toBeVisible();
    
    // 作成した投稿のメニューを開く
    const postCard = page.locator(`.MuiCard-root:has-text("${deleteTitle}")`);
    await postCard.locator('button[aria-label="メニュー"]').click();
    await page.click('text=削除');
    
    // 確認ダイアログが表示される
    await expect(page.locator('text=投稿を削除しますか？')).toBeVisible();
    
    // キャンセルをテスト
    await page.click('button:has-text("キャンセル")');
    await expect(page.locator(`text=${deleteTitle}`)).toBeVisible();
    
    // 再度削除を実行
    await postCard.locator('button[aria-label="メニュー"]').click();
    await page.click('text=削除');
    await page.click('button:has-text("削除"):not(:has-text("キャンセル"))');
    
    // 投稿が削除されたことを確認
    await expect(page.locator(`text=${deleteTitle}`)).not.toBeVisible();
  });

  test('他人の投稿は編集・削除できない', async ({ page }) => {
    // USER_1で投稿を作成
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    await page.goto('/board/new');
    const otherUserTitle = `他ユーザーテスト ${Date.now()}`;
    await page.fill('input[label="タイトル"]', otherUserTitle);
    await page.fill('textarea[label="本文"]', 'USER1の投稿');
    await page.click('button:has-text("投稿する")');
    
    // ログアウト
    await page.goto('/api/auth/signout');
    
    // USER_2でログイン
    await login(page, TEST_USER_2.email, TEST_USER_2.password);
    await page.goto('/board');
    
    // USER_1の投稿を確認
    const otherPostCard = page.locator(`.MuiCard-root:has-text("${otherUserTitle}")`);
    await expect(otherPostCard).toBeVisible();
    
    // メニューボタンが表示されないことを確認
    await expect(otherPostCard.locator('button[aria-label="メニュー"]')).not.toBeVisible();
    
    // URLを直接入力してもアクセスできないことを確認
    // （投稿IDを取得する方法がないため、この部分はAPIテストで確認）
  });

  test('ページネーションが動作する', async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    
    // 11件の投稿を作成（2ページ目が必要）
    for (let i = 1; i <= 11; i++) {
      await page.goto('/board/new');
      await page.fill('input[label="タイトル"]', `ページネーションテスト ${i}`);
      await page.fill('textarea[label="本文"]', `投稿 ${i}`);
      await page.click('button:has-text("投稿する")');
      await page.waitForURL('/board');
    }
    
    // 1ページ目に10件表示されることを確認
    const cards = page.locator('.MuiCard-root');
    await expect(cards).toHaveCount(10);
    
    // ページネーションコントロールが表示される
    await expect(page.locator('text=1 / 2 ページ')).toBeVisible();
    await expect(page.locator('button:has-text("次のページ")')).toBeVisible();
    
    // 2ページ目に移動
    await page.click('button:has-text("次のページ")');
    await expect(page).toHaveURL(/page=2/);
    
    // 2ページ目に1件表示される
    await expect(cards).toHaveCount(1);
    await expect(page.locator('button:has-text("前のページ")')).toBeVisible();
    
    // 1ページ目に戻る
    await page.click('button:has-text("前のページ")');
    await expect(page).toHaveURL(/page=1/);
    await expect(cards).toHaveCount(10);
  });

  test('XSS攻撃が防げる', async ({ page }) => {
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    await page.goto('/board/new');
    
    // XSSペイロードを含む投稿を作成
    const xssTitle = '<script>alert("XSS")</script>';
    const xssContent = '<img src=x onerror="alert(\'XSS\')">';
    
    await page.fill('input[label="タイトル"]', xssTitle);
    await page.fill('textarea[label="本文"]', xssContent);
    await page.click('button:has-text("投稿する")');
    
    // アラートが表示されないことを確認
    page.on('dialog', () => {
      throw new Error('XSS attack was successful - alert was shown');
    });
    
    // 投稿が文字列として表示される
    await expect(page.locator(`text=${xssTitle}`)).toBeVisible();
    await expect(page.locator(`text=${xssContent}`)).toBeVisible();
    
    // HTMLとして解釈されていないことを確認
    const titleHtml = await page.locator(`text=${xssTitle}`).innerHTML();
    expect(titleHtml).not.toContain('<script>');
  });
});

test.describe('パフォーマンステスト', () => {
  test('大量データでのパフォーマンス', async ({ page }) => {
    test.slow(); // タイムアウトを3倍に延長
    
    await login(page, TEST_USER_1.email, TEST_USER_1.password);
    
    // 50件の投稿を作成
    console.log('Creating 50 test posts...');
    for (let i = 1; i <= 50; i++) {
      await page.goto('/board/new');
      await page.fill('input[label="タイトル"]', `パフォーマンステスト ${i}`);
      await page.fill('textarea[label="本文"]', `これは${i}番目のテスト投稿です。`);
      await page.click('button:has-text("投稿する")');
      if (i % 10 === 0) console.log(`Created ${i} posts`);
    }
    
    // ページロード時間を測定
    const startTime = Date.now();
    await page.goto('/board');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time with 50+ posts: ${loadTime}ms`);
    
    // 3秒以内にロードされることを確認
    expect(loadTime).toBeLessThan(3000);
    
    // ページネーションが正常に動作
    await expect(page.locator('text=/\\d+ \\/ \\d+ ページ/')).toBeVisible();
  });
});