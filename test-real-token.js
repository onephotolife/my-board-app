const { chromium } = require('playwright');

async function testRealToken() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 実際のトークンでメール確認テスト\n');
  console.log('='.repeat(50));
  
  // エラー監視
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`❌ エラー: ${msg.text()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/auth/verify-email')) {
      console.log(`📡 API Response: ${response.status()} ${response.statusText()}`);
    }
  });
  
  // 実際のトークンでテスト
  const realToken = '8c8cd2aa-ea66-48e9-a33e-8cff78c70117';
  const verifyUrl = `http://localhost:3000/auth/verify-email?token=${realToken}`;
  
  console.log(`\n📍 メール確認ページへアクセス`);
  console.log(`   URL: ${verifyUrl}`);
  
  await page.goto(verifyUrl);
  await page.waitForTimeout(3000);
  
  // 成功メッセージの確認
  const successMessage = await page.$('div:has-text("メールアドレスの確認が完了しました")');
  const errorMessage = await page.$('div:has-text("トークンが無効")');
  
  if (successMessage) {
    console.log('   ✅ メール確認成功！');
    
    // リダイレクト先の確認
    await page.waitForTimeout(3500);
    const currentUrl = page.url();
    console.log(`   📍 リダイレクト先: ${currentUrl}`);
    
    if (currentUrl.includes('/auth/signin?verified=true')) {
      console.log('   ✅ ログインページへ正しくリダイレクトされました');
      
      // 成功メッセージの表示確認
      const verifiedMessage = await page.$('div:has-text("メールアドレスが確認されました")');
      if (verifiedMessage) {
        console.log('   ✅ ログインページに成功メッセージが表示されています');
      }
    }
  } else if (errorMessage) {
    console.log('   ❌ トークンエラー（既に使用済みの可能性があります）');
  } else {
    console.log('   ⚠️ 予期しない状態');
    const pageContent = await page.content();
    console.log('   ページ内容:', pageContent.substring(0, 200));
  }
  
  // Hydrationエラーチェック
  console.log('\n📍 Hydrationエラーチェック');
  const hydrationErrors = errors.filter(e => e.includes('Hydration') || e.includes('hydration'));
  if (hydrationErrors.length === 0) {
    console.log('   ✅ Hydrationエラーなし');
  } else {
    console.log(`   ❌ ${hydrationErrors.length}個のHydrationエラー`);
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果');
  console.log('='.repeat(50));
  
  if (successMessage && hydrationErrors.length === 0) {
    console.log('🎉 完璧！メール確認が正常に動作しています');
  } else if (errorMessage) {
    console.log('⚠️ トークンは既に使用済みです（これは正常な動作です）');
  } else {
    console.log('❌ 問題が検出されました');
  }
  
  await browser.close();
}

testRealToken();