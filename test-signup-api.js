const { chromium } = require('playwright');

async function testSignupFlow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('📍 新規登録フローのテスト開始...\n');
  
  // コンソールメッセージを監視
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ コンソールエラー:', msg.text());
    }
  });
  
  // ネットワークエラーを監視
  page.on('requestfailed', request => {
    console.log('❌ リクエスト失敗:', request.url(), request.failure().errorText);
  });
  
  // レスポンスを監視
  page.on('response', response => {
    if (response.url().includes('/api/auth/register')) {
      console.log(`📡 API Response: ${response.status()} ${response.statusText()}`);
    }
  });
  
  // 新規登録ページへ
  console.log('1️⃣ 新規登録ページへ移動...');
  await page.goto('http://localhost:3000/auth/signup');
  await page.waitForTimeout(1000);
  
  // テストデータ
  const timestamp = Date.now();
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'TestPassword123',
    confirmPassword: 'TestPassword123'
  };
  
  console.log('2️⃣ フォーム入力中...');
  console.log(`   Name: ${testUser.name}`);
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Password: ***`);
  
  // フォーム入力
  await page.fill('input[name="name"]', testUser.name);
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);
  
  console.log('\n3️⃣ 登録ボタンをクリック...');
  
  // 登録ボタンクリック
  const [response] = await Promise.all([
    page.waitForResponse(response => 
      response.url().includes('/api/auth/register'),
      { timeout: 10000 }
    ).catch(() => null),
    page.click('button[type="submit"]')
  ]);
  
  await page.waitForTimeout(2000);
  
  // 結果確認
  if (response) {
    const status = response.status();
    const body = await response.text();
    
    console.log('\n📊 API レスポンス:');
    console.log(`   Status: ${status}`);
    
    try {
      const json = JSON.parse(body);
      console.log(`   Body: ${JSON.stringify(json, null, 2)}`);
      
      if (status === 201 || status === 200) {
        console.log('\n✅ 登録成功！');
      } else {
        console.log('\n❌ 登録失敗');
      }
    } catch {
      console.log(`   Body: ${body}`);
    }
  } else {
    console.log('\n⚠️ APIレスポンスがタイムアウトしました');
  }
  
  // エラーメッセージの確認
  const errorElement = await page.$('div[style*="color: #c62828"]');
  if (errorElement) {
    const errorText = await errorElement.textContent();
    console.log(`\n❌ 画面エラー: ${errorText}`);
  }
  
  // 成功メッセージの確認
  const successElement = await page.$('div[style*="color: #2e7d32"]');
  if (successElement) {
    const successText = await successElement.textContent();
    console.log(`\n✅ 画面成功メッセージ: ${successText}`);
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
  
  console.log('\n📍 テスト完了');
}

testSignupFlow();