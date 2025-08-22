#!/usr/bin/env node

/**
 * MongoDB全文検索インデックス設定スクリプト
 * 
 * 実行方法:
 * node scripts/setup-search-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

async function setupSearchIndexes() {
  try {
    console.log('🔌 MongoDBに接続中...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB接続成功');

    const db = mongoose.connection.db;
    
    // 投稿コレクションのインデックス設定
    console.log('\n📚 投稿コレクションの全文検索インデックスを設定中...');
    const postsCollection = db.collection('posts');
    
    // 既存のテキストインデックスを削除（存在する場合）
    try {
      await postsCollection.dropIndex('text');
      console.log('  ↳ 既存のテキストインデックスを削除しました');
    } catch (error) {
      console.log('  ↳ 既存のテキストインデックスなし');
    }
    
    // 複合テキストインデックスの作成
    await postsCollection.createIndex(
      {
        title: 'text',
        content: 'text',
        'tags': 'text',
        'author.name': 'text',
      },
      {
        weights: {
          title: 10,      // タイトルの重み付けを最も高く
          content: 5,     // 本文は中程度
          'tags': 3,      // タグは低め
          'author.name': 1, // 著者名は最も低く
        },
        default_language: 'none',
        name: 'posts_text_search',
      }
    );
    console.log('✅ 投稿の全文検索インデックスを作成しました');
    
    // パフォーマンス用の追加インデックス
    console.log('\n⚡ パフォーマンス最適化インデックスを設定中...');
    
    // 複合インデックス（カテゴリ + 作成日時）
    await postsCollection.createIndex(
      { category: 1, createdAt: -1 },
      { name: 'category_created_compound' }
    );
    console.log('  ✅ カテゴリー + 作成日時の複合インデックス');
    
    // 複合インデックス（ステータス + 作成日時）
    await postsCollection.createIndex(
      { status: 1, createdAt: -1 },
      { name: 'status_created_compound' }
    );
    console.log('  ✅ ステータス + 作成日時の複合インデックス');
    
    // タグ配列のインデックス
    await postsCollection.createIndex(
      { tags: 1 },
      { name: 'tags_array_index' }
    );
    console.log('  ✅ タグ配列インデックス');
    
    // いいね数のインデックス（ソート用）
    await postsCollection.createIndex(
      { 'likes.length': -1 },
      { name: 'likes_count_index', sparse: true }
    );
    console.log('  ✅ いいね数インデックス');
    
    // 閲覧数のインデックス（ソート用）
    await postsCollection.createIndex(
      { views: -1 },
      { name: 'views_index' }
    );
    console.log('  ✅ 閲覧数インデックス');
    
    // ユーザーコレクションのインデックス設定
    console.log('\n👤 ユーザーコレクションのインデックスを設定中...');
    const usersCollection = db.collection('users');
    
    // ユーザー名での全文検索
    try {
      await usersCollection.dropIndex('text');
    } catch (error) {
      // インデックスが存在しない場合は無視
    }
    
    await usersCollection.createIndex(
      {
        name: 'text',
        email: 'text',
      },
      {
        weights: {
          name: 5,
          email: 1,
        },
        default_language: 'none',
        name: 'users_text_search',
      }
    );
    console.log('✅ ユーザーの全文検索インデックスを作成しました');
    
    // 通報コレクションのインデックス設定
    console.log('\n🚨 通報コレクションのインデックスを設定中...');
    const reportsCollection = db.collection('reports');
    
    // 通報ステータスと作成日時の複合インデックス
    await reportsCollection.createIndex(
      { status: 1, createdAt: -1 },
      { name: 'report_status_created' }
    );
    console.log('  ✅ 通報ステータス + 作成日時の複合インデックス');
    
    // 通報理由のインデックス
    await reportsCollection.createIndex(
      { reason: 1 },
      { name: 'report_reason_index' }
    );
    console.log('  ✅ 通報理由インデックス');
    
    // インデックス情報の表示
    console.log('\n📊 作成されたインデックス一覧:');
    
    const postIndexes = await postsCollection.indexes();
    console.log('\n投稿コレクション:');
    postIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    const userIndexes = await usersCollection.indexes();
    console.log('\nユーザーコレクション:');
    userIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    const reportIndexes = await reportsCollection.indexes();
    console.log('\n通報コレクション:');
    reportIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n✨ すべてのインデックス設定が完了しました！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 MongoDB接続を終了しました');
  }
}

// スクリプト実行
setupSearchIndexes();