#!/usr/bin/env node

/**
 * テストアカウント作成スクリプト
 * 20人天才エンジニア会議により設計
 * 
 * 使用方法: node scripts/create-test-accounts.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// カラー出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Userスキーマ定義（既存モデルと同じ）
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  avatar: {
    type: String,
    default: ''
  },
  emailVerified: { 
    type: Boolean, 
    default: false 
  },
  emailVerificationToken: String,
  emailVerificationTokenExpiry: Date,
  passwordResetToken: String,
  passwordResetTokenExpiry: Date,
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, { 
  timestamps: true 
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// テストアカウントデータ
const testAccounts = [
  {
    email: 'verified@test.com',
    password: 'Test123!',
    name: 'Verified User',
    bio: 'テスト用の確認済みユーザーです',
    emailVerified: true,
    role: 'user',
    description: '✅ メール確認済み通常ユーザー'
  },
  {
    email: 'unverified@test.com',
    password: 'Test123!',
    name: 'Unverified User',
    bio: 'テスト用の未確認ユーザーです',
    emailVerified: false,
    emailVerificationToken: crypto.randomBytes(32).toString('hex'),
    emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    role: 'user',
    description: '❌ メール未確認ユーザー'
  },
  {
    email: 'admin@test.com',
    password: 'Admin123!',
    name: 'Admin User',
    bio: 'テスト用の管理者ユーザーです',
    emailVerified: true,
    role: 'admin',
    description: '👑 管理者権限ユーザー'
  },
  {
    email: 'locked@test.com',
    password: 'Locked123!',
    name: 'Locked User',
    bio: 'テスト用のロックされたユーザーです',
    emailVerified: true,
    loginAttempts: 5,
    lockUntil: new Date(Date.now() + 60 * 60 * 1000), // 1時間後まで
    role: 'user',
    description: '🔒 ログイン試行超過でロック中'
  },
  {
    email: 'expired@test.com',
    password: 'Expired123!',
    name: 'Expired Token User',
    bio: 'テスト用の期限切れトークンユーザーです',
    emailVerified: false,
    emailVerificationToken: crypto.randomBytes(32).toString('hex'),
    emailVerificationTokenExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前
    role: 'user',
    description: '⏰ トークン期限切れユーザー'
  }
];

async function createTestAccounts() {
  try {
    log('\n🚀 テストアカウント作成スクリプト開始\n', 'cyan');
    
    // MongoDB接続
    log('📦 MongoDBに接続中...', 'blue');
    await mongoose.connect(MONGODB_URI);
    log('✅ MongoDB接続成功\n', 'green');
    
    // 既存のテストアカウントを削除（オプション）
    log('🧹 既存のテストアカウントをクリーンアップ中...', 'yellow');
    const testEmails = testAccounts.map(acc => acc.email);
    const deleteResult = await User.deleteMany({ email: { $in: testEmails } });
    log(`  削除されたアカウント数: ${deleteResult.deletedCount}\n`, 'yellow');
    
    // 各アカウントを作成
    log('👥 テストアカウントを作成中...\n', 'blue');
    
    for (const accountData of testAccounts) {
      try {
        // パスワードのハッシュ化
        const hashedPassword = await bcrypt.hash(accountData.password, 10);
        
        // descriptionを除いたデータでユーザー作成
        const { description, password, ...userData } = accountData;
        const user = new User({
          ...userData,
          password: hashedPassword
        });
        
        await user.save();
        
        log(`  ${description}`, 'green');
        log(`    📧 Email: ${accountData.email}`, 'reset');
        log(`    🔑 Password: ${accountData.password}`, 'reset');
        log(`    👤 Name: ${accountData.name}`, 'reset');
        log(`    ✉️  Verified: ${accountData.emailVerified ? 'Yes' : 'No'}`, 'reset');
        log(`    🛡️  Role: ${accountData.role}`, 'reset');
        
        if (accountData.lockUntil) {
          log(`    🔒 Locked until: ${accountData.lockUntil.toLocaleString()}`, 'yellow');
        }
        if (accountData.emailVerificationToken) {
          log(`    🎫 Verification token: ${accountData.emailVerificationToken.substring(0, 10)}...`, 'reset');
        }
        console.log('');
        
      } catch (error) {
        log(`  ❌ エラー: ${accountData.email} - ${error.message}`, 'red');
      }
    }
    
    // 統計情報
    log('📊 作成完了統計:', 'cyan');
    const createdUsers = await User.find({ email: { $in: testEmails } });
    log(`  ✅ 作成成功: ${createdUsers.length}アカウント`, 'green');
    log(`  📧 確認済み: ${createdUsers.filter(u => u.emailVerified).length}アカウント`, 'green');
    log(`  ❌ 未確認: ${createdUsers.filter(u => !u.emailVerified).length}アカウント`, 'yellow');
    log(`  👑 管理者: ${createdUsers.filter(u => u.role === 'admin').length}アカウント`, 'blue');
    
    // テスト手順の表示
    console.log('\n' + '='.repeat(60));
    log('🧪 テスト実行手順:', 'cyan');
    console.log('='.repeat(60));
    console.log('\n1. アプリケーションを起動:');
    log('   npm run dev', 'blue');
    console.log('\n2. ブラウザでアクセス:');
    log('   http://localhost:3000/auth/signin', 'blue');
    console.log('\n3. 以下のアカウントでテスト:');
    
    testAccounts.forEach(acc => {
      console.log(`\n   ${acc.description}:`);
      console.log(`   - Email: ${acc.email}`);
      console.log(`   - Password: ${acc.password}`);
    });
    
    console.log('\n4. 詳細なテスト手順:');
    log('   cat LOGIN_TEST_GUIDE.md', 'blue');
    
    console.log('\n' + '='.repeat(60));
    log('✨ すべてのテストアカウントが準備完了しました！', 'green');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    log(`\n❌ エラーが発生しました: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    // MongoDB接続を閉じる
    await mongoose.connection.close();
    log('🔌 MongoDB接続を閉じました', 'blue');
  }
}

// 実行
createTestAccounts().catch(console.error);