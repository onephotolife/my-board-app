#!/usr/bin/env node

/**
 * いいね機能マイグレーションスクリプト
 * 既存の投稿にlikesフィールドを追加
 * 
 * 実行方法: node scripts/migrate-likes.js
 */

const mongoose = require('mongoose');

// MongoDBスキーマ定義（/src/lib/models/Post.tsと同等）
const PostSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: {
    _id: String,
    name: String,
    email: String,
  },
  status: String,
  views: Number,
  likes: {
    type: [String],
    default: [],
  },
  tags: [String],
  category: String,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date,
});

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

async function runMigration() {
  console.log('=================================================');
  console.log('いいね機能マイグレーション開始');
  console.log('開始時刻:', new Date().toISOString());
  console.log('=================================================\n');

  try {
    // MongoDB接続
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    console.log('接続先:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB接続成功\n');

    // 既存投稿数の確認
    const totalPosts = await Post.countDocuments();
    console.log(`総投稿数: ${totalPosts}`);

    // likesフィールドが存在しない投稿を検索
    const postsWithoutLikes = await Post.countDocuments({ 
      $or: [
        { likes: { $exists: false } },
        { likes: null },
        { likes: undefined }
      ]
    });
    
    console.log(`マイグレーション対象投稿数: ${postsWithoutLikes}`);

    if (postsWithoutLikes === 0) {
      console.log('\n✅ マイグレーション不要（すべての投稿にlikesフィールドが存在）');
      await mongoose.disconnect();
      return;
    }

    // DRY-RUN: 更新前のサンプル確認
    console.log('\n--- DRY-RUN: 更新対象サンプル（最大5件）---');
    const samplePosts = await Post.find({ 
      $or: [
        { likes: { $exists: false } },
        { likes: null },
        { likes: undefined }
      ]
    }).limit(5).select('_id title likes');

    samplePosts.forEach(post => {
      console.log(`  ID: ${post._id}, Title: ${post.title?.substring(0, 30)}..., likes: ${post.likes}`);
    });

    // ユーザー確認
    console.log('\n⚠️  本番マイグレーションを実行しますか？');
    console.log('実行する場合は5秒以内にCtrl+Cで中断してください...');
    
    // 5秒待機
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 本番マイグレーション実行
    console.log('\n🚀 本番マイグレーション開始...');
    
    const updateResult = await Post.updateMany(
      { 
        $or: [
          { likes: { $exists: false } },
          { likes: null },
          { likes: undefined }
        ]
      },
      { 
        $set: { likes: [] } 
      }
    );

    console.log('\n=================================================');
    console.log('マイグレーション完了');
    console.log('=================================================');
    console.log(`✅ 更新完了: ${updateResult.modifiedCount}件`);
    console.log(`✅ 一致した件数: ${updateResult.matchedCount}件`);
    console.log(`✅ 承認された件数: ${updateResult.acknowledged ? 'はい' : 'いいえ'}`);

    // 検証: 更新後の確認
    const postsWithoutLikesAfter = await Post.countDocuments({ 
      $or: [
        { likes: { $exists: false } },
        { likes: null },
        { likes: undefined }
      ]
    });

    console.log(`\n検証結果: likesフィールドなし投稿数 = ${postsWithoutLikesAfter}`);

    if (postsWithoutLikesAfter === 0) {
      console.log('✅ マイグレーション成功！すべての投稿にlikesフィールドが追加されました');
    } else {
      console.log('⚠️  警告: まだlikesフィールドがない投稿が残っています');
    }

    // 更新後のサンプル表示
    console.log('\n--- 更新後サンプル（最大3件）---');
    const updatedSamples = await Post.find({}).limit(3).select('_id title likes');
    updatedSamples.forEach(post => {
      console.log(`  ID: ${post._id}, likes: [${post.likes?.join(', ') || ''}] (${post.likes?.length || 0}件)`);
    });

  } catch (error) {
    console.error('\n❌ マイグレーションエラー:', error);
    console.error('詳細:', error.stack);
    process.exit(1);
  } finally {
    // 接続を閉じる
    await mongoose.disconnect();
    console.log('\n✅ MongoDB接続切断');
    console.log('完了時刻:', new Date().toISOString());
  }
}

// 実行
runMigration().catch(console.error);