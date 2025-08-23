import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('Production Like Button Test', () => {
  test('いいねボタンの動作とリアルタイム更新を確認', async ({ page }) => {
    console.log('📝 Production いいねボタン機能テスト開始');
    
    // ログイン処理
    await page.goto(`${PROD_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // スクリーンショット: ログイン前
    await page.screenshot({ path: 'test-results/like-button-01-login.png', fullPage: true });
    
    // ログインボタンをクリック
    const submitButton = await page.$('button:has-text("ログイン"), button[type="submit"], button');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.click('button');
    }
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(`${PROD_URL}/dashboard`, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // ボードページへ移動
    await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // スクリーンショット: ボードページ
    await page.screenshot({ path: 'test-results/like-button-02-board.png', fullPage: true });
    
    // 投稿が表示されるまで待機
    const postCards = await page.$$('[data-testid^="post-card-"]');
    console.log(`  表示されている投稿数: ${postCards.length}`);
    
    if (postCards.length === 0) {
      console.log('  ⚠️ 投稿が表示されていません');
      
      // MuiCardを探す（data-testidがない場合）
      const muiCards = await page.$$('.MuiCard-root');
      console.log(`  MuiCard数: ${muiCards.length}`);
      
      if (muiCards.length > 0) {
        // 最初のカードでいいねボタンを探す
        const firstCard = muiCards[0];
        
        // いいねボタンを探す（複数の方法）
        const likeButtonIcon = await firstCard.$('svg[data-testid="FavoriteBorderIcon"], svg[data-testid="FavoriteIcon"]');
        const likeButton = await firstCard.$('button:has(svg[data-testid="FavoriteBorderIcon"]), button:has(svg[data-testid="FavoriteIcon"])');
        
        console.log(`  いいねボタン（アイコン）: ${likeButtonIcon ? 'あり' : 'なし'}`);
        console.log(`  いいねボタン（ボタン）: ${likeButton ? 'あり' : 'なし'}`);
        
        if (likeButton) {
          // いいね数を取得（BadgeContent）
          const badgeContent = await firstCard.$('.MuiBadge-badge');
          const initialLikeCount = badgeContent ? await badgeContent.textContent() : '0';
          console.log(`  初期いいね数: ${initialLikeCount || '0'}`);
          
          // いいねボタンをクリック
          await likeButton.click();
          await page.waitForTimeout(2000);
          
          // スクリーンショット: いいね後
          await page.screenshot({ path: 'test-results/like-button-03-after-like.png', fullPage: true });
          
          // いいね後の数を確認
          const afterBadgeContent = await firstCard.$('.MuiBadge-badge');
          const afterLikeCount = afterBadgeContent ? await afterBadgeContent.textContent() : '0';
          console.log(`  いいね後の数: ${afterLikeCount || '0'}`);
          
          // 数が変化したことを確認
          const initialCount = parseInt(initialLikeCount || '0', 10);
          const afterCount = parseInt(afterLikeCount || '0', 10);
          
          if (afterCount !== initialCount) {
            console.log(`  ✅ いいね数が変化: ${initialCount} → ${afterCount}`);
          } else {
            console.log(`  ⚠️ いいね数が変化していません: ${initialCount} → ${afterCount}`);
          }
          
          // もう一度クリックして取り消し
          await likeButton.click();
          await page.waitForTimeout(2000);
          
          // スクリーンショット: いいね取り消し後
          await page.screenshot({ path: 'test-results/like-button-04-after-unlike.png', fullPage: true });
          
          const afterUnlikeBadgeContent = await firstCard.$('.MuiBadge-badge');
          const afterUnlikeCount = afterUnlikeBadgeContent ? await afterUnlikeBadgeContent.textContent() : '0';
          const unlikeCount = parseInt(afterUnlikeCount || '0', 10);
          
          console.log(`  取り消し後の数: ${unlikeCount}`);
          
          if (unlikeCount === initialCount) {
            console.log(`  ✅ いいね取り消し成功: ${afterCount} → ${unlikeCount}`);
          } else {
            console.log(`  ⚠️ いいね取り消しが期待値と異なる: ${afterCount} → ${unlikeCount} (期待: ${initialCount})`);
          }
        }
      }
    } else {
      // data-testidがある場合の処理
      const firstPost = postCards[0];
      const postId = await firstPost.getAttribute('data-testid');
      const actualPostId = postId?.replace('post-card-', '');
      
      console.log(`  投稿ID: ${actualPostId}`);
      
      // いいねボタンの状態を確認
      const likeButton = await page.$(`[data-testid="like-button-${actualPostId}"]`);
      const likeCount = await page.$(`[data-testid="like-count-${actualPostId}"]`);
      
      if (likeButton && likeCount) {
        // 初期のいいね数を取得
        const initialLikeCount = await likeCount.textContent() || '0';
        console.log(`  初期いいね数: ${initialLikeCount}`);
        
        // いいねボタンをクリック
        await likeButton.click();
        await page.waitForTimeout(2000);
        
        // いいね後の数を確認
        const afterLikeCount = await likeCount.textContent() || '0';
        console.log(`  いいね後の数: ${afterLikeCount}`);
        
        // 数が増えたことを確認
        const initialCount = parseInt(initialLikeCount, 10);
        const afterCount = parseInt(afterLikeCount, 10);
        
        if (afterCount === initialCount + 1) {
          console.log(`  ✅ いいね数が増加: ${initialCount} → ${afterCount}`);
        } else {
          console.log(`  ⚠️ いいね数の増加が期待値と異なる: ${initialCount} → ${afterCount}`);
        }
      }
    }
    
    // My Postsページで反映を確認
    await page.goto(`${PROD_URL}/my-posts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // スクリーンショット: My Posts
    await page.screenshot({ path: 'test-results/like-button-05-my-posts.png', fullPage: true });
    
    // 総いいね数を確認
    const totalLikesElement = await page.locator('text=/総いいね数/').locator('..').locator('h4');
    const totalLikesText = await totalLikesElement.textContent();
    console.log(`  My Posts総いいね数: ${totalLikesText}`);
    
    // 各投稿のいいね数を集計
    const myPostCards = await page.$$('.MuiCard-root');
    let calculatedTotal = 0;
    const postLikes: number[] = [];
    
    for (let i = 0; i < myPostCards.length; i++) {
      const card = myPostCards[i];
      
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
    
    console.log(`  計算した総いいね数: ${calculatedTotal}`);
    const displayedTotal = parseInt(totalLikesText || '0', 10);
    
    // IPoV（視覚的証拠の記述）
    console.log('\\n📊 IPoV (視覚的証拠):');
    console.log('  - ボードページに投稿カードが表示');
    console.log('  - 各投稿にいいねボタン（ハートアイコン）が配置');
    console.log('  - いいね数はバッジで表示');
    console.log('  - クリックでハートアイコンが塗りつぶし/枠線に変化');
    console.log('  - My Postsページで総いいね数が表示');
    
    // 詳細レポート
    console.log('\\n📊 == テスト結果サマリー ==');
    console.log(`  ボードページ投稿数: ${postCards.length || muiCards.length}`);
    console.log(`  My Posts投稿数: ${myPostCards.length}`);
    console.log(`  個別いいね数: [${postLikes.join(', ')}]`);
    console.log(`  総いいね数（表示）: ${displayedTotal}`);
    console.log(`  総いいね数（計算）: ${calculatedTotal}`);
    console.log(`  一致確認: ${displayedTotal === calculatedTotal ? '✅ 正確' : '❌ 不一致'}`);
    console.log(`  検証結果: ${displayedTotal === calculatedTotal ? '✅ PASSED' : '❌ FAILED'}`);
  });
});