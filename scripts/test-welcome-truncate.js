const puppeteer = require('puppeteer');

async function testWelcomeTruncate() {
  console.log('🔍 WelcomeSectionの長いユーザー名トランケートテスト...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // メインページを開く
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0'
    });
    
    // 画面サイズのテストケース
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      console.log(`\n📱 テスト: ${viewport.name} (${viewport.width}x${viewport.height})`);
      await page.setViewport(viewport);
      
      // WelcomeSectionの情報を取得
      const welcomeInfo = await page.evaluate(() => {
        const welcomeSection = document.querySelector('.MuiPaper-root');
        if (!welcomeSection) return null;
        
        // 紫色の背景を持つウェルカムセクションを探す
        const purpleSection = Array.from(document.querySelectorAll('.MuiPaper-root')).find(el => {
          const style = window.getComputedStyle(el);
          return style.background && style.background.includes('linear-gradient');
        });
        
        if (!purpleSection) return null;
        
        // おかえりなさいのテキストを探す
        const welcomeText = purpleSection.querySelector('h4');
        
        // テキストがトランケートされているかチェック
        const isTextTruncated = (element) => {
          if (!element) return false;
          const style = window.getComputedStyle(element);
          return style.textOverflow === 'ellipsis' && 
                 style.overflow === 'hidden' &&
                 style.whiteSpace === 'nowrap';
        };
        
        return {
          hasWelcomeSection: true,
          welcomeText: welcomeText ? welcomeText.textContent : null,
          isWelcomeTruncated: isTextTruncated(welcomeText),
          actualWidth: welcomeText ? welcomeText.scrollWidth : 0,
          visibleWidth: welcomeText ? welcomeText.clientWidth : 0,
          isOverflowing: welcomeText ? welcomeText.scrollWidth > welcomeText.clientWidth : false
        };
      });
      
      if (welcomeInfo && welcomeInfo.hasWelcomeSection) {
        console.log('  ✅ WelcomeSection発見');
        console.log(`  ウェルカムテキスト: ${welcomeInfo.welcomeText?.substring(0, 40)}...`);
        console.log(`  トランケート設定: ${welcomeInfo.isWelcomeTruncated ? '✅' : '❌'}`);
        console.log(`  テキストオーバーフロー: ${welcomeInfo.isOverflowing ? 'あり' : 'なし'}`);
        console.log(`  実際の幅: ${welcomeInfo.actualWidth}px / 表示幅: ${welcomeInfo.visibleWidth}px`);
      } else {
        console.log('  ❌ WelcomeSectionが見つかりません');
      }
      
      // スクリーンショットを撮る
      await page.screenshot({ 
        path: `welcome-truncate-test-${viewport.name.replace(' ', '-')}.png`,
        fullPage: false 
      });
    }
    
    console.log('\n✅ WelcomeSectionトランケートテスト完了！');
    console.log('スクリーンショットが保存されました:');
    viewports.forEach(v => {
      console.log(`  - welcome-truncate-test-${v.name.replace(' ', '-')}.png`);
    });
    
    console.log('\n10秒後にブラウザを閉じます...');
    await new Promise(r => setTimeout(r, 10000));
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

testWelcomeTruncate().catch(console.error);