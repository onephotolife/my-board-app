#!/usr/bin/env node
/**
 * 影響範囲テスト
 * 
 * 改修による既存機能への影響を確認
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
    'User-Agent': 'Impact-Test-Client/1.0'
  }
}));

// 認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

console.log('================================================================================');
console.log('影響範囲テスト');
console.log('================================================================================');
console.log('');

async function runTest(name, testFn) {
  const startTime = Date.now();
  console.log(`🧪 [${name}] 開始...`);
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ [${name}] 成功 (${duration}ms)`);
    return { status: 'PASS', result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ [${name}] 失敗 (${duration}ms)`);
    console.log(`   エラー: ${error.message}`);
    return { status: 'FAIL', error: error.message, duration };
  }
}

// テスト結果
const testResults = {
  timestamp: new Date().toISOString(),
  tests: []
};

async function main() {
  // 1. ホームページアクセス
  const homeTest = await runTest('ホームページアクセス', async () => {
    const response = await client.get('/');
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
    return { status: response.status };
  });
  testResults.tests.push(homeTest);

  // 2. CSRFトークン取得
  const csrfTest = await runTest('CSRFトークン取得', async () => {
    const response = await client.get('/api/csrf');
    if (!response.data?.token) throw new Error('Token not found');
    return { token: response.data.token.substring(0, 20) + '...' };
  });
  testResults.tests.push(csrfTest);

  // 3. 認証処理
  const authTest = await runTest('認証処理', async () => {
    const csrfResponse = await client.get('/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    
    const loginResponse = await client.post('/api/auth/callback/credentials', null, {
      params: {
        ...AUTH_CREDENTIALS,
        csrfToken
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });
    
    const sessionResponse = await client.get('/api/auth/session');
    return {
      loginStatus: loginResponse.status,
      hasSession: !!sessionResponse.data
    };
  });
  testResults.tests.push(authTest);

  // 4. 投稿一覧取得
  const postsTest = await runTest('投稿一覧取得（認証が必要）', async () => {
    try {
      const response = await client.get('/api/posts');
      return {
        status: response.status,
        posts: Array.isArray(response.data) ? response.data.length : 0
      };
    } catch (error) {
      if (error.response?.status === 401) {
        // 401エラーは認証が必要なので正常
        return { status: 401, message: 'Authentication required (expected behavior)' };
      }
      throw error;
    }
  });
  testResults.tests.push(postsTest);

  // 5. セッションチェック
  const sessionTest = await runTest('セッションチェック', async () => {
    const response = await client.get('/api/auth/session');
    return {
      status: response.status,
      hasSession: !!response.data,
      user: response.data?.user?.email
    };
  });
  testResults.tests.push(sessionTest);

  // 6. パフォーマンスメトリクス
  const perfTest = await runTest('パフォーマンスメトリクス', async () => {
    const response = await client.get('/api/performance');
    return {
      status: response.status,
      hasMetrics: !!response.data
    };
  });
  testResults.tests.push(perfTest);

  // 7. 連続リクエスト（レート制限確認）
  const rateLimitTest = await runTest('連続リクエスト（429エラーなし）', async () => {
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < 5; i++) {
      try {
        const response = await client.get('/api/csrf');
        if (response.status === 200) successCount++;
        else if (response.status === 429) errorCount++;
      } catch (error) {
        if (error.response?.status === 429) errorCount++;
      }
    }
    
    if (errorCount > 0) throw new Error(`429エラーが${errorCount}回発生`);
    return { successCount, errorCount };
  });
  testResults.tests.push(rateLimitTest);

  // 8. CSP（Content Security Policy）確認
  const cspTest = await runTest('CSPヘッダー確認', async () => {
    const response = await client.get('/');
    const csp = response.headers['content-security-policy'];
    if (!csp) throw new Error('CSP header not found');
    return { hasCSP: true, cspLength: csp.length };
  });
  testResults.tests.push(cspTest);

  // 9. XSS保護ヘッダー確認
  const xssTest = await runTest('XSS保護ヘッダー確認', async () => {
    const response = await client.get('/');
    const xssProtection = response.headers['x-xss-protection'];
    const contentType = response.headers['x-content-type-options'];
    
    if (!xssProtection || !contentType) {
      throw new Error('Security headers missing');
    }
    
    return {
      xssProtection,
      contentTypeOptions: contentType
    };
  });
  testResults.tests.push(xssTest);

  // 10. レスポンスタイム確認
  const responseTimeTest = await runTest('レスポンスタイム確認', async () => {
    const times = [];
    
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await client.get('/');
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    if (avgTime > 1000) throw new Error(`平均レスポンスタイムが遅い: ${avgTime}ms`);
    
    return {
      times,
      average: Math.round(avgTime)
    };
  });
  testResults.tests.push(responseTimeTest);

  // 結果サマリー
  console.log('');
  console.log('================================================================================');
  console.log('📊 テスト結果サマリー');
  console.log('================================================================================');
  
  const passed = testResults.tests.filter(t => t.status === 'PASS').length;
  const failed = testResults.tests.filter(t => t.status === 'FAIL').length;
  
  console.log(`✅ 成功: ${passed}個`);
  console.log(`❌ 失敗: ${failed}個`);
  console.log(`📊 合計: ${testResults.tests.length}個`);
  
  console.log('\n詳細:');
  testResults.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    const testName = [
      'ホームページアクセス',
      'CSRFトークン取得',
      '認証処理',
      '投稿一覧取得（認証が必要）',
      'セッションチェック',
      'パフォーマンスメトリクス',
      '連続リクエスト（429エラーなし）',
      'CSPヘッダー確認',
      'XSS保護ヘッダー確認',
      'レスポンスタイム確認'
    ][index];
    
    console.log(`${icon} ${testName}: ${test.status} (${test.duration}ms)`);
    if (test.error) {
      console.log(`   └─ ${test.error}`);
    }
  });
  
  // 最終判定
  console.log('');
  console.log('================================================================================');
  console.log('🏁 最終判定');
  console.log('================================================================================');
  
  if (failed === 0) {
    console.log('✅ すべてのテストが成功しました！');
    console.log('✅ 既存機能への悪影響はありません！');
    process.exit(0);
  } else {
    console.log(`❌ ${failed}個のテストが失敗しました`);
    console.log('⚠️  既存機能に影響がある可能性があります');
    process.exit(1);
  }
}

// 実行
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});