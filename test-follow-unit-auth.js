/**
 * フォローAPI 単体テスト（認証付き）
 * 
 * STRICT120 AUTH_ENFORCED_TESTING_GUARD 準拠
 * 各APIメソッド（GET, POST, DELETE）を個別にテスト
 * 
 * 必須認証情報:
 * - Email: one.photolife+1@gmail.com  
 * - Password: ?@thc123THC@?
 */

const https = require('https');
const http = require('http');

// ========================================
// 設定
// ========================================
const BASE_URL = 'http://localhost:3000';
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

// テストデータ
const TEST_DATA = {
  VALID_OBJECT_IDS: [
    '507f1f77bcf86cd799439011',
    '68b00bb9e2d2d61e174b2204',
    'aaaaaaaaaaaaaaaaaaaaaaaa'
  ],
  INVALID_OBJECT_IDS: [
    '123',                      // 短すぎる
    '68b00b3',                  // 7文字
    'invalid-id-format',        // 無効文字
    'GGGGGG00000000000000000',  // 非16進数
    '',                         // 空文字列
    'xxxxxxxxxxxxxxxxxxxxxxxx'  // 24文字だが16進数ではない
  ],
  NON_EXISTENT_VALID_ID: '68b00b35e2d2d61e174b2157'
};

// ========================================
// ユーティリティ関数
// ========================================
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? (data.startsWith('{') || data.startsWith('[') ? JSON.parse(data) : data) : null
        });
      });
    });

    req.on('error', reject);
    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(payload);
    }
    req.end();
  });
}

// 認証ヘルパー関数群
async function getCsrfToken() {
  const response = await makeRequest('GET', '/api/auth/csrf');
  return response.body?.csrfToken;
}

async function authenticate(csrfToken) {
  const authPayload = {
    email: AUTH_CREDENTIALS.email,
    password: AUTH_CREDENTIALS.password,
    csrfToken: csrfToken,
    callbackUrl: BASE_URL,
    redirect: false
  };

  const response = await makeRequest('POST', '/api/auth/signin/credentials', {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || ''
  }, authPayload);
  
  const cookies = response.headers['set-cookie'];
  if (cookies) {
    const sessionCookie = cookies.find(c => 
      c.includes('next-auth.session-token') || 
      c.includes('__Secure-next-auth.session-token') ||
      c.includes('authjs.session-token')
    );
    if (sessionCookie) {
      return sessionCookie.split(';')[0];
    }
  }
  return null;
}

async function verifySession(sessionToken) {
  const response = await makeRequest('GET', '/api/auth/session', {
    'Cookie': sessionToken || ''
  });
  return response.body?.user ? response.body : null;
}

// ========================================
// 単体テスト関数群
// ========================================

// GET /api/users/[userId]/follow 単体テスト
async function testGetFollowStatus(sessionToken) {
  console.log('\n[UNIT TEST] GET /api/users/[userId]/follow');
  const results = [];

  // テスト1: 有効なObjectID形式での正常系/異常系
  console.log('\n  Test 1.1: 有効ObjectID形式 - 存在しないユーザー');
  const userId = TEST_DATA.NON_EXISTENT_VALID_ID;
  
  try {
    const response = await makeRequest('GET', `/api/users/${userId}/follow`, {
      'Cookie': sessionToken
    });
    
    console.log(`    Status: ${response.status}`);
    console.log(`    Body:`, response.body);
    
    const expected = {
      status: 404,
      errorCode: 'USER_NOT_FOUND',
      errorMessage: 'ターゲットユーザーが見つかりません'
    };
    
    const actual = {
      status: response.status,
      errorCode: response.body?.code,
      errorMessage: response.body?.error
    };
    
    const passed = actual.status === expected.status && 
                   actual.errorCode === expected.errorCode;
    
    results.push({
      test: 'GET valid ObjectID - non-existent user',
      expected,
      actual,
      passed,
      userId
    });
    
    console.log(`    Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.log(`    ❌ Exception: ${error.message}`);
    results.push({
      test: 'GET valid ObjectID - non-existent user',
      error: error.message,
      passed: false,
      userId
    });
  }

  // テスト1.2: 無効なObjectID形式
  for (const invalidId of TEST_DATA.INVALID_OBJECT_IDS) {
    console.log(`\n  Test 1.2: 無効ObjectID "${invalidId}" (長さ:${invalidId.length})`);
    
    try {
      const response = await makeRequest('GET', `/api/users/${invalidId}/follow`, {
        'Cookie': sessionToken
      });
      
      console.log(`    Status: ${response.status}`);
      console.log(`    Body:`, response.body);
      
      const expected = {
        status: 400,
        errorCode: 'INVALID_OBJECT_ID_FORMAT'
      };
      
      const actual = {
        status: response.status,
        errorCode: response.body?.code
      };
      
      const passed = actual.status === expected.status && 
                     actual.errorCode === expected.errorCode;
      
      results.push({
        test: `GET invalid ObjectID - ${invalidId}`,
        expected,
        actual,
        passed,
        invalidId
      });
      
      console.log(`    Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
      
    } catch (error) {
      console.log(`    ❌ Exception: ${error.message}`);
      results.push({
        test: `GET invalid ObjectID - ${invalidId}`,
        error: error.message,
        passed: false,
        invalidId
      });
    }
  }

  return results;
}

// POST /api/users/[userId]/follow 単体テスト
async function testPostFollow(sessionToken, csrfToken) {
  console.log('\n[UNIT TEST] POST /api/users/[userId]/follow');
  const results = [];

  // テスト2.1: 存在しないユーザーへのフォロー試行
  console.log('\n  Test 2.1: 存在しないユーザーへのフォロー');
  const userId = TEST_DATA.NON_EXISTENT_VALID_ID;
  
  try {
    const response = await makeRequest('POST', `/api/users/${userId}/follow`, {
      'Cookie': sessionToken,
      'x-csrf-token': csrfToken
    });
    
    console.log(`    Status: ${response.status}`);
    console.log(`    Body:`, response.body);
    
    const expected = {
      status: 404,
      errorCode: 'USER_NOT_FOUND'
    };
    
    const actual = {
      status: response.status,
      errorCode: response.body?.code
    };
    
    const passed = actual.status === expected.status && 
                   actual.errorCode === expected.errorCode;
    
    results.push({
      test: 'POST follow non-existent user',
      expected,
      actual,
      passed,
      userId
    });
    
    console.log(`    Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.log(`    ❌ Exception: ${error.message}`);
    results.push({
      test: 'POST follow non-existent user',
      error: error.message,
      passed: false,
      userId
    });
  }

  // テスト2.2: 無効ObjectID
  const invalidId = TEST_DATA.INVALID_OBJECT_IDS[1]; // '68b00b3'
  console.log(`\n  Test 2.2: 無効ObjectID "${invalidId}"`);
  
  try {
    const response = await makeRequest('POST', `/api/users/${invalidId}/follow`, {
      'Cookie': sessionToken,
      'x-csrf-token': csrfToken
    });
    
    const expected = { status: 400, errorCode: 'INVALID_OBJECT_ID_FORMAT' };
    const actual = { status: response.status, errorCode: response.body?.code };
    const passed = actual.status === expected.status && actual.errorCode === expected.errorCode;
    
    results.push({
      test: 'POST follow invalid ObjectID',
      expected,
      actual,
      passed,
      invalidId
    });
    
    console.log(`    Status: ${response.status}`);
    console.log(`    Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    results.push({
      test: 'POST follow invalid ObjectID',
      error: error.message,
      passed: false,
      invalidId
    });
  }

  return results;
}

// DELETE /api/users/[userId]/follow 単体テスト
async function testDeleteFollow(sessionToken, csrfToken) {
  console.log('\n[UNIT TEST] DELETE /api/users/[userId]/follow');
  const results = [];

  // テスト3.1: 存在しないユーザーのアンフォロー
  const userId = TEST_DATA.NON_EXISTENT_VALID_ID;
  console.log(`\n  Test 3.1: 存在しないユーザーのアンフォロー "${userId}"`);
  
  try {
    const response = await makeRequest('DELETE', `/api/users/${userId}/follow`, {
      'Cookie': sessionToken,
      'x-csrf-token': csrfToken
    });
    
    console.log(`    Status: ${response.status}`);
    console.log(`    Body:`, response.body);
    
    // アンフォローの場合、ユーザーが存在しないか、フォローしていない場合は400になる可能性がある
    const validStatuses = [400, 404];
    const passed = validStatuses.includes(response.status);
    
    results.push({
      test: 'DELETE unfollow non-existent user',
      expected: { status: 'one of [400, 404]' },
      actual: { status: response.status, body: response.body },
      passed,
      userId
    });
    
    console.log(`    Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    results.push({
      test: 'DELETE unfollow non-existent user',
      error: error.message,
      passed: false,
      userId
    });
  }

  return results;
}

// 認証関連の単体テスト
async function testAuthenticationRequirement() {
  console.log('\n[UNIT TEST] 認証要件テスト');
  const results = [];

  const testUserId = TEST_DATA.VALID_OBJECT_IDS[0];

  // 未認証でのアクセステスト
  const endpoints = [
    { method: 'GET', path: `/api/users/${testUserId}/follow` },
    { method: 'POST', path: `/api/users/${testUserId}/follow` },
    { method: 'DELETE', path: `/api/users/${testUserId}/follow` }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n  Test: 未認証 ${endpoint.method} ${endpoint.path}`);
    
    try {
      const response = await makeRequest(endpoint.method, endpoint.path);
      
      console.log(`    Status: ${response.status}`);
      
      const expected = { status: 401 };
      const actual = { status: response.status };
      const passed = actual.status === expected.status;
      
      results.push({
        test: `Unauthenticated ${endpoint.method}`,
        expected,
        actual,
        passed,
        endpoint: endpoint.path
      });
      
      console.log(`    Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
      
    } catch (error) {
      results.push({
        test: `Unauthenticated ${endpoint.method}`,
        error: error.message,
        passed: false,
        endpoint: endpoint.path
      });
    }
  }

  return results;
}

// メイン実行
async function main() {
  console.log('========================================');
  console.log('フォローAPI単体テスト');
  console.log('AUTH_ENFORCED_TESTING_GUARD準拠');
  console.log('========================================');
  console.log(`開始時刻: ${new Date().toISOString()}`);
  
  const allResults = [];
  let sessionToken = null;
  let csrfToken = null;
  
  try {
    // 認証セットアップ
    console.log('\n[AUTH SETUP] 認証処理実行中...');
    csrfToken = await getCsrfToken();
    sessionToken = await authenticate(csrfToken);
    
    if (!sessionToken) {
      throw new Error('Authentication failed');
    }
    
    const session = await verifySession(sessionToken);
    if (!session?.user) {
      throw new Error('Session verification failed');
    }
    
    console.log(`✅ 認証成功: ${session.user.email}`);

    // 単体テスト実行
    console.log('\n========================================');
    console.log('単体テスト実行開始');
    console.log('========================================');

    // 認証要件テスト
    const authResults = await testAuthenticationRequirement();
    allResults.push(...authResults);

    // GET APIテスト
    const getResults = await testGetFollowStatus(sessionToken);
    allResults.push(...getResults);

    // POST APIテスト
    const postResults = await testPostFollow(sessionToken, csrfToken);
    allResults.push(...postResults);

    // DELETE APIテスト
    const deleteResults = await testDeleteFollow(sessionToken, csrfToken);
    allResults.push(...deleteResults);

    // 結果集計
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;
    const total = allResults.length;

    console.log('\n========================================');
    console.log('単体テスト結果サマリー');
    console.log('========================================');
    console.log(`📊 総テスト数: ${total}`);
    console.log(`✅ 成功: ${passed}`);
    console.log(`❌ 失敗: ${failed}`);
    console.log(`📈 成功率: ${(passed / total * 100).toFixed(1)}%`);

    // 証拠ブロック
    console.log('\n[証拠ブロック - 単体テスト]');
    console.log(`認証状態: OK (${session.user.email})`);
    console.log(`実行時刻: ${new Date().toISOString()}`);
    console.log('テスト詳細:');
    allResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.test}: ${result.passed ? 'PASS' : 'FAIL'}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });
    
    console.log('I attest: all numbers come from the attached evidence.');

  } catch (error) {
    console.error('\n❌ 単体テスト実行失敗:', error.message);
    
    console.log('\n[UNEXECUTED (AUTH REQUIRED)]');
    console.log('認証失敗により以下の単体テストが未実行:');
    console.log('- GET /api/users/[userId]/follow エラーハンドリング');
    console.log('- POST /api/users/[userId]/follow エラーハンドリング'); 
    console.log('- DELETE /api/users/[userId]/follow エラーハンドリング');
    console.log('- 認証要件の検証');
    
    process.exit(1);
  }
}

main().catch(console.error);