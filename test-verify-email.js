const { chromium } = require('playwright');

async function testEmailVerification() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('📧 メール確認フローテスト開始\n');
  console.log('='.repeat(50));
  
  // エラー監視
  let hydrationErrors = 0;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Hydration') || text.includes('hydration')) {
        hydrationErrors++;
        console.log(`❌ Hydrationエラー: ${text.substring(0, 50)}...`);
      }
    }
  });
  
  // Step 1: 新規登録
  console.log('\n📍 Step 1: 新規ユーザー登録');
  await page.goto('http://localhost:3000/auth/signup');
  await page.waitForTimeout(1000);
  
  const timestamp = Date.now();
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'TestPassword123',
  };
  
  console.log(`   Email: ${testUser.email}`);
  
  await page.fill('input[name="name"]', testUser.name);
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.fill('input[name="confirmPassword"]', testUser.password);
  
  const [registerResponse] = await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth/register')),
    page.click('button[type="submit"]')
  ]);
  
  if (registerResponse.status() === 201) {
    console.log('   ✅ 登録成功');
  } else {
    console.log(`   ❌ 登録失敗: ${registerResponse.status()}`);
    await browser.close();
    return;
  }
  
  await page.waitForTimeout(2000);
  
  // Step 2: データベースから確認トークンを取得（実際のテスト用）
  console.log('\n📍 Step 2: メール確認ページテスト');
  
  // テスト用の固定トークン（実際には無効）
  const testToken = 'test-token-12345';
  const verifyUrl = `http://localhost:3000/auth/verify-email?token=${testToken}`;
  
  console.log(`   URL: ${verifyUrl}`);
  await page.goto(verifyUrl);
  await page.waitForTimeout(2000);
  
  // ページの状態確認
  const pageContent = await page.content();
  
  if (pageContent.includes('メールアドレスの確認')) {
    console.log('   ✅ メール確認ページが表示されました');
    
    // エラーメッセージの確認
    const errorElement = await page.$('div:has-text("トークンが無効")');
    if (errorElement) {
      console.log('   ℹ️ 予想通り無効なトークンエラーが表示されました');
    }
  } else if (pageContent.includes('404')) {
    console.log('   ❌ 404エラー - ページが見つかりません');
  } else {
    console.log('   ⚠️ 予期しないページ内容');
  }
  
  // Step 3: 無効なリンクのテスト
  console.log('\n📍 Step 3: 無効なリンクのテスト');
  await page.goto('http://localhost:3000/auth/verify-email');
  await page.waitForTimeout(1500);
  
  const invalidLinkMessage = await page.$('div:has-text("無効なリンク")');
  if (invalidLinkMessage) {
    console.log('   ✅ 無効なリンクエラーが正しく表示されました');
  } else {
    console.log('   ⚠️ エラーメッセージが表示されませんでした');
  }
  
  // Step 4: Hydrationエラーチェック
  console.log('\n📍 Step 4: Hydrationエラーチェック');
  await page.reload();
  await page.waitForTimeout(1500);
  
  if (hydrationErrors === 0) {
    console.log('   ✅ Hydrationエラーなし');
  } else {
    console.log(`   ❌ ${hydrationErrors}個のHydrationエラー検出`);
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(50));
  
  const results = [
    { test: '新規登録', status: registerResponse.status() === 201 ? 'PASS' : 'FAIL' },
    { test: 'メール確認ページ表示', status: !pageContent.includes('404') ? 'PASS' : 'FAIL' },
    { test: '無効リンクエラー表示', status: invalidLinkMessage ? 'PASS' : 'FAIL' },
    { test: 'Hydrationエラー', status: hydrationErrors === 0 ? 'PASS' : 'FAIL' },
  ];
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status}`);
  });
  
  const passCount = results.filter(r => r.status === 'PASS').length;
  if (passCount === results.length) {
    console.log('\n🎉 全テスト成功！');
  } else {
    console.log(`\n⚠️ ${results.length - passCount}個のテストが失敗しました`);
  }
  
  await browser.close();
}

testEmailVerification();