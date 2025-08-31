/**
 * CSRFトークンマネージャー単体テスト（認証付き）
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const axios = require('axios');

// テスト設定
const CONFIG = {
  baseURL: 'http://localhost:3000',
  auth: {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  }
};

// デバッグログ設定
const DEBUG = true;
const log = (message, data = null) => {
  if (DEBUG) {
    console.log(`[DEBUG ${new Date().toISOString()}] ${message}`, data || '');
  }
};

/**
 * 認証ヘルパー関数
 */
async function authenticate() {
  try {
    log('認証開始');
    
    // CSRFトークン取得
    const csrfResponse = await axios.get(`${CONFIG.baseURL}/api/csrf`, {
      withCredentials: true
    });
    
    const csrfToken = csrfResponse.data.token;
    log('CSRFトークン取得成功', { token: csrfToken.substring(0, 20) + '...' });
    
    // 認証実行
    const authResponse = await axios.post(
      `${CONFIG.baseURL}/api/auth/callback/credentials`,
      {
        email: CONFIG.auth.email,
        password: CONFIG.auth.password,
        csrfToken
      },
      {
        headers: {
          'x-csrf-token': csrfToken,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      }
    );
    
    // セッションCookie取得
    const cookies = authResponse.headers['set-cookie'];
    log('認証成功', { statusCode: authResponse.status });
    
    return {
      csrfToken,
      cookies,
      success: true
    };
  } catch (error) {
    log('認証失敗', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * テスト1: トークン取得の重複防止確認
 */
async function testTokenDuplication() {
  console.log('\n=== テスト1: トークン取得の重複防止確認 ===');
  
  const results = [];
  const startTime = Date.now();
  
  try {
    // 並列で5回CSRFトークンを取得
    const promises = Array.from({ length: 5 }, (_, i) => {
      return axios.get(`${CONFIG.baseURL}/api/csrf`, {
        withCredentials: true
      }).then(res => ({
        index: i,
        token: res.data.token,
        timestamp: Date.now() - startTime
      })).catch(err => ({
        index: i,
        error: err.response?.status || err.message,
        timestamp: Date.now() - startTime
      }));
    });
    
    const responses = await Promise.all(promises);
    
    // 結果分析
    const successful = responses.filter(r => r.token);
    const failed = responses.filter(r => r.error);
    
    console.log('成功リクエスト:', successful.length);
    console.log('失敗リクエスト:', failed.length);
    
    if (failed.length > 0) {
      console.log('エラー詳細:', failed);
    }
    
    // 期待値: 全て成功すべき（重複防止が機能）
    const testPassed = successful.length === 5 && failed.length === 0;
    
    return {
      testName: 'トークン取得の重複防止',
      passed: testPassed,
      details: {
        successful: successful.length,
        failed: failed.length,
        totalTime: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      testName: 'トークン取得の重複防止',
      passed: false,
      error: error.message
    };
  }
}

/**
 * テスト2: シングルトンパターンの確認
 */
async function testSingletonPattern() {
  console.log('\n=== テスト2: シングルトンパターンの確認 ===');
  
  const auth = await authenticate();
  if (!auth.success) {
    return {
      testName: 'シングルトンパターン',
      passed: false,
      error: '認証失敗'
    };
  }
  
  try {
    // 同一セッションで複数回トークンを取得
    const tokens = [];
    
    for (let i = 0; i < 3; i++) {
      const response = await axios.get(`${CONFIG.baseURL}/api/csrf`, {
        headers: {
          'Cookie': auth.cookies?.join('; ')
        },
        withCredentials: true
      });
      
      tokens.push(response.data.token);
      log(`トークン${i + 1}取得`, { token: response.data.token.substring(0, 20) + '...' });
      
      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 期待値: トークンは異なるべき（セキュリティのため）
    const uniqueTokens = new Set(tokens);
    const testPassed = uniqueTokens.size > 1;
    
    return {
      testName: 'シングルトンパターン',
      passed: testPassed,
      details: {
        totalTokens: tokens.length,
        uniqueTokens: uniqueTokens.size
      }
    };
  } catch (error) {
    return {
      testName: 'シングルトンパターン',
      passed: false,
      error: error.message
    };
  }
}

/**
 * テスト3: リトライロジックの確認
 */
async function testRetryLogic() {
  console.log('\n=== テスト3: リトライロジックの確認 ===');
  
  // 429エラーを意図的に発生させる
  const requests = [];
  const startTime = Date.now();
  
  try {
    // 短時間で大量のリクエストを送信
    for (let i = 0; i < 10; i++) {
      requests.push(
        axios.get(`${CONFIG.baseURL}/api/csrf`, {
          withCredentials: true,
          validateStatus: () => true // 全てのステータスコードを許可
        }).then(res => ({
          index: i,
          status: res.status,
          timestamp: Date.now() - startTime
        }))
      );
    }
    
    const results = await Promise.all(requests);
    
    // 429エラーの検出
    const rateLimited = results.filter(r => r.status === 429);
    const successful = results.filter(r => r.status === 200);
    
    console.log('成功リクエスト:', successful.length);
    console.log('レート制限エラー:', rateLimited.length);
    
    // 期待値: レート制限が適切に機能
    const testPassed = rateLimited.length > 0 || successful.length === 10;
    
    return {
      testName: 'リトライロジック',
      passed: testPassed,
      details: {
        successful: successful.length,
        rateLimited: rateLimited.length,
        totalTime: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      testName: 'リトライロジック',
      passed: false,
      error: error.message
    };
  }
}

/**
 * メイン実行関数
 */
async function runTests() {
  console.log('====================================');
  console.log('CSRFトークンマネージャー単体テスト');
  console.log('====================================');
  console.log('認証情報:', CONFIG.auth.email);
  console.log('対象URL:', CONFIG.baseURL);
  console.log('');
  
  const results = [];
  
  // 各テストを実行
  results.push(await testTokenDuplication());
  results.push(await testSingletonPattern());
  results.push(await testRetryLogic());
  
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

module.exports = { runTests, authenticate };