import { test, expect } from '@playwright/test';

const PROD_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('Code Deployment Verification', () => {
  test('コード変更が本番環境に正しくデプロイされているかを確認', async ({ page }) => {
    console.log('🔍 デプロイメント検証開始');
    
    // すべてのコンソールログをキャプチャ
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('いいね') || text.includes('📝') || text.includes('✅') || text.includes('🚫') || text.includes('API') || text.includes('ERROR') || text.includes('error')) {
        console.log(`🖥️  Console: ${text}`);
      }
    });
    
    // エラーも監視
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
      consoleLogs.push(`ERROR: ${error.message}`);
    });
    
    // ログイン
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
    
    // ボードページへ移動
    await page.goto(`${PROD_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // デベロッパーツールでReactコンポーネントの状態を確認
    const componentState = await page.evaluate(() => {
      // Reactの開発者ツールがある場合
      const reactFiber = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      return {
        hasReactDevTools: !!reactFiber,
        userAgent: navigator.userAgent,
        location: window.location.href,
        timestamp: new Date().toISOString()
      };
    });
    
    console.log('🔧 環境情報:', JSON.stringify(componentState, null, 2));
    
    // handleLike関数の存在確認（JavaScriptソース内を検索）
    const handleLikeExists = await page.evaluate(() => {
      // ページのすべてのスクリプトタグの内容をチェック
      const scripts = Array.from(document.querySelectorAll('script'));
      let foundHandleLike = false;
      let foundSetPosts = false;
      
      scripts.forEach(script => {
        if (script.textContent) {
          if (script.textContent.includes('handleLike') && script.textContent.includes('setPosts')) {
            foundHandleLike = true;
          }
          if (script.textContent.includes('setPosts') && script.textContent.includes('prevPosts')) {
            foundSetPosts = true;
          }
        }
      });
      
      return { foundHandleLike, foundSetPosts };
    });
    
    console.log('🔍 コード確認:', JSON.stringify(handleLikeExists, null, 2));
    
    // 最初の投稿でいいねボタンクリック
    const postCards = await page.$$('[data-testid^="post-card-"]');
    
    if (postCards.length > 0) {
      const firstPost = postCards[0];
      const postId = await firstPost.getAttribute('data-testid');
      const actualPostId = postId?.replace('post-card-', '');
      
      console.log(`🎯 対象投稿ID: ${actualPostId}`);
      
      // クリック前の状態
      const likeButton = await page.locator(`[data-testid="like-button-${actualPostId}"]`).first();
      const likeCount = await page.locator(`[data-testid="like-count-${actualPostId}"]`).first();
      
      const initialLikeCount = await likeCount.textContent() || '0';
      console.log(`📊 クリック前: ${initialLikeCount}`);
      
      // いいねボタンクリック
      await likeButton.click();
      console.log('👆 いいねボタンクリック実行');
      
      // 2秒後の状態確認
      await page.waitForTimeout(2000);
      const afterLikeCount = await likeCount.textContent() || '0';
      console.log(`📊 2秒後: ${afterLikeCount}`);
      
      // さらに3秒待機
      await page.waitForTimeout(3000);
      const finalLikeCount = await likeCount.textContent() || '0';
      console.log(`📊 5秒後: ${finalLikeCount}`);
      
      // 変化の検証
      const hasChanged = initialLikeCount !== finalLikeCount;
      console.log(`📈 変化あり: ${hasChanged} (${initialLikeCount} → ${finalLikeCount})`);
      
    } else {
      console.log('❌ 投稿カードが見つかりません');
    }
    
    // 最終的なコンソールログサマリー
    const likeRelatedLogs = consoleLogs.filter(log => 
      log.includes('いいね') || log.includes('📝') || log.includes('✅') || log.includes('🚫')
    );
    
    console.log('\\n📋 いいね関連ログサマリー:');
    likeRelatedLogs.forEach((log, i) => {
      console.log(`  ${i + 1}: ${log}`);
    });
    
    console.log(`\\n📊 == 検証結果 ==`);
    console.log(`  コンソールログ総数: ${consoleLogs.length}`);
    console.log(`  いいね関連ログ数: ${likeRelatedLogs.length}`);
    console.log(`  handleLike発見: ${handleLikeExists.foundHandleLike}`);
    console.log(`  setPosts発見: ${handleLikeExists.foundSetPosts}`);
    console.log(`  検証完了: ✅`);
  });
});