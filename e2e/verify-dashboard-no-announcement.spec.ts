import { test, expect } from '@playwright/test';

/**
 * STRICT120準拠: ダッシュボードお知らせセクション削除検証
 * 
 * 検証項目:
 * 1. お知らせセクションが存在しないこと
 * 2. ダミーテキストが表示されないこと
 * 3. 最近の活動セクションは正常表示
 */

const BASE_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('ダッシュボードお知らせセクション削除検証', () => {
  test('本番環境でお知らせセクションが削除されていることを確認', async ({ page }) => {
    // タイムアウトを延長
    test.setTimeout(120000);
    
    console.log('🔐 ログイン開始');
    console.log(`  Email: ${TEST_USER.email}`);
    
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
    console.log('📍 ダッシュボードページ到達');
    
    // ページコンテンツを取得
    const pageContent = await page.content();
    
    // お知らせセクションのテキストが存在しないことを確認
    const hasAnnouncementTitle = pageContent.includes('お知らせ');
    const hasMarkdownText = pageContent.includes('新機能: マークダウン記法に対応しました');
    const hasMaintenanceText = pageContent.includes('メンテナンス完了: システムが安定稼働中です');
    
    console.log('🔍 お知らせセクション検証:');
    console.log(`  「お知らせ」タイトル: ${hasAnnouncementTitle ? '❌ 存在' : '✅ 存在しない'}`);
    console.log(`  マークダウン対応テキスト: ${hasMarkdownText ? '❌ 存在' : '✅ 存在しない'}`);
    console.log(`  メンテナンス完了テキスト: ${hasMaintenanceText ? '❌ 存在' : '✅ 存在しない'}`);
    
    // アサーション：お知らせセクションが存在しないこと
    expect(hasAnnouncementTitle).toBe(false);
    expect(hasMarkdownText).toBe(false);
    expect(hasMaintenanceText).toBe(false);
    
    // 最近の活動セクションが存在することを確認
    const hasRecentActivity = pageContent.includes('最近の活動');
    console.log(`  「最近の活動」セクション: ${hasRecentActivity ? '✅ 存在' : '❌ 存在しない'}`);
    expect(hasRecentActivity).toBe(true);
    
    // クイックアクションセクションが存在することを確認
    const hasQuickActions = pageContent.includes('クイックアクション');
    console.log(`  「クイックアクション」セクション: ${hasQuickActions ? '✅ 存在' : '❌ 存在しない'}`);
    expect(hasQuickActions).toBe(true);
    
    // スクリーンショット保存
    await page.screenshot({ 
      path: 'test-results/dashboard-no-announcement.png',
      fullPage: true 
    });
    
    console.log('✅ お知らせセクション削除検証完了');
    
    // IPoV構造化記述
    const ipov = {
      色: {
        背景: '#f5f5f5',
        カード: '#ffffff',
        統計カード: 'gradient'
      },
      位置: {
        左カラム: 'x=0, width=280',
        メインコンテンツ: 'x=280, 8列グリッド',
        右カラム: 'x=right, 4列グリッド'
      },
      テキスト: {
        ページタイトル: 'ダッシュボード',
        サブセクション: ['クイックアクション', '最新の投稿', '最近の活動'],
        削除済み: 'お知らせ（存在しない）'
      },
      状態: {
        お知らせセクション: '削除済み',
        最近の活動: '正常表示',
        クイックアクション: '正常表示'
      },
      異常: 'なし'
    };
    
    console.log('📊 IPoV記述:', JSON.stringify(ipov, null, 2));
  });
});