#!/usr/bin/env node

/**
 * 直接ログインテスト（デバッグ用）
 * 14人天才会議 - 天才8
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const http = require('http');

const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

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

async function directLoginTest() {
  log('\n🧠 天才8: 直接ログインテスト（デバッグ用）\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  let mongoClient;
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // テストユーザー作成
    const testEmail = `debug-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    log('\n📝 テストユーザー作成', 'blue');
    
    // emailVerified = false のユーザー作成
    await db.collection('users').insertOne({
      email: testEmail,
      password: hashedPassword,
      name: 'Debug Test User',
      emailVerified: false, // 明示的にfalse
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    log(`  Email: ${testEmail}`, 'cyan');
    log(`  Password: ${testPassword}`, 'cyan');
    log(`  emailVerified: false`, 'yellow');
    
    log('\n🔐 ログインテスト実行', 'blue');
    log('サーバーのコンソールログを確認してください！', 'yellow');
    log('以下のログが表示されるはずです:', 'yellow');
    log('  - 🔐 [AUTH] authorize関数が呼ばれました', 'cyan');
    log('  - 📧 [AUTH] ユーザー情報', 'cyan');
    log('  - ❌ [AUTH] メール未確認のためログイン拒否', 'cyan');
    
    // 直接APIをコール
    const authData = JSON.stringify({
      email: testEmail,
      password: testPassword
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': authData.length
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', async () => {
        log('\n📊 レスポンス:', 'magenta');
        log(`  Status: ${res.statusCode}`, res.statusCode === 401 ? 'green' : 'red');
        log(`  Headers:`, 'cyan');
        console.log(res.headers);
        
        if (res.statusCode === 200 || res.statusCode === 302) {
          log('\n❌ セキュリティエラー: メール未確認でログイン成功！', 'red');
          log('これは重大な問題です！', 'red');
        } else {
          log('\n✅ 正常: メール未確認でログイン拒否', 'green');
        }
        
        // クリーンアップ
        await db.collection('users').deleteOne({ email: testEmail });
        
        if (mongoClient) {
          await mongoClient.close();
        }
        
        log('\n' + '='.repeat(60), 'cyan');
        log('サーバーログを確認してデバッグ情報を見てください', 'yellow');
        log('='.repeat(60) + '\n', 'cyan');
      });
    });
    
    req.on('error', (e) => {
      log(`\n❌ リクエストエラー: ${e.message}`, 'red');
    });
    
    req.write(authData);
    req.end();
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
    console.error(error);
    
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// 実行
directLoginTest().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});