const puppeteer = require('puppeteer');

async function realTest() {
  console.log('🔍 実際の動作確認を開始します\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 500, // ゆっくり動作
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  
  // エラー監視
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ エラー:', msg.text());
    }
  });

  try {
    // プロフィールページにアクセス
    console.log('1. プロフィールページにアクセス中...');
    await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle0' });
    
    // 30秒待機（手動ログインと操作のため）
    console.log('\n⏰ 30秒間待機します。この間に：');
    console.log('  1. ログインしてください（必要な場合）');
    console.log('  2. 編集ボタンをクリック');
    console.log('  3. 自己紹介欄に何か入力');
    console.log('  4. 保存ボタンをクリック');
    console.log('  5. 結果を確認\n');
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 現在の自己紹介を取得
    const bio = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      return textarea ? textarea.value : null;
    });
    
    console.log('\n📝 現在の自己紹介欄の内容:');
    console.log(`"${bio || '空'}"`);
    
    if (bio && bio.includes('Initializing')) {
      console.log('\n❌ 問題: デバッグメッセージが含まれています！');
    } else if (bio && bio.length > 0) {
      console.log('\n✅ 自己紹介が正しく表示されています');
    } else {
      console.log('\n⚠️ 自己紹介が空です');
    }
    
    // スクリーンショット保存
    await page.screenshot({ path: 'real-test-result.png', fullPage: true });
    console.log('\n📸 スクリーンショット: real-test-result.png');
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await browser.close();
  }
}

realTest();