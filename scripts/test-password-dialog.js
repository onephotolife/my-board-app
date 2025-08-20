#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testPasswordDialog() {
  console.log('🔍 パスワード変更ダイアログの動作確認を開始します...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // コンソールメッセージを監視
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    // ページエラーを監視
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(`❌ Page Error: ${error.message}`);
    });
    
    console.log('1. プロフィールページにアクセス...');
    await page.goto('http://localhost:3000/profile', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // ログインが必要な場合はスキップ
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signin')) {
      console.log('⚠️  ログインが必要です。認証なしでのテストをスキップします。');
      await browser.close();
      return;
    }
    
    // パスワード変更ボタンを探す
    console.log('2. パスワード変更ボタンを検索...');
    const passwordButton = await page.$('button:has-text("パスワード変更")');
    
    if (!passwordButton) {
      console.log('⚠️  パスワード変更ボタンが見つかりません');
      await browser.close();
      return;
    }
    
    console.log('✅ パスワード変更ボタンが見つかりました');
    
    // ボタンをクリック
    console.log('3. パスワード変更ボタンをクリック...');
    await passwordButton.click();
    
    // ダイアログが表示されるまで待機
    await page.waitForTimeout(1000);
    
    // ダイアログ要素を確認
    console.log('4. ダイアログ要素を確認...');
    
    const dialogTitle = await page.$('h6:has-text("パスワード変更")');
    const currentPasswordField = await page.$('input[type="password"]');
    const cancelButton = await page.$('button:has-text("キャンセル")');
    const submitButton = await page.$('button:has-text("変更する")');
    
    const results = [];
    
    if (dialogTitle) {
      results.push('✅ ダイアログタイトルが表示されています');
    } else {
      results.push('❌ ダイアログタイトルが表示されていません');
    }
    
    if (currentPasswordField) {
      results.push('✅ パスワード入力フィールドが表示されています');
    } else {
      results.push('❌ パスワード入力フィールドが表示されていません');
    }
    
    if (cancelButton) {
      results.push('✅ キャンセルボタンが表示されています');
    } else {
      results.push('❌ キャンセルボタンが表示されていません');
    }
    
    if (submitButton) {
      results.push('✅ 変更するボタンが表示されています');
    } else {
      results.push('❌ 変更するボタンが表示されていません');
    }
    
    // 結果を表示
    console.log('\n=== テスト結果 ===');
    results.forEach(result => console.log(result));
    
    if (consoleMessages.length > 0) {
      console.log('\n=== コンソールエラー ===');
      consoleMessages.forEach(msg => console.log(msg));
    }
    
    if (pageErrors.length > 0) {
      console.log('\n=== ページエラー ===');
      pageErrors.forEach(error => console.log(error));
    }
    
    // ダイアログを閉じる
    if (cancelButton) {
      console.log('\n5. ダイアログを閉じる...');
      await cancelButton.click();
      await page.waitForTimeout(500);
      
      // ダイアログが閉じられたか確認
      const dialogAfterClose = await page.$('h6:has-text("パスワード変更")');
      if (!dialogAfterClose) {
        console.log('✅ ダイアログが正常に閉じられました');
      } else {
        console.log('❌ ダイアログが閉じられませんでした');
      }
    }
    
    // 総合結果
    const hasErrors = results.some(r => r.includes('❌')) || 
                     consoleMessages.length > 0 || 
                     pageErrors.length > 0;
    
    if (!hasErrors) {
      console.log('\n✅ パスワード変更ダイアログは正常に動作しています！');
    } else {
      console.log('\n⚠️  いくつかの問題が検出されました。上記のエラーを確認してください。');
    }
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error.message);
  } finally {
    await browser.close();
  }
}

// スクリプトを実行
testPasswordDialog().catch(console.error);