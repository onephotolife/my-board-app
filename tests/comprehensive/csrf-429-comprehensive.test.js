/**
 * CSRF 429エラー包括テスト（認証付き）
 * 全体システムの動作確認と429エラー再発防止の検証
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const axios = require('axios');
const { chromium } = require('playwright');

// テスト設定
const CONFIG = {
  baseURL: 'http://localhost:3000',
  auth: {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  },
  timeout: 60000,
  maxRetries: 3
};

// デバッグログ設定
const DEBUG = true;
const log = (message, data = null) => {
  if (DEBUG) {
    console.log(`[DEBUG ${new Date().toISOString()}] ${message}`, data || '');
  }
};

// メトリクス収集
const metrics = {
  apiCalls: {},
  errors: [],
  timings: {},
  providers: {}
};

/**
 * メトリクス記録ヘルパー
 */
function recordMetric(type, key, value) {
  if (!metrics[type]) metrics[type] = {};
  if (!metrics[type][key]) metrics[type][key] = [];
  metrics[type][key].push({
    value,
    timestamp: Date.now()
  });
}

/**
 * 完全な認証フロー実行
 */
async function performFullAuthentication() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-dev-shm-usage']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    log('完全認証フロー開始');
    const startTime = Date.now();
    
    // ネットワークリクエストを監視
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        const endpoint = url.replace(CONFIG.baseURL, '');
        recordMetric('apiCalls', endpoint, {
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    // レスポンス監視（429エラー検出）
    page.on('response', response => {
      if (response.status() === 429) {
        recordMetric('errors', '429', {
          url: response.url(),
          timestamp: Date.now()
        });
        console.error('❌ 429エラー検出:', response.url());
      }
    });
    
    // サインインページへ移動
    await page.goto(`${CONFIG.baseURL}/auth/signin`, {
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout
    });
    
    // 認証フォーム入力
    await page.fill('input[name="email"]', CONFIG.auth.email);
    await page.fill('input[name="password"]', CONFIG.auth.password);
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    
    // リダイレクト待機
    await page.waitForURL(url => {
      return !url.includes('/auth/signin');
    }, { timeout: CONFIG.timeout });
    
    const authTime = Date.now() - startTime;
    recordMetric('timings', 'authentication', authTime);
    log(`認証完了: ${authTime}ms`);
    
    return { success: true, page, browser, context };
  } catch (error) {
    log('認証失敗', error.message);
    await browser.close();
    return { success: false, error: error.message };
  }
}

/**
 * テスト1: 初期ロード時の429エラー防止確認
 */
async function testInitialLoadWithoutErrors() {
  console.log('\n=== テスト1: 初期ロード時の429エラー防止確認 ===');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-dev-shm-usage']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    let error429Count = 0;
    const apiRequests = [];
    
    // リクエスト監視
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiRequests.push({
          url,
          status: response.status(),
          timestamp: Date.now()
        });
        
        if (response.status() === 429) {
          error429Count++;
          console.error(`429エラー: ${url}`);
        }
      }
    });
    
    // ページ読み込み
    const startTime = Date.now();
    await page.goto(CONFIG.baseURL, {
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout
    });
    
    // 追加の待機時間
    await page.waitForTimeout(3000);
    
    const loadTime = Date.now() - startTime;
    
    // 結果分析
    console.log(`ページロード時間: ${loadTime}ms`);
    console.log(`APIリクエスト総数: ${apiRequests.length}`);
    console.log(`429エラー数: ${error429Count}`);
    
    // API別の集計
    const apiSummary = {};
    apiRequests.forEach(req => {
      const endpoint = req.url.replace(CONFIG.baseURL, '').split('?')[0];
      if (!apiSummary[endpoint]) {
        apiSummary[endpoint] = { count: 0, errors: 0 };
      }
      apiSummary[endpoint].count++;
      if (req.status === 429) {
        apiSummary[endpoint].errors++;
      }
    });
    
    console.log('API別リクエスト:');
    Object.entries(apiSummary).forEach(([endpoint, data]) => {
      console.log(`  ${endpoint}: ${data.count}回 (429エラー: ${data.errors}回)`);
    });
    
    // 期待値: 429エラーが発生しない
    const testPassed = error429Count === 0;
    
    return {
      testName: '初期ロード時の429エラー防止',
      passed: testPassed,
      details: {
        loadTime,
        totalRequests: apiRequests.length,
        error429Count,
        apiSummary
      }
    };
  } catch (error) {
    return {
      testName: '初期ロード時の429エラー防止',
      passed: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

/**
 * テスト2: 認証後のProvider再初期化
 */
async function testProviderReinitializationAfterAuth() {
  console.log('\n=== テスト2: 認証後のProvider再初期化 ===');
  
  const authResult = await performFullAuthentication();
  if (!authResult.success) {
    return {
      testName: '認証後のProvider再初期化',
      passed: false,
      error: '認証に失敗しました'
    };
  }
  
  const { page, browser } = authResult;
  
  try {
    // Provider初期化ログを収集
    const providerLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Provider') || text.includes('CSRF')) {
        providerLogs.push({
          text,
          type: msg.type(),
          timestamp: Date.now()
        });
      }
    });
    
    // APIリクエストカウント
    const apiCounts = {
      before: { csrf: 0, session: 0, performance: 0 },
      after: { csrf: 0, session: 0, performance: 0 }
    };
    
    page.on('request', request => {
      const url = request.url();
      const phase = Date.now() < reloadTime ? 'before' : 'after';
      
      if (url.includes('/api/csrf')) apiCounts[phase].csrf++;
      else if (url.includes('/api/auth/session')) apiCounts[phase].session++;
      else if (url.includes('/api/performance')) apiCounts[phase].performance++;
    });
    
    // ダッシュボードまたはホームへ移動
    await page.goto(CONFIG.baseURL, {
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout
    });
    
    // ページリロード前の記録
    const reloadTime = Date.now() + 1000;
    await page.waitForTimeout(1000);
    
    // ページリロード
    await page.reload({ waitUntil: 'networkidle' });
    
    // リロード後の待機
    await page.waitForTimeout(2000);
    
    // 結果分析
    console.log('リロード前のAPIリクエスト:');
    console.log('  CSRF:', apiCounts.before.csrf);
    console.log('  Session:', apiCounts.before.session);
    console.log('  Performance:', apiCounts.before.performance);
    
    console.log('リロード後のAPIリクエスト:');
    console.log('  CSRF:', apiCounts.after.csrf);
    console.log('  Session:', apiCounts.after.session);
    console.log('  Performance:', apiCounts.after.performance);
    
    console.log('Providerログ数:', providerLogs.length);
    
    // 期待値: リロード後もAPI呼び出しが最小限
    const totalAfter = apiCounts.after.csrf + 
                       apiCounts.after.session + 
                       apiCounts.after.performance;
    const testPassed = totalAfter <= 5;
    
    return {
      testName: '認証後のProvider再初期化',
      passed: testPassed,
      details: {
        beforeReload: apiCounts.before,
        afterReload: apiCounts.after,
        providerLogs: providerLogs.length
      }
    };
  } catch (error) {
    return {
      testName: '認証後のProvider再初期化',
      passed: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

/**
 * テスト3: 高負荷シミュレーション
 */
async function testHighLoadScenario() {
  console.log('\n=== テスト3: 高負荷シミュレーション ===');
  
  const authResult = await performFullAuthentication();
  if (!authResult.success) {
    return {
      testName: '高負荷シミュレーション',
      passed: false,
      error: '認証に失敗しました'
    };
  }
  
  const { page, browser, context } = authResult;
  
  try {
    // 複数タブを開く
    const pages = [page];
    for (let i = 0; i < 3; i++) {
      const newPage = await context.newPage();
      pages.push(newPage);
    }
    
    // 各タブで同時にページを読み込む
    const loadPromises = pages.map(async (p, index) => {
      const errors = [];
      
      p.on('response', response => {
        if (response.status() === 429) {
          errors.push({
            url: response.url(),
            tab: index
          });
        }
      });
      
      await p.goto(CONFIG.baseURL, {
        waitUntil: 'networkidle',
        timeout: CONFIG.timeout
      });
      
      return { tab: index, errors };
    });
    
    const results = await Promise.all(loadPromises);
    
    // エラー集計
    let totalErrors = 0;
    results.forEach(result => {
      totalErrors += result.errors.length;
      if (result.errors.length > 0) {
        console.log(`タブ${result.tab}: ${result.errors.length}個の429エラー`);
      }
    });
    
    // 期待値: 複数タブでも429エラーが最小限
    const testPassed = totalErrors <= 2;
    
    return {
      testName: '高負荷シミュレーション',
      passed: testPassed,
      details: {
        tabCount: pages.length,
        totalErrors,
        errorsByTab: results.map(r => ({
          tab: r.tab,
          errorCount: r.errors.length
        }))
      }
    };
  } catch (error) {
    return {
      testName: '高負荷シミュレーション',
      passed: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

/**
 * テスト4: デバッグログとメトリクス検証
 */
async function testDebugLogsAndMetrics() {
  console.log('\n=== テスト4: デバッグログとメトリクス検証 ===');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-dev-shm-usage']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // コンソールログを収集
    const debugLogs = {
      csrf: [],
      provider: [],
      performance: [],
      errors: []
    };
    
    page.on('console', msg => {
      const text = msg.text();
      
      if (text.includes('[CSRF]')) {
        debugLogs.csrf.push(text);
      } else if (text.includes('[PROVIDER')) {
        debugLogs.provider.push(text);
      } else if (text.includes('[PERF]')) {
        debugLogs.performance.push(text);
      } else if (msg.type() === 'error') {
        debugLogs.errors.push(text);
      }
    });
    
    // グローバル変数の確認
    await page.goto(CONFIG.baseURL, {
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout
    });
    
    // グローバル変数の検査
    const globalVars = await page.evaluate(() => {
      return {
        hasCsrfInitFlag: typeof window.__CSRF_INIT_IN_PROGRESS__ !== 'undefined',
        hasCsrfCache: typeof window.__CSRF_TOKEN_CACHE__ !== 'undefined',
        hasApiTracker: typeof window.__API_CALL_TRACKER__ !== 'undefined',
        hasCsrfMountCount: typeof window.__CSRF_MOUNT_COUNT__ !== 'undefined',
        mountCount: window.__CSRF_MOUNT_COUNT__ || 0
      };
    });
    
    console.log('デバッグログ収集:');
    console.log('  CSRF:', debugLogs.csrf.length);
    console.log('  Provider:', debugLogs.provider.length);
    console.log('  Performance:', debugLogs.performance.length);
    console.log('  Errors:', debugLogs.errors.length);
    
    console.log('グローバル変数:');
    console.log('  CSRFフラグ:', globalVars.hasCsrfInitFlag);
    console.log('  CSRFキャッシュ:', globalVars.hasCsrfCache);
    console.log('  APIトラッカー:', globalVars.hasApiTracker);
    console.log('  マウント回数:', globalVars.mountCount);
    
    // 期待値: デバッグ機能が正常に動作
    const testPassed = debugLogs.errors.length === 0 && 
                      globalVars.mountCount <= 2;
    
    return {
      testName: 'デバッグログとメトリクス検証',
      passed: testPassed,
      details: {
        debugLogs: {
          csrf: debugLogs.csrf.length,
          provider: debugLogs.provider.length,
          performance: debugLogs.performance.length,
          errors: debugLogs.errors.length
        },
        globalVars
      }
    };
  } catch (error) {
    return {
      testName: 'デバッグログとメトリクス検証',
      passed: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

/**
 * メイン実行関数
 */
async function runTests() {
  console.log('====================================');
  console.log('CSRF 429エラー包括テスト');
  console.log('====================================');
  console.log('認証情報:', CONFIG.auth.email);
  console.log('対象URL:', CONFIG.baseURL);
  console.log('タイムアウト:', CONFIG.timeout / 1000, '秒');
  console.log('');
  
  const results = [];
  
  // 各テストを実行
  results.push(await testInitialLoadWithoutErrors());
  results.push(await testProviderReinitializationAfterAuth());
  results.push(await testHighLoadScenario());
  results.push(await testDebugLogsAndMetrics());
  
  // メトリクスサマリー
  console.log('\n====================================');
  console.log('メトリクスサマリー');
  console.log('====================================');
  
  // APIコール集計
  const apiCallSummary = {};
  Object.entries(metrics.apiCalls).forEach(([endpoint, calls]) => {
    apiCallSummary[endpoint] = calls.length;
  });
  
  if (Object.keys(apiCallSummary).length > 0) {
    console.log('API呼び出し回数:');
    Object.entries(apiCallSummary)
      .sort((a, b) => b[1] - a[1])
      .forEach(([endpoint, count]) => {
        console.log(`  ${endpoint}: ${count}回`);
      });
  }
  
  // エラー集計
  if (metrics.errors.length > 0) {
    console.log('\nエラー:');
    const errorSummary = {};
    metrics.errors.forEach(error => {
      const key = error[0];
      errorSummary[key] = (errorSummary[key] || 0) + 1;
    });
    Object.entries(errorSummary).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}回`);
    });
  }
  
  // 結果サマリー
  console.log('\n====================================');
  console.log('テスト結果サマリー');
  console.log('====================================');
  
  let passedCount = 0;
  let failedCount = 0;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.testName}`);
    if (result.details) {
      console.log('  詳細:', JSON.stringify(result.details, null, 2));
    }
    if (result.error) {
      console.log('  エラー:', result.error);
    }
    
    if (result.passed) passedCount++;
    else failedCount++;
  });
  
  console.log('\n総合結果: PASS=' + passedCount + ', FAIL=' + failedCount);
  console.log('');
  
  // 最終判定
  const allPassed = failedCount === 0;
  if (allPassed) {
    console.log('🎉 全てのテストに合格しました！');
    console.log('429エラー対策が正常に機能しています。');
  } else {
    console.log('⚠️ 一部のテストが失敗しました。');
    console.log('429エラー対策の追加改善が必要です。');
  }
  
  return allPassed;
}

// 実行
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { runTests };