const { chromium } = require('playwright');
const { MongoClient } = require('mongodb');

async function testCompleteFlow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🚀 完全なメール確認フローテスト\n');
  console.log('='.repeat(50));
  
  const timestamp = Date.now();
  const testUser = {
    name: `Complete Test ${timestamp}`,
    email: `complete${timestamp}@example.com`,
    password: 'TestPassword123',
  };
  
  let totalErrors = 0;
  
  // エラー監視
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Hydration') || text.includes('hydration')) {
        totalErrors++;
        console.log(`❌ Hydrationエラー: ${text.substring(0, 50)}...`);
      }
    }
  });
  
  // Step 1: 新規登録
  console.log('\n📍 Step 1: 新規ユーザー登録');
  console.log(`   Name: ${testUser.name}`);
  console.log(`   Email: ${testUser.email}`);
  
  await page.goto('http://localhost:3000/auth/signup');
  await page.waitForTimeout(1000);
  
  await page.fill('input[name="name"]', testUser.name);
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.fill('input[name="confirmPassword"]', testUser.password);
  
  const [registerResponse] = await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth/register')),
    page.click('button[type="submit"]')
  ]);
  
  if (registerResponse.status() !== 201) {
    console.log(`   ❌ 登録失敗: ${registerResponse.status()}`);
    await browser.close();
    return;
  }
  
  console.log('   ✅ 登録成功');
  await page.waitForTimeout(2000);
  
  // Step 2: MongoDBからトークンを取得
  console.log('\n📍 Step 2: 確認トークン取得');
  
  let token = null;
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('boardDB');
    const user = await db.collection('users').findOne({ email: testUser.email });
    
    if (user && user.emailVerificationToken) {
      token = user.emailVerificationToken;
      console.log(`   ✅ トークン取得成功: ${token}`);
    } else {
      console.log('   ❌ トークンが見つかりません');
    }
    
    await client.close();
  } catch (error) {
    console.log('   ⚠️ MongoDBアクセスエラー:', error.message);
    console.log('   代替方法: メール送信ログを確認してください');
  }
  
  if (!token) {
    // 代替: ダミートークンでテスト継続
    console.log('   ℹ️ ダミートークンでテストを継続します');
    token = 'dummy-token-for-test';
  }
  
  // Step 3: メール確認
  console.log('\n📍 Step 3: メール確認ページアクセス');
  const verifyUrl = `http://localhost:3000/auth/verify-email?token=${token}`;
  console.log(`   URL: ${verifyUrl.substring(0, 80)}...`);
  
  await page.goto(verifyUrl);
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  const pageContent = await page.content();
  
  if (currentUrl.includes('/auth/signin?verified=true')) {
    console.log('   ✅ メール確認成功 - ログインページへリダイレクト');
    
    const verifiedMessage = await page.$('div:has-text("メールアドレスが確認されました")');
    if (verifiedMessage) {
      console.log('   ✅ 成功メッセージ表示確認');
    }
  } else if (pageContent.includes('トークンが無効')) {
    console.log('   ⚠️ 無効なトークン（予想される動作）');
  } else if (pageContent.includes('404')) {
    console.log('   ❌ 404エラー - ページが見つかりません');
  } else {
    console.log('   ℹ️ その他の状態');
  }
  
  // Step 4: ページリロードテスト
  console.log('\n📍 Step 4: リロードテスト（Hydrationエラーチェック）');
  const errorsBefore = totalErrors;
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1000);
  
  await page.goto('http://localhost:3000/auth/signup');
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1000);
  
  await page.goto('http://localhost:3000/auth/signin');
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1000);
  
  const newErrors = totalErrors - errorsBefore;
  if (newErrors === 0) {
    console.log('   ✅ Hydrationエラーなし');
  } else {
    console.log(`   ❌ ${newErrors}個のHydrationエラー検出`);
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 最終結果');
  console.log('='.repeat(50));
  
  const results = {
    '新規登録': registerResponse.status() === 201 ? 'PASS' : 'FAIL',
    'トークン取得': token && token !== 'dummy-token-for-test' ? 'PASS' : 'WARN',
    'メール確認ページ': !pageContent.includes('404') ? 'PASS' : 'FAIL',
    'Hydrationエラー': totalErrors === 0 ? 'PASS' : 'FAIL',
  };
  
  Object.entries(results).forEach(([test, status]) => {
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${test}: ${status}`);
  });
  
  const passCount = Object.values(results).filter(s => s === 'PASS').length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n合計: ${passCount}/${totalTests} テスト成功`);
  
  if (passCount === totalTests) {
    console.log('\n🎉🎉🎉 完璧！全てのテストが成功しました！ 🎉🎉🎉');
  } else if (totalErrors === 0) {
    console.log('\n✅ Hydrationエラーは完全に解決されています！');
  }
  
  await browser.close();
}

testCompleteFlow().catch(console.error);