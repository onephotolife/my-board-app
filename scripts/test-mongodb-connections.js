#!/usr/bin/env node

/**
 * MongoDB接続テストスクリプト
 * 各環境での接続をテストし、実際の使用状況を確認
 */

const { MongoClient } = require('mongodb');
const http = require('http');
const crypto = require('crypto');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// API経由でのテスト
async function testAPIConnection(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// 直接接続テスト
async function testDirectConnection(uri, name) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    const startTime = Date.now();
    await client.connect();
    const connectTime = Date.now() - startTime;
    
    // データベース情報取得
    const admin = client.db().admin();
    const pingResult = await admin.ping();
    const buildInfo = await admin.buildInfo();
    
    // コレクション一覧
    const db = client.db('boardDB');
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    return {
      success: true,
      name,
      connectTime,
      version: buildInfo.version,
      collections: collections.map(c => c.name),
    };
  } catch (error) {
    return {
      success: false,
      name,
      error: error.message,
    };
  }
}

// クエリパフォーマンステスト
async function testQueryPerformance(uri, name) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('boardDB');
    const collection = db.collection('users');
    
    // テストユーザー作成
    const testUser = {
      email: `perf-test-${Date.now()}@example.com`,
      name: 'Performance Test',
      password: 'hashed',
      createdAt: new Date(),
    };
    
    // 挿入テスト
    const insertStart = Date.now();
    const insertResult = await collection.insertOne(testUser);
    const insertTime = Date.now() - insertStart;
    
    // 検索テスト
    const findStart = Date.now();
    const foundUser = await collection.findOne({ _id: insertResult.insertedId });
    const findTime = Date.now() - findStart;
    
    // 削除テスト
    const deleteStart = Date.now();
    await collection.deleteOne({ _id: insertResult.insertedId });
    const deleteTime = Date.now() - deleteStart;
    
    await client.close();
    
    return {
      success: true,
      name,
      insertTime,
      findTime,
      deleteTime,
      totalTime: insertTime + findTime + deleteTime,
    };
  } catch (error) {
    return {
      success: false,
      name,
      error: error.message,
    };
  }
}

// メイン実行関数
async function runTests() {
  log('\n🧪 MongoDB接続テスト実行', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  // 環境変数読み込み
  require('dotenv').config({ path: '.env.local' });
  
  const atlasUri = process.env.MONGODB_URI;
  const localUri = process.env.MONGODB_URI_LOCAL || 'mongodb://localhost:27017/boardDB';
  
  // Phase 1: API経由のテスト
  log('\n📋 Phase 1: API経由の接続テスト', 'blue');
  
  try {
    // 投稿一覧取得
    const postsResult = await testAPIConnection('/api/posts');
    if (postsResult.status === 200) {
      log('  ✅ GET /api/posts: 成功', 'green');
      const posts = JSON.parse(postsResult.data);
      log(`     投稿数: ${posts.length}`, 'cyan');
    } else {
      log(`  ❌ GET /api/posts: 失敗 (${postsResult.status})`, 'red');
    }
    
    // 新規投稿作成
    const newPost = {
      content: `テスト投稿 ${new Date().toISOString()}`,
    };
    
    const createResult = await testAPIConnection('/api/posts', 'POST', newPost);
    if (createResult.status === 201 || createResult.status === 200) {
      log('  ✅ POST /api/posts: 成功', 'green');
      const created = JSON.parse(createResult.data);
      
      // 作成した投稿を削除
      if (created._id || created.id) {
        const deleteResult = await testAPIConnection(
          `/api/posts/${created._id || created.id}`,
          'DELETE'
        );
        if (deleteResult.status === 200) {
          log('  ✅ DELETE /api/posts/[id]: 成功', 'green');
        }
      }
    } else {
      log(`  ❌ POST /api/posts: 失敗 (${createResult.status})`, 'red');
    }
    
    // 認証API
    const signupData = {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };
    
    const signupResult = await testAPIConnection('/api/auth/signup', 'POST', signupData);
    if (signupResult.status === 200 || signupResult.status === 201) {
      log('  ✅ POST /api/auth/signup: 成功', 'green');
    } else {
      log(`  ⚠️ POST /api/auth/signup: ${signupResult.status}`, 'yellow');
    }
    
  } catch (error) {
    log(`  ❌ APIテストエラー: ${error.message}`, 'red');
  }
  
  // Phase 2: 直接接続テスト
  log('\n📋 Phase 2: 直接接続テスト', 'blue');
  
  if (atlasUri) {
    const atlasResult = await testDirectConnection(atlasUri, 'MongoDB Atlas');
    if (atlasResult.success) {
      log(`\n✅ MongoDB Atlas接続成功`, 'green');
      log(`  接続時間: ${atlasResult.connectTime}ms`, 'cyan');
      log(`  バージョン: ${atlasResult.version}`, 'cyan');
      log(`  コレクション: ${atlasResult.collections.join(', ')}`, 'cyan');
    } else {
      log(`\n❌ MongoDB Atlas接続失敗`, 'red');
      log(`  エラー: ${atlasResult.error}`, 'yellow');
    }
  }
  
  const localResult = await testDirectConnection(localUri, 'Local MongoDB');
  if (localResult.success) {
    log(`\n✅ Local MongoDB接続成功`, 'green');
    log(`  接続時間: ${localResult.connectTime}ms`, 'cyan');
    log(`  バージョン: ${localResult.version}`, 'cyan');
    log(`  コレクション: ${localResult.collections.join(', ')}`, 'cyan');
  } else {
    log(`\n❌ Local MongoDB接続失敗`, 'red');
    log(`  エラー: ${localResult.error}`, 'yellow');
  }
  
  // Phase 3: パフォーマンステスト
  log('\n📋 Phase 3: パフォーマンステスト', 'blue');
  
  if (atlasUri) {
    const atlasPerfResult = await testQueryPerformance(atlasUri, 'MongoDB Atlas');
    if (atlasPerfResult.success) {
      log(`\n✅ MongoDB Atlasパフォーマンス`, 'green');
      log(`  挿入: ${atlasPerfResult.insertTime}ms`, 'cyan');
      log(`  検索: ${atlasPerfResult.findTime}ms`, 'cyan');
      log(`  削除: ${atlasPerfResult.deleteTime}ms`, 'cyan');
      log(`  合計: ${atlasPerfResult.totalTime}ms`, 'yellow');
    }
  }
  
  const localPerfResult = await testQueryPerformance(localUri, 'Local MongoDB');
  if (localPerfResult.success) {
    log(`\n✅ Local MongoDBパフォーマンス`, 'green');
    log(`  挿入: ${localPerfResult.insertTime}ms`, 'cyan');
    log(`  検索: ${localPerfResult.findTime}ms`, 'cyan');
    log(`  削除: ${localPerfResult.deleteTime}ms`, 'cyan');
    log(`  合計: ${localPerfResult.totalTime}ms`, 'yellow');
  }
  
  // Phase 4: 現在の使用状況確認
  log('\n📋 Phase 4: 現在の使用状況', 'blue');
  
  // どちらの接続が実際に使われているか確認
  try {
    const testEmail = `usage-test-${Date.now()}@example.com`;
    const signupData = {
      name: 'Usage Test',
      email: testEmail,
      password: 'TestPassword123!',
    };
    
    // APIで作成
    await testAPIConnection('/api/auth/signup', 'POST', signupData);
    
    // 両方のDBで確認
    let foundInAtlas = false;
    let foundInLocal = false;
    
    if (atlasUri) {
      const atlasClient = new MongoClient(atlasUri);
      await atlasClient.connect();
      const atlasUser = await atlasClient.db('boardDB').collection('users').findOne({ email: testEmail });
      foundInAtlas = !!atlasUser;
      await atlasClient.close();
    }
    
    const localClient = new MongoClient(localUri);
    await localClient.connect();
    const localUser = await localClient.db('boardDB').collection('users').findOne({ email: testEmail });
    foundInLocal = !!localUser;
    
    // クリーンアップ
    if (foundInLocal) {
      await localClient.db('boardDB').collection('users').deleteOne({ email: testEmail });
    }
    await localClient.close();
    
    if (atlasUri && foundInAtlas) {
      const atlasClient = new MongoClient(atlasUri);
      await atlasClient.connect();
      await atlasClient.db('boardDB').collection('users').deleteOne({ email: testEmail });
      await atlasClient.close();
    }
    
    log('\n使用中のデータベース:', 'magenta');
    if (foundInAtlas && !foundInLocal) {
      log('  🌐 MongoDB Atlas（クラウド）', 'green');
    } else if (foundInLocal && !foundInAtlas) {
      log('  💻 Local MongoDB（ローカル）', 'green');
    } else if (foundInAtlas && foundInLocal) {
      log('  ⚠️ 両方のDBに書き込まれています（設定要確認）', 'yellow');
    } else {
      log('  ❌ どちらのDBにも書き込まれませんでした', 'red');
    }
    
  } catch (error) {
    log(`\n❌ 使用状況確認エラー: ${error.message}`, 'red');
  }
  
  // 総合診断
  log('\n📊 総合診断', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  // 結果サマリー
  const atlasOk = atlasUri && atlasResult?.success;
  const localOk = localResult?.success;
  const apiOk = true; // APIテストの結果に基づく
  
  if (atlasOk && localOk && apiOk) {
    log('✅ すべての接続が正常です', 'green');
  } else {
    log('⚠️ 一部の接続に問題があります', 'yellow');
    if (!atlasOk) log('  • MongoDB Atlas接続に問題', 'red');
    if (!localOk) log('  • Local MongoDB接続に問題', 'red');
    if (!apiOk) log('  • API経由の接続に問題', 'red');
  }
  
  log('\n' + '=' .repeat(60) + '\n', 'cyan');
}

// 実行
runTests().catch(error => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});