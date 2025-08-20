#!/usr/bin/env node

/**
 * MongoDB接続テストスクリプト
 * 14人天才会議 - 天才5
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// MongoDB URIを取得する関数
function getMongoUri() {
  const uris = {
    production: process.env.MONGODB_URI_PRODUCTION,
    local: process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB'
  };

  log('\n📊 環境変数チェック', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  if (uris.production && uris.production !== 'mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/boardDB?retryWrites=true&w=majority') {
    log('✅ MONGODB_URI_PRODUCTION が設定されています', 'green');
    log(`   URI: ${uris.production.replace(/\/\/.*@/, '//***@').substring(0, 60)}...`, 'cyan');
    return uris.production;
  } else if (uris.production) {
    log('⚠️  MONGODB_URI_PRODUCTION はサンプル値のままです', 'yellow');
    log('   実際のMongoDB Atlas接続文字列を設定してください', 'yellow');
  }
  
  log('📍 MONGODB_URI (ローカル) を使用します', 'blue');
  log(`   URI: ${uris.local}`, 'cyan');
  return uris.local;
}

// 接続テストを実行
async function testConnection() {
  log('\n🧠 天才5: MongoDB接続テスト\n', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  const MONGODB_URI = getMongoUri();
  const isAtlas = MONGODB_URI.includes('mongodb+srv') || MONGODB_URI.includes('mongodb.net');
  
  log('\n🔍 接続情報', 'blue');
  log('=' .repeat(70), 'cyan');
  log(`接続タイプ: ${isAtlas ? 'MongoDB Atlas (オンライン)' : 'ローカルMongoDB'}`, 'cyan');
  log(`環境: ${process.env.NODE_ENV || 'development'}`, 'cyan');
  
  // 接続オプション
  const options = {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
    family: 4,
  };
  
  if (isAtlas) {
    options.retryWrites = true;
    options.w = 'majority';
  }
  
  log('\n🔄 接続を開始します...', 'yellow');
  
  try {
    // 接続
    const startTime = Date.now();
    await mongoose.connect(MONGODB_URI, options);
    const connectionTime = Date.now() - startTime;
    
    log(`\n✅ 接続成功！ (${connectionTime}ms)`, 'green');
    
    // 接続情報を表示
    const connection = mongoose.connection;
    log('\n📋 接続詳細', 'blue');
    log('=' .repeat(70), 'cyan');
    log(`データベース名: ${connection.db.databaseName}`, 'cyan');
    log(`ホスト: ${connection.host}`, 'cyan');
    log(`ポート: ${connection.port}`, 'cyan');
    log(`接続状態: ${['切断', '接続済み', '接続中', '切断中'][connection.readyState]}`, 'cyan');
    
    // コレクション一覧を取得
    const collections = await connection.db.collections();
    log(`\nコレクション数: ${collections.length}`, 'cyan');
    if (collections.length > 0) {
      log('コレクション一覧:', 'cyan');
      for (const collection of collections) {
        const count = await collection.countDocuments();
        log(`  - ${collection.collectionName}: ${count} ドキュメント`, 'cyan');
      }
    }
    
    // ユーザーコレクションの詳細確認
    const usersCollection = connection.db.collection('users');
    const userCount = await usersCollection.countDocuments();
    
    log('\n👥 ユーザーデータ確認', 'blue');
    log('=' .repeat(70), 'cyan');
    log(`総ユーザー数: ${userCount}`, 'cyan');
    
    if (userCount > 0) {
      // 最新のユーザー5件を取得
      const recentUsers = await usersCollection
        .find({}, { projection: { email: 1, name: 1, emailVerified: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      log('\n最近登録されたユーザー (最新5件):', 'cyan');
      recentUsers.forEach((user, index) => {
        const date = user.createdAt ? new Date(user.createdAt).toLocaleString('ja-JP') : '不明';
        log(`  ${index + 1}. ${user.email || '不明'}`, 'cyan');
        log(`     名前: ${user.name || '未設定'}`, 'cyan');
        log(`     メール確認: ${user.emailVerified ? '✅' : '❌'}`, user.emailVerified ? 'green' : 'yellow');
        log(`     登録日時: ${date}`, 'cyan');
      });
      
      // 統計情報
      const verifiedCount = await usersCollection.countDocuments({ emailVerified: true });
      const unverifiedCount = await usersCollection.countDocuments({ emailVerified: false });
      
      log('\n📊 統計情報', 'blue');
      log(`メール確認済み: ${verifiedCount} ユーザー`, 'green');
      log(`メール未確認: ${unverifiedCount} ユーザー`, 'yellow');
    }
    
    // テストデータの作成（オプション）
    log('\n🧪 テストデータ作成', 'blue');
    log('=' .repeat(70), 'cyan');
    
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Connection Test User',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      testData: true
    };
    
    try {
      const result = await usersCollection.insertOne(testUser);
      log('✅ テストユーザー作成成功', 'green');
      log(`   ID: ${result.insertedId}`, 'cyan');
      log(`   Email: ${testUser.email}`, 'cyan');
      
      // テストデータを削除
      await usersCollection.deleteOne({ _id: result.insertedId });
      log('✅ テストユーザー削除成功', 'green');
    } catch (error) {
      log('⚠️  テストデータ作成/削除でエラー:', 'yellow');
      log(`   ${error.message}`, 'yellow');
    }
    
    // 最終結果
    log('\n' + '='.repeat(70), 'cyan');
    log('🎉 すべてのテストが成功しました！', 'green');
    log(`✅ ${isAtlas ? 'MongoDB Atlas (オンライン)' : 'ローカルMongoDB'} への接続が正常に動作しています`, 'green');
    log('='.repeat(70) + '\n', 'cyan');
    
  } catch (error) {
    log('\n❌ 接続エラー', 'red');
    log('=' .repeat(70), 'red');
    log(`エラーメッセージ: ${error.message}`, 'red');
    
    // エラーの詳細分析
    if (error.message.includes('ECONNREFUSED')) {
      log('\n💡 解決方法:', 'yellow');
      log('  1. MongoDBサーバーが起動していることを確認', 'yellow');
      log('  2. ローカルの場合: mongod を実行', 'yellow');
      log('  3. ポート27017が使用可能か確認', 'yellow');
    } else if (error.message.includes('authentication failed')) {
      log('\n💡 解決方法:', 'yellow');
      log('  1. MongoDB Atlasのユーザー名とパスワードを確認', 'yellow');
      log('  2. .env.productionのMONGODB_URI_PRODUCTIONを更新', 'yellow');
      log('  3. パスワードに特殊文字が含まれる場合はURLエンコード', 'yellow');
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND')) {
      log('\n💡 解決方法:', 'yellow');
      log('  1. インターネット接続を確認', 'yellow');
      log('  2. MongoDB AtlasのIP Whitelistに現在のIPを追加', 'yellow');
      log('  3. Network Accessで0.0.0.0/0 (すべて許可)を設定', 'yellow');
      log('  4. VPNを使用している場合は無効化してみる', 'yellow');
    } else if (error.message.includes('querySrv')) {
      log('\n💡 解決方法:', 'yellow');
      log('  1. MongoDB Atlas接続文字列を確認', 'yellow');
      log('  2. mongodb+srv://の形式が正しいか確認', 'yellow');
      log('  3. クラスター名が正しいか確認', 'yellow');
    }
    
    log('\n詳細なエラー情報:', 'red');
    console.error(error);
    
    process.exit(1);
  } finally {
    // 接続を閉じる
    await mongoose.disconnect();
    log('\n🛑 接続を終了しました', 'cyan');
  }
}

// メイン実行
testConnection().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});