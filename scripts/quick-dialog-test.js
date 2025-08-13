const puppeteer = require('puppeteer');

async function quickTest() {
  const browser = await puppeteer.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    
    // エラーを記録
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // テストページに移動
    console.log('テストページにアクセス...');
    await page.goto('http://localhost:3000/test-password-dialog', {
      waitUntil: 'networkidle0'
    });
    
    // ボタンをクリック
    console.log('ボタンをクリック...');
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('パスワード変更ダイアログを開く'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    console.log('クリック成功:', clicked);
    
    // 少し待つ
    await new Promise(r => setTimeout(r, 1000));
    
    // ダイアログの状態を確認
    const state = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const presentationDivs = document.querySelectorAll('[role="presentation"]');
      const h6Elements = document.querySelectorAll('h6');
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      
      // MUI Portal の確認
      const portalContainer = document.querySelector('#__next');
      const bodyLastChild = document.body.lastElementChild;
      
      return {
        hasDialog: !!dialog,
        dialogVisible: dialog ? getComputedStyle(dialog).visibility : null,
        presentationCount: presentationDivs.length,
        h6Titles: Array.from(h6Elements).map(h => h.textContent),
        passwordInputCount: passwordInputs.length,
        portalInfo: {
          hasPortalContainer: !!portalContainer,
          bodyLastChildTag: bodyLastChild ? bodyLastChild.tagName : null,
          bodyLastChildClass: bodyLastChild ? bodyLastChild.className : null
        }
      };
    });
    
    console.log('\n=== 結果 ===');
    console.log('Dialog存在:', state.hasDialog);
    console.log('Dialog表示:', state.dialogVisible);
    console.log('Presentation要素:', state.presentationCount);
    console.log('H6タイトル:', state.h6Titles);
    console.log('パスワード入力:', state.passwordInputCount);
    console.log('Portal情報:', state.portalInfo);
    
    if (errors.length > 0) {
      console.log('\n=== エラー ===');
      errors.forEach(e => console.log(e));
    }
    
    // 結論
    if (state.hasDialog && state.passwordInputCount >= 3) {
      console.log('\n✅ ダイアログは正常に動作しています');
    } else {
      console.log('\n❌ ダイアログが正しく表示されていません');
    }
    
  } finally {
    await browser.close();
  }
}

quickTest().catch(console.error);