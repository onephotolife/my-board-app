#!/usr/bin/env node

/**
 * Migration Script: Fix Post Status
 * 
 * 問題: 既存投稿のstatusが'draft'またはnullのため、ボードページに表示されない
 * 解決: すべての投稿のstatusを'published'に更新
 * 
 * 実行方法: node scripts/fix-post-status.js
 */

const mongoose = require('mongoose');

// MongoDB接続URL（.env.localから取得した正しい接続情報）
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://boarduser:thc1234567890THC@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority';

// Postスキーマ定義（簡易版）
const PostSchema = new mongoose.Schema({
  title: String,
  content: String,
  status: {
    type: String,
    enum: ['published', 'draft', 'deleted'],
    default: 'published'
  },
  author: {
    _id: String,
    name: String,
    email: String
  },
  authorInfo: {
    name: String,
    email: String,
    avatar: String
  },
  tags: [String],
  likes: [String]
}, {
  timestamps: true
});

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

async function migratePostStatus() {
  try {
    console.log('🔄 MongoDB接続開始...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // 現在の投稿状態を確認
    console.log('\n📊 現在の投稿状態を確認中...');
    const statusCounts = await Post.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('現在のステータス分布:');
    statusCounts.forEach(item => {
      console.log(`  ${item._id || 'null'}: ${item.count}件`);
    });

    // draft, null, undefinedの投稿を取得
    const postsToUpdate = await Post.find({
      $or: [
        { status: 'draft' },
        { status: null },
        { status: { $exists: false } },
        { status: '' }
      ]
    });

    console.log(`\n🔍 更新対象の投稿: ${postsToUpdate.length}件`);

    if (postsToUpdate.length > 0) {
      // 更新前の詳細を表示
      console.log('\n更新対象の投稿詳細:');
      for (const post of postsToUpdate.slice(0, 5)) { // 最初の5件のみ表示
        console.log(`  - ID: ${post._id}`);
        console.log(`    タイトル: ${post.title || '(無題)'}`);
        console.log(`    現在のステータス: ${post.status || 'null'}`);
        console.log(`    作成日: ${post.createdAt}`);
      }
      if (postsToUpdate.length > 5) {
        console.log(`  ... 他 ${postsToUpdate.length - 5}件`);
      }

      // ステータスを'published'に更新
      console.log('\n🔧 ステータスを"published"に更新中...');
      const updateResult = await Post.updateMany(
        {
          $or: [
            { status: 'draft' },
            { status: null },
            { status: { $exists: false } },
            { status: '' }
          ]
        },
        {
          $set: { status: 'published' }
        }
      );

      console.log(`✅ ${updateResult.modifiedCount}件の投稿を更新しました`);

      // 更新後の状態を確認
      console.log('\n📊 更新後の投稿状態:');
      const newStatusCounts = await Post.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      newStatusCounts.forEach(item => {
        console.log(`  ${item._id || 'null'}: ${item.count}件`);
      });

      // published投稿の総数を確認
      const publishedCount = await Post.countDocuments({ status: 'published' });
      console.log(`\n✅ 公開済み投稿の総数: ${publishedCount}件`);

    } else {
      console.log('✅ すべての投稿は既に"published"ステータスです');
    }

    // 接続を閉じる
    await mongoose.connection.close();
    console.log('\n✅ 処理完了');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// スクリプト実行
console.log('=================================');
console.log('Post Status Migration Script');
console.log('=================================\n');

migratePostStatus();