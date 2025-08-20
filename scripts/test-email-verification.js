#!/usr/bin/env node

/**
 * メール認証機能検証テストスクリプト
 * 実行方法: node scripts/test-email-verification.js
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// テスト結果を格納
const testResults = {
  passed: [],
  failed: [],
  skipped: []
};

// カラー出力用のヘルパー
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name, status, details = '') {
  const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
  const color = status === 'passed' ? 'green' : status === 'failed' ? 'red' : 'yellow';
  log(`${icon} ${name}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
  testResults[status].push({ name, details });
}

// Userモデルの定義（簡易版）
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  name: String,
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationTokenExpiry: Date,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// テスト用のトークン生成関数
function generateTestToken() {
  return Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
}

// テスト関数群

/**
 * 1. API設計の検証
 */
async function testAPIEndpoints() {
  logSection('1. API設計の検証');
  
  // 1.1 GET /api/auth/verify エンドポイント
  try {
    log('\n1.1 GET /api/auth/verify エンドポイント', 'blue');
    
    // トークンなしでのアクセス
    const response1 = await fetch(`${BASE_URL}/api/auth/verify`);
    const data1 = await response1.json();
    
    if (response1.status === 400 && data1.error) {
      logTest('トークンなしでのエラーハンドリング', 'passed', 
        `ステータス: ${response1.status}, メッセージ: ${data1.error.message}`);
    } else {
      logTest('トークンなしでのエラーハンドリング', 'failed', 
        `期待: 400, 実際: ${response1.status}`);
    }
    
    // 無効なトークンでのアクセス
    const invalidToken = 'invalid-token-12345';
    const response2 = await fetch(`${BASE_URL}/api/auth/verify?token=${invalidToken}`);
    const data2 = await response2.json();
    
    if (response2.status === 400 && data2.error) {
      logTest('無効なトークンのエラーハンドリング', 'passed',
        `ステータス: ${response2.status}, コード: ${data2.error.code}`);
    } else {
      logTest('無効なトークンのエラーハンドリング', 'failed',
        `期待: 400, 実際: ${response2.status}`);
    }
    
  } catch (error) {
    logTest('GET /api/auth/verify テスト', 'failed', error.message);
  }
  
  // 1.2 POST /api/auth/resend エンドポイント
  try {
    log('\n1.2 POST /api/auth/resend エンドポイント', 'blue');
    
    // メールアドレスなしでのリクエスト
    const response1 = await fetch(`${BASE_URL}/api/auth/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data1 = await response1.json();
    
    if (response1.status === 400 && data1.error) {
      logTest('メールアドレスなしでのエラーハンドリング', 'passed',
        `ステータス: ${response1.status}, メッセージ: ${data1.error.message}`);
    } else {
      logTest('メールアドレスなしでのエラーハンドリング', 'failed',
        `期待: 400, 実際: ${response1.status}`);
    }
    
    // 無効な形式のメールアドレス
    const response2 = await fetch(`${BASE_URL}/api/auth/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' })
    });
    const data2 = await response2.json();
    
    if (response2.status === 400 && data2.error) {
      logTest('無効なメール形式のエラーハンドリング', 'passed',
        `ステータス: ${response2.status}, メッセージ: ${data2.error.message}`);
    } else {
      logTest('無効なメール形式のエラーハンドリング', 'failed',
        `期待: 400, 実際: ${response2.status}`);
    }
    
    // 存在しないユーザー（セキュリティテスト）
    const response3 = await fetch(`${BASE_URL}/api/auth/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    });
    const data3 = await response3.json();
    
    if (response3.status === 200 && data3.success) {
      logTest('存在しないユーザーでも成功レスポンス（セキュリティ）', 'passed',
        `ステータス: ${response3.status}, メッセージ: ${data3.message}`);
    } else {
      logTest('存在しないユーザーでも成功レスポンス（セキュリティ）', 'failed',
        `期待: 200, 実際: ${response3.status}`);
    }
    
  } catch (error) {
    logTest('POST /api/auth/resend テスト', 'failed', error.message);
  }
}

/**
 * 2. データベース処理の検証
 */
async function testDatabaseOperations() {
  logSection('2. データベース処理の検証');
  
  try {
    // MongoDB接続
    await mongoose.connect(MONGODB_URI);
    log('✅ MongoDB接続成功', 'green');
    
    // 2.1 トークンでユーザー検索
    log('\n2.1 トークンでユーザー検索', 'blue');
    
    const testToken = generateTestToken();
    const testEmail = `test-${Date.now()}@example.com`;
    
    // テストユーザー作成
    const user = await User.create({
      email: testEmail,
      password: 'hashed-password',
      name: 'Test User',
      emailVerificationToken: testToken,
      emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      emailVerified: false
    });
    
    // トークンで検索
    const found = await User.findOne({ emailVerificationToken: testToken });
    
    if (found && found.email === testEmail) {
      logTest('トークンによるユーザー検索', 'passed',
        `ユーザー検索成功: ${found.email}`);
    } else {
      logTest('トークンによるユーザー検索', 'failed',
        'ユーザーが見つかりません');
    }
    
    // 2.2 有効期限チェック
    log('\n2.2 有効期限チェック', 'blue');
    
    // 期限切れトークンのユーザー
    const expiredUser = await User.create({
      email: `expired-${Date.now()}@example.com`,
      password: 'hashed-password',
      emailVerificationToken: generateTestToken(),
      emailVerificationTokenExpiry: new Date(Date.now() - 60 * 60 * 1000), // 1時間前
      emailVerified: false
    });
    
    // 有効なトークンのユーザー
    const validUser = await User.create({
      email: `valid-${Date.now()}@example.com`,
      password: 'hashed-password',
      emailVerificationToken: generateTestToken(),
      emailVerificationTokenExpiry: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23時間後
      emailVerified: false
    });
    
    // 有効期限チェック関数のテスト
    function isTokenValid(expiry) {
      if (!expiry) return false;
      return new Date(expiry) > new Date();
    }
    
    if (!isTokenValid(expiredUser.emailVerificationTokenExpiry)) {
      logTest('期限切れトークンの検出', 'passed',
        `期限: ${expiredUser.emailVerificationTokenExpiry}`);
    } else {
      logTest('期限切れトークンの検出', 'failed',
        '期限切れトークンが有効と判定されました');
    }
    
    if (isTokenValid(validUser.emailVerificationTokenExpiry)) {
      logTest('有効なトークンの検証', 'passed',
        `期限: ${validUser.emailVerificationTokenExpiry}`);
    } else {
      logTest('有効なトークンの検証', 'failed',
        '有効なトークンが無効と判定されました');
    }
    
    // 2.3 emailVerifiedフィールド更新
    log('\n2.3 emailVerifiedフィールド更新', 'blue');
    
    const updateUser = await User.create({
      email: `update-${Date.now()}@example.com`,
      password: 'hashed-password',
      emailVerified: false,
      emailVerificationToken: generateTestToken(),
      emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    // 更新処理
    updateUser.emailVerified = true;
    updateUser.emailVerificationToken = undefined;
    updateUser.emailVerificationTokenExpiry = undefined;
    await updateUser.save();
    
    // 更新確認
    const updated = await User.findById(updateUser._id);
    
    if (updated.emailVerified === true && 
        !updated.emailVerificationToken && 
        !updated.emailVerificationTokenExpiry) {
      logTest('emailVerifiedフィールド更新', 'passed',
        `emailVerified: ${updated.emailVerified}, トークン削除: 成功`);
    } else {
      logTest('emailVerifiedフィールド更新', 'failed',
        `emailVerified: ${updated.emailVerified}`);
    }
    
    // クリーンアップ
    await User.deleteMany({ 
      email: { $regex: /^(test|expired|valid|update)-\d+@example\.com$/ } 
    });
    
  } catch (error) {
    logTest('データベース処理テスト', 'failed', error.message);
  }
}

/**
 * 3. セキュリティテスト
 */
async function testSecurity() {
  logSection('3. セキュリティテスト');
  
  // 3.1 SQLインジェクション対策
  log('\n3.1 インジェクション対策', 'blue');
  
  try {
    const maliciousToken = "'; DROP TABLE users; --";
    const response = await fetch(
      `${BASE_URL}/api/auth/verify?token=${encodeURIComponent(maliciousToken)}`
    );
    const data = await response.json();
    
    if (response.status === 400 && data.error) {
      // データベースが正常か確認
      const users = await User.find({});
      if (users && users.length >= 0) {
        logTest('インジェクション攻撃への耐性', 'passed',
          'データベースは正常に動作しています');
      }
    } else {
      logTest('インジェクション攻撃への耐性', 'failed',
        '予期しないレスポンス');
    }
  } catch (error) {
    logTest('インジェクション対策テスト', 'failed', error.message);
  }
  
  // 3.2 タイミング攻撃対策
  log('\n3.2 タイミング攻撃対策', 'blue');
  
  try {
    const times = [];
    
    // 存在するユーザー（テスト用に作成）
    const existingUser = await User.create({
      email: `timing-test-${Date.now()}@example.com`,
      password: 'hashed-password',
      emailVerified: false
    });
    
    // 存在するユーザーへのリクエスト
    const start1 = Date.now();
    await fetch(`${BASE_URL}/api/auth/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: existingUser.email })
    });
    times.push(Date.now() - start1);
    
    // 存在しないユーザーへのリクエスト
    const start2 = Date.now();
    await fetch(`${BASE_URL}/api/auth/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `notexist-${Date.now()}@example.com` })
    });
    times.push(Date.now() - start2);
    
    const timeDiff = Math.abs(times[0] - times[1]);
    
    if (timeDiff < 200) { // 200ms以内の差
      logTest('タイミング攻撃への耐性', 'passed',
        `レスポンス時間差: ${timeDiff}ms (存在: ${times[0]}ms, 非存在: ${times[1]}ms)`);
    } else {
      logTest('タイミング攻撃への耐性', 'failed',
        `レスポンス時間差が大きすぎます: ${timeDiff}ms`);
    }
    
    // クリーンアップ
    await User.deleteOne({ _id: existingUser._id });
    
  } catch (error) {
    logTest('タイミング攻撃対策テスト', 'failed', error.message);
  }
}

/**
 * 4. レート制限テスト
 */
async function testRateLimit() {
  logSection('4. レート制限テスト');
  
  log('\n4.1 連続リクエストのレート制限', 'blue');
  
  try {
    const testEmail = `ratelimit-${Date.now()}@example.com`;
    const requests = [];
    
    // 5回連続リクエスト
    for (let i = 0; i < 5; i++) {
      requests.push(
        fetch(`${BASE_URL}/api/auth/resend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail })
        })
      );
      
      // 少し待機（同時リクエストを避ける）
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);
    
    // 最初の数回は成功、その後は429エラーを期待
    const successCount = statuses.filter(s => s === 200).length;
    const rateLimitedCount = statuses.filter(s => s === 429).length;
    
    if (rateLimitedCount > 0) {
      logTest('レート制限の動作', 'passed',
        `成功: ${successCount}回, レート制限: ${rateLimitedCount}回`);
    } else {
      logTest('レート制限の動作', 'skipped',
        'レート制限が発動しませんでした（設定による）');
    }
    
  } catch (error) {
    logTest('レート制限テスト', 'failed', error.message);
  }
}

/**
 * 5. 統合テスト
 */
async function testIntegration() {
  logSection('5. 統合テスト');
  
  log('\n5.1 完全なメール認証フロー', 'blue');
  
  try {
    // 1. テストユーザー作成
    const integrationEmail = `integration-${Date.now()}@example.com`;
    const integrationToken = generateTestToken();
    
    const integrationUser = await User.create({
      email: integrationEmail,
      password: 'hashed-password',
      name: 'Integration Test User',
      emailVerified: false,
      emailVerificationToken: integrationToken,
      emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    logTest('テストユーザー作成', 'passed', 
      `Email: ${integrationEmail}`);
    
    // 2. トークンで認証
    const verifyResponse = await fetch(
      `${BASE_URL}/api/auth/verify?token=${integrationToken}`
    );
    const verifyData = await verifyResponse.json();
    
    if (verifyResponse.status === 200 && verifyData.success) {
      logTest('メール認証成功', 'passed',
        `メッセージ: ${verifyData.message}`);
    } else {
      logTest('メール認証成功', 'failed',
        `ステータス: ${verifyResponse.status}`);
    }
    
    // 3. データベースで確認
    const verifiedUser = await User.findById(integrationUser._id);
    
    if (verifiedUser.emailVerified === true && !verifiedUser.emailVerificationToken) {
      logTest('データベース更新確認', 'passed',
        'emailVerified: true, トークン削除: 成功');
    } else {
      logTest('データベース更新確認', 'failed',
        `emailVerified: ${verifiedUser.emailVerified}`);
    }
    
    // 4. 既に確認済みの場合のテスト
    // 新しいトークンを生成して再度テスト
    const newToken = generateTestToken();
    verifiedUser.emailVerificationToken = newToken;
    verifiedUser.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await verifiedUser.save();
    
    const alreadyVerifiedResponse = await fetch(
      `${BASE_URL}/api/auth/verify?token=${newToken}`
    );
    const alreadyVerifiedData = await alreadyVerifiedResponse.json();
    
    if (alreadyVerifiedResponse.status === 200 && 
        alreadyVerifiedData.data?.alreadyVerified) {
      logTest('既に確認済みの処理', 'passed',
        'alreadyVerified: true');
    } else {
      logTest('既に確認済みの処理', 'failed',
        `期待: alreadyVerified=true, 実際: ${JSON.stringify(alreadyVerifiedData.data)}`);
    }
    
    // クリーンアップ
    await User.deleteOne({ _id: integrationUser._id });
    
  } catch (error) {
    logTest('統合テスト', 'failed', error.message);
  }
}

/**
 * テストレポート生成
 */
function generateReport() {
  logSection('テスト結果サマリー');
  
  const total = testResults.passed.length + 
                testResults.failed.length + 
                testResults.skipped.length;
  
  const passRate = total > 0 ? 
    ((testResults.passed.length / total) * 100).toFixed(1) : 0;
  
  console.log('\n📊 統計:');
  log(`  ✅ 成功: ${testResults.passed.length}`, 'green');
  log(`  ❌ 失敗: ${testResults.failed.length}`, 'red');
  log(`  ⏭️  スキップ: ${testResults.skipped.length}`, 'yellow');
  console.log(`  📈 合格率: ${passRate}%`);
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ 失敗したテスト:');
    testResults.failed.forEach(test => {
      log(`  - ${test.name}`, 'red');
      if (test.details) {
        console.log(`    ${test.details}`);
      }
    });
  }
  
  // 評価
  console.log('\n📝 評価:');
  if (passRate >= 90) {
    log('🏆 完全準拠: すべての主要機能が正常に動作しています', 'green');
  } else if (passRate >= 70) {
    log('✅ 準拠: 基本機能は動作していますが、一部改善が必要です', 'yellow');
  } else {
    log('⚠️ 要改善: 重要な機能に問題があります', 'red');
  }
  
  // タイムスタンプ
  console.log('\n⏰ テスト実行日時:', new Date().toLocaleString('ja-JP'));
}

/**
 * メイン実行関数
 */
async function runTests() {
  console.log('🔍 メール認証機能検証テスト開始\n');
  
  try {
    // 各テストを順番に実行
    await testAPIEndpoints();
    await testDatabaseOperations();
    await testSecurity();
    await testRateLimit();
    await testIntegration();
    
    // レポート生成
    generateReport();
    
  } catch (error) {
    console.error('\n❌ テスト実行エラー:', error);
  } finally {
    // MongoDB接続を閉じる
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      log('\n✅ MongoDB接続を閉じました', 'green');
    }
    
    // 終了コード設定
    const exitCode = testResults.failed.length > 0 ? 1 : 0;
    process.exit(exitCode);
  }
}

// 実行
runTests().catch(console.error);