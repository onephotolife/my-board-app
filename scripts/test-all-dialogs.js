const puppeteer = require('puppeteer');

async function testAllDialogs() {
  console.log('🔍 全てのダイアログページをテスト...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const pages = [
    { url: '/test-password-dialog', name: 'テスト用ダイアログページ' },
    { url: '/test-profile-mock', name: 'モック付きプロフィールページ' },
    { url: '/profile', name: '本番プロフィールページ' }
  ];
  
  try {
    const page = await browser.newPage();
    
    // エラーを記録
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({ page: '', message: msg.text() });
      }
    });
    
    for (const testPage of pages) {
      console.log(`\n=== ${testPage.name} (${testPage.url}) ===`);
      errors.forEach(e => e.page = testPage.name);
      
      try {
        await page.goto(`http://localhost:3000${testPage.url}`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        const currentUrl = page.url();
        console.log('現在のURL:', currentUrl);
        
        // リダイレクトされた場合
        if (currentUrl.includes('signin')) {
          console.log('⚠️  認証ページにリダイレクトされました');
          continue;
        }
        
        // ページが正常にロードされたか確認
        await new Promise(r => setTimeout(r, 2000));
        
        // ボタンを探してクリック
        const clickResult = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          
          // パスワード変更ボタンを探す（複数のパターンに対応）
          const patterns = ['パスワード変更', 'Password', 'Change Password'];
          let targetButton = null;
          
          for (const pattern of patterns) {
            targetButton = buttons.find(b => b.textContent.includes(pattern));
            if (targetButton) break;
          }
          
          if (targetButton) {
            targetButton.click();
            return { 
              success: true, 
              buttonText: targetButton.textContent,
              buttonCount: buttons.length 
            };
          }
          
          return { 
            success: false, 
            buttonCount: buttons.length,
            buttonTexts: buttons.map(b => b.textContent.trim()).filter(t => t.length > 0)
          };
        });
        
        if (clickResult.success) {
          console.log(`✅ ボタンクリック成功: "${clickResult.buttonText}"`);
        } else {
          console.log(`⚠️  パスワード変更ボタンが見つかりません`);
          console.log(`   見つかったボタン (${clickResult.buttonCount}個):`, clickResult.buttonTexts);
        }
        
        // ダイアログの状態を確認
        await new Promise(r => setTimeout(r, 1000));
        
        const dialogState = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          const passwordInputs = document.querySelectorAll('input[type="password"]');
          const h6Elements = document.querySelectorAll('h6');
          const backdrop = document.querySelector('.MuiBackdrop-root');
          
          // ダイアログのコンテンツを確認
          let dialogContent = null;
          if (dialog) {
            const textContent = dialog.textContent;
            dialogContent = textContent ? textContent.substring(0, 100) : null;
          }
          
          return {
            hasDialog: !!dialog,
            hasBackdrop: !!backdrop,
            passwordInputCount: passwordInputs.length,
            h6Titles: Array.from(h6Elements).map(h => h.textContent),
            dialogContent,
            dialogDisplay: dialog ? getComputedStyle(dialog).display : null,
            dialogVisibility: dialog ? getComputedStyle(dialog).visibility : null
          };
        });
        
        console.log('ダイアログ状態:');
        console.log(`  - Dialog存在: ${dialogState.hasDialog}`);
        console.log(`  - Backdrop存在: ${dialogState.hasBackdrop}`);
        console.log(`  - パスワード入力フィールド: ${dialogState.passwordInputCount}個`);
        console.log(`  - Display: ${dialogState.dialogDisplay}`);
        console.log(`  - Visibility: ${dialogState.dialogVisibility}`);
        
        if (dialogState.hasDialog && dialogState.passwordInputCount >= 3) {
          console.log('✅ ダイアログが正常に表示されています');
        } else if (dialogState.hasDialog) {
          console.log('⚠️  ダイアログは表示されていますが、フィールドが不足しています');
        } else {
          console.log('❌ ダイアログが表示されていません');
        }
        
      } catch (error) {
        console.error(`❌ エラー: ${error.message}`);
      }
    }
    
    // エラーサマリー
    if (errors.length > 0) {
      console.log('\n=== コンソールエラー ===');
      errors.forEach(e => {
        console.log(`[${e.page}] ${e.message}`);
      });
    }
    
  } catch (error) {
    console.error('スクリプトエラー:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n=== テスト完了 ===');
}

testAllDialogs().catch(console.error);