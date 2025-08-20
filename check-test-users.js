#!/usr/bin/env node

/**
 * テストユーザーのデータベース状態確認
 */

const mongoose = require('mongoose');

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

async function checkUsers() {
  try {
    // MongoDB接続
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ データベース接続成功\n');

    // テストユーザーを検索
    const testEmails = [
      'test-valid@example.com',
      'test-expired@example.com',
      'test-verified@example.com',
      'test-resend@example.com',
    ];

    console.log('📊 テストユーザーの状態:\n');
    console.log('='.repeat(80));
    
    for (const email of testEmails) {
      const user = await User.findOne({ email });
      
      if (user) {
        console.log(`\n📧 ${email}`);
        console.log(`  名前: ${user.name}`);
        console.log(`  認証済み: ${user.emailVerified ? '✅' : '❌'}`);
        console.log(`  トークン: ${user.emailVerificationToken ? user.emailVerificationToken.substring(0, 20) + '...' : 'なし'}`);
        if (user.emailVerificationTokenExpiry) {
          const now = new Date();
          const expiry = new Date(user.emailVerificationTokenExpiry);
          const isExpired = expiry < now;
          console.log(`  有効期限: ${expiry.toLocaleString('ja-JP')}`);
          console.log(`  状態: ${isExpired ? '⏰ 期限切れ' : '✅ 有効'}`);
        }
      } else {
        console.log(`\n❌ ${email} - ユーザーが見つかりません`);
      }
    }

    console.log('\n' + '='.repeat(80));

    // 全ユーザー数を表示
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    
    console.log('\n📈 統計:');
    console.log(`  総ユーザー数: ${totalUsers}`);
    console.log(`  認証済み: ${verifiedUsers}`);
    console.log(`  未認証: ${totalUsers - verifiedUsers}`);

    // 最近作成されたユーザーを表示
    console.log('\n🕐 最近作成されたユーザー:');
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email createdAt emailVerified');
    
    recentUsers.forEach(user => {
      const status = user.emailVerified ? '✅' : '❌';
      console.log(`  ${status} ${user.email} - ${user.createdAt.toLocaleString('ja-JP')}`);
    });

    await mongoose.connection.close();
    console.log('\n✨ 完了');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

checkUsers();