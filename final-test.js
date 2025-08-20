const { chromium } = require('playwright');

async function finalTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const testResults = [];
  let hydrationErrors = 0;
  let apiErrors = 0;
  
  console.log('🚀 最終テスト開始\n');
  console.log('='.repeat(50));
  
  // エラー監視
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Hydration') || text.includes('hydration')) {
        hydrationErrors++;
        console.log(`❌ Hydrationエラー検出: ${text.substring(0, 50)}...`);
      }
    }
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      if (response.url().includes('/api/')) {
        apiErrors++;
        console.log(`❌ APIエラー: ${response.status()} ${response.url()}`);
      }
    }
  });
  
  // Test 1: ホームページ
  console.log('\n📍 Test 1: ホームページ');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1000);
  const homeErrors = hydrationErrors;
  console.log(homeErrors === 0 ? '✅ OK - エラーなし' : `❌ ${homeErrors}個のエラー`);
  testResults.push({ test: 'ホームページ', status: homeErrors === 0 ? 'PASS' : 'FAIL' });
  
  // Test 2: 新規登録ページ
  console.log('\n📍 Test 2: 新規登録ページ');
  const prevErrors = hydrationErrors;
  await page.goto('http://localhost:3000/auth/signup');
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1000);
  const signupErrors = hydrationErrors - prevErrors;
  console.log(signupErrors === 0 ? '✅ OK - エラーなし' : `❌ ${signupErrors}個のエラー`);
  testResults.push({ test: '新規登録ページ', status: signupErrors === 0 ? 'PASS' : 'FAIL' });
  
  // Test 3: ログインページ
  console.log('\n📍 Test 3: ログインページ');
  const prevErrors2 = hydrationErrors;
  await page.goto('http://localhost:3000/auth/signin');
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForTimeout(1000);
  const signinErrors = hydrationErrors - prevErrors2;
  console.log(signinErrors === 0 ? '✅ OK - エラーなし' : `❌ ${signinErrors}個のエラー`);
  testResults.push({ test: 'ログインページ', status: signinErrors === 0 ? 'PASS' : 'FAIL' });
  
  // Test 4: 新規登録API
  console.log('\n📍 Test 4: 新規登録API');
  await page.goto('http://localhost:3000/auth/signup');
  await page.waitForTimeout(1000);
  
  const timestamp = Date.now();
  await page.fill('input[name="name"]', `Test User ${timestamp}`);
  await page.fill('input[name="email"]', `test${timestamp}@example.com`);
  await page.fill('input[name="password"]', 'TestPassword123');
  await page.fill('input[name="confirmPassword"]', 'TestPassword123');
  
  const prevApiErrors = apiErrors;
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth/register'), { timeout: 10000 }).catch(() => null),
    page.click('button[type="submit"]')
  ]);
  
  await page.waitForTimeout(2000);
  
  if (response && response.status() === 201) {
    console.log('✅ OK - 登録成功 (201 Created)');
    testResults.push({ test: '新規登録API', status: 'PASS' });
  } else if (response) {
    console.log(`❌ FAIL - Status: ${response.status()}`);
    testResults.push({ test: '新規登録API', status: 'FAIL' });
  } else {
    console.log('❌ FAIL - タイムアウト');
    testResults.push({ test: '新規登録API', status: 'FAIL' });
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(50));
  
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  
  testResults.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status}`);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`合計: ${passCount}/${testResults.length} テスト成功`);
  console.log(`Hydrationエラー: ${hydrationErrors}個`);
  console.log(`APIエラー: ${apiErrors}個`);
  
  if (passCount === testResults.length && hydrationErrors === 0) {
    console.log('\n🎉🎉🎉 全テスト成功！完璧です！ 🎉🎉🎉');
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました');
  }
  
  await browser.close();
}

finalTest();