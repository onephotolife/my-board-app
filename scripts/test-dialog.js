const puppeteer = require('puppeteer');

async function testDialog() {
  console.log('🔍 投稿ダイアログのUI/UXテスト...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // boardページを開く
    console.log('📍 掲示板ページを開きます...');
    await page.goto('http://localhost:3000/board', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // FABボタンを待つ
    await page.waitForSelector('.MuiFab-root', { timeout: 10000 });
    console.log('✅ FABボタンを発見');
    
    // スクリーンショット: ダイアログを開く前
    await page.screenshot({ 
      path: 'dialog-test-before.png',
      fullPage: false 
    });
    console.log('📸 スクリーンショット保存: dialog-test-before.png');
    
    // FABボタンをクリックしてダイアログを開く
    await page.click('.MuiFab-root');
    console.log('🖱️ FABボタンをクリック');
    
    // ダイアログが開くのを待つ
    await page.waitForSelector('.MuiDialog-root', { timeout: 5000 });
    console.log('✅ ダイアログが開きました');
    
    // ダイアログの情報を取得
    const dialogInfo = await page.evaluate(() => {
      const dialog = document.querySelector('.MuiDialog-root');
      const backdrop = document.querySelector('.MuiBackdrop-root');
      const paper = document.querySelector('.MuiDialog-paper');
      const title = document.querySelector('#post-dialog-title');
      const content = document.querySelector('#post-dialog-description');
      
      if (!dialog) return null;
      
      const getComputedZ = (element) => {
        if (!element) return null;
        const style = window.getComputedStyle(element);
        return style.zIndex;
      };
      
      return {
        hasDialog: !!dialog,
        hasBackdrop: !!backdrop,
        hasPaper: !!paper,
        dialogZIndex: getComputedZ(dialog),
        backdropZIndex: getComputedZ(backdrop),
        paperZIndex: getComputedZ(paper),
        backdropOpacity: backdrop ? window.getComputedStyle(backdrop).backgroundColor : null,
        titleText: title ? title.textContent : null,
        titleBgColor: title ? window.getComputedStyle(title).backgroundColor : null,
        contentBgColor: content ? window.getComputedStyle(content).backgroundColor : null,
      };
    });
    
    console.log('\n📊 ダイアログ情報:');
    console.log('  ダイアログ存在:', dialogInfo.hasDialog ? '✅' : '❌');
    console.log('  背景存在:', dialogInfo.hasBackdrop ? '✅' : '❌');
    console.log('  Paper存在:', dialogInfo.hasPaper ? '✅' : '❌');
    console.log('  Dialog z-index:', dialogInfo.dialogZIndex);
    console.log('  Backdrop z-index:', dialogInfo.backdropZIndex);
    console.log('  Paper z-index:', dialogInfo.paperZIndex);
    console.log('  背景の不透明度:', dialogInfo.backdropOpacity);
    console.log('  タイトル:', dialogInfo.titleText);
    console.log('  タイトル背景色:', dialogInfo.titleBgColor);
    console.log('  コンテンツ背景色:', dialogInfo.contentBgColor);
    
    // スクリーンショット: ダイアログを開いた後
    await page.screenshot({ 
      path: 'dialog-test-after.png',
      fullPage: false 
    });
    console.log('\n📸 スクリーンショット保存: dialog-test-after.png');
    
    // 視認性チェック
    const visibility = await page.evaluate(() => {
      const paper = document.querySelector('.MuiDialog-paper');
      if (!paper) return { visible: false };
      
      const rect = paper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // ダイアログの中心の要素を取得
      const elementAtCenter = document.elementFromPoint(centerX, centerY);
      
      // ダイアログ内の要素かチェック
      const isDialogElement = paper.contains(elementAtCenter);
      
      return {
        visible: isDialogElement,
        elementTag: elementAtCenter ? elementAtCenter.tagName : null,
        paperPosition: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        }
      };
    });
    
    console.log('\n🔍 視認性チェック:');
    console.log('  ダイアログ視認性:', visibility.visible ? '✅ 良好' : '❌ 問題あり');
    console.log('  中心の要素:', visibility.elementTag);
    console.log('  ダイアログ位置:', visibility.paperPosition);
    
    console.log('\n✅ ダイアログUI/UXテスト完了！');
    console.log('10秒後にブラウザを閉じます...');
    await new Promise(r => setTimeout(r, 10000));
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

testDialog().catch(console.error);