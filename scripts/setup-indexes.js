const mongoose = require('mongoose');

async function setupIndexes() {
  try {
    await mongoose.connect('mongodb://localhost:27017/board-app');
    
    const db = mongoose.connection.db;
    
    console.log('📋 インデックス作成開始...');
    
    // RateLimitコレクションのインデックス
    try {
      await db.collection('ratelimits').createIndexes([
        { key: { key: 1, createdAt: 1 } },
        { key: { createdAt: 1 }, expireAfterSeconds: 86400 }
      ]);
      console.log('✅ RateLimitインデックス作成完了');
    } catch (error) {
      console.log('ℹ️  RateLimitインデックス: ', error.message);
    }
    
    // ResendHistoryコレクションのインデックス
    try {
      await db.collection('resendhistories').createIndexes([
        { key: { userId: 1 } },
        { key: { email: 1 } },
        { key: { createdAt: -1 } }
      ]);
      console.log('✅ ResendHistoryインデックス作成完了');
    } catch (error) {
      console.log('ℹ️  ResendHistoryインデックス: ', error.message);
    }
    
    // Userコレクションのインデックス
    try {
      await db.collection('users').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { createdAt: -1 } }
      ]);
      console.log('✅ Userインデックス作成完了');
    } catch (error) {
      console.log('ℹ️  Userインデックス: ', error.message);
    }
    
    console.log('✅ すべてのインデックス作成処理完了');
    process.exit(0);
  } catch (error) {
    console.error('❌ インデックス作成失敗:', error.message);
    process.exit(1);
  }
}

setupIndexes();