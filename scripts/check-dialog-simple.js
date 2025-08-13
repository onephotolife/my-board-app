const puppeteer = require('puppeteer');

async function checkDialog() {
  console.log('🔍 ダイアログ表示確認...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📍 掲示板ページを開きます（既にログイン済みのセッションを使用）');
    await page.goto('http://localhost:3000/board', {
      waitUntil: 'networkidle0'
    });
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log(`現在のURL: ${currentUrl}`);
    
    if (currentUrl.includes('board')) {
      console.log('✅ 掲示板ページにアクセスできました');
      
      // FABボタンを探す
      const fabButton = await page.$('.MuiFab-root');
      if (fabButton) {
        console.log('✅ FABボタンを発見');
        
        // スクリーンショット（クリック前）
        await page.screenshot({ 
          path: 'dialog-before.png',
          fullPage: false 
        });
        console.log('📸 dialog-before.png 保存');
        
        // FABボタンをクリック
        await fabButton.click();
        await page.waitForTimeout(1000);
        
        // スクリーンショット（クリック後）
        await page.screenshot({ 
          path: 'dialog-after.png',
          fullPage: false 
        });
        console.log('📸 dialog-after.png 保存');
        
        // ダイアログの存在確認
        const dialog = await page.$('.MuiDialog-root');
        console.log('ダイアログ表示:', dialog ? '✅' : '❌');
        
      } else {
        console.log('❌ FABボタンが見つかりません（未ログインの可能性）');
      }
    } else {
      console.log('❌ ログインページにリダイレクトされました');
    }
    
    console.log('\n✅ 確認完了');
    console.log('10秒後にブラウザを閉じます...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

checkDialog().catch(console.error);