const puppeteer = require('puppeteer');

async function testActualBio() {
  console.log('🔍 自己紹介欄の実際の動作テスト\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 300,
    defaultViewport: { width: 1280, height: 800 },
    devtools: true // 開発者ツールを開く
  });

  const page = await browser.newPage();
  
  // ネットワークリクエストを監視
  page.on('request', request => {
    if (request.url().includes('/api/profile') && request.method() === 'PUT') {
      console.log('📤 PUT リクエスト送信:');
      console.log('   Body:', request.postData());
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/profile') && response.request().method() === 'PUT') {
      console.log('📥 PUT レスポンス:', response.status());
      try {
        const data = await response.json();
        console.log('   返却データ:', JSON.stringify(data, null, 2));
      } catch (e) {}
    }
  });

  try {
    console.log('ステップ 1: プロフィールページにアクセス');
    await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle0' });
    
    console.log('\n⏰ 40秒待機します。この間に手動で操作してください:');
    console.log('1. ログイン（必要な場合）');
    console.log('2. 編集ボタンをクリック');
    console.log('3. 自己紹介欄に「テスト自己紹介123」と入力');
    console.log('4. 保存ボタンをクリック\n');
    console.log('ネットワークログを監視中...\n');
    
    await new Promise(resolve => setTimeout(resolve, 40000));
    
    // 最終的な自己紹介の内容を確認
    const finalBio = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      return textarea ? textarea.value : null;
    });
    
    console.log('\n📝 最終的な自己紹介欄の内容:');
    console.log(`"${finalBio || '空'}"`);
    
    // formDataの状態を確認（React DevToolsがある場合）
    const hasReactDevTools = await page.evaluate(() => {
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined;
    });
    
    if (hasReactDevTools) {
      console.log('\nReact DevToolsが検出されました');
      console.log('コンポーネントの状態を確認してください');
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    console.log('\n⏸️ ブラウザを開いたままにします（手動で閉じてください）');
    // ブラウザは開いたままにする
  }
}

testActualBio();