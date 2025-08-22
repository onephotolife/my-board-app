#!/usr/bin/env node

/**
 * 既存の投稿にタグを追加するスクリプト
 * 開発・テスト用
 */

const mongoose = require('mongoose');
const Post = require('../src/lib/models/Post').default;

// MongoDB接続
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// サンプルタグセット
const sampleTags = {
  tech: ['JavaScript', 'React', 'Next.js', 'Node.js', 'TypeScript'],
  general: ['お知らせ', '雑談', '日記', '趣味', 'ニュース'],
  question: ['質問', 'ヘルプ', '初心者', 'トラブル', '解決済み'],
  discussion: ['議論', '提案', 'アイデア', '意見交換', 'フィードバック'],
  announcement: ['重要', '更新', 'メンテナンス', 'リリース', '告知']
};

async function addTagsToPosts() {
  try {
    console.log('🔗 MongoDBに接続中...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // 既存の投稿を取得
    const posts = await Post.find({ status: 'published' });
    console.log(`📝 ${posts.length}件の投稿を発見`);

    if (posts.length === 0) {
      console.log('⚠️ 投稿が存在しません。新規投稿を作成してください。');
      return;
    }

    // 各投稿にランダムなタグを追加
    for (const post of posts) {
      // カテゴリーに基づいてタグを選択
      const categoryTags = sampleTags[post.category] || sampleTags.general;
      
      // ランダムに1-3個のタグを選択
      const numTags = Math.floor(Math.random() * 3) + 1;
      const selectedTags = [];
      
      for (let i = 0; i < numTags; i++) {
        const randomTag = categoryTags[Math.floor(Math.random() * categoryTags.length)];
        if (!selectedTags.includes(randomTag)) {
          selectedTags.push(randomTag);
        }
      }

      // 投稿を更新
      post.tags = selectedTags;
      await post.save();
      
      console.log(`✅ 投稿「${post.title}」にタグを追加: [${selectedTags.join(', ')}]`);
    }

    console.log('');
    console.log('🎉 すべての投稿にタグを追加しました');
    
    // 統計情報を表示
    const tagStats = {};
    for (const post of posts) {
      for (const tag of post.tags) {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      }
    }
    
    console.log('');
    console.log('📊 タグ統計:');
    Object.entries(tagStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tag, count]) => {
        console.log(`  - ${tag}: ${count}件`);
      });

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('🔌 MongoDB接続を切断しました');
  }
}

// スクリプト実行
addTagsToPosts();