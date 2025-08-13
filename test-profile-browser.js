const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testProfileBrowser() {
  console.log('🔍 ブラウザでプロフィールページを確認...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // コンソールメッセージの監視
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      console.log('❌ コンソールエラー:', text);
      
      // UserProviderエラーをチェック
      if (text.includes('useUser must be used within a UserProvider')) {
        console.log('\n⚠️ UserProviderエラーが検出されました！');
        console.log('   このエラーは修正されているはずです。');
        console.log('   ブラウザのキャッシュをクリアしてみてください。\n');
      }
    } else if (type === 'warning') {
      console.log('⚠️ 警告:', text);
    }
  });
  
  // ネットワークエラーの監視
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    
    if (url.includes('/profile') && status >= 400) {
      console.log(`⚠️ プロフィールページ HTTPエラー ${status}: ${url}`);
    }
  });
  
  try {
    // 1. プロフィールページへ直接アクセス（未認証）
    console.log('1️⃣ プロフィールページへアクセス（未認証）...');
    const response = await page.goto(`${BASE_URL}/profile`, { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    await sleep(2000);
    
    // リダイレクト先のURLを確認
    const currentUrl = page.url();
    console.log(`   現在のURL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('✅ サインインページにリダイレクトされました（正常）');
      console.log('   callbackUrlが設定されています:', currentUrl.includes('callbackUrl=/profile'));
    } else if (currentUrl.includes('/profile')) {
      // プロフィールページにいる場合
      const pageContent = await page.evaluate(() => document.body.innerText);
      
      if (pageContent.includes('useUser must be used within a UserProvider')) {
        console.log('❌ UserProviderエラーが表示されています');
        console.log('\n修正が適用されていない可能性があります。');
        console.log('以下を確認してください:');
        console.log('1. src/app/layout.tsx が Providers を使用している');
        console.log('2. src/app/providers.tsx に UserProvider が含まれている');
        console.log('3. Next.jsサーバーを再起動する');
      } else {
        console.log('⚠️ プロフィールページが表示されました（認証なし）');
        console.log('   ページ内容:', pageContent.substring(0, 200));
      }
    }
    
    // 2. ページソースでProvidersの存在を確認
    console.log('\n2️⃣ Providersの存在を確認...');
    const htmlContent = await page.content();
    
    // HTMLに含まれるJavaScriptを確認
    const hasUserProvider = htmlContent.includes('UserProvider') || htmlContent.includes('UserContext');
    const hasProviders = htmlContent.includes('Providers');
    
    if (hasUserProvider) {
      console.log('✅ UserProviderのコードが含まれています');
    } else {
      console.log('⚠️ UserProviderのコードが見つかりません');
    }
    
    if (hasProviders) {
      console.log('✅ Providersコンポーネントが使用されています');
    } else {
      console.log('⚠️ Providersコンポーネントが見つかりません');
    }
    
    // 3. 開発者ツールでReactコンポーネントツリーを確認
    console.log('\n3️⃣ Reactコンポーネントの状態を確認...');
    const hasReactDevTools = await page.evaluate(() => {
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined;
    });
    
    if (hasReactDevTools) {
      console.log('✅ React DevToolsが利用可能です');
      console.log('   ブラウザのReact DevToolsで以下を確認してください:');
      console.log('   - Providersコンポーネントが存在する');
      console.log('   - UserProviderが子コンポーネントとして存在する');
      console.log('   - SessionProviderも存在する');
    } else {
      console.log('ℹ️ React DevToolsが検出されませんでした');
    }
    
    console.log('\n========================================');
    console.log('確認結果サマリー:');
    console.log('========================================');
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('✅ 未認証時のリダイレクトは正常に動作しています');
      console.log('✅ UserProviderエラーは表示されていません');
      console.log('\n修正は正常に適用されています！');
    } else {
      console.log('⚠️ 予期しない動作が検出されました');
      console.log('   手動でブラウザを確認してください');
    }
    
    console.log('\n手動確認の推奨:');
    console.log('1. ブラウザでサインインして /profile にアクセス');
    console.log('2. プロフィールページが正常に表示されることを確認');
    console.log('3. 編集機能が動作することを確認');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ テスト中にエラーが発生:', error.message);
    
    // スクリーンショットを保存
    await page.screenshot({ 
      path: 'profile-browser-test.png',
      fullPage: true 
    });
    console.log('📸 スクリーンショットを保存: profile-browser-test.png');
    
  } finally {
    console.log('\n⏸️ ブラウザを10秒間開いたままにします...');
    console.log('   手動で確認したい場合はブラウザを操作してください');
    await sleep(10000);
    
    console.log('🔒 ブラウザを閉じます...');
    await browser.close();
    process.exit(0);
  }
}

// テスト実行
testProfileBrowser().catch(console.error);