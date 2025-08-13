const puppeteer = require('puppeteer');

async function quickTest() {
  console.log('🔍 クイックテスト開始...\n');
  console.log('⚠️  開発サーバーが http://localhost:3000 で実行されていることを確認してください\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100
  });
  
  try {
    const page = await browser.newPage();
    
    // コンソールログを監視
    const errors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('aria-hidden') || text.includes('Blocked')) {
        errors.push(text);
        console.log(`[ERROR DETECTED]: ${text}`);
      }
    });
    
    console.log('1. テストページにアクセス...');
    await page.goto('http://localhost:3000/test-dialog', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const currentUrl = page.url();
    console.log('   現在のURL:', currentUrl);
    
    // パスワード変更ボタンを探す
    console.log('\n2. パスワード変更ボタンを探す...');
    const hasButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const passwordButton = buttons.find(b => 
        b.textContent.includes('パスワード変更') || 
        b.textContent.includes('ダイアログを開く')
      );
      return !!passwordButton;
    });
    
    if (!hasButton) {
      console.log('   ❌ パスワード変更ボタンが見つかりません');
      await browser.close();
      return;
    }
    
    console.log('   ✅ パスワード変更ボタンが見つかりました');
    
    // ボタンをクリック
    console.log('\n3. パスワード変更ボタンをクリック...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const passwordButton = buttons.find(b => 
        b.textContent.includes('パスワード変更') || 
        b.textContent.includes('ダイアログを開く')
      );
      if (passwordButton) passwordButton.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // ダイアログの状態を確認
    console.log('\n4. ダイアログの状態を確認...');
    const dialogState = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      const ariaHiddenElements = document.querySelectorAll('[aria-hidden="true"]');
      
      return {
        hasDialog: !!dialog,
        passwordInputCount: passwordInputs.length,
        ariaHiddenCount: ariaHiddenElements.length,
        dialogVisible: dialog ? getComputedStyle(dialog).visibility === 'visible' : false
      };
    });
    
    console.log('   ダイアログ存在:', dialogState.hasDialog ? '✅' : '❌');
    console.log('   パスワード入力フィールド:', dialogState.passwordInputCount, '個');
    console.log('   ダイアログ表示:', dialogState.dialogVisible ? '✅' : '❌');
    console.log('   aria-hidden要素:', dialogState.ariaHiddenCount, '個');
    
    // エラーチェック
    console.log('\n5. エラーチェック...');
    if (errors.length > 0) {
      console.log('   ⚠️ aria-hidden関連のエラーが検出されました:');
      errors.forEach(err => console.log(`     - ${err}`));
    } else {
      console.log('   ✅ aria-hiddenエラーなし');
    }
    
    // 総合判定
    console.log('\n=== 結果 ===');
    if (dialogState.hasDialog && dialogState.passwordInputCount >= 3 && errors.length === 0) {
      console.log('✅ テスト成功！ダイアログは正常に動作しています。');
    } else {
      console.log('❌ 問題が検出されました:');
      if (!dialogState.hasDialog) console.log('  - ダイアログが表示されていません');
      if (dialogState.passwordInputCount < 3) console.log('  - パスワード入力フィールドが不足しています');
      if (errors.length > 0) console.log('  - aria-hiddenエラーが発生しています');
    }
    
    console.log('\n10秒後にブラウザを閉じます...');
    await new Promise(r => setTimeout(r, 10000));
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.log('\n⚠️  開発サーバーが起動していません。');
      console.log('   別のターミナルで以下のコマンドを実行してください:');
      console.log('   npm run dev');
    }
  } finally {
    await browser.close();
  }
}

quickTest().catch(console.error);