const { chromium } = require('playwright');

async function testAllPages() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let totalErrors = 0;
  const results = [];
  
  // コンソールエラーをキャプチャ
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Hydration') || text.includes('hydration')) {
        totalErrors++;
        console.log(`❌ Hydrationエラー: ${text.substring(0, 100)}...`);
      }
    }
  });
  
  // テストするページ
  const pages = [
    { url: 'http://localhost:3000', name: 'ホームページ' },
    { url: 'http://localhost:3000/auth/signup', name: '新規登録ページ' },
    { url: 'http://localhost:3000/auth/signin', name: 'ログインページ' },
  ];
  
  for (const testPage of pages) {
    console.log(`\n📍 ${testPage.name}をテスト中...`);
    const pageErrors = totalErrors;
    
    // ページ読み込み
    await page.goto(testPage.url);
    await page.waitForTimeout(1500);
    
    // リロードテスト
    console.log('   🔄 リロードテスト...');
    await page.reload();
    await page.waitForTimeout(1500);
    
    // 複数回リロード
    console.log('   🔄 2回目のリロード...');
    await page.reload();
    await page.waitForTimeout(1500);
    
    const errorsFound = totalErrors - pageErrors;
    if (errorsFound === 0) {
      console.log(`   ✅ ${testPage.name}: エラーなし`);
      results.push({ page: testPage.name, status: 'OK', errors: 0 });
    } else {
      console.log(`   ❌ ${testPage.name}: ${errorsFound}個のエラー`);
      results.push({ page: testPage.name, status: 'ERROR', errors: errorsFound });
    }
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー:');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${result.page}: ${result.errors}個のエラー`);
  });
  
  if (totalErrors === 0) {
    console.log('\n🎉 全てのページでHydrationエラーなし！完璧です！');
  } else {
    console.log(`\n⚠️ 合計 ${totalErrors}個のHydrationエラーが検出されました`);
  }
  
  await browser.close();
}

testAllPages();