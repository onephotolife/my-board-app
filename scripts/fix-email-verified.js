#!/usr/bin/env node

/**
 * Phase 2: emailVerified問題修正スクリプト
 * 
 * 目的:
 * - 既存ユーザーのemailVerifiedフィールドを修正
 * - undefined/nullの値をtrueに更新
 * - テストユーザーの確認状態を正常化
 */

const mongoose = require('mongoose');
require('dotenv').config();

// User モデルの定義
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  lastLogin: Date,
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function fixEmailVerified() {
  console.log('🔧 Phase 2: emailVerified修正スクリプト開始');
  console.log('==========================================');
  
  try {
    // MongoDB接続
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://blankb01:Xn7xKZgRoD30xhTS@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority';
    
    console.log('🔌 MongoDB接続中...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB接続成功');
    
    // 1. 現状の確認
    console.log('\n📊 現在のユーザー状態:');
    const allUsers = await User.find({}, 'email emailVerified createdAt').lean();
    
    console.log(`総ユーザー数: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`- ${user.email}: emailVerified=${user.emailVerified} (type: ${typeof user.emailVerified})`);
    });
    
    // 2. 問題のあるユーザーを特定
    const problemUsers = await User.find({
      $or: [
        { emailVerified: { $exists: false } },
        { emailVerified: null },
        { emailVerified: undefined }
      ]
    });
    
    console.log(`\n⚠️ 修正が必要なユーザー: ${problemUsers.length}件`);
    
    // 3. 特定のテストユーザーを優先修正
    const testUser = await User.findOne({ email: 'one.photolife+2@gmail.com' });
    if (testUser) {
      console.log(`\n🎯 テストユーザー修正: ${testUser.email}`);
      console.log(`  修正前: emailVerified=${testUser.emailVerified}`);
      
      testUser.emailVerified = true;
      testUser.emailVerifiedAt = testUser.emailVerifiedAt || new Date();
      await testUser.save();
      
      console.log(`  修正後: emailVerified=${testUser.emailVerified}`);
      console.log(`  ✅ テストユーザー修正完了`);
    }
    
    // 4. その他の問題ユーザーを修正
    let fixedCount = 0;
    for (const user of problemUsers) {
      if (user.email !== 'one.photolife+2@gmail.com') {
        console.log(`\n📝 修正中: ${user.email}`);
        
        // 古いユーザー（2024年以前）は自動的に確認済みとする
        const isOldUser = user.createdAt && new Date(user.createdAt) < new Date('2024-01-01');
        
        if (isOldUser || !user.emailVerified) {
          user.emailVerified = true;
          user.emailVerifiedAt = user.emailVerifiedAt || user.createdAt || new Date();
          await user.save();
          fixedCount++;
          console.log(`  ✅ 修正完了`);
        }
      }
    }
    
    // 5. 最終確認
    console.log('\n📊 修正後の状態:');
    const updatedUsers = await User.find({}, 'email emailVerified').lean();
    updatedUsers.forEach(user => {
      const status = user.emailVerified ? '✅' : '❌';
      console.log(`${status} ${user.email}: emailVerified=${user.emailVerified}`);
    });
    
    // 6. 統計情報
    const verifiedCount = await User.countDocuments({ emailVerified: true });
    const unverifiedCount = await User.countDocuments({ emailVerified: false });
    
    console.log('\n📈 統計:');
    console.log(`  確認済み: ${verifiedCount}件`);
    console.log(`  未確認: ${unverifiedCount}件`);
    console.log(`  修正件数: ${fixedCount + (testUser ? 1 : 0)}件`);
    
    console.log('\n✅ Phase 2: emailVerified修正完了');
    
  } catch (error) {
    console.error('❌ エラー発生:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB接続を切断しました');
  }
}

// メイン実行
if (require.main === module) {
  fixEmailVerified()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fixEmailVerified };