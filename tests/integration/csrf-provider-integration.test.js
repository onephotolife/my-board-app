/**
 * CSRFProvider結合テスト（認証付き）
 * Provider階層とCSRF保護の統合動作を確認
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
  timeout: 30000
};

// デバッグログ設定
const DEBUG = true;
const log = (message, data = null) => {
  if (DEBUG) {
    console.log(`[DEBUG ${new Date().toISOString()}] ${message}`, data || '');
  }
};

/**
 * Playwright認証ヘルパー
 */
async function authenticateWithPlaywright(page) {
  try {
    log('Playwright認証開始');
    
    // サインインページへ
    await page.goto(`${CONFIG.baseURL}/auth/signin`, { 
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout 
    });
    
    // 認証フォーム入力
    await page.fill('input[name="email"]', CONFIG.auth.email);
    await page.fill('input[name="password"]', CONFIG.auth.password);
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    
    // ダッシュボードまたはホームページへのリダイレクトを待つ
    await page.waitForURL(url => {
      return url.includes('/dashboard') || url === CONFIG.baseURL + '/';
    }, { timeout: CONFIG.timeout });
    
    log('Playwright認証成功');
    return true;
  } catch (error) {
    log('Playwright認証失敗', error.message);
    return false;
  }
}

/**
 * テスト1: Provider初期化時のCSRFトークン取得
 */
async function testProviderInitialization() {
  console.log('\n=== テスト1: Provider初期化時のCSRFトークン取得 ===');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // ネットワークリクエストを監視
    const csrfRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/csrf')) {
        csrfRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
        log('CSRFリクエスト検出', request.url());
      }
    });
    
    // ページ読み込み
    await page.goto(CONFIG.baseURL, { 
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout 
    });
    
    // CSRFトークンがメタタグに設定されているか確認
    const metaToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="app-csrf-token"]');
      return meta ? meta.getAttribute('content') : null;
    });
    
    // コンソールログを取得
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('CSRF')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // 結果分析
    const testPassed = csrfRequests.length <= 2 && metaToken !== null;
    
    return {
      testName: 'Provider初期化時のCSRFトークン取得',
      passed: testPassed,
      details: {
        csrfRequestCount: csrfRequests.length,
        hasMetaToken: !!metaToken,
        consoleLogs: consoleLogs.length
      }
    };
  } catch (error) {
    return {
      testName: 'Provider初期化時のCSRFトークン取得',
      passed: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

/**
 * テスト2: 認証済みセッションでのProvider動作
 */
async function testAuthenticatedProviderBehavior() {
  console.log('\n=== テスト2: 認証済みセッションでのProvider動作 ===');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // APIリクエストを監視
    const apiRequests = {
      csrf: [],
      session: [],
      performance: []
    };
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/csrf')) {
        apiRequests.csrf.push(Date.now());
      } else if (url.includes('/api/auth/session')) {
        apiRequests.session.push(Date.now());
      } else if (url.includes('/api/performance')) {
        apiRequests.performance.push(Date.now());
      }
    });
    
    // 認証実行
    const authSuccess = await authenticateWithPlaywright(page);
    if (!authSuccess) {
      throw new Error('認証に失敗しました');
    }
    
    // ページリロードしてProvider再初期化を確認
    await page.reload({ waitUntil: 'networkidle' });
    
    // 1秒待機
    await page.waitForTimeout(1000);
    
    // 結果分析
    const totalRequests = apiRequests.csrf.length + 
                         apiRequests.session.length + 
                         apiRequests.performance.length;
    
    console.log('APIリクエスト数:');
    console.log('  CSRF:', apiRequests.csrf.length);
    console.log('  Session:', apiRequests.session.length);
    console.log('  Performance:', apiRequests.performance.length);
    
    // 期待値: 認証済みの場合、リクエスト数が最小限
    const testPassed = totalRequests < 10;
    
    return {
      testName: '認証済みセッションでのProvider動作',
      passed: testPassed,
      details: {
        csrfRequests: apiRequests.csrf.length,
        sessionRequests: apiRequests.session.length,
        performanceRequests: apiRequests.performance.length,
        totalRequests
      }
    };
  } catch (error) {
    return {
      testName: '認証済みセッションでのProvider動作',
      passed: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

/**
 * テスト3: レート制限とCSRFProvider統合
 */
async function testRateLimitIntegration() {
  console.log('\n=== テスト3: レート制限とCSRFProvider統合 ===');
  
  try {
    // 認証取得
    const authResponse = await axios.post(
      `${CONFIG.baseURL}/api/auth/callback/credentials`,
      {
        email: CONFIG.auth.email,
        password: CONFIG.auth.password
      },
      {
        withCredentials: true,
        validateStatus: () => true
      }
    );
    
    const cookies = authResponse.headers['set-cookie'];
    
    // 短時間で複数のAPI呼び出し
    const requests = [];
    const endpoints = ['/api/csrf', '/api/auth/session', '/api/performance'];
    
    for (let i = 0; i < 15; i++) {
      const endpoint = endpoints[i % endpoints.length];
      requests.push(
        axios.get(`${CONFIG.baseURL}${endpoint}`, {
          headers: cookies ? { 'Cookie': cookies.join('; ') } : {},
          withCredentials: true,
          validateStatus: () => true
        }).then(res => ({
          endpoint,
          status: res.status,
          index: i
        }))
      );
    }
    
    const results = await Promise.all(requests);
    
    // 429エラーの検出
    const rateLimited = results.filter(r => r.status === 429);
    const successful = results.filter(r => r.status === 200);
    
    console.log('成功リクエスト:', successful.length);
    console.log('レート制限エラー:', rateLimited.length);
    
    // エンドポイント別の集計
    const byEndpoint = {};
    endpoints.forEach(ep => {
      byEndpoint[ep] = {
        success: results.filter(r => r.endpoint === ep && r.status === 200).length,
        limited: results.filter(r => r.endpoint === ep && r.status === 429).length
      };
    });
    
    console.log('エンドポイント別:', byEndpoint);
    
    // 期待値: レート制限が適切に機能
    const testPassed = rateLimited.length === 0 || 
                      (rateLimited.length > 0 && rateLimited.length < 10);
    
    return {
      testName: 'レート制限とCSRFProvider統合',
      passed: testPassed,
      details: {
        successful: successful.length,
        rateLimited: rateLimited.length,
        byEndpoint
      }
    };
  } catch (error) {
    return {
      testName: 'レート制限とCSRFProvider統合',
      passed: false,
      error: error.message
    };
  }
}

/**
 * テスト4: StrictModeでの二重初期化確認
 */
async function testStrictModeDoubleInitialization() {
  console.log('\n=== テスト4: StrictModeでの二重初期化確認 ===');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // コンソールログを収集
    const mountLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Provider mount') || text.includes('CSRF')) {
        mountLogs.push({
          text,
          timestamp: Date.now()
        });
      }
    });
    
    // CSRFリクエストを監視
    const csrfRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/csrf')) {
        csrfRequests.push(Date.now());
      }
    });
    
    // ページ読み込み
    await page.goto(CONFIG.baseURL, { 
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout 
    });
    
    // 2秒待機
    await page.waitForTimeout(2000);
    
    // 結果分析
    console.log('マウントログ数:', mountLogs.length);
    console.log('CSRFリクエスト数:', csrfRequests.length);
    
    // 期待値: StrictModeでも過剰なリクエストが発生しない
    const testPassed = csrfRequests.length <= 2;
    
    return {
      testName: 'StrictModeでの二重初期化確認',
      passed: testPassed,
      details: {
        mountLogs: mountLogs.length,
        csrfRequests: csrfRequests.length,
        isDoubleMount: mountLogs.length > 1
      }
    };
  } catch (error) {
    return {
      testName: 'StrictModeでの二重初期化確認',
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
  console.log('CSRFProvider結合テスト');
  console.log('====================================');
  console.log('認証情報:', CONFIG.auth.email);
  console.log('対象URL:', CONFIG.baseURL);
  console.log('');
  
  const results = [];
  
  // 各テストを実行
  results.push(await testProviderInitialization());
  results.push(await testAuthenticatedProviderBehavior());
  results.push(await testRateLimitIntegration());
  results.push(await testStrictModeDoubleInitialization());
  
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
  
  console.log('\n合計: PASS=' + passedCount + ', FAIL=' + failedCount);
  
  // 全体の成功/失敗を返す
  return failedCount === 0;
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