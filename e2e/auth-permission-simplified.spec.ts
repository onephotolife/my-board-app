import { test, expect } from '@playwright/test';

const TEST_URL = 'https://board.blankbrainai.com';
const TEST_EMAIL = 'one.photolife+2@gmail.com';
const TEST_PASSWORD = '?@thc123THC@?';

test.describe('権限管理簡易テスト', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('権限管理統合テスト', async ({ page, context }) => {
    console.log('===== 権限管理テスト開始 =====');
    console.log('環境:', TEST_URL);
    console.log('実行時刻:', new Date().toISOString());
    
    // Step 1: ログイン
    console.log('\n[Step 1] 認証');
    await page.goto(`${TEST_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard|\/board/, { timeout: 15000 });
    console.log('✅ ログイン成功');
    
    // 認証状態を保持
    await context.storageState({ path: 'auth-state.json' });
    
    // Step 2: 掲示板から投稿を確認
    console.log('\n[Step 2] 掲示板の投稿確認');
    await page.goto(`${TEST_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    // 投稿の存在確認
    const postExists = await page.locator('[data-testid="post-item"], .MuiCard-root').first().isVisible().catch(() => false);
    console.log('投稿の存在:', postExists ? '✅' : '❌');
    
    if (postExists) {
      // 自分の投稿かどうか確認
      const firstPost = await page.locator('[data-testid="post-item"], .MuiCard-root').first();
      const postText = await firstPost.textContent();
      const isMyPost = postText?.includes('test') || postText?.includes(TEST_EMAIL.split('@')[0]);
      console.log('自分の投稿検出:', isMyPost ? '✅' : '該当なし');
      
      // 編集・削除ボタンの表示確認
      const editButton = await firstPost.locator('button:has-text("編集"), a:has-text("編集")').isVisible().catch(() => false);
      const deleteButton = await firstPost.locator('button:has-text("削除")').isVisible().catch(() => false);
      
      console.log('編集ボタン表示:', editButton ? '✅' : '❌');
      console.log('削除ボタン表示:', deleteButton ? '✅' : '❌');
    }
    
    // Step 3: 自分の投稿ページ
    console.log('\n[Step 3] My Postsページ');
    await page.goto(`${TEST_URL}/my-posts`);
    await page.waitForLoadState('networkidle');
    
    const myPostsVisible = await page.locator('h1:has-text("自分の投稿"), h3:has-text("自分の投稿")').isVisible().catch(() => false);
    console.log('My Postsページ表示:', myPostsVisible ? '✅' : '❌');
    
    const myPostCount = await page.locator('[data-testid="post-item"], .MuiCard-root').count();
    console.log('自分の投稿数:', myPostCount);
    
    if (myPostCount > 0) {
      const firstMyPost = await page.locator('[data-testid="post-item"], .MuiCard-root').first();
      const myEditBtn = await firstMyPost.locator('button:has-text("編集"), a:has-text("編集")').isVisible().catch(() => false);
      const myDeleteBtn = await firstMyPost.locator('button:has-text("削除")').isVisible().catch(() => false);
      
      console.log('自分の投稿 - 編集ボタン:', myEditBtn ? '✅' : '❌');
      console.log('自分の投稿 - 削除ボタン:', myDeleteBtn ? '✅' : '❌');
      
      // 編集を試行
      if (myEditBtn) {
        const editLink = await firstMyPost.locator('button:has-text("編集"), a:has-text("編集")').first();
        const href = await editLink.getAttribute('href').catch(() => null);
        
        if (href) {
          console.log('\n[Step 4] 編集ページアクセステスト');
          await page.goto(`${TEST_URL}${href}`);
          await page.waitForLoadState('networkidle');
          
          const editFormVisible = await page.locator('textarea').isVisible().catch(() => false);
          console.log('編集フォーム表示:', editFormVisible ? '✅' : '❌');
          
          if (editFormVisible) {
            const originalContent = await page.locator('textarea').first().inputValue();
            const newContent = originalContent + '\n[編集テスト: ' + new Date().toISOString() + ']';
            await page.locator('textarea').first().fill(newContent);
            
            const saveButton = await page.locator('button:has-text("更新"), button:has-text("保存")').first();
            await saveButton.click();
            
            await page.waitForTimeout(2000);
            const savedSuccess = page.url().includes('/posts/') && !page.url().includes('/edit');
            console.log('編集保存成功:', savedSuccess ? '✅' : '❌');
          }
        }
      }
    }
    
    // Step 5: 他人の投稿への権限テスト
    console.log('\n[Step 5] 権限制御テスト');
    
    // 存在しない投稿IDでテスト
    const fakePostId = '507f1f77bcf86cd799439011';
    await page.goto(`${TEST_URL}/posts/${fakePostId}/edit`);
    await page.waitForLoadState('networkidle');
    
    const errorShown = await page.locator('text=/エラー|error|見つかりません|not found|権限/i').isVisible().catch(() => false);
    const redirectedToAuth = page.url().includes('/auth/signin');
    const redirectedToBoard = page.url().includes('/board');
    
    console.log('エラー表示:', errorShown ? '✅' : '❌');
    console.log('認証ページへリダイレクト:', redirectedToAuth ? '✅' : '❌');
    console.log('掲示板へリダイレクト:', redirectedToBoard ? '✅' : '❌');
    
    const accessDenied = errorShown || redirectedToAuth || redirectedToBoard;
    console.log('アクセス拒否（総合）:', accessDenied ? '✅' : '❌');
    
    // Step 6: 新規投稿作成テスト
    console.log('\n[Step 6] 新規投稿作成');
    await page.goto(`${TEST_URL}/posts/new`);
    await page.waitForLoadState('networkidle');
    
    const newPostPageVisible = !page.url().includes('/auth/signin');
    console.log('新規投稿ページアクセス:', newPostPageVisible ? '✅' : '❌');
    
    if (newPostPageVisible) {
      // タイトルフィールドを探す
      const titleInput = await page.locator('input[type="text"]').first().isVisible().catch(() => false);
      const contentTextarea = await page.locator('textarea').first().isVisible().catch(() => false);
      
      console.log('タイトルフィールド:', titleInput ? '✅' : '❌');
      console.log('本文フィールド:', contentTextarea ? '✅' : '❌');
      
      if (titleInput && contentTextarea) {
        await page.locator('input[type="text"]').first().fill('権限テスト投稿 ' + Date.now());
        await page.locator('textarea').first().fill('この投稿は権限管理のテストです。');
        
        const submitButton = await page.locator('button[type="submit"]:has-text("投稿")').isVisible().catch(() => false);
        console.log('投稿ボタン:', submitButton ? '✅' : '❌');
        
        if (submitButton) {
          await page.locator('button[type="submit"]:has-text("投稿")').click();
          await page.waitForTimeout(3000);
          
          const postCreated = page.url().includes('/board');
          console.log('投稿作成成功:', postCreated ? '✅' : '❌');
        }
      }
    }
    
    // Step 7: 削除テスト
    console.log('\n[Step 7] 削除権限テスト');
    await page.goto(`${TEST_URL}/my-posts`);
    await page.waitForLoadState('networkidle');
    
    const deleteTestCount = await page.locator('[data-testid="post-item"], .MuiCard-root').count();
    
    if (deleteTestCount > 0) {
      const deleteButton = await page.locator('button:has-text("削除")').first().isVisible().catch(() => false);
      console.log('削除ボタン表示:', deleteButton ? '✅' : '❌');
      
      if (deleteButton) {
        await page.locator('button:has-text("削除")').first().click();
        
        // 確認ダイアログを処理
        const confirmButton = await page.locator('button:has-text("削除"), button:has-text("はい"), button:has-text("確認")').last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
          
          const newCount = await page.locator('[data-testid="post-item"], .MuiCard-root').count();
          const deleteSuccess = newCount < deleteTestCount;
          console.log('削除実行結果:', deleteSuccess ? '✅' : '❌');
        }
      }
    }
    
    // 最終スクリーンショット
    await page.screenshot({ 
      path: 'test-results/auth-permission-final.png',
      fullPage: true 
    });
    
    console.log('\n===== 権限管理テスト完了 =====');
    console.log('スクリーンショット: test-results/auth-permission-final.png');
    console.log('実行時刻:', new Date().toISOString());
  });
});