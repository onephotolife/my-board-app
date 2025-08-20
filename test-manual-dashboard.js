const puppeteer = require('puppeteer');

async function testDashboard() {
  console.log('🚀 ダッシュボードの手動テストを開始...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // コンソールエラーを監視
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(msg.text());
        console.log(`❌ Console ${msg.type()}: ${msg.text()}`);
      }
    });

    // ログインページに移動
    console.log('📝 ログインページへ移動中...');
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // ログイン情報を入力
    console.log('🔐 ログイン情報を入力中...');
    await page.type('input[type="email"]', 'test@example.com', { delay: 50 });
    await page.type('input[type="password"]', 'TestPassword123!', { delay: 50 });
    
    // ログインボタンをクリック
    console.log('✅ ログインボタンをクリック...');
    await page.click('button[type="submit"]');
    
    // ダッシュボードに移動するまで待機
    console.log('⏳ ダッシュボードへの遷移を待機...');
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('✅ ダッシュボードに正常に遷移しました');
    } catch (e) {
      console.log('❌ ダッシュボードへの遷移に失敗しました');
      const currentUrl = await page.url();
      console.log('現在のURL:', currentUrl);
      
      // ページの内容を確認
      const pageContent = await page.$eval('body', el => el.textContent);
      console.log('ページ内容の一部:', pageContent.substring(0, 200));
      return;
    }
    
    // 少し待ってからレンダリングを確認
    await page.waitForTimeout(3000);
    
    // MUI Grid v2の確認
    console.log('🔍 MUI Grid v2コンテナを確認中...');
    const gridContainers = await page.$$('.MuiGrid2-container');
    console.log('Grid2コンテナの数:', gridContainers.length);
    
    // カードの確認
    console.log('📊 カードコンポーネントを確認中...');
    const cards = await page.$$('.MuiCard-root');
    console.log('カードの数:', cards.length);
    
    // Chipコンポーネントの確認
    console.log('🏷️ Chipコンポーネントを確認中...');
    const chips = await page.$$('.MuiChip-root');
    console.log('Chipの数:', chips.length);
    
    // HTML構造の確認
    console.log('🏗️ HTML構造を確認中...');
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
    
    console.log('DOM構造:', domStructure);
    
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
    
    console.log('\n📋 テスト結果:');
    console.log('✅ Grid2コンテナ:', gridContainers.length > 0);
    console.log('✅ カード表示:', cards.length === 3);
    console.log('✅ Chip表示:', chips.length >= 4);
    console.log('✅ HTML構造:', !domStructure.hasInvalidNesting);
    console.log('✅ MUI Gridエラーなし:', muiGridErrors.length === 0);
    console.log('✅ HTML構造エラーなし:', htmlErrors.length === 0);
    console.log('✅ 総コンソールエラー数:', consoleErrors.length);
    
    if (muiGridErrors.length === 0 && htmlErrors.length === 0 && 
        gridContainers.length > 0 && cards.length === 3) {
      console.log('\n🎉 MUI修正が100%成功しました！');
    } else {
      console.log('\n❌ まだ修正が必要です');
    }
    
    // スクリーンショット撮影
    await page.screenshot({ 
      path: 'dashboard-test-result.png', 
      fullPage: true 
    });
    console.log('📸 スクリーンショットを保存しました: dashboard-test-result.png');
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  } finally {
    await browser.close();
  }
}

testDashboard();