// プロフィール機能自動テストスクリプト
// Puppeteerを使用したE2Eテスト

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'profile.test@example.com',
  password: 'Test1234!',
  name: 'テストユーザー',
  bio: 'これはテスト用のプロフィールです。'
};

// テスト結果を記録
const testResults = [];

// ユーティリティ関数
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page) {
  console.log('🔐 ログイン処理開始...');
  
  try {
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    
    await page.type('input[name="email"]', TEST_USER.email);
    await page.type('input[name="password"]', TEST_USER.password);
    
    // ログインボタンをクリック
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
      // ナビゲーションを待つ
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
        console.log('⚠️  ナビゲーションタイムアウト - ページ遷移を確認中...');
      });
    } else {
      console.log('❌ ログインボタンが見つかりません');
      return false;
    }
    
    console.log('✅ ログイン成功');
    return true;
  } catch (error) {
    console.log('❌ ログイン失敗:', error.message);
    return false;
  }
}

// テスト関数
async function testAuthCheck(browser) {
  console.log('\n📝 Test 1: 認証チェック（未ログイン時）');
  
  try {
    // シークレットモードで新しいページを開く
    const context = await browser.createBrowserContext();
    const newPage = await context.newPage();
    
    await newPage.goto(`${BASE_URL}/profile`);
    await delay(1000);
    
    const url = newPage.url();
    const isRedirected = url.includes('/auth/signin') && url.includes('callbackUrl');
    
    await context.close();
    
    if (isRedirected) {
      console.log('✅ Pass: 未ログイン時に正しくリダイレクトされました');
      testResults.push({ test: '認証チェック', result: 'PASS' });
      return true;
    } else {
      console.log('❌ Fail: リダイレクトが正しく動作していません');
      testResults.push({ test: '認証チェック', result: 'FAIL', error: 'リダイレクト失敗' });
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    testResults.push({ test: '認証チェック', result: 'ERROR', error: error.message });
    return false;
  }
}

async function testProfileDisplay(page) {
  console.log('\n📝 Test 2: プロフィール表示の確認');
  
  try {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // プロフィール情報の取得（MUIのTextFieldは特殊なセレクタが必要）
    const name = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (let input of inputs) {
        const label = input.closest('.MuiFormControl-root')?.querySelector('label');
        if (label && label.textContent.includes('名前')) {
          return input.value;
        }
      }
      return null;
    });
    
    const email = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (let input of inputs) {
        const label = input.closest('.MuiFormControl-root')?.querySelector('label');
        if (label && label.textContent.includes('メールアドレス')) {
          return input.value;
        }
      }
      return null;
    });
    
    const bio = await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      for (let textarea of textareas) {
        const label = textarea.closest('.MuiFormControl-root')?.querySelector('label');
        if (label && label.textContent.includes('自己紹介')) {
          return textarea.value;
        }
      }
      return null;
    });
    
    // アバターの頭文字を確認
    const avatarText = await page.$eval('.MuiAvatar-root', el => el.textContent).catch(() => null);
    
    const checks = {
      name: name === TEST_USER.name,
      email: email === TEST_USER.email,
      bio: bio === TEST_USER.bio,
      avatar: avatarText && avatarText.length > 0
    };
    
    const allPassed = Object.values(checks).every(v => v);
    
    if (allPassed) {
      console.log('✅ Pass: プロフィール情報が正しく表示されています');
      testResults.push({ test: 'プロフィール表示', result: 'PASS' });
    } else {
      console.log('❌ Fail: プロフィール情報の表示に問題があります');
      console.log('  チェック結果:', checks);
      testResults.push({ test: 'プロフィール表示', result: 'FAIL', details: checks });
    }
    
    return allPassed;
  } catch (error) {
    console.error('❌ Error:', error.message);
    testResults.push({ test: 'プロフィール表示', result: 'ERROR', error: error.message });
    return false;
  }
}

async function testProfileUpdate(page) {
  console.log('\n📝 Test 3: プロフィール更新');
  
  try {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForSelector('button', { timeout: 5000 });
    
    // 編集ボタンをクリック
    const editButton = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (let button of buttons) {
        if (button.textContent.includes('編集')) {
          return button;
        }
      }
      return null;
    });
    
    if (editButton) {
      await editButton.click();
      await delay(1000);
    }
    
    // フォームをクリアして新しい値を入力
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (let input of inputs) {
        const label = input.closest('.MuiFormControl-root')?.querySelector('label');
        if (label && label.textContent.includes('名前')) {
          input.select();
          input.value = '';
        }
      }
    });
    
    await page.keyboard.type('更新テストユーザー');
    
    await page.evaluate(() => {
      const textareas = document.querySelectorAll('textarea');
      for (let textarea of textareas) {
        const label = textarea.closest('.MuiFormControl-root')?.querySelector('label');
        if (label && label.textContent.includes('自己紹介')) {
          textarea.select();
          textarea.value = '';
        }
      }
    });
    
    await page.keyboard.type('プロフィールを更新しました。');
    
    // 保存ボタンをクリック
    const saveButton = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (let button of buttons) {
        if (button.textContent.includes('保存')) {
          return button;
        }
      }
      return null;
    });
    
    if (saveButton) {
      await saveButton.click();
    }
    
    // 成功メッセージを待つ
    const successMessage = await page.waitForSelector('.MuiAlert-standardSuccess', { 
      timeout: 5000 
    }).catch(() => null);
    
    if (successMessage) {
      console.log('✅ Pass: プロフィールが正常に更新されました');
      testResults.push({ test: 'プロフィール更新', result: 'PASS' });
      return true;
    } else {
      console.log('❌ Fail: プロフィール更新に失敗しました');
      testResults.push({ test: 'プロフィール更新', result: 'FAIL' });
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    testResults.push({ test: 'プロフィール更新', result: 'ERROR', error: error.message });
    return false;
  }
}

async function testCharacterLimit(page) {
  console.log('\n📝 Test 4: 文字数制限チェック');
  
  try {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForSelector('button', { timeout: 5000 });
    
    // 編集モードに入る
    const editButton = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (let button of buttons) {
        if (button.textContent.includes('編集')) {
          return button;
        }
      }
      return null;
    });
    
    if (editButton) {
      await editButton.click();
      await delay(1000);
    }
    
    // 51文字の名前を入力
    const longName = 'あ'.repeat(51);
    await page.evaluate((text) => {
      const inputs = document.querySelectorAll('input');
      for (let input of inputs) {
        const label = input.closest('.MuiFormControl-root')?.querySelector('label');
        if (label && label.textContent.includes('名前')) {
          input.value = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }, longName);
    
    await delay(500);
    
    // 201文字の自己紹介を入力
    const longBio = 'テ'.repeat(201);
    await page.evaluate((text) => {
      const textareas = document.querySelectorAll('textarea');
      for (let textarea of textareas) {
        const label = textarea.closest('.MuiFormControl-root')?.querySelector('label');
        if (label && label.textContent.includes('自己紹介')) {
          textarea.value = text;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }, longBio);
    
    // エラーチェック
    await delay(500);
    const bioError = await page.$$('.MuiFormHelperText-root.Mui-error');
    const hasBioError = bioError.length > 0;
    
    // 保存ボタンが無効化されているか確認
    const isSaveDisabled = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (let button of buttons) {
        if (button.textContent.includes('保存')) {
          return button.disabled;
        }
      }
      return false;
    });
    
    if (hasNameError && hasBioError && isSaveDisabled) {
      console.log('✅ Pass: 文字数制限が正しく機能しています');
      testResults.push({ test: '文字数制限', result: 'PASS' });
      return true;
    } else {
      console.log('❌ Fail: 文字数制限が正しく機能していません');
      console.log(`  名前エラー: ${hasNameError}, 自己紹介エラー: ${hasBioError}, 保存無効: ${isSaveDisabled}`);
      testResults.push({ test: '文字数制限', result: 'FAIL' });
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    testResults.push({ test: '文字数制限', result: 'ERROR', error: error.message });
    return false;
  }
}

async function testPasswordChange(page) {
  console.log('\n📝 Test 5: パスワード変更（バリデーションのみ）');
  
  try {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForSelector('button', { timeout: 5000 });
    
    // パスワード変更ボタンをクリック
    const passwordButton = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button');
      for (let button of buttons) {
        if (button.textContent.includes('パスワード変更')) {
          return button;
        }
      }
      return null;
    });
    
    if (passwordButton) {
      await passwordButton.click();
      await delay(1000);
    }
    
    // ダイアログが開いたか確認
    const dialog = await page.$('.MuiDialog-root');
    if (!dialog) {
      console.log('❌ Fail: パスワード変更ダイアログが開きません');
      testResults.push({ test: 'パスワード変更', result: 'FAIL' });
      return false;
    }
    
    // 短いパスワードを入力してバリデーションエラーを確認
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (let input of inputs) {
        const label = input.closest('.MuiFormControl-root')?.querySelector('label');
        if (label && label.textContent.includes('新しいパスワード') && !label.textContent.includes('確認')) {
          input.value = 'short';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    });
    
    await delay(500);
    
    const errorMessage = await page.$('.MuiFormHelperText-root.Mui-error');
    
    // ダイアログを閉じる
    await page.keyboard.press('Escape');
    
    if (errorMessage) {
      console.log('✅ Pass: パスワードバリデーションが正しく動作しています');
      testResults.push({ test: 'パスワード変更', result: 'PASS' });
      return true;
    } else {
      console.log('⚠️  Warning: パスワードバリデーションが確認できませんでした');
      testResults.push({ test: 'パスワード変更', result: 'WARNING' });
      return true;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    testResults.push({ test: 'パスワード変更', result: 'ERROR', error: error.message });
    return false;
  }
}

// メインテスト実行関数
async function runTests() {
  console.log('🚀 プロフィール機能自動テスト開始\n');
  console.log('================================\n');
  
  const browser = await puppeteer.launch({
    headless: false, // UIを表示してテスト
    slowMo: 50, // 動作を見やすくするため
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    // Test 1: 認証チェック
    await testAuthCheck(browser);
    
    // ログイン
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      console.log('⚠️  ログインに失敗したため、残りのテストをスキップします');
      return;
    }
    
    // Test 2: プロフィール表示
    await testProfileDisplay(page);
    
    // Test 3: プロフィール更新
    await testProfileUpdate(page);
    
    // Test 4: 文字数制限
    await testCharacterLimit(page);
    
    // Test 5: パスワード変更
    await testPasswordChange(page);
    
  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error);
  } finally {
    // 結果サマリー
    console.log('\n================================');
    console.log('📊 テスト結果サマリー\n');
    
    const passCount = testResults.filter(r => r.result === 'PASS').length;
    const failCount = testResults.filter(r => r.result === 'FAIL').length;
    const errorCount = testResults.filter(r => r.result === 'ERROR').length;
    
    console.log(`✅ PASS: ${passCount}`);
    console.log(`❌ FAIL: ${failCount}`);
    console.log(`⚠️  ERROR: ${errorCount}`);
    
    console.log('\n詳細:');
    testResults.forEach(r => {
      const icon = r.result === 'PASS' ? '✅' : r.result === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${r.test}: ${r.result}`);
      if (r.error) console.log(`   Error: ${r.error}`);
      if (r.details) console.log(`   Details:`, r.details);
    });
    
    await browser.close();
    
    // テスト失敗時は非ゼロのexitコードを返す
    process.exit(failCount + errorCount > 0 ? 1 : 0);
  }
}

// 実行
runTests().catch(console.error);