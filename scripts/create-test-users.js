#!/usr/bin/env node

/**
 * テスト用ユーザーを作成するスクリプト
 * メール再送信テストで使用する固定ユーザーを事前に作成
 */

const { MongoClient } = require('mongodb');
const bcryptjs = require('bcryptjs');

async function createTestUsers() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('📊 データベース接続中:', mongoUri);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    console.log('👤 テストユーザー作成開始...');
    
    // テスト用ユーザーを作成（10個）
    for (let i = 1; i <= 10; i++) {
      const email = `test${i}@example.com`;
      
      try {
        // 既存ユーザーを確認
        const existingUser = await usersCollection.findOne({ email });
        
        if (!existingUser) {
          // 新規作成
          const hashedPassword = await bcryptjs.hash('Test1234!', 10);
          
          await usersCollection.insertOne({
            email,
            password: hashedPassword,
            name: `Test User ${i}`,
            emailVerified: false,
            emailVerificationToken: null,
            emailVerificationTokenExpiry: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`✅ ユーザー作成: ${email}`);
        } else {
          // 既存ユーザーをリセット
          await usersCollection.updateOne(
            { email },
            {
              $set: {
                emailVerified: false,
                emailVerificationToken: null,
                emailVerificationTokenExpiry: null,
                updatedAt: new Date()
              }
            }
          );
          console.log(`♻️ ユーザーリセット: ${email}`);
        }
      } catch (error) {
        console.error(`❌ ユーザー作成エラー (${email}):`, error.message);
      }
    }
    
    // 作成されたユーザー数を確認
    const testUserCount = await usersCollection.countDocuments({ 
      email: /^test\d+@example\.com$/ 
    });
    
    console.log(`\n✅ テストユーザー作成完了: ${testUserCount}件`);
    
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
  createTestUsers();
}