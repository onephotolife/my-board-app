#!/usr/bin/env node

/**
 * MongoDB Atlas接続テストスクリプト
 * cluster0.ej6jq5c.mongodb.net への接続を検証
 */

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 環境変数読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function testDirectConnection() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}MongoDB Atlas 直接接続テスト${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error(`${colors.red}❌ MONGODB_URIが設定されていません${colors.reset}`);
    return false;
  }

  console.log(`${colors.blue}📍 接続URI:${colors.reset}`);
  console.log(`   ${uri.replace(/\/\/[^@]+@/, '//***@')}\n`);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });

  try {
    console.log(`${colors.yellow}🔄 MongoDB Atlasに接続中...${colors.reset}`);
    await client.connect();
    
    console.log(`${colors.green}✅ 接続成功！${colors.reset}\n`);
    
    // Pingテスト
    const adminDb = client.db().admin();
    const pingResult = await adminDb.ping();
    console.log(`${colors.green}✅ Ping成功:${colors.reset}`, pingResult);
    
    // データベース情報
    const db = client.db('boardDB');
    const collections = await db.listCollections().toArray();
    console.log(`${colors.blue}📊 データベース: boardDB${colors.reset}`);
    console.log(`${colors.blue}📁 コレクション数: ${collections.length}${colors.reset}`);
    
    // usersコレクション確認
    const usersCollection = collections.find(c => c.name === 'users');
    if (usersCollection) {
      const userCount = await db.collection('users').countDocuments();
      console.log(`${colors.green}✅ usersコレクション: ${userCount}件${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ usersコレクションが存在しません（初回登録時に作成されます）${colors.reset}`);
    }
    
    await client.close();
    return true;
    
  } catch (error) {
    console.error(`${colors.red}❌ 接続失敗: ${error.message}${colors.reset}`);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log(`\n${colors.yellow}💡 クラスターが見つかりません。以下を確認してください:${colors.reset}`);
      console.log('   1. クラスターIDが正しいか (ej6jq5c)');
      console.log('   2. クラスターが起動しているか');
    } else if (error.message.includes('authentication')) {
      console.log(`\n${colors.yellow}💡 認証エラー。以下を確認してください:${colors.reset}`);
      console.log('   1. ユーザー名: boarduser');
      console.log('   2. パスワード: thc1234567890THC');
      console.log('   3. Database Accessでユーザーが作成されているか');
    } else if (error.message.includes('whitelist')) {
      console.log(`\n${colors.yellow}💡 IPアドレスが許可されていません:${colors.reset}`);
      console.log('   1. Network Accessで0.0.0.0/0を追加');
      console.log('   2. または現在のIPアドレスを追加');
    }
    
    await client.close();
    return false;
  }
}

async function testMongooseConnection() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Mongoose接続テスト${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  const uri = process.env.MONGODB_URI;
  
  try {
    console.log(`${colors.yellow}🔄 Mongooseで接続中...${colors.reset}`);
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false
    });
    
    console.log(`${colors.green}✅ Mongoose接続成功！${colors.reset}`);
    console.log(`${colors.blue}📊 接続状態: ${mongoose.connection.readyState}${colors.reset}`);
    console.log(`${colors.blue}📍 ホスト: ${mongoose.connection.host}${colors.reset}`);
    console.log(`${colors.blue}📁 データベース: ${mongoose.connection.name}${colors.reset}`);
    
    await mongoose.connection.close();
    return true;
    
  } catch (error) {
    console.error(`${colors.red}❌ Mongoose接続失敗: ${error.message}${colors.reset}`);
    return false;
  }
}

async function createTestUser() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}テストユーザー作成${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('boardDB');
    
    const testUser = {
      email: `atlas-test-${Date.now()}@example.com`,
      name: 'Atlas Test User',
      password: 'hashedPassword',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`${colors.yellow}📝 テストユーザー作成中...${colors.reset}`);
    console.log(`   Email: ${testUser.email}`);
    
    const result = await db.collection('users').insertOne(testUser);
    
    if (result.insertedId) {
      console.log(`${colors.green}✅ ユーザー作成成功！${colors.reset}`);
      console.log(`   ID: ${result.insertedId}`);
      
      // 確認
      const created = await db.collection('users').findOne({ _id: result.insertedId });
      if (created) {
        console.log(`${colors.green}✅ データ確認成功${colors.reset}`);
        
        // クリーンアップ
        await db.collection('users').deleteOne({ _id: result.insertedId });
        console.log(`${colors.blue}🧹 テストデータをクリーンアップしました${colors.reset}`);
      }
    }
    
    await client.close();
    return true;
    
  } catch (error) {
    console.error(`${colors.red}❌ テストユーザー作成失敗: ${error.message}${colors.reset}`);
    await client.close();
    return false;
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     MongoDB Atlas接続テスト - cluster0.ej6jq5c            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  const results = {
    directConnection: await testDirectConnection(),
    mongooseConnection: await testMongooseConnection(),
    testUser: false
  };
  
  // 接続成功時のみテストユーザー作成
  if (results.directConnection) {
    results.testUser = await createTestUser();
  }
  
  // 結果サマリー
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}テスト結果サマリー${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`直接接続: ${results.directConnection ? colors.green + '✅ 成功' : colors.red + '❌ 失敗'}${colors.reset}`);
  console.log(`Mongoose接続: ${results.mongooseConnection ? colors.green + '✅ 成功' : colors.red + '❌ 失敗'}${colors.reset}`);
  console.log(`データ書き込み: ${results.testUser ? colors.green + '✅ 成功' : colors.red + '❌ 失敗'}${colors.reset}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log(`\n${colors.bold}${colors.green}🎉 すべてのテストに合格しました！${colors.reset}`);
    console.log(`${colors.green}MongoDB Atlasが正常に動作しています。${colors.reset}`);
  } else {
    console.log(`\n${colors.bold}${colors.red}⚠️ 一部のテストが失敗しました${colors.reset}`);
    console.log(`${colors.yellow}上記のエラーメッセージを確認してください。${colors.reset}`);
  }
}

main().catch(console.error);