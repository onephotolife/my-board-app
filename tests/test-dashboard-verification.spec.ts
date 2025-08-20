import { test, expect, chromium } from '@playwright/test';

test('ダッシュボード MUI エラー修正検証', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  
  // コンソールエラーを監視
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(msg.text());
      console.log(`Console ${msg.type()}: ${msg.text()}`);
    }
  });

  try {
    // ログインページに移動
    console.log('🔑 ログインページに移動中...');
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
    
    // フォーム要素の存在確認
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('📝 ログインフォーム発見');

    // ログイン情報を入力
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    console.log('🚀 ログインを実行中...');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクトを待つ
    try {
      await page.waitForURL('**/dashboard', { timeout: 30000 });
      console.log('✅ ダッシュボードに正常に遷移');
    } catch (error) {
      console.log('❌ ダッシュボードへのリダイレクト失敗');
      const currentUrl = page.url();
      console.log('現在のURL:', currentUrl);
      
      // エラーメッセージがあるかチェック
      const errorElement = await page.$('.error, [role="alert"], .MuiAlert-root');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log('エラーメッセージ:', errorText);
      }
      
      // スクリーンショットを撮影
      await page.screenshot({ path: 'login-error.png', fullPage: true });
      throw error;
    }

    // ページの読み込み完了を待つ
    await page.waitForTimeout(3000);
    
    console.log('🔍 MUI関連の検証開始...');

    // MUI Grid v2の確認
    const gridContainers = await page.locator('.MuiGrid2-container').count();
    console.log('✅ Grid2コンテナ数:', gridContainers);

    // カードの確認
    const cards = await page.locator('.MuiCard-root').count();
    console.log('✅ カード数:', cards);

    // Chipコンポーネントの確認
    const chips = await page.locator('.MuiChip-root').count();
    console.log('✅ Chip数:', chips);

    // ステータスChipの確認
    const statusChip = await page.locator('.MuiChip-root').filter({ hasText: 'メール確認済み' }).count();
    console.log('✅ ステータスChip:', statusChip);

    // MUIエラーの確認
    const muiGridErrors = consoleErrors.filter(err => 
      err.includes('MUI Grid') || 
      err.includes('item prop') || 
      err.includes('xs prop') || 
      err.includes('md prop')
    );

    const htmlErrors = consoleErrors.filter(err => 
      err.includes('cannot be a descendant') ||
      err.includes('hydration error')
    );

    console.log('📊 検証結果:');
    console.log('- Grid2コンテナ存在:', gridContainers > 0);
    console.log('- カード表示:', cards === 3);
    console.log('- Chip表示:', chips >= 4);
    console.log('- ステータスChip表示:', statusChip === 1);
    console.log('- MUI Gridエラーなし:', muiGridErrors.length === 0);
    console.log('- HTML構造エラーなし:', htmlErrors.length === 0);
    console.log('- 総コンソールエラー数:', consoleErrors.length);

    // HTML構造の確認
    const domStructure = await page.evaluate(() => {
      const pTags = document.querySelectorAll('p');
      let hasInvalidNesting = false;
      
      pTags.forEach(p => {
        const divChildren = p.querySelectorAll('div');
        if (divChildren.length > 0) {
          hasInvalidNesting = true;
        }
      });
      
      return {
        hasInvalidNesting,
        pTagCount: pTags.length,
        hasGrid2Container: document.querySelectorAll('.MuiGrid2-container').length > 0
      };
    });

    console.log('🏗️ HTML構造:', domStructure);

    // スクリーンショット撮影
    await page.screenshot({ path: 'dashboard-verification.png', fullPage: true });
    console.log('📸 スクリーンショット保存: dashboard-verification.png');

    // アサーション
    expect(gridContainers).toBeGreaterThan(0);
    expect(cards).toBe(3);
    expect(chips).toBeGreaterThanOrEqual(4);
    expect(statusChip).toBe(1);
    expect(muiGridErrors).toHaveLength(0);
    expect(htmlErrors).toHaveLength(0);
    expect(domStructure.hasInvalidNesting).toBe(false);
    expect(domStructure.hasGrid2Container).toBe(true);

    console.log('🎉 すべての検証に合格！MUI修正が正常に適用されています！');

  } catch (error) {
    console.error('❌ テストエラー:', error);
    throw error;
  } finally {
    await browser.close();
  }
});