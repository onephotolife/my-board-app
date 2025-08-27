#!/usr/bin/env node

/**
 * テスト用ユーザーデータシードスクリプト
 * test-followページで使用するための実在するユーザーデータを作成
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDBモデルを直接読み込み
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// UserスキーマとFollowスキーマの定義
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'moderator', 'user'], default: 'user' },
  emailVerified: { type: Boolean, default: false },
  bio: String,
  avatar: String,
  followingCount: { type: Number, default: 0 },
  followersCount: { type: Number, default: 0 },
  mutualFollowsCount: { type: Number, default: 0 },
}, { timestamps: true });

const FollowSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isReciprocal: { type: Boolean, default: false },
}, { timestamps: true });

// モデルの作成（既存の場合は取得）
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Follow = mongoose.models.Follow || mongoose.model('Follow', FollowSchema);

// テストユーザーデータ
const testUsers = [
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439001'),
    email: 'test1@example.com',
    password: 'Test123!',
    name: 'テストユーザー1',
    bio: 'フォロー機能テスト用のユーザー1です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439002'),
    email: 'test2@example.com',
    password: 'Test123!',
    name: 'テストユーザー2',
    bio: 'フォロー機能テスト用のユーザー2です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439003'),
    email: 'test3@example.com',
    password: 'Test123!',
    name: 'テストユーザー3',
    bio: 'フォロー機能テスト用のユーザー3です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439004'),
    email: 'test4@example.com',
    password: 'Test123!',
    name: 'テストユーザー4',
    bio: 'フォロー機能テスト用のユーザー4です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439005'),
    email: 'test5@example.com',
    password: 'Test123!',
    name: 'テストユーザー5',
    bio: 'フォロー機能テスト用のユーザー5です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439006'),
    email: 'test6@example.com',
    password: 'Test123!',
    name: 'テストユーザー6',
    bio: 'フォロー機能テスト用のユーザー6です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439007'),
    email: 'test7@example.com',
    password: 'Test123!',
    name: 'テストユーザー7',
    bio: 'フォロー機能テスト用のユーザー7です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439008'),
    email: 'test8@example.com',
    password: 'Test123!',
    name: 'テストユーザー8',
    bio: 'フォロー機能テスト用のユーザー8です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439009'),
    email: 'test9@example.com',
    password: 'Test123!',
    name: 'テストユーザー9',
    bio: 'フォロー機能テスト用のユーザー9です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439010'),
    email: 'test10@example.com',
    password: 'Test123!',
    name: 'テストユーザー10',
    bio: 'フォロー機能テスト用のユーザー10です',
    emailVerified: true,
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    email: 'test11@example.com',
    password: 'Test123!',
    name: 'テストユーザー11',
    bio: 'フォロー機能テスト用のユーザー11です',
    emailVerified: true,
  },
  // メインテストユーザー（ログイン用）
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439999'),
    email: 'testmain@example.com',
    password: 'Test123!',
    name: 'メインテストユーザー',
    bio: 'ログインテスト用のメインユーザーです',
    emailVerified: true,
    role: 'user',
  },
];

async function seedTestUsers() {
  try {
    // MongoDB接続
    console.log('MongoDB接続中...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB接続成功');

    // 既存のテストユーザーをクリーンアップ
    console.log('\n既存のテストユーザーをクリーンアップ中...');
    const testEmails = testUsers.map(u => u.email);
    const testIds = testUsers.map(u => u._id);
    
    // 既存のフォロー関係を削除
    await Follow.deleteMany({
      $or: [
        { follower: { $in: testIds } },
        { following: { $in: testIds } }
      ]
    });
    
    // 既存のテストユーザーを削除
    await User.deleteMany({ email: { $in: testEmails } });
    console.log('✅ クリーンアップ完了');

    // テストユーザーを作成
    console.log('\nテストユーザー作成中...');
    for (const userData of testUsers) {
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await User.create({
        ...userData,
        password: hashedPassword,
      });
      
      console.log(`✅ 作成: ${user.name} (${user.email}) - ID: ${user._id}`);
    }

    // サンプルフォロー関係を作成
    console.log('\nサンプルフォロー関係を作成中...');
    const mainUser = await User.findOne({ email: 'testmain@example.com' });
    const user1 = await User.findOne({ email: 'test1@example.com' });
    const user2 = await User.findOne({ email: 'test2@example.com' });
    
    if (mainUser && user1 && user2) {
      // メインユーザーがユーザー1をフォロー
      await Follow.create({
        follower: mainUser._id,
        following: user1._id,
        isReciprocal: false,
      });
      
      // ユーザー1のフォロワー数を更新
      await User.findByIdAndUpdate(user1._id, { $inc: { followersCount: 1 } });
      // メインユーザーのフォロー数を更新
      await User.findByIdAndUpdate(mainUser._id, { $inc: { followingCount: 1 } });
      
      console.log(`✅ フォロー関係作成: ${mainUser.name} → ${user1.name}`);
    }

    // 統計情報を表示
    console.log('\n=== シード完了 ===');
    const totalUsers = await User.countDocuments();
    const totalFollows = await Follow.countDocuments();
    console.log(`ユーザー数: ${totalUsers}`);
    console.log(`フォロー関係: ${totalFollows}`);
    
    // テストユーザー一覧
    console.log('\n=== テストユーザー一覧 ===');
    for (const user of testUsers) {
      console.log(`ID: ${user._id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: Test123!`);
      console.log(`  Name: ${user.name}`);
      console.log('');
    }

    console.log('\n✅ すべてのテストデータが正常に作成されました');
    console.log('\n📝 使用方法:');
    console.log('1. メインユーザーでログイン: testmain@example.com / Test123!');
    console.log('2. test-followページでフォロー機能をテスト');
    
  } catch (error) {
    console.error('❌ エラー発生:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB接続を終了しました');
  }
}

// 実行
if (require.main === module) {
  seedTestUsers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedTestUsers };