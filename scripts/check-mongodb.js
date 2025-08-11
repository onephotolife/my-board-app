#!/usr/bin/env node

/**
 * MongoDB接続とデータ確認スクリプト
 * 使用方法: node scripts/check-mongodb.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

console.log('=== MongoDB データ確認 ===');
console.log('接続先:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));

// Postスキーマ（簡易版）
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: String,
  authorName: String,
  authorEmail: String,
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);

async function checkMongoDB() {
  try {
    // MongoDB接続
    console.log('\n1. MongoDB接続中...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 接続成功');
    
    // データベース情報
    console.log('\n2. データベース情報:');
    console.log('   データベース名:', mongoose.connection.db.databaseName);
    console.log('   接続状態:', mongoose.connection.readyState === 1 ? '接続中' : '未接続');
    
    // 投稿数の確認
    console.log('\n3. 投稿データ:');
    const count = await Post.countDocuments();
    console.log('   総投稿数:', count);
    
    // 最新の投稿5件を表示
    if (count > 0) {
      console.log('\n4. 最新の投稿（最大5件）:');
      const posts = await Post.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      
      posts.forEach((post, index) => {
        console.log(`\n   [${index + 1}] ${post.title || '無題'}`);
        console.log(`       ID: ${post._id}`);
        console.log(`       内容: ${post.content?.substring(0, 50)}...`);
        console.log(`       投稿者: ${post.authorName || post.author || '不明'}`);
        console.log(`       作成日: ${post.createdAt}`);
      });
    } else {
      console.log('   ⚠️ 投稿がまだありません');
    }
    
    // コレクション一覧
    console.log('\n5. コレクション一覧:');
    const collections = await mongoose.connection.db.collections();
    collections.forEach(col => {
      console.log(`   - ${col.collectionName}`);
    });
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 解決方法:');
      console.log('   1. MongoDBが起動していることを確認:');
      console.log('      brew services start mongodb-community');
      console.log('   2. 接続URIが正しいことを確認:');
      console.log('      cat .env.local | grep MONGODB_URI');
    }
  } finally {
    // 接続を閉じる
    await mongoose.connection.close();
    console.log('\n✅ 接続を閉じました');
    process.exit(0);
  }
}

// 実行
checkMongoDB();