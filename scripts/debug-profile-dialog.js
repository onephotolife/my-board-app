const puppeteer = require('puppeteer');

async function debugProfileDialog() {
  console.log('🔍 プロフィールページのダイアログデバッグ開始...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // コンソールメッセージを全て記録
    const consoleLogs = [];
    page.on('console', msg => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      console.log(logEntry);
    });
    
    // ページエラーを記録
    page.on('pageerror', error => {
      console.error('[Page Error]:', error.message);
    });
    
    // 1. まずテストページで動作確認
    console.log('=== テストページでの動作確認 ===');
    await page.goto('http://localhost:3000/test-password-dialog', {
      waitUntil: 'networkidle0'
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // テストページでボタンクリック
    const testResult = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.includes('パスワード変更ダイアログを開く'));
      if (button) {
        button.click();
        return { clicked: true };
      }
      return { clicked: false };
    });
    
    console.log('テストページでのクリック:', testResult.clicked);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // ダイアログの状態確認
    const testDialogState = await page.evaluate(() => {
      return {
        dialog: !!document.querySelector('[role="dialog"]'),
        inputs: document.querySelectorAll('input[type="password"]').length
      };
    });
    
    console.log('テストページのダイアログ:', testDialogState);
    
    // 2. プロフィールページに移動
    console.log('\n=== プロフィールページでの動作確認 ===');
    await page.goto('http://localhost:3000/profile', {
      waitUntil: 'networkidle0'
    });
    
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // ログインページにリダイレクトされた場合
    if (currentUrl.includes('signin')) {
      console.log('認証が必要です。ログインページにリダイレクトされました。');
      
      // デバッグ用: コンポーネントの状態を直接確認
      await page.goto('http://localhost:3000/test-password-dialog', {
        waitUntil: 'networkidle0'
      });
      
      // コンポーネントを直接インジェクト
      const componentTest = await page.evaluate(() => {
        // React DevToolsがあるか確認
        const hasReactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined;
        
        // MUIのバージョン確認
        const muiVersion = window.MaterialUI ? window.MaterialUI.version : 'unknown';
        
        return {
          hasReactDevTools,
          muiVersion,
          documentReady: document.readyState
        };
      });
      
      console.log('\n=== 環境情報 ===');
      console.log('React DevTools:', componentTest.hasReactDevTools);
      console.log('MUI Version:', componentTest.muiVersion);
      console.log('Document State:', componentTest.documentReady);
    } else {
      // プロフィールページでボタンを探す
      await new Promise(r => setTimeout(r, 2000));
      
      const profileButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.map(b => ({
          text: b.textContent,
          className: b.className,
          disabled: b.disabled
        }));
      });
      
      console.log('\n見つかったボタン:');
      profileButtons.forEach(b => console.log(`- "${b.text}" (disabled: ${b.disabled})`));
      
      // パスワード変更ボタンをクリック
      const profileClickResult = await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent.includes('パスワード変更'));
        if (button) {
          console.log('Clicking password change button');
          button.click();
          return { clicked: true, buttonText: button.textContent };
        }
        return { clicked: false };
      });
      
      console.log('\nパスワード変更ボタンのクリック:', profileClickResult);
      
      await new Promise(r => setTimeout(r, 2000));
      
      // ダイアログの状態確認
      const profileDialogState = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const backdrop = document.querySelector('.MuiBackdrop-root');
        const modal = document.querySelector('.MuiModal-root');
        
        // React Fiberを使ってコンポーネントの状態を確認
        let componentState = null;
        if (dialog && dialog._reactInternalFiber) {
          try {
            componentState = dialog._reactInternalFiber.memoizedProps;
          } catch (e) {}
        }
        
        return {
          hasDialog: !!dialog,
          hasBackdrop: !!backdrop,
          hasModal: !!modal,
          passwordInputs: document.querySelectorAll('input[type="password"]').length,
          dialogDisplay: dialog ? getComputedStyle(dialog).display : null,
          dialogVisibility: dialog ? getComputedStyle(dialog).visibility : null,
          componentState
        };
      });
      
      console.log('\nプロフィールページのダイアログ状態:', profileDialogState);
    }
    
    // コンソールログのサマリー
    console.log('\n=== コンソールログサマリー ===');
    const errors = consoleLogs.filter(log => log.includes('[error]'));
    const warnings = consoleLogs.filter(log => log.includes('[warn]'));
    
    console.log(`エラー: ${errors.length}件`);
    console.log(`警告: ${warnings.length}件`);
    
    if (errors.length > 0) {
      console.log('\nエラー詳細:');
      errors.forEach(e => console.log(e));
    }
    
    console.log('\n30秒間ブラウザを開いたままにします。DevToolsで確認してください...');
    await new Promise(r => setTimeout(r, 30000));
    
  } catch (error) {
    console.error('❌ スクリプトエラー:', error);
  } finally {
    await browser.close();
  }
}

debugProfileDialog().catch(console.error);