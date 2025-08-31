#!/usr/bin/env node
/**
 * CSRF 429エラー改善確認用 認証付きテスト
 * 
 * テスト内容:
 * 1. 認証なしでのアクセステスト
 * 2. 認証してセッション確立
 * 3. 認証済みでのアクセステスト
 * 4. API呼び出し回数とレート制限の確認
 * 5. デバッグログの収集
 */

const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const tough = require('tough-cookie');

// Cookie管理用のjar作成
const cookieJar = new tough.CookieJar();
const client = axiosCookieJarSupport(axios.create({
  baseURL: 'http://localhost:3000',
  jar: cookieJar,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Accept': 'application/json, text/html',
    'User-Agent': 'CSRF-Test-Client/1.0'
  }
}));

// 認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

// テスト結果格納用
const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  apiCallStats: {},
  errors: [],
  csrfTokens: [],
  sessionInfo: null
};

// APIコール統計
function trackApiCall(endpoint, status, duration) {
  if (!testResults.apiCallStats[endpoint]) {
    testResults.apiCallStats[endpoint] = {
      calls: 0,
      statuses: {},
      totalDuration: 0,
      averageDuration: 0
    };
  }
  
  const stats = testResults.apiCallStats[endpoint];
  stats.calls++;
  stats.statuses[status] = (stats.statuses[status] || 0) + 1;
  stats.totalDuration += duration;
  stats.averageDuration = stats.totalDuration / stats.calls;
}

// デバッグ情報を含む詳細ログ
function logDebug(message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
}

// テスト実行関数
async function runTest(name, testFn) {
  const startTime = Date.now();
  logDebug(`🧪 テスト開始: ${name}`);
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    testResults.tests.push({
      name,
      status: 'PASSED',
      duration,
      result
    });
    
    logDebug(`✅ テスト成功: ${name}`, { duration, result });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    testResults.tests.push({
      name,
      status: 'FAILED',
      duration,
      error: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      }
    });
    
    testResults.errors.push({
      test: name,
      error: error.message,
      response: error.response?.data
    });
    
    logDebug(`❌ テスト失敗: ${name}`, {
      duration,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    throw error;
  }
}

// 1. 認証なしでのアクセステスト
async function testWithoutAuth() {
  logDebug('認証なしでのアクセステスト開始');
  
  const endpoints = [
    { path: '/', name: 'Home Page' },
    { path: '/api/csrf', name: 'CSRF Token' },
    { path: '/api/auth/session', name: 'Session Check' },
    { path: '/api/performance', name: 'Performance Metrics' }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    try {
      const response = await client.get(endpoint.path);
      const duration = Date.now() - startTime;
      
      trackApiCall(endpoint.path, response.status, duration);
      
      results[endpoint.name] = {
        status: response.status,
        duration,
        hasToken: !!response.data?.token,
        data: endpoint.path === '/api/csrf' ? response.data : 'OK'
      };
      
      // CSRFトークンを記録
      if (response.data?.token) {
        testResults.csrfTokens.push({
          token: response.data.token,
          timestamp: new Date().toISOString(),
          authenticated: false
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      trackApiCall(endpoint.path, error.response?.status || 0, duration);
      
      results[endpoint.name] = {
        status: error.response?.status || 'ERROR',
        duration,
        error: error.message
      };
    }
  }
  
  return results;
}

// 2. 認証処理
async function authenticate() {
  logDebug('認証処理開始', { email: AUTH_CREDENTIALS.email });
  
  try {
    // CSRFトークン取得
    logDebug('CSRFトークン取得中...');
    const csrfResponse = await client.get('/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    logDebug('CSRFトークン取得成功', { token: csrfToken?.substring(0, 20) + '...' });
    
    // ログインリクエスト
    logDebug('ログインリクエスト送信中...');
    const loginResponse = await client.post('/api/auth/callback/credentials', null, {
      params: {
        ...AUTH_CREDENTIALS,
        csrfToken
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });
    
    logDebug('ログインレスポンス受信', {
      status: loginResponse.status,
      headers: loginResponse.headers,
      hasSetCookie: !!loginResponse.headers['set-cookie']
    });
    
    // セッション確認
    logDebug('セッション確認中...');
    const sessionResponse = await client.get('/api/auth/session');
    testResults.sessionInfo = sessionResponse.data;
    
    logDebug('認証成功', {
      user: sessionResponse.data?.user?.email,
      expires: sessionResponse.data?.expires
    });
    
    return {
      success: true,
      session: sessionResponse.data,
      csrfToken
    };
  } catch (error) {
    logDebug('認証失敗', {
      error: error.message,
      response: error.response?.data
    });
    throw error;
  }
}

// 3. 認証済みでのアクセステスト
async function testWithAuth() {
  logDebug('認証済みでのアクセステスト開始');
  
  const endpoints = [
    { path: '/', name: 'Home Page (Auth)' },
    { path: '/api/csrf', name: 'CSRF Token (Auth)' },
    { path: '/api/auth/session', name: 'Session Check (Auth)' },
    { path: '/api/performance', name: 'Performance Metrics (Auth)' },
    { path: '/api/posts', name: 'Posts API (Auth)' }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    try {
      const response = await client.get(endpoint.path);
      const duration = Date.now() - startTime;
      
      trackApiCall(endpoint.path, response.status, duration);
      
      results[endpoint.name] = {
        status: response.status,
        duration,
        hasData: !!response.data,
        dataType: typeof response.data
      };
      
      // CSRFトークンを記録
      if (response.data?.token) {
        testResults.csrfTokens.push({
          token: response.data.token,
          timestamp: new Date().toISOString(),
          authenticated: true
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      trackApiCall(endpoint.path, error.response?.status || 0, duration);
      
      results[endpoint.name] = {
        status: error.response?.status || 'ERROR',
        duration,
        error: error.message,
        data: error.response?.data
      };
    }
  }
  
  return results;
}

// 4. レート制限テスト
async function testRateLimit() {
  logDebug('レート制限テスト開始');
  
  const results = {
    csrfEndpoint: { total: 0, success: 0, rateLimited: 0 },
    sessionEndpoint: { total: 0, success: 0, rateLimited: 0 },
    performanceEndpoint: { total: 0, success: 0, rateLimited: 0 }
  };
  
  // 各エンドポイントに10回連続リクエスト
  const endpoints = [
    { path: '/api/csrf', key: 'csrfEndpoint' },
    { path: '/api/auth/session', key: 'sessionEndpoint' },
    { path: '/api/performance', key: 'performanceEndpoint' }
  ];
  
  for (const endpoint of endpoints) {
    logDebug(`${endpoint.path} への連続リクエストテスト`);
    
    for (let i = 0; i < 10; i++) {
      results[endpoint.key].total++;
      
      try {
        const response = await client.get(endpoint.path);
        if (response.status === 200) {
          results[endpoint.key].success++;
        }
      } catch (error) {
        if (error.response?.status === 429) {
          results[endpoint.key].rateLimited++;
          logDebug(`Rate limited on request ${i + 1}`, {
            endpoint: endpoint.path,
            retryAfter: error.response.headers['retry-after']
          });
        }
      }
      
      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// 5. デバッグ情報収集
async function collectDebugInfo() {
  logDebug('デバッグ情報収集開始');
  
  try {
    // ブラウザコンテキストのシミュレーション
    const response = await client.get('/', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    // HTML内のスクリプトタグからデバッグ情報を抽出（簡易的）
    const html = response.data;
    const debugInfo = {
      responseSize: html.length,
      hasCSRFMeta: html.includes('csrf-token'),
      hasSessionProvider: html.includes('SessionProvider'),
      hasCSRFProvider: html.includes('CSRFProvider')
    };
    
    return debugInfo;
  } catch (error) {
    return {
      error: error.message
    };
  }
}

// メインテスト実行
async function main() {
  console.log('=' .repeat(80));
  console.log('CSRF 429エラー改善確認テスト（認証付き）');
  console.log('=' .repeat(80));
  console.log('');
  
  try {
    // 1. 認証なしテスト
    console.log('📋 Phase 1: 認証なしでのアクセステスト');
    console.log('-'.repeat(40));
    const withoutAuthResults = await runTest('認証なしアクセス', testWithoutAuth);
    console.log('');
    
    // 2. 認証処理
    console.log('🔐 Phase 2: 認証処理');
    console.log('-'.repeat(40));
    const authResult = await runTest('認証', authenticate);
    console.log('');
    
    // 3. 認証済みテスト
    console.log('✅ Phase 3: 認証済みでのアクセステスト');
    console.log('-'.repeat(40));
    const withAuthResults = await runTest('認証済みアクセス', testWithAuth);
    console.log('');
    
    // 4. レート制限テスト
    console.log('🚦 Phase 4: レート制限テスト');
    console.log('-'.repeat(40));
    const rateLimitResults = await runTest('レート制限', testRateLimit);
    console.log('');
    
    // 5. デバッグ情報収集
    console.log('🔍 Phase 5: デバッグ情報収集');
    console.log('-'.repeat(40));
    const debugInfo = await runTest('デバッグ情報', collectDebugInfo);
    console.log('');
    
  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error);
  }
  
  // 結果サマリー
  console.log('=' .repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('=' .repeat(80));
  
  // API呼び出し統計
  console.log('\n📈 API呼び出し統計:');
  console.table(
    Object.entries(testResults.apiCallStats).map(([endpoint, stats]) => ({
      Endpoint: endpoint,
      'Total Calls': stats.calls,
      '200 OK': stats.statuses[200] || 0,
      '429 Error': stats.statuses[429] || 0,
      'Other Errors': Object.entries(stats.statuses)
        .filter(([status]) => status !== '200' && status !== '429')
        .reduce((sum, [, count]) => sum + count, 0),
      'Avg Duration (ms)': Math.round(stats.averageDuration)
    }))
  );
  
  // テスト結果
  console.log('\n🧪 テスト結果:');
  const passedTests = testResults.tests.filter(t => t.status === 'PASSED').length;
  const failedTests = testResults.tests.filter(t => t.status === 'FAILED').length;
  console.log(`  ✅ 成功: ${passedTests}`);
  console.log(`  ❌ 失敗: ${failedTests}`);
  console.log(`  📊 合計: ${testResults.tests.length}`);
  
  // 429エラー分析
  const total429Errors = Object.values(testResults.apiCallStats)
    .reduce((sum, stats) => sum + (stats.statuses[429] || 0), 0);
  
  console.log('\n⚠️  429エラー分析:');
  console.log(`  総429エラー数: ${total429Errors}`);
  
  if (total429Errors > 0) {
    console.log('  影響を受けたエンドポイント:');
    Object.entries(testResults.apiCallStats).forEach(([endpoint, stats]) => {
      if (stats.statuses[429]) {
        console.log(`    - ${endpoint}: ${stats.statuses[429]}回`);
      }
    });
  } else {
    console.log('  🎉 429エラーは発生しませんでした！');
  }
  
  // セッション情報
  if (testResults.sessionInfo) {
    console.log('\n👤 セッション情報:');
    console.log(`  ユーザー: ${testResults.sessionInfo.user?.email || 'N/A'}`);
    console.log(`  有効期限: ${testResults.sessionInfo.expires || 'N/A'}`);
  }
  
  // CSRFトークン情報
  console.log('\n🔑 CSRFトークン:');
  console.log(`  取得成功: ${testResults.csrfTokens.length}回`);
  console.log(`  認証前: ${testResults.csrfTokens.filter(t => !t.authenticated).length}回`);
  console.log(`  認証後: ${testResults.csrfTokens.filter(t => t.authenticated).length}回`);
  
  // 最終判定
  console.log('\n' + '=' .repeat(80));
  console.log('🏁 最終判定:');
  console.log('=' .repeat(80));
  
  const success = total429Errors === 0 && failedTests === 0;
  if (success) {
    console.log('✅ すべてのテストが成功しました！');
    console.log('✅ 429エラーは解決されています！');
  } else {
    console.log('❌ 問題が残っています:');
    if (total429Errors > 0) {
      console.log(`  - 429エラーが${total429Errors}回発生`);
    }
    if (failedTests > 0) {
      console.log(`  - ${failedTests}個のテストが失敗`);
    }
  }
  
  // JSON形式で結果を保存
  const fs = require('fs');
  const resultFile = `test-results-${Date.now()}.json`;
  fs.writeFileSync(resultFile, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 詳細な結果は ${resultFile} に保存されました`);
  
  process.exit(success ? 0 : 1);
}

// 実行
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});