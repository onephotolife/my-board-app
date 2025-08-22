#!/usr/bin/env node

/**
 * 既存の投稿にタグを追加するスクリプト
 * 開発・テスト用
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

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

// Postスキーマを直接定義
const PostSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    author: {
      _id: String,
      name: String,
      email: String,
    },
    status: String,
    views: Number,
    likes: [String],
    tags: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      enum: ['general', 'tech', 'question', 'discussion', 'announcement'],
      default: 'general',
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model('Post', PostSchema);

async function addTagsToPosts() {
  try {
    console.log('🔗 MongoDBに接続中...');
    console.log('URI:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // 既存の投稿を取得
    const posts = await Post.find({ status: 'published' });
    console.log(`📝 ${posts.length}件の投稿を発見`);

    if (posts.length === 0) {
      console.log('⚠️ 投稿が存在しません。新規投稿を作成してください。');
      
      // テスト用の投稿を作成
      console.log('📝 テスト投稿を作成中...');
      const testPosts = [
        {
          title: 'React 18の新機能について',
          content: 'React 18では、Concurrent Featuresが導入され、よりスムーズなユーザー体験が実現できるようになりました。',
          author: {
            _id: 'test-user-1',
            name: 'テストユーザー',
            email: 'test@example.com'
          },
          category: 'tech',
          tags: ['React', 'JavaScript', 'フロントエンド'],
          status: 'published',
          views: 0,
          likes: []
        },
        {
          title: 'Next.js 14のApp Routerについて質問',
          content: 'App Routerの使い方がよくわからないので、詳しい方教えてください。',
          author: {
            _id: 'test-user-1',
            name: 'テストユーザー',
            email: 'test@example.com'
          },
          category: 'question',
          tags: ['Next.js', '質問', '初心者'],
          status: 'published',
          views: 0,
          likes: []
        },
        {
          title: '今日のお知らせ',
          content: 'システムメンテナンスを明日実施します。',
          author: {
            _id: 'test-user-1',
            name: 'テストユーザー',
            email: 'test@example.com'
          },
          category: 'announcement',
          tags: ['重要', 'メンテナンス'],
          status: 'published',
          views: 0,
          likes: []
        }
      ];

      for (const postData of testPosts) {
        const post = new Post(postData);
        await post.save();
        console.log(`✅ テスト投稿「${post.title}」を作成しました`);
      }
      
      return;
    }

    // 各投稿にランダムなタグを追加
    for (const post of posts) {
      // すでにタグがある場合はスキップ
      if (post.tags && post.tags.length > 0) {
        console.log(`⏭️ 投稿「${post.title}」は既にタグがあるためスキップ: [${post.tags.join(', ')}]`);
        continue;
      }

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
    console.log('🎉 タグ処理が完了しました');
    
    // 統計情報を表示
    const allPosts = await Post.find({ status: 'published' });
    const tagStats = {};
    let postsWithTags = 0;
    
    for (const post of allPosts) {
      if (post.tags && post.tags.length > 0) {
        postsWithTags++;
        for (const tag of post.tags) {
          tagStats[tag] = (tagStats[tag] || 0) + 1;
        }
      }
    }
    
    console.log('');
    console.log('📊 統計情報:');
    console.log(`  - 総投稿数: ${allPosts.length}件`);
    console.log(`  - タグ付き投稿: ${postsWithTags}件`);
    console.log('');
    console.log('📊 タグ使用状況:');
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