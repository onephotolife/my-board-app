import { test, expect } from '@playwright/test';

test.describe('ダッシュボードページの文字列検証', () => {
  const PRODUCTION_URL = 'https://board.blankbrainai.com';
  const TEST_EMAIL = 'one.photolife+2@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';

  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    // ログインフォームに入力
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(`${PRODUCTION_URL}/dashboard`, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
  });

  test('現在の表示内容の確認', async ({ page }) => {
    console.log('📊 ダッシュボードページの現在の表示内容を確認中...');
    
    // メインカラムの文字を確認
    const mainTitle = await page.locator('h4.MuiTypography-h4').textContent();
    console.log(`メインカラムのタイトル: "${mainTitle}"`);
    expect(mainTitle).toBe('会員制掲示板');
    
    // 共通メニューの文字を確認
    const menuText = await page.locator('span.MuiListItemText-primary').filter({ hasText: '会員制掲示板' }).textContent();
    console.log(`メニューのテキスト: "${menuText}"`);
    expect(menuText).toBe('会員制掲示板');
    
    // コメント機能の表示を確認
    const commentButtons = await page.locator('button:has-text("コメント")').count();
    console.log(`コメントボタンの数: ${commentButtons}`);
    
    // 投稿エリアを確認
    const posts = await page.locator('[class*="MuiCard"]').count();
    console.log(`表示されている投稿カードの数: ${posts}`);
    
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: 'dashboard-current-state.png',
      fullPage: true
    });
    console.log('✅ スクリーンショットを dashboard-current-state.png に保存しました');
  });

  test('文字列変更後の影響確認（シミュレーション）', async ({ page }) => {
    console.log('🔄 文字列変更の影響をシミュレーション中...');
    
    // JavaScriptでDOM要素を直接変更してシミュレーション
    await page.evaluate(() => {
      // メインカラムのタイトルを変更
      const mainTitle = document.querySelector('h4.MuiTypography-h4');
      if (mainTitle) {
        mainTitle.textContent = 'ダッシュボード';
      }
      
      // メニューのテキストを変更
      const menuItems = document.querySelectorAll('span.MuiListItemText-primary');
      menuItems.forEach((item) => {
        if (item.textContent === '会員制掲示板') {
          item.textContent = 'ダッシュボード';
        }
      });
    });
    
    // 変更後のスクリーンショット
    await page.screenshot({
      path: 'dashboard-after-change.png',
      fullPage: true
    });
    console.log('✅ 変更後のスクリーンショットを dashboard-after-change.png に保存しました');
    
    // 他のページへの影響を確認
    console.log('📝 他のページへの影響を確認中...');
    
    // 掲示板ページ
    await page.goto(`${PRODUCTION_URL}/board`);
    await page.waitForLoadState('networkidle');
    const boardTitle = await page.locator('h1, h2, h3, h4').first().textContent();
    console.log(`掲示板ページのタイトル: "${boardTitle}"`);
    
    // プロフィールページ
    await page.goto(`${PRODUCTION_URL}/profile`);
    await page.waitForLoadState('networkidle');
    const profileTitle = await page.locator('h1, h2, h3, h4').first().textContent();
    console.log(`プロフィールページのタイトル: "${profileTitle}"`);
  });

  test('コメント機能の実装状況確認', async ({ page }) => {
    console.log('💬 コメント機能の実装状況を確認中...');
    
    await page.goto(`${PRODUCTION_URL}/board`);
    await page.waitForLoadState('networkidle');
    
    // 投稿が存在するか確認
    const postCards = await page.locator('[class*="MuiCard"]').count();
    if (postCards > 0) {
      // 最初の投稿でコメント機能を確認
      const commentButton = await page.locator('button:has-text("コメント")').first();
      
      if (await commentButton.isVisible()) {
        console.log('✅ コメントボタンが見つかりました');
        
        // コメントボタンをクリック
        await commentButton.click();
        
        // コメント入力欄が表示されるか確認
        const commentInput = await page.locator('input[placeholder*="コメント"], textarea[placeholder*="コメント"]').isVisible();
        console.log(`コメント入力欄の表示: ${commentInput}`);
        
        // 「今後実装予定」のメッセージを確認
        const notImplementedMessage = await page.locator('text=/コメント機能.*実装予定/').isVisible();
        console.log(`未実装メッセージの表示: ${notImplementedMessage}`);
      } else {
        console.log('⚠️ コメントボタンが見つかりません');
      }
    } else {
      console.log('⚠️ 投稿が存在しません');
    }
  });
});