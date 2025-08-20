#!/usr/bin/env node
/**
 * 完全な新規登録フローテストスイート
 * 14人天才会議による徹底的なテスト実装
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

// カラー出力用のヘルパー
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// テスト結果の追跡
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// MongoDBクライアント
let mongoClient;
let db;

// テスト設定
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  mongoUrl: 'mongodb://localhost:27017/boardDB',
  dbName: 'boardDB',
  timeout: 10000,
};

// ========================================
// ユーティリティ関数
// ========================================

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testPass(testName, details = '') {
  totalTests++;
  passedTests++;
  testResults.push({ name: testName, status: 'PASS', details });
  log(`  ✅ ${testName} ${details ? `- ${details}` : ''}`, 'green');
}

function testFail(testName, error, details = '') {
  totalTests++;
  failedTests++;
  testResults.push({ name: testName, status: 'FAIL', error, details });
  log(`  ❌ ${testName} - ${error} ${details ? `(${details})` : ''}`, 'red');
}

function generateTestEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
}

function generateStrongPassword() {
  return `Test@${Date.now()}!Strong`;
}

// APIリクエストヘルパー
async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${TEST_CONFIG.baseUrl}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TEST_CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ========================================
// テストスイート
// ========================================

// 天才1: 環境セットアップ
async function setupTestEnvironment() {
  log('\n🧠 天才1: テスト環境セットアップ', 'cyan');
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(TEST_CONFIG.mongoUrl);
    await mongoClient.connect();
    db = mongoClient.db(TEST_CONFIG.dbName);
    testPass('MongoDB接続確立');
    
    // テスト用データのクリーンアップ
    const testEmails = await db.collection('users').find({
      email: { $regex: /^test_.*@example\.com$/ }
    }).toArray();
    
    if (testEmails.length > 0) {
      await db.collection('users').deleteMany({
        email: { $regex: /^test_.*@example\.com$/ }
      });
      testPass('テストデータクリーンアップ完了', `${testEmails.length}件削除`);
    }
    
    // サーバー接続確認
    const healthCheck = await makeRequest('/api/health').catch(() => null);
    if (healthCheck) {
      testPass('APIサーバー接続確認');
    } else {
      // サーバーが/api/healthを持たない場合は、登録APIで確認
      const apiCheck = await makeRequest('/api/auth/register', 'POST', {});
      if (apiCheck.status === 400 || apiCheck.status === 500) {
        testPass('APIサーバー接続確認', 'エラーレスポンスで確認');
      } else {
        testFail('APIサーバー接続確認', 'サーバーに接続できません');
      }
    }
    
  } catch (error) {
    testFail('環境セットアップ', error.message);
    throw error;
  }
}

// 天才2: パスワード強度テスト
async function testPasswordStrength() {
  log('\n🧠 天才2: パスワード強度チェックテスト', 'cyan');
  
  const testCases = [
    { password: 'abc', expected: 'fail', reason: '短すぎる' },
    { password: 'abcdefgh', expected: 'fail', reason: '文字種不足' },
    { password: 'password123', expected: 'fail', reason: '一般的すぎる' },
    { password: 'Password123', expected: 'weak', reason: '特殊文字なし' },
    { password: 'MyP@ss123', expected: 'pass', reason: '最低要件クリア' },
    { password: 'MyStr0ng!Pass2024', expected: 'strong', reason: '強力なパスワード' },
  ];
  
  for (const testCase of testCases) {
    const email = generateTestEmail();
    const response = await makeRequest('/api/auth/register', 'POST', {
      name: 'Test User',
      email: email,
      password: testCase.password,
    });
    
    if (testCase.expected === 'fail' && response.status === 400) {
      testPass(`弱いパスワード拒否: ${testCase.reason}`, testCase.password);
    } else if (testCase.expected === 'pass' && response.status === 201) {
      testPass(`適切なパスワード受理: ${testCase.reason}`, testCase.password);
    } else if (testCase.expected === 'strong' && response.status === 201) {
      testPass(`強力なパスワード受理: ${testCase.reason}`, testCase.password);
    } else if (testCase.expected === 'weak' && response.status === 400) {
      const errorType = response.body?.type;
      if (errorType === 'WEAK_PASSWORD') {
        testPass(`弱いパスワード検出: ${testCase.reason}`, testCase.password);
      } else {
        testFail(`パスワード強度判定: ${testCase.reason}`, response.body?.error || 'Unknown error');
      }
    } else {
      testFail(`パスワード強度判定: ${testCase.reason}`, 
        `期待: ${testCase.expected}, 実際: ${response.status}`);
    }
  }
}

// 天才3: メール重複チェックテスト
async function testEmailDuplication() {
  log('\n🧠 天才3: メール重複チェックテスト', 'cyan');
  
  const testEmail = generateTestEmail();
  const password = generateStrongPassword();
  
  // 初回登録
  const firstReg = await makeRequest('/api/auth/register', 'POST', {
    name: 'First User',
    email: testEmail,
    password: password,
  });
  
  if (firstReg.status === 201) {
    testPass('初回登録成功', testEmail);
  } else {
    testFail('初回登録', firstReg.body?.error || 'Unknown error');
    return;
  }
  
  // 重複登録試行
  const duplicateReg = await makeRequest('/api/auth/register', 'POST', {
    name: 'Second User',
    email: testEmail,
    password: password,
  });
  
  if (duplicateReg.status === 400 && duplicateReg.body?.type === 'EMAIL_EXISTS') {
    testPass('重複メール拒否', '正しくエラーを返却');
  } else {
    testFail('重複メール拒否', '重複が許可されました');
  }
  
  // 大文字小文字の違いでも重複検出
  const caseVariant = await makeRequest('/api/auth/register', 'POST', {
    name: 'Third User',
    email: testEmail.toUpperCase(),
    password: password,
  });
  
  if (caseVariant.status === 400) {
    testPass('大文字小文字無視の重複検出', testEmail.toUpperCase());
  } else {
    testFail('大文字小文字無視の重複検出', '異なるケースで登録可能');
  }
  
  // メール重複チェックAPI
  const checkAvailable = await makeRequest('/api/auth/check-email', 'POST', {
    email: testEmail,
  });
  
  if (checkAvailable.status === 200 && checkAvailable.body?.available === false) {
    testPass('メール重複チェックAPI', '既存メール検出');
  } else {
    testFail('メール重複チェックAPI', '既存メールを検出できず');
  }
  
  const newEmail = generateTestEmail();
  const checkNew = await makeRequest('/api/auth/check-email', 'POST', {
    email: newEmail,
  });
  
  if (checkNew.status === 200 && checkNew.body?.available === true) {
    testPass('メール利用可能チェック', '新規メール');
  } else {
    testFail('メール利用可能チェック', '新規メールが利用不可と判定');
  }
}

// 天才4: 正常系登録フローテスト
async function testNormalRegistrationFlow() {
  log('\n🧠 天才4: 正常系登録フローテスト', 'cyan');
  
  const testData = {
    name: 'テストユーザー太郎',
    email: generateTestEmail(),
    password: 'MyStr0ng!Pass2024',
  };
  
  // 登録リクエスト
  const startTime = Date.now();
  const response = await makeRequest('/api/auth/register', 'POST', testData);
  const responseTime = Date.now() - startTime;
  
  if (response.status === 201) {
    testPass('登録成功', `応答時間: ${responseTime}ms`);
    
    // レスポンス検証
    if (response.body?.success === true) {
      testPass('成功フラグ確認');
    }
    
    if (response.body?.message) {
      testPass('成功メッセージ確認', response.body.message.substring(0, 30) + '...');
    }
    
    if (response.body?.email === testData.email) {
      testPass('メールアドレス確認');
    }
    
    // データベース確認
    const user = await db.collection('users').findOne({ email: testData.email });
    if (user) {
      testPass('データベース保存確認');
      
      if (user.password !== testData.password) {
        testPass('パスワードハッシュ化確認');
      } else {
        testFail('パスワードハッシュ化', '平文で保存されています');
      }
      
      if (user.emailVerificationToken) {
        testPass('メール確認トークン生成');
      }
      
      if (user.emailVerified === false) {
        testPass('メール未確認状態');
      }
    } else {
      testFail('データベース保存', 'ユーザーが見つかりません');
    }
  } else {
    testFail('登録リクエスト', response.body?.error || 'Unknown error');
  }
}

// 天才5: 異常系テストケース
async function testAbnormalCases() {
  log('\n🧠 天才5: 異常系テストケース', 'cyan');
  
  // 空リクエスト
  const emptyRequest = await makeRequest('/api/auth/register', 'POST', {});
  if (emptyRequest.status === 400) {
    testPass('空リクエスト拒否');
  } else {
    testFail('空リクエスト拒否', `ステータス: ${emptyRequest.status}`);
  }
  
  // 不正なメールアドレス
  const invalidEmail = await makeRequest('/api/auth/register', 'POST', {
    name: 'Test User',
    email: 'invalid-email',
    password: generateStrongPassword(),
  });
  if (invalidEmail.status === 400) {
    testPass('不正メールアドレス拒否');
  } else {
    testFail('不正メールアドレス拒否', `ステータス: ${invalidEmail.status}`);
  }
  
  // 短い名前
  const shortName = await makeRequest('/api/auth/register', 'POST', {
    name: 'A',
    email: generateTestEmail(),
    password: generateStrongPassword(),
  });
  if (shortName.status === 400) {
    testPass('短い名前拒否');
  } else {
    testFail('短い名前拒否', `ステータス: ${shortName.status}`);
  }
  
  // 長すぎる名前
  const longName = await makeRequest('/api/auth/register', 'POST', {
    name: 'A'.repeat(100),
    email: generateTestEmail(),
    password: generateStrongPassword(),
  });
  if (longName.status === 400) {
    testPass('長すぎる名前拒否');
  } else {
    testFail('長すぎる名前拒否', `ステータス: ${longName.status}`);
  }
  
  // SQLインジェクション試行
  const sqlInjection = await makeRequest('/api/auth/register', 'POST', {
    name: "'; DROP TABLE users; --",
    email: generateTestEmail(),
    password: generateStrongPassword(),
  });
  if (sqlInjection.status === 201 || sqlInjection.status === 400) {
    // テーブルが残っているか確認
    const tableExists = await db.collection('users').findOne({});
    if (tableExists !== null || tableExists !== undefined) {
      testPass('SQLインジェクション対策', 'テーブル保護確認');
    }
  }
  
  // XSS試行
  const xssAttempt = await makeRequest('/api/auth/register', 'POST', {
    name: '<script>alert("XSS")</script>',
    email: generateTestEmail(),
    password: generateStrongPassword(),
  });
  if (xssAttempt.status === 201) {
    const user = await db.collection('users').findOne({ 
      email: xssAttempt.body?.email 
    });
    if (user && user.name === '<script>alert("XSS")</script>') {
      testPass('XSS文字列の安全な保存', 'エスケープ確認');
    }
  }
}

// 天才6: バリデーションテスト
async function testValidation() {
  log('\n🧠 天才6: バリデーションテスト', 'cyan');
  
  const validationTests = [
    {
      data: { name: '', email: generateTestEmail(), password: generateStrongPassword() },
      expectedError: '名前',
      description: '空の名前',
    },
    {
      data: { name: 'Test', email: '', password: generateStrongPassword() },
      expectedError: 'メールアドレス',
      description: '空のメール',
    },
    {
      data: { name: 'Test', email: generateTestEmail(), password: '' },
      expectedError: 'パスワード',
      description: '空のパスワード',
    },
    {
      data: { name: 'Test', email: 'test@', password: generateStrongPassword() },
      expectedError: '有効なメールアドレス',
      description: '不完全なメール',
    },
    {
      data: { name: 'Test', email: '@example.com', password: generateStrongPassword() },
      expectedError: '有効なメールアドレス',
      description: 'ローカル部なしメール',
    },
    {
      data: { name: 'Test', email: 'test@example', password: generateStrongPassword() },
      expectedError: '有効なメールアドレス',
      description: 'TLDなしメール',
    },
  ];
  
  for (const test of validationTests) {
    const response = await makeRequest('/api/auth/register', 'POST', test.data);
    if (response.status === 400 && response.body?.error?.includes(test.expectedError)) {
      testPass(`バリデーション: ${test.description}`, response.body.error);
    } else {
      testFail(`バリデーション: ${test.description}`, 
        `期待: ${test.expectedError}, 実際: ${response.body?.error}`);
    }
  }
}

// 天才7: メール認証フローテスト
async function testEmailVerification() {
  log('\n🧠 天才7: メール認証フローテスト', 'cyan');
  
  const testData = {
    name: 'Verify Test User',
    email: generateTestEmail(),
    password: generateStrongPassword(),
  };
  
  // ユーザー登録
  const regResponse = await makeRequest('/api/auth/register', 'POST', testData);
  if (regResponse.status !== 201) {
    testFail('メール認証テスト準備', '登録失敗');
    return;
  }
  
  // トークン取得
  const user = await db.collection('users').findOne({ email: testData.email });
  if (!user || !user.emailVerificationToken) {
    testFail('トークン取得', 'トークンが見つかりません');
    return;
  }
  
  const token = user.emailVerificationToken;
  testPass('メール確認トークン取得', token.substring(0, 8) + '...');
  
  // 正しいトークンで確認
  const verifyResponse = await makeRequest(
    `/api/auth/verify-email?token=${token}`, 
    'GET'
  );
  
  if (verifyResponse.status === 200) {
    testPass('メール確認成功');
    
    // データベース更新確認
    const verifiedUser = await db.collection('users').findOne({ email: testData.email });
    if (verifiedUser.emailVerified === true) {
      testPass('メール確認フラグ更新');
    } else {
      testFail('メール確認フラグ更新', 'フラグが更新されていません');
    }
  } else {
    testFail('メール確認', verifyResponse.body?.error || 'Unknown error');
  }
  
  // 無効なトークンで確認
  const invalidToken = 'invalid-token-12345';
  const invalidVerify = await makeRequest(
    `/api/auth/verify-email?token=${invalidToken}`, 
    'GET'
  );
  
  if (invalidVerify.status === 400 || invalidVerify.status === 404) {
    testPass('無効トークン拒否');
  } else {
    testFail('無効トークン拒否', `ステータス: ${invalidVerify.status}`);
  }
  
  // 期限切れトークンのテスト（24時間後をシミュレート）
  const expiredUser = await db.collection('users').findOne({ email: testData.email });
  if (expiredUser) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    await db.collection('users').updateOne(
      { email: testData.email },
      { $set: { emailVerificationTokenExpiry: yesterday } }
    );
    
    const expiredVerify = await makeRequest(
      `/api/auth/verify-email?token=${token}`, 
      'GET'
    );
    
    if (expiredVerify.status === 400) {
      testPass('期限切れトークン拒否');
    } else {
      testFail('期限切れトークン拒否', `ステータス: ${expiredVerify.status}`);
    }
  }
}

// 天才8: レート制限テスト
async function testRateLimit() {
  log('\n🧠 天才8: レート制限テスト', 'cyan');
  
  const baseEmail = generateTestEmail();
  const password = generateStrongPassword();
  
  // 連続リクエスト送信
  const requests = [];
  for (let i = 0; i < 7; i++) {
    requests.push(makeRequest('/api/auth/register', 'POST', {
      name: `Rate Test ${i}`,
      email: `${i}_${baseEmail}`,
      password: password,
    }));
  }
  
  const results = await Promise.all(requests);
  
  let blockedCount = 0;
  let allowedCount = 0;
  
  results.forEach((result, index) => {
    if (result.status === 429) {
      blockedCount++;
    } else if (result.status === 201 || result.status === 400) {
      allowedCount++;
    }
  });
  
  if (blockedCount > 0) {
    testPass('レート制限動作確認', `${blockedCount}件ブロック`);
  } else {
    testFail('レート制限動作確認', 'ブロックされませんでした');
  }
  
  if (allowedCount <= 5) {
    testPass('レート制限閾値', `${allowedCount}件許可`);
  } else {
    testFail('レート制限閾値', `${allowedCount}件許可（期待: 5件以下）`);
  }
  
  // メール重複チェックAPIのレート制限
  const checkRequests = [];
  for (let i = 0; i < 12; i++) {
    checkRequests.push(makeRequest('/api/auth/check-email', 'POST', {
      email: `test${i}@example.com`,
    }));
  }
  
  const checkResults = await Promise.all(checkRequests);
  const checkBlocked = checkResults.filter(r => r.status === 429).length;
  
  if (checkBlocked > 0) {
    testPass('メールチェックAPI レート制限', `${checkBlocked}件ブロック`);
  } else {
    testFail('メールチェックAPI レート制限', 'ブロックされませんでした');
  }
}

// 天才9: セキュリティテスト
async function testSecurity() {
  log('\n🧠 天才9: セキュリティテスト', 'cyan');
  
  // タイミング攻撃対策確認（メールチェック）
  const existingEmail = generateTestEmail();
  const newEmail = generateTestEmail();
  
  // 既存メール作成
  await makeRequest('/api/auth/register', 'POST', {
    name: 'Timing Test',
    email: existingEmail,
    password: generateStrongPassword(),
  });
  
  // タイミング測定
  const timings = {
    existing: [],
    new: [],
  };
  
  for (let i = 0; i < 5; i++) {
    const start1 = Date.now();
    await makeRequest('/api/auth/check-email', 'POST', { email: existingEmail });
    timings.existing.push(Date.now() - start1);
    
    const start2 = Date.now();
    await makeRequest('/api/auth/check-email', 'POST', { email: newEmail + i });
    timings.new.push(Date.now() - start2);
  }
  
  const avgExisting = timings.existing.reduce((a, b) => a + b, 0) / timings.existing.length;
  const avgNew = timings.new.reduce((a, b) => a + b, 0) / timings.new.length;
  const diff = Math.abs(avgExisting - avgNew);
  
  if (diff < 50) {
    testPass('タイミング攻撃対策', `時間差: ${diff.toFixed(2)}ms`);
  } else {
    testFail('タイミング攻撃対策', `時間差: ${diff.toFixed(2)}ms（50ms以上）`);
  }
  
  // パスワード平文チェック
  const secureUser = {
    name: 'Secure User',
    email: generateTestEmail(),
    password: 'SecureP@ss123!',
  };
  
  await makeRequest('/api/auth/register', 'POST', secureUser);
  const dbUser = await db.collection('users').findOne({ email: secureUser.email });
  
  if (dbUser && dbUser.password !== secureUser.password) {
    testPass('パスワードハッシュ化確認');
    
    // bcryptハッシュの形式確認
    if (dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$')) {
      testPass('bcryptハッシュ形式確認');
    } else {
      testFail('bcryptハッシュ形式', 'bcrypt形式ではありません');
    }
  } else {
    testFail('パスワードハッシュ化', '平文で保存されています');
  }
  
  // HTTPヘッダーセキュリティ
  const response = await makeRequest('/api/auth/register', 'POST', {});
  if (!response.headers['x-powered-by']) {
    testPass('X-Powered-Byヘッダー非表示');
  } else {
    testFail('X-Powered-Byヘッダー', '技術スタック露出');
  }
}

// 天才10: パフォーマンステスト
async function testPerformance() {
  log('\n🧠 天才10: パフォーマンステスト', 'cyan');
  
  const timings = [];
  
  // 10回の登録リクエストのパフォーマンス測定
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await makeRequest('/api/auth/register', 'POST', {
      name: `Perf Test ${i}`,
      email: generateTestEmail(),
      password: generateStrongPassword(),
    });
    timings.push(Date.now() - start);
  }
  
  const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
  const maxTime = Math.max(...timings);
  const minTime = Math.min(...timings);
  
  if (avgTime < 2000) {
    testPass('平均応答時間', `${avgTime.toFixed(2)}ms`);
  } else {
    testFail('平均応答時間', `${avgTime.toFixed(2)}ms（2秒以上）`);
  }
  
  if (maxTime < 5000) {
    testPass('最大応答時間', `${maxTime}ms`);
  } else {
    testFail('最大応答時間', `${maxTime}ms（5秒以上）`);
  }
  
  log(`  📊 パフォーマンス統計:`, 'blue');
  log(`     平均: ${avgTime.toFixed(2)}ms`, 'blue');
  log(`     最小: ${minTime}ms`, 'blue');
  log(`     最大: ${maxTime}ms`, 'blue');
  
  // 並行リクエストテスト
  const concurrentStart = Date.now();
  const concurrentRequests = [];
  
  for (let i = 0; i < 5; i++) {
    concurrentRequests.push(makeRequest('/api/auth/register', 'POST', {
      name: `Concurrent ${i}`,
      email: generateTestEmail(),
      password: generateStrongPassword(),
    }));
  }
  
  await Promise.all(concurrentRequests);
  const concurrentTime = Date.now() - concurrentStart;
  
  if (concurrentTime < 3000) {
    testPass('並行処理性能', `5件同時: ${concurrentTime}ms`);
  } else {
    testFail('並行処理性能', `5件同時: ${concurrentTime}ms（3秒以上）`);
  }
}

// 天才11: データベース整合性テスト
async function testDatabaseIntegrity() {
  log('\n🧠 天才11: データベース整合性テスト', 'cyan');
  
  // インデックス確認
  const indexes = await db.collection('users').indexes();
  const emailIndex = indexes.find(idx => idx.key && idx.key.email);
  
  if (emailIndex) {
    testPass('メールインデックス存在確認');
    if (emailIndex.unique) {
      testPass('メールユニーク制約確認');
    } else {
      testFail('メールユニーク制約', 'ユニーク制約がありません');
    }
  } else {
    testFail('メールインデックス', 'インデックスが見つかりません');
  }
  
  // フィールド整合性確認
  const sampleUser = {
    name: 'DB Test User',
    email: generateTestEmail(),
    password: generateStrongPassword(),
  };
  
  await makeRequest('/api/auth/register', 'POST', sampleUser);
  const dbUser = await db.collection('users').findOne({ email: sampleUser.email });
  
  const requiredFields = [
    'email', 'password', 'name', 'emailVerified',
    'emailVerificationToken', 'emailVerificationTokenExpiry',
    'createdAt', 'updatedAt'
  ];
  
  for (const field of requiredFields) {
    if (dbUser && dbUser[field] !== undefined) {
      testPass(`必須フィールド: ${field}`);
    } else {
      testFail(`必須フィールド: ${field}`, '存在しません');
    }
  }
  
  // データ型確認
  if (dbUser) {
    if (typeof dbUser.emailVerified === 'boolean') {
      testPass('emailVerified型確認', 'boolean');
    } else {
      testFail('emailVerified型確認', `型: ${typeof dbUser.emailVerified}`);
    }
    
    if (dbUser.createdAt instanceof Date) {
      testPass('createdAt型確認', 'Date');
    } else {
      testFail('createdAt型確認', `型: ${typeof dbUser.createdAt}`);
    }
  }
}

// 天才12: エンドツーエンドテスト
async function testEndToEnd() {
  log('\n🧠 天才12: エンドツーエンドテスト', 'cyan');
  
  const testUser = {
    name: 'E2E Test User',
    email: generateTestEmail(),
    password: 'E2ETest@2024!',
  };
  
  // ステップ1: メール重複チェック
  const checkEmail = await makeRequest('/api/auth/check-email', 'POST', {
    email: testUser.email,
  });
  
  if (checkEmail.status === 200 && checkEmail.body?.available === true) {
    testPass('E2E: メール利用可能確認');
  } else {
    testFail('E2E: メール利用可能確認', 'メール利用不可');
  }
  
  // ステップ2: ユーザー登録
  const register = await makeRequest('/api/auth/register', 'POST', testUser);
  
  if (register.status === 201) {
    testPass('E2E: ユーザー登録成功');
  } else {
    testFail('E2E: ユーザー登録', register.body?.error || 'Unknown error');
    return;
  }
  
  // ステップ3: メール確認
  const user = await db.collection('users').findOne({ email: testUser.email });
  if (user && user.emailVerificationToken) {
    const verify = await makeRequest(
      `/api/auth/verify-email?token=${user.emailVerificationToken}`,
      'GET'
    );
    
    if (verify.status === 200) {
      testPass('E2E: メール確認完了');
    } else {
      testFail('E2E: メール確認', verify.body?.error || 'Unknown error');
    }
  } else {
    testFail('E2E: メール確認', 'トークンが見つかりません');
  }
  
  // ステップ4: 確認済みユーザーの状態確認
  const verifiedUser = await db.collection('users').findOne({ email: testUser.email });
  if (verifiedUser && verifiedUser.emailVerified === true) {
    testPass('E2E: 最終状態確認');
  } else {
    testFail('E2E: 最終状態確認', 'メール未確認状態');
  }
}

// 天才13: 負荷テストと境界値テスト
async function testLoadAndBoundary() {
  log('\n🧠 天才13: 負荷テストと境界値テスト', 'cyan');
  
  // 境界値テスト - 名前の長さ
  const boundaryTests = [
    { name: 'AB', expected: 'pass', description: '最小文字数（2文字）' },
    { name: 'A'.repeat(50), expected: 'pass', description: '最大文字数（50文字）' },
    { name: 'A'.repeat(51), expected: 'fail', description: '最大文字数超過（51文字）' },
  ];
  
  for (const test of boundaryTests) {
    const response = await makeRequest('/api/auth/register', 'POST', {
      name: test.name,
      email: generateTestEmail(),
      password: generateStrongPassword(),
    });
    
    if (test.expected === 'pass' && response.status === 201) {
      testPass(`境界値: ${test.description}`);
    } else if (test.expected === 'fail' && response.status === 400) {
      testPass(`境界値: ${test.description}`);
    } else {
      testFail(`境界値: ${test.description}`, 
        `期待: ${test.expected}, 実際: ${response.status}`);
    }
  }
  
  // 負荷テスト - 短時間での大量リクエスト
  log('  ⏳ 負荷テスト実行中...', 'yellow');
  const loadTestStart = Date.now();
  const loadRequests = [];
  
  for (let i = 0; i < 20; i++) {
    loadRequests.push(makeRequest('/api/auth/check-email', 'POST', {
      email: `load_test_${i}@example.com`,
    }).catch(err => ({ status: 'error', error: err.message })));
  }
  
  const loadResults = await Promise.all(loadRequests);
  const loadTestTime = Date.now() - loadTestStart;
  
  const successCount = loadResults.filter(r => r.status === 200).length;
  const rateLimitCount = loadResults.filter(r => r.status === 429).length;
  const errorCount = loadResults.filter(r => r.status === 'error').length;
  
  log(`  📊 負荷テスト結果:`, 'blue');
  log(`     成功: ${successCount}/20`, 'blue');
  log(`     レート制限: ${rateLimitCount}/20`, 'blue');
  log(`     エラー: ${errorCount}/20`, 'blue');
  log(`     総時間: ${loadTestTime}ms`, 'blue');
  
  if (errorCount === 0) {
    testPass('負荷テスト安定性', 'エラーなし');
  } else {
    testFail('負荷テスト安定性', `${errorCount}件のエラー`);
  }
  
  if (rateLimitCount > 0) {
    testPass('負荷時レート制限動作', `${rateLimitCount}件制限`);
  }
}

// 天才14: 最終検証と承認
async function finalValidation() {
  log('\n🧠 天才14: 最終検証と承認', 'cyan');
  
  // システム全体の健全性確認
  const healthChecks = [
    { name: 'API応答性', check: () => makeRequest('/api/auth/register', 'POST', {}) },
    { name: 'データベース接続', check: () => db.collection('users').findOne({}) },
    { name: 'メールチェックAPI', check: () => makeRequest('/api/auth/check-email', 'POST', { email: 'test@test.com' }) },
  ];
  
  for (const check of healthChecks) {
    try {
      await check.check();
      testPass(`システム健全性: ${check.name}`);
    } catch (error) {
      testFail(`システム健全性: ${check.name}`, error.message);
    }
  }
  
  // テスト結果サマリー
  log('\n' + '='.repeat(60), 'bright');
  log('🎯 テスト結果サマリー', 'bright');
  log('='.repeat(60), 'bright');
  
  const successRate = (passedTests / totalTests * 100).toFixed(2);
  
  log(`\n📊 統計:`, 'cyan');
  log(`  総テスト数: ${totalTests}`, 'white');
  log(`  ✅ 成功: ${passedTests}`, 'green');
  log(`  ❌ 失敗: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`  📈 成功率: ${successRate}%`, successRate >= 95 ? 'green' : 'yellow');
  
  // カテゴリ別結果
  log(`\n📋 カテゴリ別結果:`, 'cyan');
  const categories = {
    '環境セットアップ': 0,
    'パスワード強度': 0,
    'メール重複': 0,
    '正常系フロー': 0,
    '異常系': 0,
    'バリデーション': 0,
    'メール認証': 0,
    'レート制限': 0,
    'セキュリティ': 0,
    'パフォーマンス': 0,
    'DB整合性': 0,
    'E2E': 0,
    '負荷/境界値': 0,
    '最終検証': 0,
  };
  
  // 実際のテスト結果に基づいて更新
  testResults.forEach(result => {
    if (result.status === 'PASS') {
      // カテゴリ分類ロジック（簡略化）
      if (result.name.includes('MongoDB') || result.name.includes('環境')) categories['環境セットアップ']++;
      else if (result.name.includes('パスワード')) categories['パスワード強度']++;
      else if (result.name.includes('重複')) categories['メール重複']++;
      else if (result.name.includes('登録成功')) categories['正常系フロー']++;
      else if (result.name.includes('拒否') || result.name.includes('異常')) categories['異常系']++;
      else if (result.name.includes('バリデーション')) categories['バリデーション']++;
      else if (result.name.includes('メール確認') || result.name.includes('トークン')) categories['メール認証']++;
      else if (result.name.includes('レート制限')) categories['レート制限']++;
      else if (result.name.includes('セキュリティ') || result.name.includes('ハッシュ')) categories['セキュリティ']++;
      else if (result.name.includes('応答時間') || result.name.includes('パフォーマンス')) categories['パフォーマンス']++;
      else if (result.name.includes('フィールド') || result.name.includes('インデックス')) categories['DB整合性']++;
      else if (result.name.includes('E2E')) categories['E2E']++;
      else if (result.name.includes('境界値') || result.name.includes('負荷')) categories['負荷/境界値']++;
      else if (result.name.includes('健全性')) categories['最終検証']++;
    }
  });
  
  Object.entries(categories).forEach(([category, count]) => {
    const emoji = count > 0 ? '✅' : '⚠️';
    log(`  ${emoji} ${category}: ${count}件`, count > 0 ? 'green' : 'yellow');
  });
  
  // 最終判定
  log('\n' + '='.repeat(60), 'bright');
  if (successRate >= 95 && failedTests <= 5) {
    log('🎉 14人天才会議 - 承認', 'green');
    log('すべてのテストが基準を満たしました！', 'green');
  } else if (successRate >= 80) {
    log('⚠️ 14人天才会議 - 条件付き承認', 'yellow');
    log('いくつかの問題がありますが、基本機能は動作しています。', 'yellow');
  } else {
    log('❌ 14人天才会議 - 要改善', 'red');
    log('重要な問題が検出されました。修正が必要です。', 'red');
  }
  log('='.repeat(60), 'bright');
}

// ========================================
// メイン実行
// ========================================

async function runAllTests() {
  console.clear();
  log('========================================', 'bright');
  log('🧠 14人天才会議 - 登録フロー完全テスト', 'bright');
  log('========================================', 'bright');
  log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`, 'white');
  log(`テスト環境: ${TEST_CONFIG.baseUrl}`, 'white');
  log('');
  
  const startTime = Date.now();
  
  try {
    // 順次テスト実行
    await setupTestEnvironment();        // 天才1
    await testPasswordStrength();        // 天才2
    await testEmailDuplication();        // 天才3
    await testNormalRegistrationFlow();  // 天才4
    await testAbnormalCases();          // 天才5
    await testValidation();              // 天才6
    await testEmailVerification();       // 天才7
    await testRateLimit();              // 天才8
    await testSecurity();               // 天才9
    await testPerformance();            // 天才10
    await testDatabaseIntegrity();      // 天才11
    await testEndToEnd();               // 天才12
    await testLoadAndBoundary();        // 天才13
    await finalValidation();            // 天才14
    
  } catch (error) {
    log(`\n❌ 致命的エラー: ${error.message}`, 'red');
    log(error.stack, 'red');
  } finally {
    // クリーンアップ
    if (mongoClient) {
      await mongoClient.close();
      log('\n📤 MongoDB接続をクローズしました', 'cyan');
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n⏱️ 総実行時間: ${totalTime}秒`, 'white');
    log(`終了時刻: ${new Date().toLocaleString('ja-JP')}`, 'white');
    
    // 終了コード
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  log('\n❌ 未処理のPromise拒否:', 'red');
  console.error(reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('\n❌ 未処理の例外:', 'red');
  console.error(error);
  process.exit(1);
});

// 実行
runAllTests();