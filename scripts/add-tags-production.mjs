#!/usr/bin/env node

/**
 * 本番環境の投稿にタグを追加するスクリプト
 * 既存投稿にタグが無い場合のみ追加
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// .env.productionファイルを読み込み
dotenv.config({ path: '.env.production' });

// MongoDB接続（本番環境）
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI または DATABASE_URL が設定されていません');
  console.log('環境変数を確認してください:');
  console.log('  - MONGODB_URI:', process.env.MONGODB_URI);
  console.log('  - DATABASE_URL:', process.env.DATABASE_URL);
  process.exit(1);
}

// サンプルタグセット（日本語）
const sampleTags = {
  tech: ['JavaScript', 'React', 'Next.js', 'Node.js', 'TypeScript', 'MongoDB', 'API', 'フロントエンド', 'バックエンド'],
  general: ['お知らせ', '雑談', '日記', '趣味', 'ニュース', '共有', 'アイデア', 'Tips'],
  question: ['質問', 'ヘルプ', '初心者', 'トラブル', '解決済み', '相談', 'アドバイス'],
  discussion: ['議論', '提案', 'アイデア', '意見交換', 'フィードバック', 'レビュー', '改善案'],
  announcement: ['重要', '更新', 'メンテナンス', 'リリース', '告知', 'お知らせ', 'イベント']
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

async function addTagsToProduction() {
  try {
    console.log('🔗 本番環境MongoDBに接続中...');
    console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//<user>:<pass>@')); // パスワードを隠す
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // 既存の投稿を取得
    const posts = await Post.find({ status: 'published' });
    console.log(`📝 ${posts.length}件の投稿を発見`);

    if (posts.length === 0) {
      console.log('⚠️ 投稿が存在しません');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    // 各投稿にタグを追加
    for (const post of posts) {
      // すでにタグがある場合はスキップ
      if (post.tags && post.tags.length > 0) {
        console.log(`⏭️ 投稿「${post.title}」は既にタグがあるためスキップ: [${post.tags.join(', ')}]`);
        skippedCount++;
        continue;
      }

      // カテゴリーに基づいてタグを選択
      const categoryTags = sampleTags[post.category] || sampleTags.general;
      
      // タイトルと内容から関連しそうなタグを選択
      const selectedTags = [];
      
      // タイトルや内容に含まれるキーワードをチェック
      const text = (post.title + ' ' + post.content).toLowerCase();
      
      // 技術系のキーワードチェック
      if (text.includes('react')) selectedTags.push('React');
      if (text.includes('next')) selectedTags.push('Next.js');
      if (text.includes('javascript') || text.includes('js')) selectedTags.push('JavaScript');
      if (text.includes('typescript') || text.includes('ts')) selectedTags.push('TypeScript');
      if (text.includes('node')) selectedTags.push('Node.js');
      if (text.includes('mongo')) selectedTags.push('MongoDB');
      if (text.includes('api')) selectedTags.push('API');
      
      // 日本語キーワードチェック
      if (text.includes('質問') || text.includes('教えて')) selectedTags.push('質問');
      if (text.includes('解決')) selectedTags.push('解決済み');
      if (text.includes('初心者') || text.includes('初めて')) selectedTags.push('初心者');
      if (text.includes('お知らせ') || text.includes('告知')) selectedTags.push('お知らせ');
      if (text.includes('重要')) selectedTags.push('重要');
      if (text.includes('アイデア') || text.includes('提案')) selectedTags.push('アイデア');
      
      // タグが見つからない場合はカテゴリーベースでランダムに選択
      if (selectedTags.length === 0) {
        const numTags = Math.floor(Math.random() * 2) + 1; // 1-2個
        for (let i = 0; i < numTags; i++) {
          const randomTag = categoryTags[Math.floor(Math.random() * categoryTags.length)];
          if (!selectedTags.includes(randomTag)) {
            selectedTags.push(randomTag);
          }
        }
      }
      
      // 最大3個までに制限
      const finalTags = selectedTags.slice(0, 3);

      // 投稿を更新
      post.tags = finalTags;
      await post.save();
      
      console.log(`✅ 投稿「${post.title.substring(0, 30)}...」にタグを追加: [${finalTags.join(', ')}]`);
      updatedCount++;
    }

    console.log('');
    console.log('🎉 タグ処理が完了しました');
    console.log(`  - 更新: ${updatedCount}件`);
    console.log(`  - スキップ: ${skippedCount}件`);
    
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
    console.log(`  - タグ無し投稿: ${allPosts.length - postsWithTags}件`);
    
    if (Object.keys(tagStats).length > 0) {
      console.log('');
      console.log('📊 タグ使用状況 (上位10件):');
      Object.entries(tagStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([tag, count]) => {
          console.log(`  - ${tag}: ${count}件`);
        });
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('詳細:', error);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('🔌 MongoDB接続を切断しました');
  }
}

// スクリプト実行
addTagsToProduction();