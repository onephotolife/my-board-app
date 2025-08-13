const puppeteer = require('puppeteer');

async function testVerifyEmail() {
  console.log('🔍 メール認証ページのテスト開始...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100
  });
  
  try {
    const page = await browser.newPage();
    
    // コンソールログを監視
    const errors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' || text.includes('Hydration') || text.includes('aria-hidden')) {
        errors.push(text);
        console.log(`[ERROR]: ${text}`);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error(`[PAGE ERROR]: ${error.message}`);
    });
    
    console.log('1. テスト用トークンでメール認証ページにアクセス...');
    // 実際のトークンまたはテスト用トークンを使用
    const testToken = '628c5938-d8b9-47b7-97ee-91c12aece35e';
    await page.goto(`http://localhost:3000/auth/verify-email?token=${testToken}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n2. ページの状態を確認...');
    const pageInfo = await page.evaluate(() => {
      const title = document.querySelector('h1');
      const message = document.querySelector('div[style*="fontSize"]');
      const buttons = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: a.textContent,
        href: a.href
      }));
      
      return {
        title: title ? title.textContent : null,
        message: message ? message.textContent : null,
        buttons,
        hasHeader: !!document.querySelector('header'),
        hasAppBar: !!document.querySelector('.MuiAppBar-root')
      };
    });
    
    console.log('  タイトル:', pageInfo.title);
    console.log('  メッセージ:', pageInfo.message ? pageInfo.message.substring(0, 50) + '...' : 'なし');
    console.log('  ボタン数:', pageInfo.buttons.length);
    console.log('  ヘッダー存在:', pageInfo.hasHeader ? '❌ あり（問題）' : '✅ なし（正常）');
    console.log('  AppBar存在:', pageInfo.hasAppBar ? '❌ あり（問題）' : '✅ なし（正常）');
    
    console.log('\n3. ネットワークリクエストを確認...');
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/auth/verify-email')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // ページをリロードしてAPIリクエストを確認
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    
    if (responses.length > 0) {
      console.log('  APIレスポンス:');
      responses.forEach(res => {
        console.log(`    - ${res.url}`);
        console.log(`      ステータス: ${res.status} ${res.statusText}`);
      });
    }
    
    console.log('\n4. エラーチェック...');
    if (errors.length > 0) {
      console.log('  ⚠️ エラーが検出されました:');
      errors.forEach(err => console.log(`    - ${err.substring(0, 100)}`));
    } else {
      console.log('  ✅ エラーなし');
    }
    
    // 結果判定
    console.log('\n=== テスト結果 ===');
    const hasHydrationError = errors.some(e => e.includes('Hydration'));
    const hasAriaError = errors.some(e => e.includes('aria-hidden'));
    const hasHeader = pageInfo.hasHeader || pageInfo.hasAppBar;
    
    if (!hasHydrationError && !hasAriaError && !hasHeader) {
      console.log('✅ すべてのテストに合格しました！');
      console.log('  - Hydrationエラーなし');
      console.log('  - aria-hiddenエラーなし');
      console.log('  - 独立したレイアウト（ヘッダーなし）');
    } else {
      console.log('❌ 問題が検出されました:');
      if (hasHydrationError) console.log('  - Hydrationエラーあり');
      if (hasAriaError) console.log('  - aria-hiddenエラーあり');
      if (hasHeader) console.log('  - ヘッダーが表示されている');
    }
    
    console.log('\n10秒後にブラウザを閉じます...');
    await new Promise(r => setTimeout(r, 10000));
    
  } catch (error) {
    console.error('\n❌ テストエラー:', error.message);
  } finally {
    await browser.close();
  }
}

testVerifyEmail().catch(console.error);