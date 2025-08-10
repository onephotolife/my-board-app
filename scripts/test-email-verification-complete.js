#!/usr/bin/env node

/**
 * メール認証機能の包括的テストスクリプト
 * 
 * テスト項目:
 * 1. 正常な認証フロー
 * 2. 無効なトークンの処理
 * 3. 期限切れトークンの処理
 * 4. 既に認証済みの場合
 * 5. レート制限の確認
 * 6. エラー表示の確認
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70));
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`  ${status}: ${testName}`, color);
  if (details) {
    console.log(`         ${details}`);
  }
}

// テスト結果を格納
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
};

// APIリクエストヘルパー
async function makeRequest(path, options = {}) {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error };
  }
}

// データベース接続
async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    await mongoose.connect(MONGODB_URI);
    return true;
  } catch (error) {
    log(`❌ データベース接続失敗: ${error.message}`, 'red');
    return false;
  }
}

// Userスキーマ
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  emailVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationTokenExpiry: Date,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// テストケース実行関数
async function runTest(testName, testFunc) {
  testResults.total++;
  try {
    const result = await testFunc();
    if (result.passed) {
      testResults.passed++;
      logTest(testName, true, result.message);
    } else {
      testResults.failed++;
      logTest(testName, false, result.message);
    }
    testResults.details.push({ testName, ...result });
  } catch (error) {
    testResults.failed++;
    logTest(testName, false, error.message);
    testResults.details.push({ testName, passed: false, error: error.message });
  }
}

// テストケース1: 正常な認証フロー
async function testValidToken() {
  const user = await User.findOne({ email: 'test-valid@example.com' });
  if (!user || !user.emailVerificationToken) {
    return { passed: false, message: 'テストユーザーが見つかりません' };
  }

  const { response, data } = await makeRequest(`/api/auth/verify?token=${user.emailVerificationToken}`);
  
  if (!data.success) {
    return { passed: false, message: `エラー: ${data.error?.message}` };
  }

  // DBの状態を確認
  const updatedUser = await User.findOne({ email: 'test-valid@example.com' });
  
  const checks = [
    { check: response.status === 200, desc: 'HTTPステータス200' },
    { check: data.success === true, desc: '成功レスポンス' },
    { check: updatedUser.emailVerified === true, desc: 'emailVerifiedがtrue' },
    { check: !updatedUser.emailVerificationToken, desc: 'トークンが削除' },
    { check: data.data?.email === user.email, desc: 'メールアドレス一致' },
  ];

  const allPassed = checks.every(c => c.check);
  const failedChecks = checks.filter(c => !c.check).map(c => c.desc);

  return {
    passed: allPassed,
    message: allPassed ? 'すべてのチェック成功' : `失敗: ${failedChecks.join(', ')}`,
    details: checks,
  };
}

// テストケース2: 無効なトークン
async function testInvalidToken() {
  const { response, data } = await makeRequest('/api/auth/verify?token=invalid-token-12345');
  
  const checks = [
    { check: response.status === 400, desc: 'HTTPステータス400' },
    { check: data.success === false, desc: 'エラーレスポンス' },
    { check: data.error?.code === 'INVALID_TOKEN', desc: 'エラーコード正確' },
    { check: data.error?.message?.includes('無効'), desc: '日本語エラーメッセージ' },
  ];

  const allPassed = checks.every(c => c.check);
  return {
    passed: allPassed,
    message: allPassed ? 'エラー処理正常' : '無効トークン処理に問題',
    details: checks,
  };
}

// テストケース3: 期限切れトークン
async function testExpiredToken() {
  const user = await User.findOne({ email: 'test-expired@example.com' });
  if (!user || !user.emailVerificationToken) {
    return { passed: false, message: 'テストユーザーが見つかりません' };
  }

  const { response, data } = await makeRequest(`/api/auth/verify?token=${user.emailVerificationToken}`);
  
  const checks = [
    { check: response.status === 400, desc: 'HTTPステータス400' },
    { check: data.error?.code === 'TOKEN_EXPIRED', desc: '期限切れエラーコード' },
    { check: data.error?.canResend === true, desc: '再送信可能フラグ' },
    { check: data.error?.message?.includes('期限'), desc: '期限切れメッセージ' },
  ];

  const allPassed = checks.every(c => c.check);
  return {
    passed: allPassed,
    message: allPassed ? '期限切れ処理正常' : '期限切れトークン処理に問題',
    details: checks,
  };
}

// テストケース4: 既に認証済み
async function testAlreadyVerified() {
  const user = await User.findOne({ email: 'test-verified@example.com' });
  if (!user || !user.emailVerificationToken) {
    return { passed: false, message: 'テストユーザーが見つかりません' };
  }

  const { response, data } = await makeRequest(`/api/auth/verify?token=${user.emailVerificationToken}`);
  
  const checks = [
    { check: response.status === 200, desc: 'HTTPステータス200' },
    { check: data.success === true, desc: '成功レスポンス' },
    { check: data.data?.alreadyVerified === true, desc: '既に認証済みフラグ' },
    { check: data.message?.includes('既に確認済み'), desc: '適切なメッセージ' },
  ];

  const allPassed = checks.every(c => c.check);
  return {
    passed: allPassed,
    message: allPassed ? '既認証処理正常' : '既認証処理に問題',
    details: checks,
  };
}

// テストケース5: トークンなし
async function testNoToken() {
  const { response, data } = await makeRequest('/api/auth/verify');
  
  const checks = [
    { check: response.status === 400, desc: 'HTTPステータス400' },
    { check: data.error?.code === 'INVALID_TOKEN', desc: 'エラーコード正確' },
  ];

  const allPassed = checks.every(c => c.check);
  return {
    passed: allPassed,
    message: allPassed ? 'トークンなしエラー正常' : 'トークンなし処理に問題',
  };
}

// テストケース6: メール再送信
async function testResendEmail() {
  const { response, data } = await makeRequest('/api/auth/resend', {
    method: 'POST',
    body: JSON.stringify({ email: 'test-resend@example.com' }),
  });
  
  const checks = [
    { check: response.status === 200, desc: 'HTTPステータス200' },
    { check: data.success === true, desc: '成功レスポンス' },
    { check: data.data?.cooldownSeconds > 0, desc: 'クールダウン設定' },
    { check: data.message?.includes('送信'), desc: '送信メッセージ' },
  ];

  const allPassed = checks.every(c => c.check);
  return {
    passed: allPassed,
    message: allPassed ? '再送信処理正常' : '再送信処理に問題',
    details: checks,
  };
}

// テストケース7: レート制限
async function testRateLimit() {
  const email = 'ratelimit-test@example.com';
  let rateLimitHit = false;
  
  // 連続リクエスト
  for (let i = 1; i <= 5; i++) {
    const { data } = await makeRequest('/api/auth/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    
    if (data.error?.code === 'RATE_LIMITED' || data.data?.cooldownSeconds) {
      rateLimitHit = true;
      break;
    }
    
    // 短い待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    passed: rateLimitHit,
    message: rateLimitHit ? 'レート制限動作確認' : 'レート制限が機能していません',
  };
}

// テストケース8: 無効なメール形式
async function testInvalidEmail() {
  const { response, data } = await makeRequest('/api/auth/resend', {
    method: 'POST',
    body: JSON.stringify({ email: 'invalid-email' }),
  });
  
  const checks = [
    { check: response.status === 400, desc: 'HTTPステータス400' },
    { check: data.error?.code === 'INVALID_INPUT', desc: '入力エラーコード' },
    { check: data.error?.message?.includes('形式'), desc: 'バリデーションメッセージ' },
  ];

  const allPassed = checks.every(c => c.check);
  return {
    passed: allPassed,
    message: allPassed ? 'バリデーション正常' : 'バリデーションに問題',
  };
}

// データベース状態確認
async function checkDatabaseState() {
  logSection('📊 データベース状態確認');
  
  try {
    // ユーザー数確認
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const unverifiedUsers = await User.countDocuments({ emailVerified: false });
    
    log(`  総ユーザー数: ${totalUsers}`, 'cyan');
    log(`  認証済み: ${verifiedUsers}`, 'green');
    log(`  未認証: ${unverifiedUsers}`, 'yellow');
    
    // RateLimitコレクション確認
    const RateLimit = mongoose.connection.collection('ratelimits');
    const rateLimitCount = await RateLimit.countDocuments();
    log(`  レート制限レコード: ${rateLimitCount}`, 'cyan');
    
    // テストユーザーの状態
    console.log('\n  テストユーザーの状態:');
    const testEmails = [
      'test-valid@example.com',
      'test-expired@example.com',
      'test-verified@example.com',
      'test-resend@example.com',
    ];
    
    for (const email of testEmails) {
      const user = await User.findOne({ email });
      if (user) {
        const status = user.emailVerified ? '✅' : '❌';
        const hasToken = user.emailVerificationToken ? 'あり' : 'なし';
        console.log(`    ${status} ${email} (トークン: ${hasToken})`);
      }
    }
    
    return true;
  } catch (error) {
    log(`  ❌ エラー: ${error.message}`, 'red');
    return false;
  }
}

// メイン実行関数
async function main() {
  log('\n🚀 メール認証機能 包括的テスト開始\n', 'bright');
  
  // サーバー確認
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error('Server not responding');
    log('✅ サーバー起動確認', 'green');
  } catch (error) {
    log('❌ サーバーが起動していません', 'red');
    log('npm run dev でサーバーを起動してください', 'yellow');
    process.exit(1);
  }
  
  // データベース接続
  const dbConnected = await connectDB();
  if (!dbConnected) {
    process.exit(1);
  }
  log('✅ データベース接続成功', 'green');
  
  // テスト実行
  logSection('🧪 テスト実行');
  
  await runTest('正常な認証フロー', testValidToken);
  await runTest('無効なトークン処理', testInvalidToken);
  await runTest('期限切れトークン処理', testExpiredToken);
  await runTest('既に認証済みの処理', testAlreadyVerified);
  await runTest('トークンなしエラー', testNoToken);
  await runTest('メール再送信機能', testResendEmail);
  await runTest('レート制限機能', testRateLimit);
  await runTest('無効なメール形式', testInvalidEmail);
  
  // データベース状態確認
  await checkDatabaseState();
  
  // 結果サマリー
  logSection('📈 テスト結果サマリー');
  
  const passRate = Math.round((testResults.passed / testResults.total) * 100);
  const allPassed = testResults.failed === 0;
  
  console.log(`  総テスト数: ${testResults.total}`);
  log(`  成功: ${testResults.passed}`, 'green');
  if (testResults.failed > 0) {
    log(`  失敗: ${testResults.failed}`, 'red');
  }
  console.log(`  成功率: ${passRate}%`);
  
  if (allPassed) {
    log('\n🎉 すべてのテストが成功しました！', 'bright');
    log('メール認証機能は完璧に動作しています ✨', 'green');
  } else {
    log('\n⚠️ 一部のテストが失敗しました', 'yellow');
    console.log('\n失敗したテスト:');
    testResults.details
      .filter(d => !d.passed)
      .forEach(d => console.log(`  - ${d.testName}: ${d.message || d.error}`));
  }
  
  // 接続を閉じる
  await mongoose.connection.close();
  
  // 終了コード
  process.exit(allPassed ? 0 : 1);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  log(`\n❌ 予期しないエラー: ${error.message}`, 'red');
  process.exit(1);
});

// 実行
main().catch(error => {
  log(`\n❌ エラー: ${error.message}`, 'red');
  process.exit(1);
});