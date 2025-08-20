const puppeteer = require('puppeteer');

async function visualCheck() {
  console.log('🔍 ビジュアル確認スクリプト起動...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📍 メインページ (http://localhost:3000) を開きます...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0'
    });
    
    // WelcomeSectionの存在を確認
    const welcomeSection = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('.MuiPaper-root'));
      for (const section of sections) {
        const style = window.getComputedStyle(section);
        if (style.background && style.background.includes('linear-gradient')) {
          const heading = section.querySelector('h4');
          return {
            found: true,
            text: heading ? heading.textContent : null,
            hasEllipsis: heading ? window.getComputedStyle(heading).textOverflow === 'ellipsis' : false
          };
        }
      }
      return { found: false };
    });
    
    if (welcomeSection.found) {
      console.log('✅ WelcomeSection発見');
      console.log(`   テキスト: ${welcomeSection.text}`);
      console.log(`   省略記号設定: ${welcomeSection.hasEllipsis ? '✅' : '❌'}`);
    } else {
      console.log('❌ WelcomeSectionが見つかりません');
    }
    
    // スクリーンショットを撮る
    await page.screenshot({ 
      path: 'visual-check-main.png',
      fullPage: true 
    });
    console.log('📸 スクリーンショット保存: visual-check-main.png');
    
    console.log('\n✅ ビジュアル確認完了');
    console.log('ブラウザを開いたままにしています。確認が終わったら手動で閉じてください。');
    
    // ブラウザを開いたままにする
    await new Promise(() => {}); // 無限に待機
    
  } catch (error) {
    console.error('エラー:', error.message);
    await browser.close();
  }
}

visualCheck().catch(console.error);