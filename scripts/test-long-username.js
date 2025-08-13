const puppeteer = require('puppeteer');

async function testLongUsername() {
  console.log('🔍 長いユーザー名のレスポンシブテスト...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // テストケース用の長いユーザー名
    const longUsernames = [
      'VeryLongUserNameThatShouldBeTruncatedWithEllipsis',
      'このユーザー名は非常に長くて画面幅を超える可能性があります',
      'user@verylongdomainnamethatcouldbreakthelayout.example.com'
    ];
    
    // 画面サイズのテストケース
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    // test-dashboardページを開く
    await page.goto('http://localhost:3000/test-dashboard', {
      waitUntil: 'networkidle0'
    });
    
    for (const viewport of viewports) {
      console.log(`\n📱 テスト: ${viewport.name} (${viewport.width}x${viewport.height})`);
      await page.setViewport(viewport);
      
      // ページ情報を取得
      const pageInfo = await page.evaluate(() => {
        const header = document.querySelector('.MuiAppBar-root');
        const welcomeText = document.querySelector('main h1 + p');
        const profileCard = document.querySelector('.MuiCard-root');
        
        // テキストがトランケートされているかチェック
        const isTextTruncated = (element) => {
          if (!element) return false;
          const style = window.getComputedStyle(element);
          return style.textOverflow === 'ellipsis' && 
                 style.overflow === 'hidden' &&
                 style.whiteSpace === 'nowrap';
        };
        
        const result = {
          hasHeader: !!header,
          welcomeText: welcomeText ? welcomeText.textContent : null,
          isWelcomeTruncated: isTextTruncated(welcomeText),
          profileCardText: []
        };
        
        // プロフィールカード内のテキストを確認
        if (profileCard) {
          const texts = profileCard.querySelectorAll('p');
          texts.forEach(text => {
            if (text.textContent.includes('名前:') || text.textContent.includes('メール:')) {
              result.profileCardText.push({
                text: text.textContent.substring(0, 50) + (text.textContent.length > 50 ? '...' : ''),
                isTruncated: isTextTruncated(text)
              });
            }
          });
        }
        
        return result;
      });
      
      console.log('  ヘッダー存在:', pageInfo.hasHeader ? '✅' : '❌');
      console.log('  ウェルカムテキスト:', pageInfo.welcomeText?.substring(0, 30) + '...');
      console.log('  ウェルカムテキストのトランケート:', pageInfo.isWelcomeTruncated ? '✅' : '❌');
      
      if (pageInfo.profileCardText.length > 0) {
        console.log('  プロフィールカード:');
        pageInfo.profileCardText.forEach(item => {
          console.log(`    - ${item.text} (トランケート: ${item.isTruncated ? '✅' : '❌'})`);
        });
      }
      
      // スクリーンショットを撮る
      await page.screenshot({ 
        path: `long-username-test-${viewport.name.replace(' ', '-')}.png`,
        fullPage: false 
      });
    }
    
    console.log('\n✅ レスポンシブテスト完了！');
    console.log('スクリーンショットが保存されました:');
    viewports.forEach(v => {
      console.log(`  - long-username-test-${v.name.replace(' ', '-')}.png`);
    });
    
    console.log('\n10秒後にブラウザを閉じます...');
    await new Promise(r => setTimeout(r, 10000));
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

testLongUsername().catch(console.error);