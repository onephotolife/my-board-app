const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let hydrationErrors = [];
  
  // コンソールエラーをキャプチャ
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Hydration') || text.includes('hydration')) {
        hydrationErrors.push(text);
        console.log('❌ Hydrationエラー検出:', text);
      }
    }
  });
  
  console.log('📍 ページを読み込み中...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  console.log('🔄 ページをリロード中...');
  await page.reload();
  await page.waitForTimeout(2000);
  
  if (hydrationErrors.length === 0) {
    console.log('✅ Hydrationエラーなし！成功！');
  } else {
    console.log(`❌ ${hydrationErrors.length}個のHydrationエラーが検出されました`);
  }
  
  await browser.close();
})();