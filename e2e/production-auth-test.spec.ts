import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_EMAIL = 'one.photolife+2@gmail.com';
const TEST_PASSWORD = '?@thc123THC@?';

test.describe('本番環境認証・権限テスト', () => {
  test('完全な認証フローと権限管理の検証', async ({ page }) => {
    console.log('===== 本番環境テスト開始 =====');
    console.log('環境:', PROD_URL);
    console.log('実行時刻:', new Date().toISOString());
    
    // Step 1: ログインページアクセス
    console.log('\n[Step 1] ログインページアクセス');
    await page.goto(`${PROD_URL}/auth/signin`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // フォーム要素の確認
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    const formVisible = await emailInput.isVisible() && 
                       await passwordInput.isVisible() && 
                       await submitButton.isVisible();
    
    console.log('ログインフォーム表示:', formVisible ? '✅' : '❌');
    
    // Step 2: ログイン実行
    console.log('\n[Step 2] ログイン実行');
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    // スクリーンショット: ログイン前
    await page.screenshot({ 
      path: 'test-results/prod-before-login.png',
      fullPage: true 
    });
    
    await submitButton.click();
    
    // ログイン後の遷移を待つ
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    const loginSuccess = !currentUrl.includes('/auth/signin');
    console.log('ログイン結果:', loginSuccess ? '✅ 成功' : '❌ 失敗');
    console.log('現在のURL:', currentUrl);
    
    // スクリーンショット: ログイン後
    await page.screenshot({ 
      path: 'test-results/prod-after-login.png',
      fullPage: true 
    });
    
    if (!loginSuccess) {
      // エラーメッセージを探す
      const errorElements = await page.locator('text=/error|エラー|Invalid|無効/i').all();
      if (errorElements.length > 0) {
        console.log('エラーメッセージ検出:');
        for (const elem of errorElements) {
          const text = await elem.textContent();
          console.log('  -', text);
        }
      }
      
      // メール未確認メッセージを探す
      const verifyElements = await page.locator('text=/確認|verify|verification/i').all();
      if (verifyElements.length > 0) {
        console.log('メール確認関連メッセージ:');
        for (const elem of verifyElements) {
          const text = await elem.textContent();
          console.log('  -', text);
        }
      }
      return;
    }
    
    // Step 3: ダッシュボードアクセス
    console.log('\n[Step 3] ダッシュボードアクセス');
    await page.goto(`${PROD_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const dashboardUrl = page.url();
    const dashboardAccess = dashboardUrl.includes('/dashboard');
    console.log('ダッシュボードアクセス:', dashboardAccess ? '✅ 可能' : '❌ 不可');
    
    // Step 4: 掲示板ページで権限確認
    console.log('\n[Step 4] 掲示板での権限確認');
    await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // 投稿の存在確認
    const posts = await page.locator('.MuiCard-root, [data-testid="post-item"]').count();
    console.log('投稿数:', posts);
    
    if (posts > 0) {
      // 最初の投稿で権限ボタンを確認
      const firstPost = page.locator('.MuiCard-root, [data-testid="post-item"]').first();
      
      // 編集ボタンの状態
      const editButton = firstPost.locator('button[aria-label="edit"], button:has-text("編集")').first();
      const editVisible = await editButton.isVisible().catch(() => false);
      const editDisabled = await editButton.isDisabled().catch(() => true);
      
      console.log('編集ボタン:', {
        表示: editVisible ? '✅' : '❌',
        有効: !editDisabled ? '✅' : '❌'
      });
      
      // 削除ボタンの状態
      const deleteButton = firstPost.locator('button[aria-label="delete"], button:has-text("削除")').first();
      const deleteVisible = await deleteButton.isVisible().catch(() => false);
      const deleteDisabled = await deleteButton.isDisabled().catch(() => true);
      
      console.log('削除ボタン:', {
        表示: deleteVisible ? '✅' : '❌',
        有効: !deleteDisabled ? '✅' : '❌'
      });
    }
    
    // Step 5: 新規投稿ページアクセス
    console.log('\n[Step 5] 新規投稿ページアクセス');
    await page.goto(`${PROD_URL}/posts/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const newPostUrl = page.url();
    const newPostAccess = newPostUrl.includes('/posts/new');
    console.log('新規投稿ページアクセス:', newPostAccess ? '✅ 可能' : '❌ 不可');
    
    if (newPostAccess) {
      const titleField = await page.locator('input[type="text"]').first().isVisible().catch(() => false);
      const contentField = await page.locator('textarea').first().isVisible().catch(() => false);
      const submitBtn = await page.locator('button[type="submit"]').first().isVisible().catch(() => false);
      
      console.log('投稿フォーム要素:', {
        タイトル: titleField ? '✅' : '❌',
        本文: contentField ? '✅' : '❌',
        送信ボタン: submitBtn ? '✅' : '❌'
      });
    }
    
    // Step 6: My Postsページ
    console.log('\n[Step 6] My Postsページ');
    await page.goto(`${PROD_URL}/my-posts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const myPostsUrl = page.url();
    const myPostsAccess = myPostsUrl.includes('/my-posts');
    console.log('My Postsページアクセス:', myPostsAccess ? '✅ 可能' : '❌ 不可');
    
    if (myPostsAccess) {
      const myPosts = await page.locator('.MuiCard-root, [data-testid="post-item"]').count();
      console.log('自分の投稿数:', myPosts);
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-results/prod-final.png',
      fullPage: true 
    });
    
    console.log('\n===== 本番環境テスト完了 =====');
    console.log('スクリーンショット:');
    console.log('  - test-results/prod-before-login.png');
    console.log('  - test-results/prod-after-login.png');
    console.log('  - test-results/prod-final.png');
    console.log('実行時刻:', new Date().toISOString());
  });
});