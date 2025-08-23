import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('Debug Like API Test', () => {
  test('APIレスポンスとユーザーID形式を詳細調査', async ({ page }) => {
    console.log('🔍 Like API Debug テスト開始');
    
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
    await page.waitForTimeout(3000);
    
    // APIリクエストをインターセプト
    const apiRequests: any[] = [];
    const apiResponses: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/posts/')) {
        console.log(`📤 API Request: ${request.method()} ${request.url()}`);
        if (request.method() === 'PATCH') {
          apiRequests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData()
          });
        }
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/posts/') && response.request().method() === 'PATCH') {
        try {
          const responseBody = await response.json();
          console.log(`📥 API Response: ${response.status()} ${response.url()}`);
          console.log('📄 Response Body:', JSON.stringify(responseBody, null, 2));
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            body: responseBody
          });
        } catch (e) {
          console.log('❌ Failed to parse response body:', e);
        }
      }
    });
    
    // ボードページへ移動
    await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // コンソールログをキャプチャ
    page.on('console', msg => {
      if (msg.text().includes('いいね') || msg.text().includes('認証') || msg.text().includes('📝') || msg.text().includes('✅') || msg.text().includes('🚫')) {
        console.log(`🖥️  Console: ${msg.text()}`);
      }
    });
    
    // 最初の投稿のいいねボタンをクリック
    const postCards = await page.$$('[data-testid^="post-card-"]');
    
    if (postCards.length > 0) {
      const firstPost = postCards[0];
      const postId = await firstPost.getAttribute('data-testid');
      const actualPostId = postId?.replace('post-card-', '');
      
      console.log(`🎯 対象投稿ID: ${actualPostId}`);
      
      // いいねボタンをクリック前の状態
      const likeButton = await page.locator(`[data-testid="like-button-${actualPostId}"]`).first();
      const likeCount = await page.locator(`[data-testid="like-count-${actualPostId}"]`).first();
      
      const initialLikeCount = await likeCount.textContent() || '0';
      console.log(`📊 クリック前いいね数: ${initialLikeCount}`);
      
      // いいねボタンクリック
      await likeButton.click();
      console.log('👆 いいねボタンをクリックしました');
      
      // 少し待機してAPIレスポンスを待つ
      await page.waitForTimeout(3000);
      
      // クリック後の状態
      const afterLikeCount = await likeCount.textContent() || '0';
      console.log(`📊 クリック後いいね数: ${afterLikeCount}`);
      
      // APIリクエスト・レスポンスを確認
      console.log(`\\n🔍 キャプチャしたAPIリクエスト数: ${apiRequests.length}`);
      apiRequests.forEach((req, i) => {
        console.log(`  Request ${i + 1}: ${req.method} ${req.url}`);
        console.log(`    Headers: ${JSON.stringify(req.headers, null, 2)}`);
        console.log(`    Body: ${req.postData}`);
      });
      
      console.log(`\\n🔍 キャプチャしたAPIレスポンス数: ${apiResponses.length}`);
      apiResponses.forEach((res, i) => {
        console.log(`  Response ${i + 1}: ${res.status} ${res.url}`);
        console.log(`    Body: ${JSON.stringify(res.body, null, 2)}`);
      });
      
      // スクリーンショット
      await page.screenshot({ path: 'test-results/debug-like-api-after-click.png', fullPage: true });
    } else {
      console.log('❌ 投稿が見つかりません');
    }
    
    console.log('\\n📊 == Debug結果サマリー ==');
    console.log(`  APIリクエスト数: ${apiRequests.length}`);
    console.log(`  APIレスポンス数: ${apiResponses.length}`);
    console.log(`  検証完了: ✅`);
  });
});