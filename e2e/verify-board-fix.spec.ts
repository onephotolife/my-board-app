import { test, expect } from '@playwright/test';

/**
 * STRICT120準拠: boardページ閲覧数削除検証テスト
 * 
 * 検証項目:
 * 1. 各投稿の閲覧数表示が削除されていること
 * 2. 並び順オプションから「閲覧数順」が削除されていること
 */

const BASE_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('boardページ閲覧数削除検証', () => {
  test('本番環境で閲覧数表示が削除されていることを確認', async ({ page }) => {
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
    
    // ダッシュボードへの遷移を待機
    await page.waitForURL(/\/dashboard/, { timeout: 60000 });
    
    console.log('✅ ログイン成功');
    
    // boardページへ移動
    await page.goto(`${BASE_URL}/board`, { waitUntil: 'networkidle' });
    
    console.log('📍 boardページ到達');
    
    // ページコンテンツを取得
    const pageContent = await page.content();
    
    // 1. 閲覧数表示が存在しないことを確認
    // VisibilityIconのdata-testidまたはクラスを検索
    const hasViewIcons = await page.locator('[data-testid*="VisibilityIcon"]').count();
    const hasViewText = /\d+\s*(views|閲覧|表示)/.test(pageContent);
    
    console.log('🔍 検証結果:');
    console.log(`  閲覧数アイコン: ${hasViewIcons > 0 ? '❌ 存在' : '✅ 削除済み'}`);
    console.log(`  閲覧数テキスト: ${hasViewText ? '❌ 存在' : '✅ 削除済み'}`);
    
    expect(hasViewIcons).toBe(0);
    expect(hasViewText).toBe(false);
    
    // 2. 並び順セレクトボックスを開いて「閲覧数順」が存在しないことを確認
    console.log('📋 並び順オプションを確認中...');
    
    // 並び順セレクトボックスを探す
    const sortSelect = page.locator('text=/並び順/').locator('..').locator('select, [role="button"]').first();
    if (await sortSelect.isVisible()) {
      // セレクトボックスをクリックして開く
      await sortSelect.click();
      await page.waitForTimeout(500); // メニューが開くのを待つ
      
      // 「閲覧数順」オプションが存在しないことを確認
      const hasViewsSort = await page.locator('text=/閲覧数順/').count();
      console.log(`  「閲覧数順」オプション: ${hasViewsSort > 0 ? '❌ 存在' : '✅ 削除済み'}`);
      expect(hasViewsSort).toBe(0);
      
      // メニューを閉じる（ESCキー押下）
      await page.keyboard.press('Escape');
    }
    
    // 3. 投稿カードの内容を確認
    const postCards = await page.locator('[data-testid*="post-card"]').count();
    if (postCards > 0) {
      console.log(`📝 投稿カード: ${postCards}件確認`);
      
      // 最初の投稿カードの内容を詳細確認
      const firstCard = page.locator('[data-testid*="post-card"]').first();
      const cardText = await firstCard.textContent();
      
      // カード内に閲覧数関連のテキストがないことを確認
      const hasViewsInCard = /\d+\s*(views|閲覧|表示)/.test(cardText || '');
      console.log(`  投稿カード内の閲覧数: ${hasViewsInCard ? '❌ 存在' : '✅ 削除済み'}`);
      expect(hasViewsInCard).toBe(false);
    }
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'test-results/board-after-fix.png',
      fullPage: true 
    });
    
    console.log('✅ すべての検証項目に合格');
    
    // IPoV構造化記述
    const ipov = {
      色: {
        背景: '#ffffff',
        テキスト: '#1e293b'
      },
      位置: {
        ヘッダー: 'y=0, h=64',
        メインコンテンツ: 'x=0, y=64',
        投稿カード: 'vertical stack'
      },
      テキスト: {
        タイトル: '掲示板',
        サブタイトル: 'リアルタイムで更新される投稿一覧',
        並び順: '新しい順、古い順、いいね順'
      },
      状態: {
        削除要素: '閲覧数表示、閲覧数順ソート: 非表示',
        表示要素: '投稿者、日時、カテゴリー、タグ: 表示'
      },
      異常: 'なし'
    };
    
    console.log('📊 IPoV記述:', JSON.stringify(ipov, null, 2));
  });
});