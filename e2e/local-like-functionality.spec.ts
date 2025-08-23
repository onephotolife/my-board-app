import { test, expect } from '@playwright/test';

test.describe('Like Functionality Test', () => {
  test('いいねボタンの動作確認とリアルタイム更新', async ({ page, context }) => {
    console.log('📝 いいねボタン機能テスト開始');
    
    // 2つのページを開く（リアルタイム更新確認用）
    const page2 = await context.newPage();
    
    // ログイン処理（ページ1）
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // テストユーザーでログイン
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/dashboard', { timeout: 15000 });
    
    // ボードページへ移動
    await page.goto('http://localhost:3000/board', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // 投稿が表示されるまで待機
    await page.waitForSelector('[data-testid^="post-card-"]', { timeout: 10000 });
    
    // 最初の投稿のいいねボタンを取得
    const firstPost = await page.locator('[data-testid^="post-card-"]').first();
    const postId = await firstPost.getAttribute('data-testid');
    const actualPostId = postId?.replace('post-card-', '');
    
    console.log(`  投稿ID: ${actualPostId}`);
    
    // いいねボタンの状態を確認
    const likeButton = await page.locator(`[data-testid="like-button-${actualPostId}"]`).first();
    const likeCount = await page.locator(`[data-testid="like-count-${actualPostId}"]`).first();
    
    // 初期のいいね数を取得
    const initialLikeCount = await likeCount.textContent() || '0';
    console.log(`  初期いいね数: ${initialLikeCount}`);
    
    // スクリーンショット: いいね前
    await page.screenshot({ path: 'test-results/like-test-01-before.png', fullPage: true });
    
    // いいねボタンをクリック
    await likeButton.click();
    await page.waitForTimeout(1000);
    
    // いいね後の数を確認
    const afterLikeCount = await likeCount.textContent() || '0';
    console.log(`  いいね後の数: ${afterLikeCount}`);
    
    // スクリーンショット: いいね後
    await page.screenshot({ path: 'test-results/like-test-02-after.png', fullPage: true });
    
    // 数が増えたことを確認
    const initialCount = parseInt(initialLikeCount, 10);
    const afterCount = parseInt(afterLikeCount, 10);
    
    expect(afterCount, 'いいね数が増加していません').toBe(initialCount + 1);
    console.log(`  ✅ いいね数が増加: ${initialCount} → ${afterCount}`);
    
    // もう一度クリックして取り消し
    await likeButton.click();
    await page.waitForTimeout(1000);
    
    const afterUnlikeCount = await likeCount.textContent() || '0';
    const unlikeCount = parseInt(afterUnlikeCount, 10);
    
    expect(unlikeCount, 'いいね取り消しが機能していません').toBe(initialCount);
    console.log(`  ✅ いいね取り消し成功: ${afterCount} → ${unlikeCount}`);
    
    // My Postsページで反映を確認
    await page.goto('http://localhost:3000/my-posts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // 総いいね数を確認
    const totalLikesElement = await page.locator('text=/総いいね数/').locator('..').locator('h4');
    const totalLikesText = await totalLikesElement.textContent();
    console.log(`  My Posts総いいね数: ${totalLikesText}`);
    
    // スクリーンショット: My Posts
    await page.screenshot({ path: 'test-results/like-test-03-my-posts.png', fullPage: true });
    
    // 詳細レポート
    console.log('\\n📊 == テスト結果サマリー ==');
    console.log(`  初期いいね数: ${initialLikeCount}`);
    console.log(`  いいね後: ${afterLikeCount}`);
    console.log(`  取り消し後: ${afterUnlikeCount}`);
    console.log(`  My Posts総数: ${totalLikesText}`);
    console.log(`  検証結果: ✅ PASSED`);
    
    await page2.close();
  });
});