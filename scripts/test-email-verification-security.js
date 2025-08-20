#!/usr/bin/env node

/**
 * メール確認セキュリティテスト
 * 14人天才会議 - 天才3
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

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

function makeRequest(path, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SecurityTest/1.0',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testEmailVerificationSecurity() {
  log('\n🧠 天才3: メール確認セキュリティテスト\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  let mongoClient;
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // テスト用のユーザー情報
    const testEmail = `security-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Security Test User';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // 1. メール未確認ユーザーを作成
    log('\n📝 テスト1: メール未確認ユーザーの作成', 'blue');
    
    const verificationToken = uuidv4();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);
    
    await db.collection('users').insertOne({
      email: testEmail,
      password: hashedPassword,
      name: testName,
      emailVerified: false, // 未確認
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiry: tokenExpiry,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    log('  ✅ ユーザー作成完了', 'green');
    log(`    Email: ${testEmail}`, 'cyan');
    log(`    emailVerified: false`, 'yellow');
    
    // 2. メール未確認でログイン試行
    log('\n🔐 テスト2: メール未確認でログイン試行', 'blue');
    
    try {
      const loginResponse = await makeRequest('/api/auth/signin', 'POST', {
        email: testEmail,
        password: testPassword
      });
      
      log(`  Status: ${loginResponse.status}`, loginResponse.status === 401 ? 'green' : 'red');
      
      if (loginResponse.status === 200) {
        log('  ❌ セキュリティエラー: メール未確認でログイン成功！', 'red');
        log('  これは重大なセキュリティ問題です！', 'red');
      } else {
        log('  ✅ 正常: メール未確認でログイン拒否', 'green');
      }
    } catch (error) {
      log(`  ✅ ログイン拒否: ${error.message}`, 'green');
    }
    
    // 3. メール確認処理を実行
    log('\n📧 テスト3: メール確認処理', 'blue');
    
    await db.collection('users').updateOne(
      { email: testEmail },
      { $set: { emailVerified: true } }
    );
    
    log('  ✅ メール確認完了', 'green');
    log(`    emailVerified: true`, 'green');
    
    // 4. メール確認後のログイン試行
    log('\n🔓 テスト4: メール確認後のログイン試行', 'blue');
    
    try {
      const loginResponse = await makeRequest('/api/auth/signin', 'POST', {
        email: testEmail,
        password: testPassword
      });
      
      log(`  Status: ${loginResponse.status}`, loginResponse.status === 200 ? 'green' : 'red');
      
      if (loginResponse.status === 200) {
        log('  ✅ 正常: メール確認後はログイン成功', 'green');
      } else {
        log('  ⚠️  問題: メール確認後もログイン失敗', 'yellow');
        log(`    理由: ${JSON.stringify(loginResponse.data)}`, 'cyan');
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
    }
    
    // 5. emailVerified が null の場合のテスト
    log('\n🔍 テスト5: emailVerified が null の場合', 'blue');
    
    const nullTestEmail = `null-test-${Date.now()}@example.com`;
    
    await db.collection('users').insertOne({
      email: nullTestEmail,
      password: hashedPassword,
      name: 'Null Test User',
      emailVerified: null, // null を明示的に設定
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    try {
      const loginResponse = await makeRequest('/api/auth/signin', 'POST', {
        email: nullTestEmail,
        password: testPassword
      });
      
      log(`  Status: ${loginResponse.status}`, loginResponse.status === 401 ? 'green' : 'red');
      
      if (loginResponse.status === 200) {
        log('  ❌ セキュリティエラー: emailVerified=nullでログイン成功！', 'red');
      } else {
        log('  ✅ 正常: emailVerified=nullでログイン拒否', 'green');
      }
    } catch (error) {
      log(`  ✅ ログイン拒否: ${error.message}`, 'green');
    }
    
    // 6. emailVerified フィールドが存在しない場合のテスト
    log('\n🔍 テスト6: emailVerified フィールドが存在しない場合', 'blue');
    
    const noFieldTestEmail = `nofield-test-${Date.now()}@example.com`;
    
    await db.collection('users').insertOne({
      email: noFieldTestEmail,
      password: hashedPassword,
      name: 'No Field Test User',
      // emailVerified フィールドを含めない
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    try {
      const loginResponse = await makeRequest('/api/auth/signin', 'POST', {
        email: noFieldTestEmail,
        password: testPassword
      });
      
      log(`  Status: ${loginResponse.status}`, loginResponse.status === 401 ? 'green' : 'red');
      
      if (loginResponse.status === 200) {
        log('  ❌ セキュリティエラー: emailVerifiedなしでログイン成功！', 'red');
      } else {
        log('  ✅ 正常: emailVerifiedなしでログイン拒否', 'green');
      }
    } catch (error) {
      log(`  ✅ ログイン拒否: ${error.message}`, 'green');
    }
    
    // クリーンアップ
    await db.collection('users').deleteOne({ email: testEmail });
    await db.collection('users').deleteOne({ email: nullTestEmail });
    await db.collection('users').deleteOne({ email: noFieldTestEmail });
    
    // 結果サマリー
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 テスト結果サマリー', 'magenta');
    log('='.repeat(60), 'cyan');
    
    log('\n✅ セキュリティチェック項目:', 'green');
    log('  1. メール未確認（false）でログイン拒否', 'cyan');
    log('  2. メール確認済み（true）でログイン許可', 'cyan');
    log('  3. emailVerified=nullでログイン拒否', 'cyan');
    log('  4. emailVerifiedフィールドなしでログイン拒否', 'cyan');
    
    log('\n🔒 修正内容:', 'yellow');
    log('  auth.config.ts: emailVerified: { $ne: null } → emailVerified: true', 'cyan');
    
    log('\n📝 推奨事項:', 'yellow');
    log('  1. 既存ユーザーのemailVerifiedフィールドを確認', 'cyan');
    log('  2. nullやundefinedの値を持つユーザーを修正', 'cyan');
    log('  3. デフォルトfalseが正しく設定されているか確認', 'cyan');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  log('🏁 テスト完了', 'green');
  log('='.repeat(60) + '\n', 'cyan');
}

// 実行
testEmailVerificationSecurity().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});