const puppeteer = require('puppeteer');

async function debugRealProfile() {
  console.log('🔍 実際のプロフィールページのデバッグ...\n');
  
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
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      console.log(`[Console]: ${text}`);
    });
    
    // エラーも記録
    page.on('pageerror', error => {
      console.error(`[Error]: ${error.message}`);
    });
    
    // 警告も記録  
    page.on('warning', warning => {
      console.warn(`[Warning]: ${warning}`);
    });
    
    console.log('=== プロフィールページにアクセス ===');
    await page.goto('http://localhost:3000/profile', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    const currentUrl = page.url();
    console.log('\n現在のURL:', currentUrl);
    
    if (currentUrl.includes('signin')) {
      console.log('\n認証が必要です。モックページに切り替えます...');
      
      // モックページで確認
      await page.goto('http://localhost:3000/test-profile-mock', {
        waitUntil: 'networkidle0'
      });
      
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log('\n=== ページ構造の確認 ===');
    const pageStructure = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const passwordButton = buttons.find(b => b.textContent.includes('パスワード変更'));
      
      return {
        buttonCount: buttons.length,
        hasPasswordButton: !!passwordButton,
        passwordButtonText: passwordButton ? passwordButton.textContent : null,
        passwordButtonDisabled: passwordButton ? passwordButton.disabled : null,
        dialogExists: !!document.querySelector('[role="dialog"]'),
        dialogOpen: !!document.querySelector('[role="dialog"][aria-hidden="false"]')
      };
    });
    
    console.log('ボタン数:', pageStructure.buttonCount);
    console.log('パスワード変更ボタン:', pageStructure.hasPasswordButton);
    console.log('ボタンテキスト:', pageStructure.passwordButtonText);
    console.log('ボタン無効:', pageStructure.passwordButtonDisabled);
    console.log('ダイアログ存在:', pageStructure.dialogExists);
    console.log('ダイアログ開いている:', pageStructure.dialogOpen);
    
    if (pageStructure.hasPasswordButton) {
      console.log('\n=== パスワード変更ボタンをクリック ===');
      
      // クリック前のログをクリア
      logs.length = 0;
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const passwordButton = buttons.find(b => b.textContent.includes('パスワード変更'));
        if (passwordButton) {
          console.log('ボタンをクリックします...');
          passwordButton.click();
          console.log('クリック完了');
        }
      });
      
      // クリック後少し待つ
      await new Promise(r => setTimeout(r, 2000));
      
      console.log('\n=== クリック後のコンソールログ ===');
      logs.forEach(log => console.log(`  ${log}`));
      
      // クリック後の状態確認
      console.log('\n=== クリック後の状態 ===');
      const afterClickState = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const backdrop = document.querySelector('.MuiBackdrop-root');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        // Reactの内部状態を確認する
        let reactState = null;
        try {
          const rootElement = document.getElementById('__next') || document.querySelector('#root');
          if (rootElement && rootElement._reactRootContainer) {
            // React 18の場合
            const fiber = rootElement._reactRootContainer._internalRoot?.current;
            if (fiber) {
              // Fiberツリーを辿ってstate情報を探す
              let currentFiber = fiber;
              while (currentFiber) {
                if (currentFiber.memoizedState && currentFiber.memoizedState.passwordDialogOpen !== undefined) {
                  reactState = { passwordDialogOpen: currentFiber.memoizedState.passwordDialogOpen };
                  break;
                }
                currentFiber = currentFiber.child || currentFiber.sibling;
              }
            }
          }
        } catch (e) {
          console.error('React state確認エラー:', e);
        }
        
        return {
          dialogExists: !!dialog,
          dialogDisplay: dialog ? getComputedStyle(dialog).display : null,
          dialogVisibility: dialog ? getComputedStyle(dialog).visibility : null,
          dialogAriaHidden: dialog ? dialog.getAttribute('aria-hidden') : null,
          backdropExists: !!backdrop,
          passwordInputCount: passwordInputs.length,
          reactState
        };
      });
      
      console.log('ダイアログ存在:', afterClickState.dialogExists);
      console.log('Display:', afterClickState.dialogDisplay);
      console.log('Visibility:', afterClickState.dialogVisibility);
      console.log('aria-hidden:', afterClickState.dialogAriaHidden);
      console.log('Backdrop存在:', afterClickState.backdropExists);
      console.log('パスワード入力数:', afterClickState.passwordInputCount);
      console.log('React状態:', afterClickState.reactState);
      
      if (afterClickState.dialogExists && afterClickState.passwordInputCount >= 3) {
        console.log('\n✅ ダイアログは正常に表示されています！');
      } else if (afterClickState.dialogExists) {
        console.log('\n⚠️ ダイアログは存在しますが、完全ではありません');
      } else {
        console.log('\n❌ ダイアログが表示されていません');
      }
    }
    
    console.log('\n=== デバッグ情報 ===');
    console.log('収集されたログ数:', logs.length);
    
    // 特定のログを探す
    const importantLogs = logs.filter(log => 
      log.includes('パスワード') || 
      log.includes('Dialog') || 
      log.includes('open') ||
      log.includes('クリック')
    );
    
    if (importantLogs.length > 0) {
      console.log('\n重要なログ:');
      importantLogs.forEach(log => console.log(`  - ${log}`));
    }
    
    console.log('\n30秒間ブラウザを開いたままにします。DevToolsで確認してください...');
    await new Promise(r => setTimeout(r, 30000));
    
  } catch (error) {
    console.error('スクリプトエラー:', error);
  } finally {
    await browser.close();
  }
}

debugRealProfile().catch(console.error);