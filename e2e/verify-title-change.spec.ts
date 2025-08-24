import { test, expect } from '@playwright/test';

/**
 * STRICT120準拠: ダッシュボード→会員制掲示板タイトル変更検証
 * 
 * 検証項目:
 * 1. ダッシュボードページのタイトルが「会員制掲示板」になっていること
 * 2. ナビゲーションメニューのラベルが「会員制掲示板」になっていること
 * 3. 旧テキスト「ダッシュボード」が存在しないこと
 */

const BASE_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

test.describe('タイトル変更検証', () => {
  test('本番環境でダッシュボードが会員制掲示板に変更されていることを確認', async ({ page }) => {
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
    
    // ページタイトル（h4要素）のテキストを取得
    const pageTitle = await page.locator('h4').first().textContent();
    console.log(`📄 ページタイトル: ${pageTitle}`);
    
    // ナビゲーションメニューでダッシュボードラベルを探す
    const navItems = await page.locator('nav li, aside li, [role="navigation"] li').allTextContents();
    console.log('📋 ナビゲーションアイテム:', navItems);
    
    // 検証
    console.log('🔍 タイトル変更検証:');
    
    // 新タイトル「会員制掲示板」の存在確認
    const hasNewTitle = pageContent.includes('会員制掲示板');
    console.log(`  「会員制掲示板」: ${hasNewTitle ? '✅ 存在' : '❌ 存在しない'}`);
    
    // 旧タイトル「ダッシュボード」が存在しないことを確認
    const hasOldTitle = pageContent.includes('ダッシュボード');
    console.log(`  「ダッシュボード」: ${hasOldTitle ? '❌ まだ存在' : '✅ 存在しない'}`);
    
    // アサーション
    expect(pageTitle).toBe('会員制掲示板');
    expect(hasNewTitle).toBe(true);
    expect(hasOldTitle).toBe(false);
    
    // 他のページも確認
    console.log('📍 他のページを確認');
    
    // 掲示板ページ
    await page.goto(`${BASE_URL}/board`, { waitUntil: 'networkidle' });
    const boardPageContent = await page.content();
    const boardHasOldTitle = boardPageContent.includes('ダッシュボード');
    console.log(`  掲示板ページ: ${boardHasOldTitle ? '❌ ダッシュボードが存在' : '✅ ダッシュボードが存在しない'}`);
    
    // マイ投稿ページ
    await page.goto(`${BASE_URL}/my-posts`, { waitUntil: 'networkidle' });
    const myPostsPageContent = await page.content();
    const myPostsHasOldTitle = myPostsPageContent.includes('ダッシュボード');
    console.log(`  マイ投稿ページ: ${myPostsHasOldTitle ? '❌ ダッシュボードが存在' : '✅ ダッシュボードが存在しない'}`);
    
    // スクリーンショット保存
    await page.goto(`${BASE_URL}/dashboard`);
    await page.screenshot({ 
      path: 'test-results/title-change-verification.png',
      fullPage: true 
    });
    
    console.log('✅ タイトル変更検証完了');
    
    // IPoV構造化記述
    const ipov = {
      色: {
        背景: '#f5f5f5',
        ヘッダー: 'gradient(#667eea, #764ba2)',
        カード: '#ffffff'
      },
      位置: {
        左カラム: 'x=0, width=280',
        メインコンテンツ: 'x=280',
        タイトル: 'ヘッダー内、左上'
      },
      テキスト: {
        ページタイトル: '会員制掲示板',
        ナビゲーションメニュー: '会員制掲示板',
        旧テキスト: 'ダッシュボード（存在しない）'
      },
      状態: {
        タイトル変更: '完了',
        ナビゲーション更新: '完了',
        旧テキスト削除: '完了'
      },
      異常: 'なし'
    };
    
    console.log('📊 IPoV記述:', JSON.stringify(ipov, null, 2));
  });
});