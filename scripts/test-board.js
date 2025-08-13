#!/usr/bin/env node

/**
 * 掲示板機能テストスクリプト
 * 
 * 使用方法:
 * node scripts/test-board.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDBに接続
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// スキーマ定義
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  role: { type: String, default: 'user' },
  bio: String,
  avatar: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
  },
  status: { type: String, default: 'published' },
  tags: [String],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

async function createTestData() {
  try {
    console.log('🔌 MongoDBに接続中...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

    // テストユーザーのデータ
    const testUsers = [
      {
        email: 'test1@example.com',
        password: 'Test1234!',
        name: 'テストユーザー1',
        emailVerified: true,
        bio: '掲示板テスト用アカウント1です',
      },
      {
        email: 'test2@example.com',
        password: 'Test1234!',
        name: 'テストユーザー2',
        emailVerified: true,
        bio: '掲示板テスト用アカウント2です',
      },
      {
        email: 'test3@example.com',
        password: 'Test1234!',
        name: '未認証ユーザー',
        emailVerified: false,
        bio: 'メール未認証のテストアカウント',
      }
    ];

    console.log('\n👤 テストユーザーを作成中...');
    const createdUsers = [];

    for (const userData of testUsers) {
      // 既存ユーザーをチェック
      let user = await User.findOne({ email: userData.email });
      
      if (user) {
        console.log(`  ⚠️  ${userData.email} は既に存在します`);
        // パスワードを更新
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user.password = hashedPassword;
        user.emailVerified = userData.emailVerified;
        user.name = userData.name;
        user.bio = userData.bio;
        await user.save();
        console.log(`  ✅ ${userData.email} を更新しました`);
      } else {
        // 新規ユーザー作成
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user = await User.create({
          ...userData,
          password: hashedPassword
        });
        console.log(`  ✅ ${userData.email} を作成しました`);
      }
      
      createdUsers.push(user);
    }

    // テスト投稿データを作成
    console.log('\n📝 テスト投稿を作成中...');
    
    const testPosts = [
      {
        title: '最初のテスト投稿',
        content: 'これは最初のテスト投稿です。掲示板機能が正しく動作することを確認しています。',
        author: createdUsers[0]._id,
        authorInfo: {
          name: createdUsers[0].name,
          email: createdUsers[0].email,
          avatar: createdUsers[0].avatar
        },
        tags: ['テスト', '初投稿'],
        status: 'published'
      },
      {
        title: '長文テスト投稿',
        content: 'あ'.repeat(1000), // 1000文字ちょうど
        author: createdUsers[0]._id,
        authorInfo: {
          name: createdUsers[0].name,
          email: createdUsers[0].email,
          avatar: createdUsers[0].avatar
        },
        tags: ['文字数制限', 'テスト'],
        status: 'published'
      },
      {
        title: 'ユーザー2の投稿',
        content: 'これはユーザー2による投稿です。他のユーザーはこの投稿を編集・削除できません。',
        author: createdUsers[1]._id,
        authorInfo: {
          name: createdUsers[1].name,
          email: createdUsers[1].email,
          avatar: createdUsers[1].avatar
        },
        tags: ['権限テスト'],
        status: 'published'
      },
      {
        title: '削除済み投稿（表示されない）',
        content: 'この投稿は削除済みステータスなので表示されません。',
        author: createdUsers[0]._id,
        authorInfo: {
          name: createdUsers[0].name,
          email: createdUsers[0].email,
          avatar: createdUsers[0].avatar
        },
        status: 'deleted'
      },
      {
        title: '下書き投稿（表示されない）',
        content: 'この投稿は下書きステータスなので表示されません。',
        author: createdUsers[0]._id,
        authorInfo: {
          name: createdUsers[0].name,
          email: createdUsers[0].email,
          avatar: createdUsers[0].avatar
        },
        status: 'draft'
      }
    ];

    // 既存の投稿を削除（クリーンな状態でテスト）
    await Post.deleteMany({ 
      'authorInfo.email': { $in: testUsers.map(u => u.email) }
    });
    console.log('  ✅ 既存のテスト投稿をクリア');

    // 新規投稿を作成
    for (const postData of testPosts) {
      await Post.create(postData);
      console.log(`  ✅ 投稿作成: "${postData.title}"`);
    }

    // テスト情報を表示
    console.log('\n' + '='.repeat(60));
    console.log('📋 テストアカウント情報');
    console.log('='.repeat(60));
    
    for (const user of testUsers) {
      console.log(`
👤 ${user.name}
   Email: ${user.email}
   Password: ${user.password}
   メール認証: ${user.emailVerified ? '✅ 認証済み' : '❌ 未認証'}
   説明: ${user.bio}
`);
    }

    // 投稿統計
    const stats = await Post.aggregate([
      { $match: { status: 'published' } },
      { $group: {
          _id: '$author',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('='.repeat(60));
    console.log('📊 投稿統計');
    console.log('='.repeat(60));
    console.log(`  公開投稿数: ${stats.reduce((sum, s) => sum + s.count, 0)}件`);
    console.log(`  削除済み: 1件`);
    console.log(`  下書き: 1件`);

    console.log('\n✅ テストデータの作成が完了しました！');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB接続を終了しました');
  }
}

// スクリプト実行
createTestData();