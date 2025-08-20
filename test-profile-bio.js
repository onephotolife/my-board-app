const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testProfileBio() {
  console.log('🔍 プロフィール自己紹介欄のテスト開始...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: { width: 1280, height: 800 },
    devtools: true // 開発者ツールを開く
  });
  
  const page = await browser.newPage();
  
  // コンソールメッセージの監視
  page.on('console', msg => {
    console.log(`[ブラウザ ${msg.type()}]:`, msg.text());
  });
  
  // ネットワークリクエストの監視
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/profile')) {
      const status = response.status();
      const method = response.request().method();
      console.log(`📡 ${method} ${url} → ${status}`);
      
      if (method === 'PUT' && status === 200) {
        try {
          const data = await response.json();
          console.log('📥 PUT レスポンス:', JSON.stringify(data, null, 2));
        } catch (e) {
          // JSONパースエラーは無視
        }
      }
    }
  });
  
  try {
    console.log('ℹ️ ブラウザでログインして、プロフィールページを開いてください。');
    console.log('   URL: http://localhost:3000/profile');
    console.log('   開発者ツールのネットワークタブとコンソールタブを確認してください。\n');
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    
    console.log('⏸️ 30秒間待機します...');
    console.log('この間に以下の手順を実行してください:');
    console.log('1. ログインする');
    console.log('2. プロフィールページに移動');
    console.log('3. 編集ボタンをクリック');
    console.log('4. 自己紹介欄に「テスト自己紹介」と入力');
    console.log('5. 保存ボタンをクリック');
    console.log('6. 自己紹介が表示されるか確認\n');
    
    // 30秒待機
    await sleep(30000);
    
    // 現在のプロフィール情報を取得
    const profileData = await page.evaluate(() => {
      const nameInput = document.querySelector('input[type="text"]');
      const bioTextarea = document.querySelector('textarea');
      
      return {
        name: nameInput ? nameInput.value : null,
        bio: bioTextarea ? bioTextarea.value : null
      };
    });
    
    console.log('\n📋 現在のプロフィール情報:');
    console.log(`  名前: ${profileData.name || '取得できません'}`);
    console.log(`  自己紹介: ${profileData.bio || '空または取得できません'}`);
    
    if (profileData.bio && profileData.bio.length > 0) {
      console.log('\n✅ 自己紹介が表示されています！');
    } else {
      console.log('\n❌ 自己紹介が表示されていません');
      console.log('\n考えられる原因:');
      console.log('1. APIレスポンスにbioフィールドが含まれていない');
      console.log('2. UserContextの状態更新が正しく行われていない');
      console.log('3. プロフィールページのフォームデータ設定に問題がある');
    }
    
  } catch (error) {
    console.error('❌ テスト中にエラー:', error.message);
  } finally {
    console.log('\n⏸️ ブラウザを10秒間開いたままにします...');
    await sleep(10000);
    
    console.log('🔒 ブラウザを閉じます...');
    await browser.close();
    process.exit(0);
  }
}

// テスト実行
testProfileBio().catch(console.error);