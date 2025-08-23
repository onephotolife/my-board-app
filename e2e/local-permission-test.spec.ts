import { test, expect } from '@playwright/test';

const TEST_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test1234!';

test.describe('ローカル権限管理テスト', () => {
  test('権限制御の基本動作確認', async ({ page }) => {
    console.log('===== ローカル権限管理テスト開始 =====');
    console.log('環境:', TEST_URL);
    console.log('実行時刻:', new Date().toISOString());
    
    // Step 1: ログイン試行
    console.log('\n[Step 1] ログイン');
    try {
      await page.goto(`${TEST_URL}/auth/signin`, { timeout: 10000 });
      
      // ログインフォームの存在確認
      const emailInput = await page.locator('input[name="email"]').isVisible();
      const passwordInput = await page.locator('input[name="password"]').isVisible();
      
      console.log('ログインフォーム表示:', emailInput && passwordInput ? '✅' : '❌');
      
      if (emailInput && passwordInput) {
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        
        // ログイン結果を待つ
        await page.waitForTimeout(3000);
        
        const currentUrl = page.url();
        const loginSuccess = !currentUrl.includes('/auth/signin');
        console.log('ログイン結果:', loginSuccess ? '✅ 成功' : '❌ 失敗');
        console.log('現在のURL:', currentUrl);
      }
    } catch (error) {
      console.log('ログインエラー:', error.message);
    }
    
    // Step 2: 掲示板ページでの権限確認
    console.log('\n[Step 2] 掲示板での権限確認');
    try {
      await page.goto(`${TEST_URL}/board`, { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // 投稿の存在確認
      const posts = await page.locator('.MuiCard-root, [data-testid="post-item"]').count();
      console.log('投稿数:', posts);
      
      if (posts > 0) {
        // 最初の投稿の権限ボタンを確認
        const firstPost = await page.locator('.MuiCard-root, [data-testid="post-item"]').first();
        
        // 編集ボタンの状態
        const editButton = await firstPost.locator('button[aria-label="edit"], button:has-text("編集")').first();
        const editVisible = await editButton.isVisible().catch(() => false);
        const editDisabled = await editButton.isDisabled().catch(() => true);
        
        console.log('編集ボタン:', {
          表示: editVisible ? '✅' : '❌',
          有効: !editDisabled ? '✅' : '❌'
        });
        
        // 削除ボタンの状態
        const deleteButton = await firstPost.locator('button[aria-label="delete"], button:has-text("削除")').first();
        const deleteVisible = await deleteButton.isVisible().catch(() => false);
        const deleteDisabled = await deleteButton.isDisabled().catch(() => true);
        
        console.log('削除ボタン:', {
          表示: deleteVisible ? '✅' : '❌',
          有効: !deleteDisabled ? '✅' : '❌'
        });
      }
    } catch (error) {
      console.log('掲示板エラー:', error.message);
    }
    
    // Step 3: 新規投稿ページのアクセス権限
    console.log('\n[Step 3] 新規投稿ページのアクセス権限');
    try {
      await page.goto(`${TEST_URL}/posts/new`, { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const hasAccess = currentUrl.includes('/posts/new');
      const redirectedToLogin = currentUrl.includes('/auth/signin');
      
      console.log('新規投稿ページアクセス:', hasAccess ? '✅ 可能' : '❌ 不可');
      console.log('ログインページへリダイレクト:', redirectedToLogin ? '✅' : '❌');
      
      if (hasAccess) {
        // フォームフィールドの確認
        const titleField = await page.locator('input[type="text"]').first().isVisible().catch(() => false);
        const contentField = await page.locator('textarea').first().isVisible().catch(() => false);
        const submitButton = await page.locator('button[type="submit"]').first().isVisible().catch(() => false);
        
        console.log('投稿フォーム要素:', {
          タイトル: titleField ? '✅' : '❌',
          本文: contentField ? '✅' : '❌',
          送信ボタン: submitButton ? '✅' : '❌'
        });
      }
    } catch (error) {
      console.log('新規投稿ページエラー:', error.message);
    }
    
    // Step 4: My Postsページ
    console.log('\n[Step 4] My Postsページ');
    try {
      await page.goto(`${TEST_URL}/my-posts`, { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const hasAccess = currentUrl.includes('/my-posts');
      
      console.log('My Postsページアクセス:', hasAccess ? '✅ 可能' : '❌ 不可');
      
      if (hasAccess) {
        const myPosts = await page.locator('.MuiCard-root, [data-testid="post-item"]').count();
        console.log('自分の投稿数:', myPosts);
        
        if (myPosts > 0) {
          // 自分の投稿では編集・削除ボタンが有効なはず
          const firstPost = await page.locator('.MuiCard-root, [data-testid="post-item"]').first();
          
          const editEnabled = await firstPost.locator('button[aria-label="edit"]:not([disabled])').isVisible().catch(() => false);
          const deleteEnabled = await firstPost.locator('button[aria-label="delete"]:not([disabled])').isVisible().catch(() => false);
          
          console.log('自分の投稿の権限:', {
            編集可能: editEnabled ? '✅' : '❌',
            削除可能: deleteEnabled ? '✅' : '❌'
          });
        }
      }
    } catch (error) {
      console.log('My Postsページエラー:', error.message);
    }
    
    // Step 5: 権限エラーの確認
    console.log('\n[Step 5] 権限エラーの確認');
    try {
      // 存在しない投稿の編集ページへアクセス
      await page.goto(`${TEST_URL}/posts/000000000000000000000000/edit`, { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // エラーメッセージまたはリダイレクトの確認
      const errorMessage = await page.locator('text=/エラー|error|見つかりません|権限/i').isVisible().catch(() => false);
      const redirected = !page.url().includes('/edit');
      
      console.log('権限エラー処理:', {
        エラーメッセージ: errorMessage ? '✅' : '❌',
        リダイレクト: redirected ? '✅' : '❌'
      });
    } catch (error) {
      console.log('権限エラー確認エラー:', error.message);
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-results/local-permission-final.png',
      fullPage: true 
    });
    
    console.log('\n===== ローカル権限管理テスト完了 =====');
    console.log('スクリーンショット: test-results/local-permission-final.png');
    console.log('実行時刻:', new Date().toISOString());
  });
});