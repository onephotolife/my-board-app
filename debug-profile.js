// プロフィール機能デバッグスクリプト
// APIエンドポイントと認証の動作確認

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// APIテスト関数
async function testProfileAPI() {
  log('\n=== プロフィールAPI デバッグ ===\n', 'cyan');

  // 1. 認証なしでアクセス
  log('1. 認証なしでプロフィールAPIにアクセス...', 'yellow');
  try {
    const res1 = await fetch(`${BASE_URL}/api/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    log(`   Status: ${res1.status} ${res1.statusText}`, res1.status === 401 ? 'green' : 'red');
    
    if (res1.status === 401) {
      log('   ✅ 正常: 認証が必要です', 'green');
    } else {
      log('   ⚠️  問題: 認証なしでアクセスできてしまっています', 'red');
    }
    
    const data1 = await res1.json().catch(() => null);
    if (data1) {
      log(`   Response: ${JSON.stringify(data1)}`, 'blue');
    }
  } catch (error) {
    log(`   ❌ エラー: ${error.message}`, 'red');
  }

  // 2. プロフィール更新のバリデーション
  log('\n2. プロフィール更新APIのバリデーションテスト...', 'yellow');
  
  const invalidPayloads = [
    { name: '', bio: 'テスト' }, // 空の名前
    { name: 'a'.repeat(51), bio: 'テスト' }, // 長すぎる名前
    { name: 'テスト', bio: 'a'.repeat(201) }, // 長すぎる自己紹介
    { bio: 'テスト' }, // 名前なし
  ];

  for (const payload of invalidPayloads) {
    try {
      const res = await fetch(`${BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const expectError = res.status === 400 || res.status === 401;
      log(`   Payload: ${JSON.stringify(payload)}`, 'blue');
      log(`   Status: ${res.status} - ${expectError ? '✅ 期待通り' : '⚠️  予期しない'}`, expectError ? 'green' : 'red');
    } catch (error) {
      log(`   ❌ エラー: ${error.message}`, 'red');
    }
  }

  // 3. パスワード変更APIのテスト
  log('\n3. パスワード変更APIのバリデーションテスト...', 'yellow');
  
  const passwordPayloads = [
    { currentPassword: 'test', newPassword: 'short' }, // 短すぎる
    { currentPassword: 'test', newPassword: 'password123' }, // 複雑性不足
    { currentPassword: '', newPassword: 'Test1234!' }, // 現在のパスワードなし
    { newPassword: 'Test1234!' }, // currentPasswordなし
  ];

  for (const payload of passwordPayloads) {
    try {
      const res = await fetch(`${BASE_URL}/api/profile/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const expectError = res.status === 400 || res.status === 401;
      log(`   Payload: ${JSON.stringify(payload)}`, 'blue');
      log(`   Status: ${res.status} - ${expectError ? '✅ 期待通り' : '⚠️  予期しない'}`, expectError ? 'green' : 'red');
      
      const data = await res.json().catch(() => null);
      if (data?.error) {
        log(`   Error Message: ${data.error}`, 'magenta');
      }
    } catch (error) {
      log(`   ❌ エラー: ${error.message}`, 'red');
    }
  }
}

// MongoDBの接続確認
async function checkMongoDB() {
  log('\n=== MongoDB接続確認 ===\n', 'cyan');
  
  const mongoose = require('mongoose');
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
  
  try {
    await mongoose.connect(MONGODB_URI);
    log('✅ MongoDB接続成功', 'green');
    
    // コレクション一覧
    const collections = await mongoose.connection.db.listCollections().toArray();
    log('\n📁 コレクション一覧:', 'yellow');
    collections.forEach(col => {
      log(`   - ${col.name}`, 'blue');
    });
    
    // Usersコレクションの確認
    const User = mongoose.connection.collection('users');
    const userCount = await User.countDocuments();
    log(`\n👥 ユーザー数: ${userCount}`, 'yellow');
    
    // テストユーザーの確認
    const testUser = await User.findOne({ email: 'profile.test@example.com' });
    if (testUser) {
      log('✅ テストユーザーが存在します', 'green');
      log(`   Name: ${testUser.name}`, 'blue');
      log(`   Email Verified: ${testUser.emailVerified}`, 'blue');
      log(`   Has Password: ${!!testUser.password}`, 'blue');
    } else {
      log('⚠️  テストユーザーが見つかりません', 'red');
      log('   test-profile-setup.js を実行してください', 'yellow');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    log(`❌ MongoDB接続エラー: ${error.message}`, 'red');
    log('   MongoDBが起動しているか確認してください', 'yellow');
  }
}

// 環境変数の確認
function checkEnvironment() {
  log('\n=== 環境変数確認 ===\n', 'cyan');
  
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'MONGODB_URI',
  ];
  
  const optionalEnvVars = [
    'EMAIL_SERVER_HOST',
    'EMAIL_SERVER_PORT',
    'EMAIL_SERVER_USER',
    'EMAIL_SERVER_PASSWORD',
  ];
  
  log('必須環境変数:', 'yellow');
  requiredEnvVars.forEach(varName => {
    const exists = !!process.env[varName];
    log(`   ${varName}: ${exists ? '✅ 設定済み' : '❌ 未設定'}`, exists ? 'green' : 'red');
  });
  
  log('\nオプション環境変数:', 'yellow');
  optionalEnvVars.forEach(varName => {
    const exists = !!process.env[varName];
    log(`   ${varName}: ${exists ? '✅ 設定済み' : '⚠️  未設定'}`, exists ? 'green' : 'yellow');
  });
}

// パフォーマンステスト
async function performanceTest() {
  log('\n=== パフォーマンステスト ===\n', 'cyan');
  
  const endpoints = [
    { method: 'GET', path: '/api/profile', name: 'プロフィール取得' },
    { method: 'PUT', path: '/api/profile', name: 'プロフィール更新' },
    { method: 'PUT', path: '/api/profile/password', name: 'パスワード変更' },
  ];
  
  for (const endpoint of endpoints) {
    const start = Date.now();
    
    try {
      const res = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: endpoint.method === 'PUT' ? JSON.stringify({
          name: 'テスト',
          bio: 'テスト',
          currentPassword: 'test',
          newPassword: 'Test1234!',
        }) : undefined,
      });
      
      const time = Date.now() - start;
      const status = res.status;
      
      log(`${endpoint.name}:`, 'yellow');
      log(`   Status: ${status}`, status < 500 ? 'green' : 'red');
      log(`   Response Time: ${time}ms ${time < 1000 ? '✅' : time < 2000 ? '⚠️' : '❌'}`, 
          time < 1000 ? 'green' : time < 2000 ? 'yellow' : 'red');
    } catch (error) {
      log(`${endpoint.name}: ❌ エラー`, 'red');
    }
  }
}

// メイン実行関数
async function main() {
  log('🔍 プロフィール機能デバッグツール', 'magenta');
  log('====================================\n', 'magenta');
  
  // 環境変数チェック
  checkEnvironment();
  
  // MongoDB接続確認
  await checkMongoDB();
  
  // API動作確認
  await testProfileAPI();
  
  // パフォーマンステスト
  await performanceTest();
  
  log('\n====================================', 'magenta');
  log('✨ デバッグ完了\n', 'magenta');
}

// 実行
main().catch(error => {
  log(`\n致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});