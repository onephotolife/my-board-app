import { test, expect } from '@playwright/test';

const BASE_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('my-posts要素削除確認', () => {
  test('本番環境で削除対象要素が存在しないことを確認', async ({ page }) => {
    // タイムアウトを延長
    test.setTimeout(90000);
    
    console.log('🔐 ログイン開始');
    
    // ログインページへ
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    
    // ログインフォーム入力
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    // ログイン実行
    await page.click('button[type="submit"]');
    
    // ダッシュボードまたはmy-postsへの遷移を待機
    await page.waitForURL(/\/(dashboard|my-posts)/, { timeout: 60000 });
    
    console.log('✅ ログイン成功');
    
    // my-postsページへ移動
    await page.goto(`${BASE_URL}/my-posts`, { waitUntil: 'networkidle' });
    
    console.log('📍 my-postsページ到達');
    
    // ページコンテンツを取得して確認
    const pageContent = await page.content();
    
    // 削除対象要素が存在しないことを確認
    const hasCommentStats = pageContent.includes('総コメント数');
    const hasViewStats = pageContent.includes('総閲覧数');
    const hasArchive = pageContent.includes('アーカイブ');
    const hasCommentText = /\d+\s*コメント/.test(pageContent);
    const hasViewText = /\d+\s*閲覧/.test(pageContent);
    
    console.log('🔍 検証結果:');
    console.log(`  総コメント数: ${hasCommentStats ? '❌ 存在' : '✅ 削除済み'}`);
    console.log(`  総閲覧数: ${hasViewStats ? '❌ 存在' : '✅ 削除済み'}`);
    console.log(`  アーカイブ: ${hasArchive ? '❌ 存在' : '✅ 削除済み'}`);
    console.log(`  コメント表示: ${hasCommentText ? '❌ 存在' : '✅ 削除済み'}`);
    console.log(`  閲覧表示: ${hasViewText ? '❌ 存在' : '✅ 削除済み'}`);
    
    // アサーション
    expect(hasCommentStats).toBe(false);
    expect(hasViewStats).toBe(false);
    expect(hasArchive).toBe(false);
    expect(hasCommentText).toBe(false);
    expect(hasViewText).toBe(false);
    
    // 総投稿数は存在することを確認
    const hasPostStats = pageContent.includes('総投稿数');
    console.log(`  総投稿数: ${hasPostStats ? '✅ 表示' : '❌ 非表示'}`);
    expect(hasPostStats).toBe(true);
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'test-results/my-posts-production-check.png',
      fullPage: true 
    });
    
    console.log('✅ すべての検証項目に合格');
  });
});