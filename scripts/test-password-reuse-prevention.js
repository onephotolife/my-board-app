const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const crypto = require('crypto');

// MongoDB接続設定
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// テスト用ユーザー情報
const TEST_USER_EMAIL = 'password-reuse-test@example.com';
const TEST_USER_NAME = 'パスワード再利用テストユーザー';
const ORIGINAL_PASSWORD = 'OriginalPassword123!@#';
const NEW_PASSWORD_1 = 'NewPassword456!@#';
const NEW_PASSWORD_2 = 'AnotherPassword789!@#';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');
  } catch (error) {
    console.error('❌ MongoDB接続失敗:', error.message);
    process.exit(1);
  }
}

async function createTestUser() {
  const User = require('../src/lib/models/User').default;
  
  // 既存のテストユーザーを削除
  await User.deleteOne({ email: TEST_USER_EMAIL });
  
  // パスワード履歴付きのテストユーザーを作成
  const hashedOriginal = await bcrypt.hash(ORIGINAL_PASSWORD, 12);
  const hashedHistory1 = await bcrypt.hash(NEW_PASSWORD_1, 12);
  const hashedHistory2 = await bcrypt.hash(NEW_PASSWORD_2, 12);
  
  const testUser = new User({
    email: TEST_USER_EMAIL,
    name: TEST_USER_NAME,
    password: hashedOriginal,
    emailVerified: true,
    passwordHistory: [
      { hash: hashedHistory1, changedAt: new Date(Date.now() - 86400000) }, // 1日前
      { hash: hashedHistory2, changedAt: new Date(Date.now() - 172800000) }, // 2日前
    ],
    lastPasswordChange: new Date(),
    passwordResetCount: 2,
  });
  
  await testUser.save();
  console.log('✅ テストユーザー作成完了');
  return testUser;
}

async function createPasswordResetToken(email) {
  const PasswordReset = require('../src/models/PasswordReset').default;
  
  // 既存のトークンを削除
  await PasswordReset.deleteMany({ email });
  
  const token = crypto.randomBytes(32).toString('hex');
  const resetRequest = new PasswordReset({
    email,
    token,
    expiresAt: new Date(Date.now() + 3600000), // 1時間後
    used: false,
  });
  
  await resetRequest.save();
  console.log('✅ パスワードリセットトークン生成完了');
  return token;
}

async function testPasswordReset(token, newPassword) {
  const baseUrl = 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'Test Script',
      },
      body: JSON.stringify({
        token,
        password: newPassword,
        confirmPassword: newPassword,
      }),
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error('API呼び出しエラー:', error.message);
    return { status: 500, data: { error: error.message } };
  }
}

async function runTests() {
  console.log('🔒 パスワード再利用防止テスト開始\n');
  console.log('='.repeat(50));
  
  await connectDB();
  
  const results = [];
  
  try {
    // テストユーザー作成
    const testUser = await createTestUser();
    
    // テスト1: 現在のパスワードと同じパスワードでリセット試行
    console.log('\n📝 テスト1: 現在のパスワードの再利用を拒否');
    const token1 = await createPasswordResetToken(TEST_USER_EMAIL);
    const result1 = await testPasswordReset(token1, ORIGINAL_PASSWORD);
    
    if (result1.status === 400 && result1.data.type === 'PASSWORD_REUSED') {
      console.log('  ✅ 成功: 現在のパスワードの再利用が拒否されました');
      console.log(`  メッセージ: ${result1.data.message}`);
      results.push({ test: '現在のパスワード再利用拒否', passed: true });
    } else {
      console.log('  ❌ 失敗: 現在のパスワードが受け入れられてしまいました');
      console.log(`  レスポンス: ${JSON.stringify(result1.data)}`);
      results.push({ test: '現在のパスワード再利用拒否', passed: false });
    }
    
    // テスト2: 履歴にあるパスワードでリセット試行
    console.log('\n📝 テスト2: 履歴パスワードの再利用を拒否');
    const token2 = await createPasswordResetToken(TEST_USER_EMAIL);
    const result2 = await testPasswordReset(token2, NEW_PASSWORD_1);
    
    if (result2.status === 400 && result2.data.type === 'PASSWORD_REUSED') {
      console.log('  ✅ 成功: 履歴パスワードの再利用が拒否されました');
      console.log(`  メッセージ: ${result2.data.message}`);
      results.push({ test: '履歴パスワード再利用拒否', passed: true });
    } else {
      console.log('  ❌ 失敗: 履歴パスワードが受け入れられてしまいました');
      console.log(`  レスポンス: ${JSON.stringify(result2.data)}`);
      results.push({ test: '履歴パスワード再利用拒否', passed: false });
    }
    
    // テスト3: 完全に新しいパスワードでリセット試行
    console.log('\n📝 テスト3: 新規パスワードの受け入れ');
    const token3 = await createPasswordResetToken(TEST_USER_EMAIL);
    const COMPLETELY_NEW_PASSWORD = 'CompletelyNew999!@#';
    const result3 = await testPasswordReset(token3, COMPLETELY_NEW_PASSWORD);
    
    if (result3.status === 200 && result3.data.success === true) {
      console.log('  ✅ 成功: 新規パスワードが正常に受け入れられました');
      console.log(`  メッセージ: ${result3.data.message}`);
      results.push({ test: '新規パスワード受け入れ', passed: true });
    } else {
      console.log('  ❌ 失敗: 新規パスワードが拒否されました');
      console.log(`  レスポンス: ${JSON.stringify(result3.data)}`);
      results.push({ test: '新規パスワード受け入れ', passed: false });
    }
    
    // テスト4: 更新後、新しく設定したパスワードの再利用を拒否
    console.log('\n📝 テスト4: 更新後パスワードの再利用を拒否');
    const token4 = await createPasswordResetToken(TEST_USER_EMAIL);
    const result4 = await testPasswordReset(token4, COMPLETELY_NEW_PASSWORD);
    
    if (result4.status === 400 && result4.data.type === 'PASSWORD_REUSED') {
      console.log('  ✅ 成功: 更新後パスワードの再利用が拒否されました');
      console.log(`  メッセージ: ${result4.data.message}`);
      results.push({ test: '更新後パスワード再利用拒否', passed: true });
    } else {
      console.log('  ❌ 失敗: 更新後パスワードが受け入れられてしまいました');
      console.log(`  レスポンス: ${JSON.stringify(result4.data)}`);
      results.push({ test: '更新後パスワード再利用拒否', passed: false });
    }
    
    // テスト5: セキュリティログの確認
    console.log('\n📝 テスト5: セキュリティログの記録確認');
    const AuditLog = require('../src/lib/security/audit-log').AuditLog;
    const reuseLogs = await AuditLog.countDocuments({
      event: 'PASSWORD_REUSE_ATTEMPT',
      email: TEST_USER_EMAIL,
    });
    
    if (reuseLogs >= 2) {
      console.log(`  ✅ 成功: パスワード再利用試行が${reuseLogs}件記録されています`);
      results.push({ test: 'セキュリティログ記録', passed: true });
    } else {
      console.log(`  ❌ 失敗: セキュリティログが不足しています (${reuseLogs}件)`);
      results.push({ test: 'セキュリティログ記録', passed: false });
    }
    
  } catch (error) {
    console.error('\n❌ テスト実行エラー:', error);
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(50));
  
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.test}`);
  });
  
  console.log('\n統計:');
  console.log(`✅ 成功: ${passedCount}/${results.length}`);
  console.log(`❌ 失敗: ${failedCount}/${results.length}`);
  
  const successRate = (passedCount / results.length * 100).toFixed(1);
  console.log(`\n成功率: ${successRate}%`);
  
  if (successRate === '100.0') {
    console.log('🎉 すべてのテストに合格！パスワード再利用防止機能は正常です。');
  } else {
    console.log('⚠️ 一部のテストが失敗しました。実装を確認してください。');
  }
  
  // クリーンアップ
  const User = require('../src/lib/models/User').default;
  const PasswordReset = require('../src/models/PasswordReset').default;
  await User.deleteOne({ email: TEST_USER_EMAIL });
  await PasswordReset.deleteMany({ email: TEST_USER_EMAIL });
  await AuditLog.deleteMany({ email: TEST_USER_EMAIL });
  
  console.log('\n✅ テストデータのクリーンアップ完了');
  
  await mongoose.disconnect();
  process.exit(successRate === '100.0' ? 0 : 1);
}

// 実行
if (require.main === module) {
  runTests().catch(error => {
    console.error('テスト実行失敗:', error);
    process.exit(1);
  });
}