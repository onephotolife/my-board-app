import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('Production Final Check', () => {
  test('最終確認：投稿表示とAPI応答', async ({ page }) => {
    console.log('📝 Production 最終確認テスト開始');
    console.log(`  時刻: ${new Date().toISOString()}`);
    
    // ログイン処理
    await page.goto(`${PROD_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    const submitButton = await page.$('button:has-text("ログイン"), button[type="submit"], button');
    if (submitButton) {
      await submitButton.click();
    }
    
    await page.waitForURL(`${PROD_URL}/dashboard`, { timeout: 15000 });
    console.log('  ✅ ログイン成功');
    await page.waitForTimeout(3000);
    
    // APIレスポンスを監視しながらボードページへ移動
    console.log('\\n📊 ボードページとAPIレスポンス確認:');
    
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/posts') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);
    
    await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
    const apiResponse = await responsePromise;
    
    if (apiResponse) {
      const responseData = await apiResponse.json().catch(() => null);
      console.log(`  APIステータス: ${apiResponse.status()}`);
      
      if (responseData) {
        if (responseData.success && responseData.data) {
          console.log(`  APIレスポンス: success=${responseData.success}`);
          console.log(`  データ件数: ${responseData.data.length}件`);
          
          if (responseData.data.length > 0) {
            console.log('  最初の3件の投稿:');
            for (let i = 0; i < Math.min(3, responseData.data.length); i++) {
              const post = responseData.data[i];
              console.log(`    ${i+1}. ${post.title || '(無題)'} (status: ${post.status})`);
            }
          }
          
          if (responseData.pagination) {
            console.log(`  ページネーション: ${responseData.pagination.page}/${responseData.pagination.totalPages}ページ`);
            console.log(`  総投稿数: ${responseData.pagination.total}件`);
          }
        }
      }
    }
    
    await page.waitForTimeout(5000);
    
    // DOM要素の確認
    console.log('\\n📊 DOM要素の確認:');
    
    // 投稿カードを探す（複数の方法）
    const postCards = await page.$$('[data-testid^="post-card-"]');
    const muiCards = await page.$$('.MuiCard-root');
    const articles = await page.$$('[role="article"]');
    const postTitles = await page.$$('h2, h3, h4, h5'); // タイトル要素
    
    console.log(`  data-testid="post-card-*": ${postCards.length}件`);
    console.log(`  .MuiCard-root: ${muiCards.length}件`);
    console.log(`  [role="article"]: ${articles.length}件`);
    console.log(`  見出し要素(h2-h5): ${postTitles.length}件`);
    
    // 投稿がない場合のメッセージ
    const noPostsMessage = await page.$('text=/投稿がありません/');
    if (noPostsMessage) {
      const messageText = await noPostsMessage.textContent();
      console.log(`  ⚠️ メッセージ: "${messageText}"`);
    }
    
    // 投稿フォームの確認
    const postForm = await page.$('textarea[placeholder*="投稿"], input[placeholder*="投稿"]');
    const postButton = await page.$('button:has-text("新規投稿"), button:has-text("投稿")');
    console.log(`  投稿フォーム: ${postForm ? 'あり' : 'なし'}`);
    console.log(`  投稿ボタン: ${postButton ? 'あり' : 'なし'}`);
    
    // スクリーンショット
    await page.screenshot({ path: 'test-results/final-check-board.png', fullPage: true });
    
    // IPoV
    console.log('\\n📊 IPoV (視覚的証拠):');
    if (muiCards.length > 0) {
      const firstCard = muiCards[0];
      const cardText = await firstCard.textContent();
      console.log(`  最初のカードのテキスト（抜粋）: "${cardText?.substring(0, 100)}..."`);
    }
    
    // 最終診断
    console.log('\\n📊 == 最終診断 ==');
    const hasVisiblePosts = postCards.length > 0 || muiCards.length > 0 || articles.length > 0;
    
    if (hasVisiblePosts) {
      console.log('  ✅ SUCCESS: 投稿が表示されています');
      console.log(`  表示件数: ${Math.max(postCards.length, muiCards.length, articles.length)}件`);
    } else if (noPostsMessage) {
      console.log('  ⚠️ WARNING: 投稿が0件（"投稿がありません"メッセージ表示）');
      console.log('  可能性:');
      console.log('    1. データベースの更新がまだ反映されていない');
      console.log('    2. キャッシュの問題');
      console.log('    3. APIフィルタリングの問題が継続');
    } else {
      console.log('  ❌ ERROR: 投稿もメッセージも表示されていません');
    }
  });
});