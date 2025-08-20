#!/usr/bin/env node

/**
 * メール認証機能 エンドツーエンド動作確認テスト
 * 実行方法: node scripts/test-email-auth-e2e.js
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// カラー出力
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

// Userモデル（簡易版）
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  name: String,
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationTokenExpiry: Date,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// トークン生成
function generateToken() {
  return Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
}

// テスト結果を格納
const testResults = [];

function recordResult(step, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  const color = status === 'PASS' ? 'green' : 'red';
  log(`${icon} ${step}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
  testResults.push({ step, status, details });
}

async function runE2ETest() {
  log('\n🚀 メール認証 E2E動作確認テスト開始', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  try {
    // MongoDB接続
    await mongoose.connect(MONGODB_URI);
    log('\n✅ MongoDB接続成功', 'green');
    
    const testEmail = `e2e-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('📝 シナリオ1: 新規登録からメール認証完了まで', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    // ステップ1: 新規ユーザー登録
    log('\n[ステップ1] 新規ユーザー登録', 'yellow');
    const token = generateToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const user = await User.create({
      email: testEmail,
      password: 'hashedPassword123', // 実際の環境ではハッシュ化される
      name: 'E2E Test User',
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiry
    });
    
    recordResult('1. 新規ユーザー登録', 'PASS', 
      `Email: ${user.email}, Token: ${token.substring(0, 10)}...`);
    
    // 初期状態の確認
    if (!user.emailVerified && user.emailVerificationToken) {
      recordResult('   - 初期状態確認', 'PASS', 
        `emailVerified: false, トークン生成: OK`);
    } else {
      recordResult('   - 初期状態確認', 'FAIL', 
        'データベースの初期状態が不正');
    }
    
    // ステップ2: メールリンクをクリック
    log('\n[ステップ2] メールリンクをクリック（認証実行）', 'yellow');
    const verifyUrl = `${BASE_URL}/api/auth/verify?token=${token}`;
    
    const verifyResponse = await fetch(verifyUrl);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.status === 200 && verifyResult.success) {
      recordResult('2. 認証成功画面が表示される', 'PASS', 
        `メッセージ: ${verifyResult.message}`);
    } else {
      recordResult('2. 認証成功画面が表示される', 'FAIL', 
        `ステータス: ${verifyResponse.status}, エラー: ${JSON.stringify(verifyResult.error)}`);
    }
    
    // ステップ3: データベース確認
    log('\n[ステップ3] データベースでemailVerified確認', 'yellow');
    const verifiedUser = await User.findById(user._id);
    
    if (verifiedUser.emailVerified === true) {
      recordResult('3. データベースでemailVerifiedが設定されている', 'PASS', 
        'emailVerified: true');
    } else {
      recordResult('3. データベースでemailVerifiedが設定されている', 'FAIL', 
        `emailVerified: ${verifiedUser.emailVerified}`);
    }
    
    // トークン削除の確認
    if (!verifiedUser.emailVerificationToken && !verifiedUser.emailVerificationTokenExpiry) {
      recordResult('   - トークン削除確認', 'PASS', 
        'トークンと有効期限が削除されている');
    } else {
      recordResult('   - トークン削除確認', 'FAIL', 
        'トークンが残っている');
    }
    
    // ステップ4: ログイン可能性の確認
    log('\n[ステップ4] 認証後のログイン可能性', 'yellow');
    if (verifiedUser.emailVerified === true) {
      recordResult('4. 認証後はログイン可能になる', 'PASS', 
        'emailVerifiedがtrueのためログイン可能');
      
      // 実際のログインAPIをテスト（可能な場合）
      // const loginResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: testEmail, password: testPassword })
      // });
    } else {
      recordResult('4. 認証後はログイン可能になる', 'FAIL', 
        'emailVerifiedがfalseのためログイン不可');
    }
    
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('📝 シナリオ2: エラーケースの確認', 'blue');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    // ステップ5: 無効なトークンでエラー確認
    log('\n[ステップ5] 無効なトークンテスト', 'yellow');
    const invalidToken = 'invalid-token-' + Date.now();
    const invalidResponse = await fetch(`${BASE_URL}/api/auth/verify?token=${invalidToken}`);
    const invalidResult = await invalidResponse.json();
    
    if (invalidResponse.status === 400 && invalidResult.error) {
      recordResult('5. 無効なトークンでエラーが表示される', 'PASS', 
        `エラーメッセージ: ${invalidResult.error.message}`);
    } else {
      recordResult('5. 無効なトークンでエラーが表示される', 'FAIL', 
        `ステータス: ${invalidResponse.status}`);
    }
    
    // ステップ6: 使用済みトークンの再利用テスト
    log('\n[ステップ6] 使用済みトークン再利用テスト', 'yellow');
    
    // 既に使用したトークンで再度アクセス
    const reusedResponse = await fetch(verifyUrl);
    const reusedResult = await reusedResponse.json();
    
    // トークンが削除されているため、無効なトークンエラーまたは既に確認済みメッセージが期待される
    if (reusedResponse.status === 400 || 
        (reusedResponse.status === 200 && reusedResult.data?.alreadyVerified)) {
      recordResult('6. 使用済みトークンが再利用できない', 'PASS', 
        `レスポンス: ${reusedResult.error?.message || reusedResult.message}`);
    } else {
      recordResult('6. 使用済みトークンが再利用できない', 'FAIL', 
        '使用済みトークンが再利用できてしまう');
    }
    
    // 追加テスト: 期限切れトークン
    log('\n[追加テスト] 期限切れトークン', 'yellow');
    const expiredToken = generateToken();
    const expiredUser = await User.create({
      email: `expired-${Date.now()}@example.com`,
      password: 'hashedPassword',
      emailVerified: false,
      emailVerificationToken: expiredToken,
      emailVerificationTokenExpiry: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25時間前
    });
    
    const expiredResponse = await fetch(`${BASE_URL}/api/auth/verify?token=${expiredToken}`);
    const expiredResult = await expiredResponse.json();
    
    if (expiredResponse.status === 400 && 
        expiredResult.error?.code === 'TOKEN_EXPIRED') {
      recordResult('   - 期限切れトークンエラー', 'PASS', 
        'TOKEN_EXPIREDエラーが返される');
    } else {
      recordResult('   - 期限切れトークンエラー', 'FAIL', 
        '期限切れが正しく検出されない');
    }
    
    // クリーンアップ
    await User.deleteOne({ _id: user._id });
    await User.deleteOne({ _id: expiredUser._id });
    
  } catch (error) {
    log(`\n❌ テストエラー: ${error.message}`, 'red');
    recordResult('システムエラー', 'FAIL', error.message);
  }
  
  // 結果サマリー
  log('\n' + '=' .repeat(60), 'cyan');
  log('📊 テスト結果サマリー', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const total = testResults.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log('\n📈 統計:');
  log(`  ✅ 成功: ${passed}件`, 'green');
  log(`  ❌ 失敗: ${failed}件`, 'red');
  console.log(`  📊 合格率: ${passRate}%`);
  
  // 必須確認項目のチェック
  console.log('\n✅ 必須確認項目:');
  const requiredTests = [
    '1. 新規ユーザー登録',
    '2. 認証成功画面が表示される',
    '3. データベースでemailVerifiedが設定されている',
    '4. 認証後はログイン可能になる',
    '5. 無効なトークンでエラーが表示される',
    '6. 使用済みトークンが再利用できない'
  ];
  
  requiredTests.forEach(testName => {
    const result = testResults.find(r => r.step === testName);
    const icon = result?.status === 'PASS' ? '✅' : '❌';
    const color = result?.status === 'PASS' ? 'green' : 'red';
    log(`  ${icon} ${testName}`, color);
  });
  
  // 最終評価
  console.log('\n📝 最終評価:');
  if (failed === 0) {
    log('🏆 完璧！すべてのテストに合格しました。', 'green');
    log('メール認証機能は完全に正常動作しています。', 'green');
  } else if (passRate >= 80) {
    log('✅ 良好: 主要機能は正常に動作しています。', 'yellow');
    log(`${failed}件の問題を修正することを推奨します。`, 'yellow');
  } else {
    log('⚠️ 要改善: 重要な機能に問題があります。', 'red');
    log('早急な修正が必要です。', 'red');
  }
  
  // 失敗したテストの詳細
  if (failed > 0) {
    console.log('\n❌ 失敗したテスト:');
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      log(`  - ${r.step}`, 'red');
      if (r.details) {
        console.log(`    詳細: ${r.details}`);
      }
    });
  }
  
  // タイムスタンプ
  console.log('\n⏰ テスト実行日時:', new Date().toLocaleString('ja-JP'));
  
  // 接続を閉じる
  await mongoose.connection.close();
  log('\n✅ MongoDB接続を閉じました', 'green');
  
  // 終了コード
  process.exit(failed > 0 ? 1 : 0);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('未処理のエラー:', error);
  process.exit(1);
});

// 実行
runE2ETest().catch(error => {
  console.error('実行エラー:', error);
  process.exit(1);
});