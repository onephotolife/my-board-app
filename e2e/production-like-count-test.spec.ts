import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('Production Like Count Test', () => {
  test('My Postsページのいいね数集計が正確であることを確認', async ({ page }) => {
    console.log('📝 My Postsページのいいね数集計テスト開始');
    
    // ログイン処理
    await page.goto(`${PROD_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // スクリーンショット: ログイン前
    await page.screenshot({ path: 'test-results/like-count-01-login.png', fullPage: true });
    
    // ログインボタンをクリック
    await page.click('button:has-text("ログイン")');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(`${PROD_URL}/dashboard`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // My Postsページへ移動
    await page.goto(`${PROD_URL}/my-posts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // スクリーンショット: My Postsページ
    await page.screenshot({ path: 'test-results/like-count-02-my-posts.png', fullPage: true });
    
    // 総いいね数を取得
    const totalLikesElement = await page.locator('text=/総いいね数/').locator('..').locator('h4');
    const totalLikesText = await totalLikesElement.textContent();
    const totalLikes = parseInt(totalLikesText || '0', 10);
    
    console.log(`  📊 表示されている総いいね数: ${totalLikes}`);
    
    // 各投稿のいいね数を集計
    const postCards = await page.$$('.MuiCard-root');
    let calculatedTotal = 0;
    const postLikes: number[] = [];
    
    for (let i = 0; i < postCards.length; i++) {
      const card = postCards[i];
      
      // いいね数のテキストを探す（「X いいね」形式）
      const likeText = await card.$eval(
        'text=/\\d+ いいね/', 
        el => el.textContent || '0 いいね'
      ).catch(() => '0 いいね');
      
      const likeCount = parseInt(likeText.match(/\\d+/)?.[0] || '0', 10);
      postLikes.push(likeCount);
      calculatedTotal += likeCount;
      
      console.log(`  投稿${i + 1}: ${likeCount}いいね`);
    }
    
    console.log(`  📊 計算した総いいね数: ${calculatedTotal}`);
    console.log(`  ✅ 表示と計算の一致: ${totalLikes === calculatedTotal ? '正確' : '不一致'}`);
    
    // 統計情報セクションの確認
    const statsSection = await page.locator('.MuiGrid-container').first();
    await statsSection.screenshot({ path: 'test-results/like-count-03-stats.png' });
    
    // 総投稿数の確認
    const totalPostsElement = await page.locator('text=/総投稿数/').locator('..').locator('h4');
    const totalPostsText = await totalPostsElement.textContent();
    const displayedPostCount = parseInt(totalPostsText || '0', 10);
    
    console.log(`  📝 表示されている総投稿数: ${displayedPostCount}`);
    console.log(`  📝 実際の投稿数: ${postCards.length}`);
    
    // テスト結果の検証
    if (totalLikes === calculatedTotal) {
      console.log('✅ テスト成功: いいね数の集計が正確です');
    } else {
      console.log('❌ テスト失敗: いいね数の集計に誤りがあります');
      console.log(`  期待値: ${calculatedTotal}, 実際: ${totalLikes}`);
    }
    
    // 検証
    expect(totalLikes, 'Total likes should match calculated sum').toBe(calculatedTotal);
    expect(displayedPostCount, 'Post count should match actual posts').toBe(postCards.length);
    
    // 詳細レポート
    console.log('\n📊 == テスト結果サマリー ==');
    console.log(`  総投稿数: ${postCards.length}`);
    console.log(`  個別いいね数: [${postLikes.join(', ')}]`);
    console.log(`  総いいね数（表示）: ${totalLikes}`);
    console.log(`  総いいね数（計算）: ${calculatedTotal}`);
    console.log(`  検証結果: ${totalLikes === calculatedTotal ? '✅ PASSED' : '❌ FAILED'}`);
  });
});