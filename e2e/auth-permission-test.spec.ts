import { test, expect } from '@playwright/test';

const TEST_URL = 'https://board.blankbrainai.com';
const TEST_EMAIL = 'one.photolife+2@gmail.com';
const TEST_PASSWORD = '?@thc123THC@?';

test.describe('権限管理テストスイート', () => {
  test.describe.configure({ mode: 'serial' });
  
  let authCookie: string;
  let myPostId: string;
  let otherPostId: string;

  test('Phase 1: 認証とテスト投稿の作成', async ({ page, request }) => {
    console.log('===== 権限管理テスト開始 =====');
    console.log('環境:', TEST_URL);
    console.log('実行時刻:', new Date().toISOString());
    
    // ログイン
    await page.goto(`${TEST_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard|\/board/, { timeout: 15000 });
    console.log('✅ ログイン成功');
    
    // Cookie取得
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));
    authCookie = sessionCookie ? `${sessionCookie.name}=${sessionCookie.value}` : '';
    
    // 自分の投稿を作成
    await page.goto(`${TEST_URL}/posts/new`);
    await page.waitForSelector('input[placeholder*="タイトル"], label:has-text("タイトル") + input', { timeout: 10000 });
    
    const testTitle = `権限テスト投稿_${Date.now()}`;
    const testContent = 'これは権限管理テスト用の投稿です。編集・削除権限のテストに使用します。';
    
    // MUIのTextFieldを確実に選択
    const titleInput = await page.locator('input').filter({ hasText: /タイトル/ }).or(page.locator('input[placeholder*="タイトル"]')).first();
    await titleInput.fill(testTitle);
    
    const contentInput = await page.locator('textarea').filter({ hasText: /本文/ }).or(page.locator('textarea[placeholder*="本文"]')).first();
    await contentInput.fill(testContent);
    await page.click('button[type="submit"]:has-text("投稿")');
    
    await page.waitForURL('**/board', { timeout: 10000 });
    console.log('✅ テスト投稿作成成功');
    
    // 投稿IDを取得
    await page.goto(`${TEST_URL}/my-posts`);
    await page.waitForSelector('[data-testid="post-item"], .MuiCard-root', { timeout: 10000 });
    
    const firstPost = await page.locator('[data-testid="post-item"], .MuiCard-root').first();
    const editButton = await firstPost.locator('button:has-text("編集"), a:has-text("編集")').first();
    const href = await editButton.getAttribute('href');
    
    if (href) {
      myPostId = href.split('/').slice(-2)[0];
      console.log('自分の投稿ID:', myPostId);
    }
    
    // 他人の投稿IDを取得（掲示板から）
    await page.goto(`${TEST_URL}/board`);
    await page.waitForSelector('[data-testid="post-item"], .MuiCard-root', { timeout: 10000 });
    
    const posts = await page.locator('[data-testid="post-item"], .MuiCard-root').all();
    for (const post of posts) {
      const authorText = await post.locator('text=/投稿者|作成者|by/').textContent().catch(() => '');
      if (!authorText.includes(TEST_EMAIL.split('@')[0])) {
        const link = await post.locator('a[href*="/posts/"]').first();
        const postHref = await link.getAttribute('href');
        if (postHref) {
          otherPostId = postHref.split('/').pop() || '';
          console.log('他人の投稿ID:', otherPostId);
          break;
        }
      }
    }
  });

  test('Test 1: 自分の投稿の編集・削除ボタン表示確認', async ({ page }) => {
    console.log('\n[Test 1] 自分の投稿のボタン表示確認');
    
    await page.goto(`${TEST_URL}/my-posts`);
    await page.waitForSelector('[data-testid="post-item"], .MuiCard-root', { timeout: 10000 });
    
    const firstPost = await page.locator('[data-testid="post-item"], .MuiCard-root').first();
    
    // 編集ボタンの確認
    const editButton = await firstPost.locator('button:has-text("編集"), a:has-text("編集")');
    const editVisible = await editButton.isVisible();
    console.log('編集ボタン表示:', editVisible ? '✅' : '❌');
    expect(editVisible).toBe(true);
    
    // 削除ボタンの確認
    const deleteButton = await firstPost.locator('button:has-text("削除")');
    const deleteVisible = await deleteButton.isVisible();
    console.log('削除ボタン表示:', deleteVisible ? '✅' : '❌');
    expect(deleteVisible).toBe(true);
  });

  test('Test 2: 自分の投稿の編集（成功）', async ({ page }) => {
    console.log('\n[Test 2] 自分の投稿の編集');
    
    if (!myPostId) {
      console.log('⚠️ 投稿IDが取得できませんでした');
      test.skip();
    }
    
    await page.goto(`${TEST_URL}/posts/${myPostId}/edit`);
    await page.waitForSelector('textarea', { timeout: 10000 });
    
    const updatedContent = '編集テスト: この投稿は正常に編集されました。' + Date.now();
    const contentInput = await page.locator('textarea').first();
    await contentInput.fill(updatedContent);
    await page.click('button[type="submit"]:has-text("更新"), button[type="submit"]:has-text("保存")');
    
    await page.waitForURL(`**/posts/${myPostId}`, { timeout: 10000 });
    
    const content = await page.textContent('.MuiTypography-body1, [data-testid="post-content"]');
    const editSuccess = content?.includes('編集テスト') || false;
    console.log('編集成功:', editSuccess ? '✅' : '❌');
    expect(editSuccess).toBe(true);
  });

  test('Test 3: 他人の投稿の編集試行（失敗）', async ({ page }) => {
    console.log('\n[Test 3] 他人の投稿の編集試行');
    
    if (!otherPostId) {
      console.log('⚠️ 他人の投稿が見つかりません');
      test.skip();
    }
    
    // URLに直接アクセス
    await page.goto(`${TEST_URL}/posts/${otherPostId}/edit`);
    
    // エラーメッセージまたはリダイレクトを確認
    const errorVisible = await page.locator('text=/権限がありません|アクセスできません|forbidden|unauthorized/i').isVisible().catch(() => false);
    const redirected = page.url().includes('/board') || page.url().includes('/auth/signin');
    
    console.log('エラーメッセージ表示:', errorVisible ? '✅' : '❌');
    console.log('リダイレクト:', redirected ? '✅' : '❌');
    
    expect(errorVisible || redirected).toBe(true);
  });

  test('Test 4: APIへの不正リクエスト（他人の投稿削除）', async ({ request }) => {
    console.log('\n[Test 4] APIへの不正削除リクエスト');
    
    if (!otherPostId) {
      console.log('⚠️ 他人の投稿が見つかりません');
      test.skip();
    }
    
    const response = await request.delete(`${TEST_URL}/api/posts/${otherPostId}`, {
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    });
    
    const status = response.status();
    console.log('APIレスポンスステータス:', status);
    console.log('権限拒否（403/401）:', [401, 403].includes(status) ? '✅' : '❌');
    
    expect([401, 403]).toContain(status);
  });

  test('Test 5: 自分の投稿の削除（成功）', async ({ page }) => {
    console.log('\n[Test 5] 自分の投稿の削除');
    
    await page.goto(`${TEST_URL}/my-posts`);
    await page.waitForSelector('[data-testid="post-item"], .MuiCard-root', { timeout: 10000 });
    
    const postsCountBefore = await page.locator('[data-testid="post-item"], .MuiCard-root').count();
    console.log('削除前の投稿数:', postsCountBefore);
    
    // 削除ボタンをクリック
    const firstPost = await page.locator('[data-testid="post-item"], .MuiCard-root').first();
    await firstPost.locator('button:has-text("削除")').click();
    
    // 確認ダイアログ
    await page.locator('button:has-text("削除"), button:has-text("はい"), button:has-text("確認")').last().click();
    
    // 削除完了を待つ
    await page.waitForTimeout(2000);
    
    const postsCountAfter = await page.locator('[data-testid="post-item"], .MuiCard-root').count();
    console.log('削除後の投稿数:', postsCountAfter);
    
    const deleteSuccess = postsCountAfter < postsCountBefore || postsCountBefore === 0;
    console.log('削除成功:', deleteSuccess ? '✅' : '❌');
    expect(deleteSuccess).toBe(true);
  });

  test('Test 6: エラーメッセージの表示確認', async ({ page }) => {
    console.log('\n[Test 6] エラーメッセージ表示');
    
    // 存在しない投稿へのアクセス
    await page.goto(`${TEST_URL}/posts/nonexistent-id-123456/edit`);
    
    const errorElements = [
      'text=/エラー|error/i',
      'text=/見つかりません|not found/i',
      'text=/権限|permission|access/i',
      '.MuiAlert-root'
    ];
    
    let errorFound = false;
    for (const selector of errorElements) {
      const visible = await page.locator(selector).isVisible().catch(() => false);
      if (visible) {
        errorFound = true;
        const text = await page.locator(selector).first().textContent();
        console.log('エラーメッセージ:', text);
        break;
      }
    }
    
    console.log('エラーメッセージ表示:', errorFound ? '✅' : '❌');
    expect(errorFound).toBe(true);
  });

  test('Phase 2: テスト結果サマリー', async ({ page }) => {
    console.log('\n===== 権限管理テスト完了 =====');
    console.log('実行時刻:', new Date().toISOString());
    
    // スクリーンショット取得
    await page.goto(`${TEST_URL}/my-posts`);
    await page.screenshot({ 
      path: 'test-results/auth-permission-final.png',
      fullPage: true 
    });
    
    console.log('最終スクリーンショット: test-results/auth-permission-final.png');
  });
});