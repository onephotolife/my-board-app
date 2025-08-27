#!/usr/bin/env node

/**
 * 最小MongoDB接続テスト
 */
const mongoose = require('mongoose');

const mongoUri = 'mongodb://localhost:27017/board-app';

async function testConnection() {
  try {
    console.log('MongoDB接続テスト開始...');
    
    // タイムアウト付き接続
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB接続成功');
    
    // 簡単なカウント取得
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    console.log(`現在のユーザー数: ${userCount}`);
    
    await mongoose.connection.close();
    console.log('✅ 接続終了');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

testConnection();