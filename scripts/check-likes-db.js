#!/usr/bin/env node

/**
 * データベース内のいいねデータを直接確認
 */

const mongoose = require('mongoose');

// MongoDBスキーマ定義
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

async function checkLikes() {
  console.log('=================================================');
  console.log('いいねデータ確認');
  console.log('=================================================\n');

  try {
    // MongoDB接続
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB接続成功\n');

    // すべての投稿のいいね状況を確認
    const posts = await Post.find({}).limit(5).select('_id title content likes createdAt');
    
    console.log(`総投稿数: ${await Post.countDocuments()}`);
    console.log(`\n最新5件の投稿のいいね状況:`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    posts.forEach((post, index) => {
      console.log(`${index + 1}. 投稿ID: ${post._id}`);
      console.log(`   内容: ${post.content?.substring(0, 50)}...`);
      console.log(`   いいね数: ${post.likes?.length || 0}`);
      if (post.likes && post.likes.length > 0) {
        console.log(`   いいねユーザーID:`);
        post.likes.forEach(userId => {
          console.log(`     - ${userId}`);
        });
      }
      console.log(`   作成日: ${post.createdAt}`);
      console.log('');
    });
    
    // いいねが1つ以上ある投稿の統計
    const postsWithLikes = await Post.countDocuments({ 
      likes: { $exists: true, $ne: [] } 
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 統計情報:');
    console.log(`   いいねがある投稿数: ${postsWithLikes}`);
    console.log(`   いいねがない投稿数: ${await Post.countDocuments() - postsWithLikes}`);
    
    // 最もいいねが多い投稿
    const mostLiked = await Post.findOne({
      likes: { $exists: true }
    }).sort({ 'likes.length': -1 }).select('_id content likes');
    
    if (mostLiked && mostLiked.likes && mostLiked.likes.length > 0) {
      console.log(`\n🏆 最もいいねが多い投稿:`);
      console.log(`   投稿ID: ${mostLiked._id}`);
      console.log(`   内容: ${mostLiked.content?.substring(0, 50)}...`);
      console.log(`   いいね数: ${mostLiked.likes.length}`);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB接続切断');
  }
}

// 実行
checkLikes().catch(console.error);