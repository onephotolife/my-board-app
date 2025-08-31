/**
 * Provider最適化 - クイックテスト（認証付き）
 * 
 * 実行日時: 2025-08-31
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const fetch = require('node-fetch');
const { chromium } = require('playwright');

// 設定
const CONFIG = {
  baseURL: 'http://localhost:3000',
  auth: {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  }
};

// メイン処理
async function runTest() {
  console.log('====================================');
  console.log('Provider最適化クイックテスト');
  console.log('====================================\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // メトリクス収集用のスクリプト注入
    await page.addInitScript(() => {
      window.__PROVIDER_METRICS__ = {
        mounts: {},
        apiCalls: {},
        initTimes: {},
        startTime: Date.now()
      };
      
      // API呼び出しの監視
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = args[0];
        const endpoint = typeof url === 'string' ? url : url.url;
        
        window.__PROVIDER_METRICS__.apiCalls[endpoint] = 
          (window.__PROVIDER_METRICS__.apiCalls[endpoint] || 0) + 1;
          
        console.log(`[API] ${endpoint}`);
        return originalFetch.apply(this, args);
      };
      
      console.log('[METRICS] Monitoring initialized');
    });
    
    // Step 1: CSRFトークン取得
    console.log('[1] CSRFトークン取得...');
    const csrfResponse = await page.request.get(`${CONFIG.baseURL}/api/csrf`);
    const csrfData = await csrfResponse.json();
    console.log('  ✓ CSRFトークン取得成功');
    
    // Step 2: 認証
    console.log('[2] 認証実行...');
    const authResponse = await page.request.post(`${CONFIG.baseURL}/api/auth/callback/credentials`, {
      form: {
        email: CONFIG.auth.email,
        password: CONFIG.auth.password,
        csrfToken: csrfData.token,
        callbackUrl: CONFIG.baseURL,
        json: 'true'
      }
    });
    
    if (authResponse.ok()) {
      console.log('  ✓ 認証成功');
    } else {
      throw new Error(`認証失敗: ${authResponse.status()}`);
    }
    
    // Step 3: ホームページアクセス（Provider初期化測定）
    console.log('[3] ホームページアクセス（Provider初期化測定）...');
    const startTime = Date.now();
    
    await page.goto(CONFIG.baseURL, { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    console.log(`  ✓ ページロード完了: ${loadTime}ms`);
    
    // Step 4: メトリクス取得
    console.log('[4] メトリクス収集...');
    const metrics = await page.evaluate(() => window.__PROVIDER_METRICS__);
    
    // Step 5: 結果分析
    console.log('\n====================================');
    console.log('テスト結果');
    console.log('====================================');
    
    console.log('\nAPI呼び出し数:');
    let totalAPICalls = 0;
    for (const [endpoint, count] of Object.entries(metrics.apiCalls)) {
      console.log(`  ${endpoint}: ${count}回`);
      totalAPICalls += count;
    }
    console.log(`  合計: ${totalAPICalls}回`);
    
    console.log('\n初期化時間:');
    const totalInitTime = Date.now() - metrics.startTime;
    console.log(`  Total: ${totalInitTime}ms`);
    console.log(`  Page Load: ${loadTime}ms`);
    
    // 成功判定
    const isOptimized = totalAPICalls <= 10 && loadTime < 3000;
    
    console.log('\n最適化判定:');
    console.log(`  API呼び出し: ${totalAPICalls <= 10 ? '✓ 最適化済み（10回以下）' : '✗ 要改善'}`);
    console.log(`  初期化時間: ${loadTime < 3000 ? '✓ 最適化済み（3秒以内）' : '✗ 要改善'}`);
    console.log(`  総合評価: ${isOptimized ? '✅ 最適化成功' : '❌ 追加改善必要'}`);
    
  } catch (error) {
    console.error('\n❌ テストエラー:', error.message);
  } finally {
    await browser.close();
  }
}

// 実行
runTest().catch(console.error);