const puppeteer = require('puppeteer');

async function checkDashboard() {
  console.log('🔍 ダッシュボードページのチェック...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // 複数のURLを試す
    const urls = [
      'http://localhost:3000/dashboard',
      'http://localhost:3000/(main)/dashboard',
      'http://localhost:3000/test-dashboard',
      'http://localhost:3000/(main)/test-dashboard'
    ];
    
    for (const url of urls) {
      console.log(`\nアクセス試行: ${url}`);
      try {
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        const currentUrl = page.url();
        console.log(`  → 実際のURL: ${currentUrl}`);
        
        if (!currentUrl.includes('signin')) {
          console.log('  ✅ ページにアクセスできました');
          break;
        }
      } catch (e) {
        console.log(`  ❌ エラー: ${e.message}`);
      }
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // ページ構造を確認
    const pageInfo = await page.evaluate(() => {
      const header = document.querySelector('header');
      const appBar = document.querySelector('.MuiAppBar-root');
      const title = document.querySelector('h1, h2, h3, h4, h5, h6');
      
      return {
        hasHeader: !!header,
        hasAppBar: !!appBar,
        title: title ? title.textContent : null,
        url: window.location.href,
        headerText: header ? header.textContent : null,
      };
    });
    
    console.log('\n📊 ページ情報:');
    console.log('  URL:', pageInfo.url);
    console.log('  ヘッダー存在:', pageInfo.hasHeader ? '✅' : '❌');
    console.log('  AppBar存在:', pageInfo.hasAppBar ? '✅' : '❌');
    console.log('  タイトル:', pageInfo.title);
    
    if (pageInfo.hasHeader || pageInfo.hasAppBar) {
      console.log('\n✅ ヘッダーが正常に表示されています！');
    } else {
      console.log('\n❌ ヘッダーが表示されていません');
    }
    
    // スクリーンショットを撮る
    await page.screenshot({ 
      path: 'dashboard-check.png',
      fullPage: true 
    });
    console.log('\nスクリーンショット: dashboard-check.png');
    
    console.log('\n10秒後にブラウザを閉じます...');
    await new Promise(r => setTimeout(r, 10000));
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

checkDashboard().catch(console.error);