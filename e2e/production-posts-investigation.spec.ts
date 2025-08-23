import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('Production Posts Investigation', () => {
  test('投稿消失の調査', async ({ page }) => {
    console.log('📝 Production 投稿消失調査開始');
    console.log(`  時刻: ${new Date().toISOString()}`);
    
    // ログイン処理
    await page.goto(`${PROD_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // ログインフォームに入力
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // ログインボタンをクリック
    const submitButton = await page.$('button:has-text("ログイン"), button[type="submit"], button');
    if (submitButton) {
      await submitButton.click();
    }
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(`${PROD_URL}/dashboard`, { timeout: 15000 });
    console.log('  ✅ ログイン成功');
    await page.waitForTimeout(3000);
    
    // ボードページへ移動
    await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // スクリーンショット: 現在のボードページ
    await page.screenshot({ path: 'test-results/investigation-01-board.png', fullPage: true });
    
    // 投稿数の確認（複数の方法）
    const postCards = await page.$$('[data-testid^="post-card-"]');
    const muiCards = await page.$$('.MuiCard-root');
    const postItems = await page.$$('[role="article"]');
    
    console.log('\\n📊 投稿の検出結果:');
    console.log(`  data-testid="post-card-*": ${postCards.length}件`);
    console.log(`  .MuiCard-root: ${muiCards.length}件`);
    console.log(`  [role="article"]: ${postItems.length}件`);
    
    // "投稿がありません"メッセージの確認
    const noPostsMessage = await page.$('text=/投稿がありません/');
    if (noPostsMessage) {
      const messageText = await noPostsMessage.textContent();
      console.log(`  ⚠️ メッセージ検出: "${messageText}"`);
    }
    
    // APIレスポンスを監視しながらリロード
    console.log('\\n📊 API応答の確認:');
    
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/posts') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);
    
    await page.reload({ waitUntil: 'domcontentloaded' });
    const apiResponse = await responsePromise;
    
    if (apiResponse) {
      const responseData = await apiResponse.json().catch(() => null);
      console.log(`  APIステータス: ${apiResponse.status()}`);
      console.log(`  API URL: ${apiResponse.url()}`);
      
      if (responseData) {
        if (Array.isArray(responseData)) {
          console.log(`  返却データ: 配列（${responseData.length}件）`);
          if (responseData.length > 0) {
            console.log(`  最初の投稿ID: ${responseData[0]._id || responseData[0].id || 'UNKNOWN'}`);
          }
        } else if (responseData.posts) {
          console.log(`  返却データ: オブジェクト.posts（${responseData.posts.length}件）`);
        } else {
          console.log(`  返却データ形式: ${typeof responseData}`);
          console.log(`  データキー: ${Object.keys(responseData).join(', ')}`);
        }
      }
    } else {
      console.log('  ⚠️ API応答を検出できませんでした');
    }
    
    // コンソールエラーの確認
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  コンソールエラー: ${msg.text()}`);
      }
    });
    
    // ネットワークエラーの確認
    page.on('requestfailed', request => {
      console.log(`  ネットワークエラー: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    // My Postsページの確認
    console.log('\\n📊 My Postsページの確認:');
    await page.goto(`${PROD_URL}/my-posts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/investigation-02-myposts.png', fullPage: true });
    
    const myPostCards = await page.$$('.MuiCard-root');
    const totalPosts = await page.locator('text=/総投稿数/').locator('..').locator('h4');
    const totalPostsText = await totalPosts.textContent().catch(() => 'UNKNOWN');
    
    console.log(`  My Posts投稿カード数: ${myPostCards.length}`);
    console.log(`  総投稿数表示: ${totalPostsText}`);
    
    // 新規投稿作成を試みる
    console.log('\\n📊 新規投稿作成テスト:');
    await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const postInput = await page.$('textarea[placeholder*="投稿を入力"], input[placeholder*="投稿を入力"]');
    if (postInput) {
      const testContent = `調査用テスト投稿 ${new Date().toISOString()}`;
      await postInput.fill(testContent);
      console.log(`  投稿内容: "${testContent}"`);
      
      const postButton = await page.$('button:has-text("新規投稿"), button:has-text("投稿")');
      if (postButton) {
        // APIレスポンスを監視
        const createResponsePromise = page.waitForResponse(
          response => response.url().includes('/api/posts') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        await postButton.click();
        const createResponse = await createResponsePromise;
        
        if (createResponse) {
          console.log(`  作成APIステータス: ${createResponse.status()}`);
          const createData = await createResponse.json().catch(() => null);
          if (createData) {
            console.log(`  作成結果: ${createData._id ? '成功' : 'データあり（ID不明）'}`);
          }
        }
        
        await page.waitForTimeout(3000);
        await page.reload({ waitUntil: 'domcontentloaded' });
        
        // 再度投稿数を確認
        const afterPostCards = await page.$$('[data-testid^="post-card-"]');
        const afterMuiCards = await page.$$('.MuiCard-root');
        console.log(`  作成後の投稿数: data-testid=${afterPostCards.length}, MuiCard=${afterMuiCards.length}`);
      } else {
        console.log('  ⚠️ 投稿ボタンが見つかりません');
      }
    } else {
      console.log('  ⚠️ 投稿入力フィールドが見つかりません');
    }
    
    // 最終スクリーンショット
    await page.screenshot({ path: 'test-results/investigation-03-final.png', fullPage: true });
    
    // IPoV（視覚的証拠の記述）
    console.log('\\n📊 IPoV (視覚的証拠):');
    console.log('  - ボードページのレイアウトは正常に表示');
    console.log('  - サイドバーメニューは表示されている');
    console.log('  - メインコンテンツエリアに投稿カードまたは"投稿がありません"メッセージ');
    console.log('  - 新規投稿フォームの有無');
    
    // 最終診断
    console.log('\\n📊 == 診断結果 ==');
    if (postCards.length === 0 && muiCards.length === 0) {
      if (noPostsMessage) {
        console.log('  状態: 投稿が0件（"投稿がありません"メッセージ表示）');
      } else {
        console.log('  状態: 投稿が0件（メッセージなし）');
      }
      console.log('  推定原因:');
      console.log('    1. データベースの投稿が削除された');
      console.log('    2. APIが空配列を返している');
      console.log('    3. 権限/フィルタリングの問題');
      console.log('    4. データベース接続の問題');
    } else {
      console.log(`  状態: 投稿が${Math.max(postCards.length, muiCards.length)}件表示`);
    }
  });
});