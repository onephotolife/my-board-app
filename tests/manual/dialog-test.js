const puppeteer = require('puppeteer');

/**
 * 投稿ダイアログのUI/UXテスト
 * 修正した機能が正しく動作することを確認
 */
async function runDialogTests() {
  console.log('🚀 投稿ダイアログUI/UXテスト開始\n');
  console.log('=' .repeat(50));
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    // コンソールエラーを監視
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // テスト1: ページアクセス
    console.log('\n📝 テスト1: 掲示板ページへのアクセス');
    await page.goto('http://localhost:3000/board', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    const currentUrl = page.url();
    if (currentUrl.includes('board')) {
      results.passed.push('✅ 掲示板ページにアクセス成功');
      console.log('  ✅ 成功');
    } else {
      results.failed.push('❌ 掲示板ページにアクセス失敗（ログインが必要）');
      console.log('  ❌ 失敗 - ログインページにリダイレクトされました');
      
      // ログインが必要な場合はここで終了
      console.log('\n⚠️ ログインが必要なため、テストを終了します');
      return results;
    }

    // テスト2: FABボタンの存在確認
    console.log('\n📝 テスト2: FABボタンの存在確認');
    const fabButton = await page.$('.MuiFab-root');
    if (fabButton) {
      results.passed.push('✅ FABボタンが存在');
      console.log('  ✅ 成功');
      
      // z-indexの確認
      const fabZIndex = await fabButton.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      console.log(`  📊 FABボタンのz-index: ${fabZIndex}`);
      if (parseInt(fabZIndex) <= 1100) {
        results.passed.push('✅ FABボタンのz-indexが適切（1100以下）');
      } else {
        results.warnings.push(`⚠️ FABボタンのz-indexが高い: ${fabZIndex}`);
      }
    } else {
      results.failed.push('❌ FABボタンが見つからない');
      console.log('  ❌ 失敗');
    }

    // テスト3: ダイアログの開閉
    console.log('\n📝 テスト3: ダイアログの開閉テスト');
    if (fabButton) {
      await fabButton.click();
      await page.waitForTimeout(1000);
      
      const dialog = await page.$('.MuiDialog-root');
      if (dialog) {
        results.passed.push('✅ ダイアログが開いた');
        console.log('  ✅ ダイアログが開きました');
        
        // スクリーンショット
        await page.screenshot({ 
          path: 'dialog-open-test.png',
          fullPage: false 
        });
        console.log('  📸 スクリーンショット保存: dialog-open-test.png');
        
        // z-indexの確認
        const dialogPaper = await page.$('.MuiDialog-paper');
        const backdrop = await page.$('.MuiBackdrop-root');
        
        if (dialogPaper && backdrop) {
          const dialogZIndex = await dialogPaper.evaluate(el => 
            window.getComputedStyle(el).zIndex
          );
          const backdropZIndex = await backdrop.evaluate(el => 
            window.getComputedStyle(el).zIndex
          );
          
          console.log(`  📊 ダイアログのz-index: ${dialogZIndex}`);
          console.log(`  📊 背景のz-index: ${backdropZIndex}`);
          
          if (parseInt(dialogZIndex) > parseInt(backdropZIndex)) {
            results.passed.push('✅ ダイアログが背景より前面に表示');
            console.log('  ✅ z-index階層が正しい');
          } else {
            results.failed.push('❌ ダイアログのz-index階層が不正');
            console.log('  ❌ z-index階層が不正');
          }
        }
        
        // キャンセルボタンでダイアログを閉じる
        const cancelButton = await page.$('button:has-text("キャンセル")');
        if (cancelButton) {
          await cancelButton.click();
          await page.waitForTimeout(500);
          
          const dialogClosed = await page.$('.MuiDialog-root');
          if (!dialogClosed) {
            results.passed.push('✅ ダイアログが正しく閉じた');
            console.log('  ✅ ダイアログが閉じました');
          } else {
            results.failed.push('❌ ダイアログが閉じない');
            console.log('  ❌ ダイアログが閉じません');
          }
        }
      } else {
        results.failed.push('❌ ダイアログが開かない');
        console.log('  ❌ ダイアログが開きません');
      }
    }

    // テスト4: aria-hiddenエラーの確認
    console.log('\n📝 テスト4: aria-hiddenエラーの確認');
    const ariaErrors = consoleErrors.filter(error => 
      error.includes('aria-hidden') || error.includes('Blocked aria-hidden')
    );
    
    if (ariaErrors.length === 0) {
      results.passed.push('✅ aria-hiddenエラーなし');
      console.log('  ✅ aria-hiddenエラーは発生していません');
    } else {
      results.failed.push('❌ aria-hiddenエラーが発生');
      console.log('  ❌ aria-hiddenエラーが発生:');
      ariaErrors.forEach(error => console.log(`    - ${error}`));
    }

    // テスト5: レスポンシブデザイン
    console.log('\n📝 テスト5: レスポンシブデザインテスト');
    
    // モバイルビュー
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    console.log('  📱 モバイルビュー (375x667)');
    
    const mobileFab = await page.$('.MuiFab-root');
    if (mobileFab) {
      results.passed.push('✅ モバイルビューでFABボタン表示');
      console.log('    ✅ FABボタンが表示されています');
    }
    
    // デスクトップビュー
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    console.log('  💻 デスクトップビュー (1920x1080)');
    
    const desktopFab = await page.$('.MuiFab-root');
    if (desktopFab) {
      results.passed.push('✅ デスクトップビューでFABボタン表示');
      console.log('    ✅ FABボタンが表示されています');
    }

    // 結果サマリー
    console.log('\n' + '=' .repeat(50));
    console.log('📊 テスト結果サマリー\n');
    
    console.log(`✅ 成功: ${results.passed.length}件`);
    results.passed.forEach(result => console.log(`  ${result}`));
    
    if (results.warnings.length > 0) {
      console.log(`\n⚠️ 警告: ${results.warnings.length}件`);
      results.warnings.forEach(result => console.log(`  ${result}`));
    }
    
    if (results.failed.length > 0) {
      console.log(`\n❌ 失敗: ${results.failed.length}件`);
      results.failed.forEach(result => console.log(`  ${result}`));
    }
    
    const successRate = (results.passed.length / (results.passed.length + results.failed.length) * 100).toFixed(1);
    console.log(`\n📈 成功率: ${successRate}%`);
    
    if (results.failed.length === 0) {
      console.log('\n🎉 すべてのテストに合格しました！');
    } else {
      console.log('\n⚠️ 一部のテストが失敗しました。修正が必要です。');
    }

    console.log('\n10秒後にブラウザを閉じます...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n💥 テスト実行中にエラーが発生:', error.message);
    results.failed.push(`💥 テスト実行エラー: ${error.message}`);
  } finally {
    await browser.close();
  }

  return results;
}

// テスト実行
runDialogTests().catch(console.error);