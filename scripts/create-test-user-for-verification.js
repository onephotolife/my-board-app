#!/usr/bin/env node

/**
 * メール認証テスト用ユーザー作成スクリプト
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Userスキーマ定義（src/lib/models/User.tsと同じ）
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationTokenExpiry: {
    type: Date,
  },
  emailSendFailed: {
    type: Boolean,
    default: false,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
}, {
  timestamps: true,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// テストユーザーのデータ
const testUsers = [
  {
    email: 'test-valid@example.com',
    name: '有効トークンユーザー',
    password: 'Test123!@#',
    scenario: '正常な認証フロー用',
    tokenValid: true,
    emailVerified: false,
  },
  {
    email: 'test-expired@example.com',
    name: '期限切れトークンユーザー',
    password: 'Test123!@#',
    scenario: '期限切れトークンテスト用',
    tokenExpired: true,
    emailVerified: false,
  },
  {
    email: 'test-verified@example.com',
    name: '認証済みユーザー',
    password: 'Test123!@#',
    scenario: '既に認証済みテスト用',
    tokenValid: true,
    emailVerified: true,
  },
  {
    email: 'test-resend@example.com',
    name: '再送信テストユーザー',
    password: 'Test123!@#',
    scenario: 'メール再送信テスト用',
    tokenValid: false,
    emailVerified: false,
  },
];

async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    await mongoose.connect(MONGODB_URI);
    log('✅ データベース接続成功', 'green');
  } catch (error) {
    log(`❌ データベース接続失敗: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function createTestUsers() {
  const createdUsers = [];

  for (const userData of testUsers) {
    try {
      // 既存ユーザーを削除
      await User.deleteOne({ email: userData.email });

      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // トークンと有効期限を設定
      let token = null;
      let expiry = null;

      if (userData.tokenValid) {
        token = crypto.randomBytes(32).toString('hex');
        expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後
      } else if (userData.tokenExpired) {
        token = crypto.randomBytes(32).toString('hex');
        expiry = new Date(Date.now() - 60 * 60 * 1000); // 1時間前（期限切れ）
      }

      // ユーザー作成
      const user = await User.create({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        emailVerified: userData.emailVerified,
        emailVerificationToken: token,
        emailVerificationTokenExpiry: expiry,
      });

      createdUsers.push({
        email: user.email,
        name: user.name,
        scenario: userData.scenario,
        emailVerified: user.emailVerified,
        token: token,
        tokenExpiry: expiry,
      });

      log(`✅ 作成: ${user.email} - ${userData.scenario}`, 'green');
      if (token) {
        log(`   トークン: ${token}`, 'cyan');
        log(`   有効期限: ${expiry}`, 'cyan');
      }
    } catch (error) {
      log(`❌ エラー: ${userData.email} - ${error.message}`, 'red');
    }
  }

  return createdUsers;
}

async function main() {
  log('\n🚀 テストユーザー作成スクリプト開始\n', 'bright');

  await connectDB();

  log('\n📝 テストユーザーを作成中...\n', 'yellow');
  const users = await createTestUsers();

  log('\n✅ テストユーザー作成完了!\n', 'bright');
  
  // テスト用URL生成
  log('📋 テスト用URL:', 'yellow');
  console.log('');
  
  users.forEach(user => {
    if (user.token) {
      const url = `http://localhost:3000/auth/verify?token=${user.token}`;
      log(`${user.scenario}:`, 'cyan');
      console.log(`  ${url}`);
      console.log('');
    }
  });

  log('📊 作成されたユーザー:', 'yellow');
  console.table(users.map(u => ({
    Email: u.email,
    Name: u.name,
    Scenario: u.scenario,
    Verified: u.emailVerified ? '✅' : '❌',
    'Has Token': u.token ? '✅' : '❌',
  })));

  await mongoose.connection.close();
  log('\n✨ 完了!', 'green');
}

main().catch(error => {
  log(`❌ エラー: ${error.message}`, 'red');
  process.exit(1);
});