#!/usr/bin/env node

/**
 * MongoDB Atlas 統合テストスクリプト
 * 14人天才会議 - 天才10
 * MongoDB Atlas接続とユーザー登録フローの完全テスト
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const fetch = require('node-fetch');

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

// テスト結果を記録
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// テストの実行と結果記録
async function runTest(name, testFunc) {
  testResults.total++;
  log(`\n🧪 ${name}`, 'blue');
  log('─'.repeat(60), 'cyan');
  
  try {
    await testFunc();
    testResults.passed++;
    testResults.details.push({ name, status: 'passed' });
    log(`✅ ${name} - 成功`, 'green');
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.details.push({ name, status: 'failed', error: error.message });
    log(`❌ ${name} - 失敗`, 'red');
    log(`   エラー: ${error.message}`, 'red');
    return false;
  }
}

// MongoDB接続テスト
async function testMongoDBConnection(uri, name) {
  const options = {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
    family: 4,
  };
  
  if (uri.includes('mongodb+srv') || uri.includes('mongodb.net')) {
    options.retryWrites = true;
    options.w = 'majority';
  }
  
  const connection = mongoose.createConnection(uri, options);
  
  // 接続が完了するまで待機
  await new Promise((resolve, reject) => {
    connection.once('connected', resolve);
    connection.once('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 10000);
  });
  
  // 接続確認
  if (connection.readyState !== 1) {
    throw new Error(`Connection not ready: ${connection.readyState}`);
  }
  
  // データベース情報取得
  const dbInfo = {
    name: connection.db.databaseName,
    host: connection.host,
    collections: await connection.db.collections().then(cols => cols.map(c => c.collectionName))
  };
  
  log(`  📊 データベース: ${dbInfo.name}`, 'cyan');
  log(`  🌐 ホスト: ${dbInfo.host}`, 'cyan');
  log(`  📁 コレクション: ${dbInfo.collections.join(', ') || 'なし'}`, 'cyan');
  
  await connection.close();
  return dbInfo;
}

// メイン統合テスト
async function runIntegrationTests() {
  log('\n🧠 天才10: MongoDB Atlas 統合テスト\n', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  // 環境変数の確認
  log('📋 環境設定確認', 'blue');
  log('=' .repeat(70), 'cyan');
  
  const mongoEnv = process.env.MONGODB_ENV || 'local';
  const localUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';
  const atlasUri = process.env.MONGODB_URI_PRODUCTION;
  
  log(`MONGODB_ENV: ${mongoEnv}`, 'cyan');
  log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`, 'cyan');
  
  // Test 1: ローカルMongoDB接続テスト
  await runTest('ローカルMongoDB接続', async () => {
    await testMongoDBConnection(localUri, 'Local MongoDB');
  });
  
  // Test 2: MongoDB Atlas接続テスト（設定されている場合）
  if (atlasUri && !atlasUri.includes('username:password')) {
    await runTest('MongoDB Atlas接続', async () => {
      await testMongoDBConnection(atlasUri, 'MongoDB Atlas');
    });
  } else {
    log('\n⚠️  MongoDB Atlas未設定', 'yellow');
    log('  MONGODB_URI_PRODUCTIONを設定してAtlas接続をテストしてください', 'yellow');
  }
  
  // Test 3: ユーザーモデルのCRUD操作
  await runTest('ユーザーCRUD操作', async () => {
    const testUri = mongoEnv === 'atlas' && atlasUri && !atlasUri.includes('username:password') 
      ? atlasUri : localUri;
    
    const connection = mongoose.createConnection(testUri, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
    
    await new Promise((resolve, reject) => {
      connection.once('connected', resolve);
      connection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
    
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: String,
      emailVerified: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });
    
    const User = connection.model('User', userSchema);
    
    // テストユーザー作成
    const testEmail = `test-${Date.now()}@integration.com`;
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    const newUser = await User.create({
      email: testEmail,
      password: hashedPassword,
      name: 'Integration Test User',
      emailVerified: false,
    });
    
    log(`  ✅ ユーザー作成: ${newUser.email}`, 'green');
    
    // ユーザー検索
    const foundUser = await User.findOne({ email: testEmail });
    if (!foundUser) throw new Error('User not found');
    log(`  ✅ ユーザー検索: ${foundUser.email}`, 'green');
    
    // ユーザー更新
    await User.updateOne(
      { email: testEmail },
      { emailVerified: true }
    );
    
    const updatedUser = await User.findOne({ email: testEmail });
    if (!updatedUser.emailVerified) throw new Error('Update failed');
    log(`  ✅ ユーザー更新: emailVerified = ${updatedUser.emailVerified}`, 'green');
    
    // ユーザー削除
    await User.deleteOne({ email: testEmail });
    const deletedUser = await User.findOne({ email: testEmail });
    if (deletedUser) throw new Error('Delete failed');
    log(`  ✅ ユーザー削除: 完了`, 'green');
    
    await connection.close();
  });
  
  // Test 4: トランザクション処理（Atlas のみ）
  if (atlasUri && !atlasUri.includes('username:password')) {
    await runTest('トランザクション処理', async () => {
      const connection = mongoose.createConnection(atlasUri, {
        bufferCommands: false,
        maxPoolSize: 10,
        retryWrites: true,
        w: 'majority',
      });
      
      await new Promise((resolve, reject) => {
        connection.once('connected', resolve);
        connection.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });
      
      const session = await connection.startSession();
      
      try {
        await session.withTransaction(async () => {
          // トランザクション内で複数の操作
          const db = connection.db;
          const users = db.collection('users');
          
          const testUser = {
            email: `tx-test-${Date.now()}@example.com`,
            name: 'Transaction Test',
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await users.insertOne(testUser, { session });
          log(`  ✅ トランザクション内で挿入`, 'green');
          
          await users.deleteOne({ email: testUser.email }, { session });
          log(`  ✅ トランザクション内で削除`, 'green');
        });
        
        log(`  ✅ トランザクション完了`, 'green');
      } finally {
        await session.endSession();
        await connection.close();
      }
    });
  }
  
  // Test 5: 接続プールとパフォーマンス
  await runTest('接続プールテスト', async () => {
    const testUri = mongoEnv === 'atlas' && atlasUri && !atlasUri.includes('username:password') 
      ? atlasUri : localUri;
    
    const connection = mongoose.createConnection(testUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    
    await new Promise((resolve, reject) => {
      connection.once('connected', resolve);
      connection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
    
    // 並列クエリ実行
    const promises = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      promises.push(
        connection.db.collection('users').countDocuments()
      );
    }
    
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    log(`  ✅ 10並列クエリ実行時間: ${duration}ms`, 'green');
    
    if (duration > 5000) {
      log(`  ⚠️  パフォーマンス警告: クエリが遅い可能性があります`, 'yellow');
    }
    
    await connection.close();
  });
  
  // Test 6: エラーハンドリング
  await runTest('エラーハンドリング', async () => {
    // 無効なURIでの接続試行
    try {
      const badConnection = mongoose.createConnection('mongodb://invalid-host-that-does-not-exist:27017/test', {
        serverSelectionTimeoutMS: 1000,
      });
      
      await new Promise((resolve, reject) => {
        badConnection.once('connected', () => reject(new Error('Should have failed')));
        badConnection.once('error', resolve);
        setTimeout(resolve, 2000);
      });
      
      log(`  ✅ 無効な接続を適切に拒否`, 'green');
    } catch (error) {
      if (error.message === 'Should have failed') throw error;
      log(`  ✅ 接続エラーを適切に処理`, 'green');
    }
    
    // 重複キーエラーのテスト
    const testUri = mongoEnv === 'atlas' && atlasUri && !atlasUri.includes('username:password') 
      ? atlasUri : localUri;
    
    const connection = mongoose.createConnection(testUri, {
      bufferCommands: false,
    });
    
    await new Promise((resolve, reject) => {
      connection.once('connected', resolve);
      connection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
    
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      name: String,
    });
    
    const User = connection.model('ErrorTestUser', userSchema);
    
    const testEmail = `error-test-${Date.now()}@example.com`;
    await User.create({ email: testEmail, name: 'First' });
    
    try {
      await User.create({ email: testEmail, name: 'Duplicate' });
      throw new Error('Should have failed with duplicate key');
    } catch (error) {
      if (error.message === 'Should have failed with duplicate key') throw error;
      log(`  ✅ 重複キーエラーを適切に検出`, 'green');
    }
    
    // クリーンアップ
    await User.deleteOne({ email: testEmail });
    await connection.close();
  });
  
  // 結果サマリー
  log('\n' + '='.repeat(70), 'cyan');
  log('📊 テスト結果サマリー', 'magenta');
  log('=' .repeat(70), 'cyan');
  
  log(`\n総テスト数: ${testResults.total}`, 'cyan');
  log(`✅ 成功: ${testResults.passed}`, 'green');
  log(`❌ 失敗: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  
  const successRate = testResults.total > 0 ? 
    (testResults.passed / testResults.total * 100).toFixed(1) : 0;
  log(`\n成功率: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  // 詳細結果
  if (testResults.details.length > 0) {
    log('\n詳細:', 'yellow');
    testResults.details.forEach(detail => {
      const icon = detail.status === 'passed' ? '✅' : '❌';
      const color = detail.status === 'passed' ? 'green' : 'red';
      log(`  ${icon} ${detail.name}`, color);
      if (detail.error) {
        log(`     エラー: ${detail.error}`, 'red');
      }
    });
  }
  
  // 最終判定
  log('\n' + '='.repeat(70), 'cyan');
  
  if (testResults.failed === 0) {
    log('🎉 すべてのテストに合格！', 'green');
    log('MongoDB接続は正常に動作しています', 'green');
    
    if (!atlasUri || atlasUri.includes('username:password')) {
      log('\n💡 次のステップ:', 'yellow');
      log('  1. MongoDB Atlasアカウントを作成', 'yellow');
      log('  2. MONGODB_URI_PRODUCTIONを設定', 'yellow');
      log('  3. MONGODB_ENV=atlas npm run dev で起動', 'yellow');
      log('  詳細は MONGODB_ATLAS_SETUP.md を参照', 'yellow');
    }
  } else {
    log('⚠️  一部のテストが失敗しました', 'yellow');
    log('エラーを確認して修正してください', 'yellow');
  }
  
  log('=' .repeat(70) + '\n', 'cyan');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// メイン実行
runIntegrationTests().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});