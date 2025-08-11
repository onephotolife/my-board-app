#!/usr/bin/env node

/**
 * ResendHistoryをリセットするスクリプト
 * テスト実行前に履歴をクリアする
 */

const { MongoClient } = require('mongodb');

async function resetResendHistory() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('📊 データベース接続中:', mongoUri);
    await client.connect();
    const db = client.db();
    
    // ResendHistoryコレクションを削除
    const resendHistoryCollection = db.collection('resendhistories');
    const deleteResult = await resendHistoryCollection.deleteMany({});
    console.log(`🗑️ ResendHistory削除: ${deleteResult.deletedCount}件`);
    
    // RateLimitコレクションも削除
    const rateLimitCollection = db.collection('ratelimits');
    const rateLimitResult = await rateLimitCollection.deleteMany({});
    console.log(`🗑️ RateLimit削除: ${rateLimitResult.deletedCount}件`);
    
    // テストユーザーのemailVerifiedをfalseにリセット
    const usersCollection = db.collection('users');
    const updateResult = await usersCollection.updateMany(
      { email: /^test\d+@example\.com$/ },
      {
        $set: {
          emailVerified: false,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          updatedAt: new Date()
        }
      }
    );
    console.log(`♻️ テストユーザーリセット: ${updateResult.modifiedCount}件`);
    
    console.log('✅ リセット完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('📊 データベース接続を閉じました');
  }
}

// 実行
if (require.main === module) {
  resetResendHistory();
}