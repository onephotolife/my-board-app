const puppeteer = require('puppeteer');

async function finalDialogTest() {
  console.log('🔍 最終的なダイアログテスト開始...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 50
  });
  
  try {
    const page = await browser.newPage();
    
    // コンソールログを全て記録
    const logs = [];
    const errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      logs.push({ type: msg.type(), text });
      
      if (msg.type() === 'error' || text.includes('aria-hidden') || text.includes('Blocked')) {
        errors.push(text);
        console.log(`[${msg.type().toUpperCase()}]: ${text}`);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error(`[PAGE ERROR]: ${error.message}`);
    });
    
    // テストケース
    const testCases = [
      {
        url: '/test-password-dialog',
        name: 'テスト専用ページ',
        buttonText: 'パスワード変更ダイアログを開く'
      },
      {
        url: '/test-profile-mock',
        name: 'モック付きプロフィールページ',
        buttonText: 'パスワード変更'
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n=== ${testCase.name} ===`);
      errors.length = 0; // エラーをクリア
      
      // ページにアクセス
      await page.goto(`http://localhost:3000${testCase.url}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      // ボタンをクリック
      console.log('1. パスワード変更ボタンをクリック...');
      const clicked = await page.evaluate((buttonText) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find(b => b.textContent.includes(buttonText));
        if (button) {
          button.click();
          return true;
        }
        return false;
      }, testCase.buttonText);
      
      if (!clicked) {
        console.log('❌ ボタンが見つかりません');
        continue;
      }
      
      // ダイアログが開くまで待機
      await new Promise(r => setTimeout(r, 1000));
      
      // ダイアログの状態を確認
      console.log('2. ダイアログの状態を確認...');
      const dialogState = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const backdrop = document.querySelector('.MuiBackdrop-root');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const ariaHiddenElements = document.querySelectorAll('[aria-hidden="true"]');
        const focusedElement = document.activeElement;
        
        // aria-hidden要素の詳細
        const ariaHiddenInfo = Array.from(ariaHiddenElements).map(el => ({
          tag: el.tagName,
          id: el.id,
          className: typeof el.className === 'string' ? el.className.substring(0, 50) : '',
          hasFocusedChild: el.contains(document.activeElement)
        }));
        
        return {
          hasDialog: !!dialog,
          hasBackdrop: !!backdrop,
          passwordInputCount: passwordInputs.length,
          dialogDisplay: dialog ? getComputedStyle(dialog).display : null,
          dialogVisibility: dialog ? getComputedStyle(dialog).visibility : null,
          ariaHiddenCount: ariaHiddenElements.length,
          ariaHiddenInfo,
          focusedElementTag: focusedElement ? focusedElement.tagName : null,
          focusedElementType: focusedElement ? focusedElement.getAttribute('type') : null
        };
      });
      
      console.log(`  Dialog存在: ${dialogState.hasDialog}`);
      console.log(`  Backdrop存在: ${dialogState.hasBackdrop}`);
      console.log(`  パスワード入力: ${dialogState.passwordInputCount}個`);
      console.log(`  Display: ${dialogState.dialogDisplay}`);
      console.log(`  Visibility: ${dialogState.dialogVisibility}`);
      console.log(`  aria-hidden要素: ${dialogState.ariaHiddenCount}個`);
      console.log(`  フォーカス要素: ${dialogState.focusedElementTag} (type: ${dialogState.focusedElementType})`);
      
      if (dialogState.ariaHiddenInfo.length > 0) {
        console.log('\n  aria-hidden要素の詳細:');
        dialogState.ariaHiddenInfo.forEach(info => {
          console.log(`    - ${info.tag}${info.id ? '#' + info.id : ''} (フォーカス子要素: ${info.hasFocusedChild})`);
        });
      }
      
      // 入力フィールドのテスト
      console.log('\n3. 入力フィールドのテスト...');
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="password"]');
        if (inputs[0]) {
          inputs[0].focus();
          inputs[0].value = 'test123';
        }
      });
      
      await new Promise(r => setTimeout(r, 500));
      
      // キャンセルボタンでダイアログを閉じる
      console.log('4. キャンセルボタンでダイアログを閉じる...');
      await page.evaluate(() => {
        const cancelButton = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent.includes('キャンセル'));
        if (cancelButton) {
          cancelButton.click();
        }
      });
      
      await new Promise(r => setTimeout(r, 1000));
      
      // ダイアログが閉じたか確認
      const dialogClosed = await page.evaluate(() => {
        return !document.querySelector('[role="dialog"]');
      });
      
      console.log(`5. ダイアログが閉じた: ${dialogClosed ? '✅' : '❌'}`);
      
      // エラーチェック
      if (errors.length > 0) {
        console.log('\n⚠️ 検出されたエラー:');
        errors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('\n✅ エラーなし');
      }
      
      // 結果判定
      if (dialogState.hasDialog && dialogState.passwordInputCount >= 3 && errors.length === 0) {
        console.log('\n✅ テスト成功！');
      } else {
        console.log('\n❌ テスト失敗');
      }
    }
    
    // 全体のサマリー
    console.log('\n=== テストサマリー ===');
    console.log('aria-hiddenエラー:', errors.filter(e => e.includes('aria-hidden')).length > 0 ? '❌ あり' : '✅ なし');
    console.log('その他のエラー:', errors.filter(e => !e.includes('aria-hidden')).length);
    
    console.log('\n30秒間ブラウザを開いたままにします。手動で確認してください...');
    await new Promise(r => setTimeout(r, 30000));
    
  } catch (error) {
    console.error('スクリプトエラー:', error);
  } finally {
    await browser.close();
  }
}

finalDialogTest().catch(console.error);