const puppeteer = require('puppeteer');

async function checkDialog() {
  console.log('🔍 ダイアログの動作確認を開始...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示
    devtools: true,  // DevToolsを開く
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100 // 動作を遅くして確認しやすくする
  });
  
  try {
    const page = await browser.newPage();
    
    // コンソールログを監視
    page.on('console', msg => {
      console.log(`[Console ${msg.type()}]: ${msg.text()}`);
    });
    
    // エラーを監視
    page.on('pageerror', error => {
      console.error(`[Page Error]: ${error.message}`);
    });
    
    console.log('1. テストページにアクセス...');
    await page.goto('http://localhost:3000/test-password-dialog', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // ページが読み込まれるまで待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('2. ボタンを探す...');
    // ボタンが存在するか確認
    const buttonExists = await page.evaluate(() => {
      const button = document.querySelector('button');
      console.log('Found buttons:', document.querySelectorAll('button').length);
      return button !== null;
    });
    
    console.log(`ボタンが存在: ${buttonExists}`);
    
    if (!buttonExists) {
      console.error('❌ ボタンが見つかりません');
      return;
    }
    
    console.log('3. パスワード変更ダイアログボタンをクリック...');
    // ボタンをクリック
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const targetButton = buttons.find(btn => btn.textContent.includes('パスワード変更ダイアログを開く'));
      if (targetButton) {
        console.log('Clicking button:', targetButton.textContent);
        targetButton.click();
      } else {
        console.error('Target button not found');
      }
    });
    
    // ダイアログが表示されるまで待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('4. ダイアログの状態を確認...');
    const dialogInfo = await page.evaluate(() => {
      // MUIダイアログを探す
      const dialog = document.querySelector('[role="dialog"]');
      const backdrop = document.querySelector('.MuiBackdrop-root');
      const dialogTitle = document.querySelector('h6');
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      
      return {
        hasDialog: dialog !== null,
        hasBackdrop: backdrop !== null,
        dialogDisplay: dialog ? window.getComputedStyle(dialog).display : 'none',
        dialogVisibility: dialog ? window.getComputedStyle(dialog).visibility : 'hidden',
        dialogTitle: dialogTitle ? dialogTitle.textContent : null,
        passwordInputCount: passwordInputs.length,
        dialogHTML: dialog ? dialog.outerHTML.substring(0, 200) : null
      };
    });
    
    console.log('\n=== ダイアログ状態 ===');
    console.log('Dialog存在:', dialogInfo.hasDialog);
    console.log('Backdrop存在:', dialogInfo.hasBackdrop);
    console.log('Display:', dialogInfo.dialogDisplay);
    console.log('Visibility:', dialogInfo.dialogVisibility);
    console.log('タイトル:', dialogInfo.dialogTitle);
    console.log('パスワード入力フィールド数:', dialogInfo.passwordInputCount);
    console.log('Dialog HTML (先頭200文字):', dialogInfo.dialogHTML);
    
    // DOM全体の状態を確認
    const domInfo = await page.evaluate(() => {
      const allDialogs = document.querySelectorAll('[role="dialog"]');
      const allModals = document.querySelectorAll('.MuiModal-root');
      const allBackdrops = document.querySelectorAll('.MuiBackdrop-root');
      
      return {
        dialogCount: allDialogs.length,
        modalCount: allModals.length,
        backdropCount: allBackdrops.length,
        bodyChildren: document.body.children.length,
        bodyHTML: document.body.innerHTML.substring(0, 500)
      };
    });
    
    console.log('\n=== DOM状態 ===');
    console.log('Dialog要素数:', domInfo.dialogCount);
    console.log('Modal要素数:', domInfo.modalCount);
    console.log('Backdrop要素数:', domInfo.backdropCount);
    console.log('Body直下の要素数:', domInfo.bodyChildren);
    
    console.log('\n10秒間ブラウザを開いたままにします。手動で確認してください...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

checkDialog().catch(console.error);