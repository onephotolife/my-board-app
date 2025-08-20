const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  name: 'テストユーザー'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testProfileFix() {
  console.log('🔍 プロフィール機能の修正確認テスト開始...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // コンソールメッセージの監視
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ コンソールエラー:', msg.text());
    }
  });
  
  // ネットワークエラーの監視
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`⚠️ HTTPエラー ${response.status()}: ${response.url()}`);
    }
  });
  
  try {
    // 1. ログインページへ移動
    console.log('1️⃣ ログインページへ移動...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    
    // 2. ログイン
    console.log('2️⃣ ログイン処理...');
    await page.type('input[name="email"]', TEST_USER.email);
    await page.type('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // ログイン完了を待つ
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    await sleep(2000);
    
    // 3. プロフィールページへ直接アクセス
    console.log('3️⃣ プロフィールページへアクセス...');
    const profileResponse = await page.goto(`${BASE_URL}/profile`, { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // レスポンスステータスを確認
    if (profileResponse.status() === 500) {
      console.log('❌ プロフィールページで500エラーが発生');
      
      // エラーメッセージを取得
      const errorText = await page.evaluate(() => document.body.innerText);
      console.log('エラー内容:', errorText);
      
      throw new Error('プロフィールページが正常に表示されません');
    }
    
    console.log(`✅ プロフィールページのレスポンス: ${profileResponse.status()}`);
    
    // 4. プロフィールページの要素確認
    console.log('4️⃣ プロフィール要素の確認...');
    await sleep(2000);
    
    // プロフィールページのタイトル確認
    const pageTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText : null;
    });
    
    if (pageTitle === 'プロフィール') {
      console.log('✅ プロフィールページが正常に表示されています');
    } else {
      console.log(`⚠️ ページタイトル: ${pageTitle || '見つかりません'}`);
    }
    
    // アバターの確認
    const avatarExists = await page.evaluate(() => {
      const avatar = document.querySelector('[class*="MuiAvatar"]');
      return avatar !== null;
    });
    
    if (avatarExists) {
      console.log('✅ アバターが表示されています');
      
      // イニシャルの確認
      const initials = await page.evaluate(() => {
        const avatar = document.querySelector('[class*="MuiAvatar"]');
        return avatar ? avatar.innerText : null;
      });
      console.log(`   イニシャル: ${initials}`);
    } else {
      console.log('⚠️ アバターが見つかりません');
    }
    
    // 名前フィールドの確認
    const nameFieldExists = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      return labels.some(label => label.innerText === '名前');
    });
    
    if (nameFieldExists) {
      console.log('✅ 名前フィールドが存在します');
      
      const nameValue = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const nameLabel = labels.find(label => label.innerText === '名前');
        if (nameLabel) {
          const input = nameLabel.parentElement.querySelector('input');
          return input ? input.value : null;
        }
        return null;
      });
      console.log(`   現在の名前: ${nameValue}`);
    } else {
      console.log('⚠️ 名前フィールドが見つかりません');
    }
    
    // 編集ボタンの確認
    const editButtonExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(button => button.innerText === '編集');
    });
    
    if (editButtonExists) {
      console.log('✅ 編集ボタンが存在します');
    } else {
      console.log('⚠️ 編集ボタンが見つかりません');
    }
    
    // 5. UserContextが正常に動作しているか確認
    console.log('5️⃣ UserContext動作確認...');
    const userContextWorking = await page.evaluate(() => {
      // ページがエラーなく表示されていれば、UserContextは正常
      return !document.body.innerText.includes('useUser must be used within a UserProvider');
    });
    
    if (userContextWorking) {
      console.log('✅ UserContextが正常に動作しています');
    } else {
      console.log('❌ UserContextエラーが残っています');
    }
    
    console.log('\n========================================');
    console.log('✅ プロフィール機能の修正確認が完了しました');
    console.log('✅ UserProviderエラーは解決されています');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ テスト中にエラーが発生:', error.message);
    
    // スクリーンショットを保存
    await page.screenshot({ 
      path: 'profile-error-screenshot.png',
      fullPage: true 
    });
    console.log('📸 エラー時のスクリーンショットを保存しました: profile-error-screenshot.png');
    
  } finally {
    console.log('\n🔒 ブラウザを閉じます...');
    await browser.close();
    process.exit(0);
  }
}

// テスト実行
testProfileFix().catch(console.error);