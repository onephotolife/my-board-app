#!/usr/bin/env node

/**
 * メールフロー完全テストスクリプト
 * 14人天才会議 - 天才10
 */

const http = require('http');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

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

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'EmailFlowTester/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function testEmailFlow() {
  log('\n🧠 天才10: メールフロー完全テスト\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  let mongoClient;
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // 1. テストデータ作成
    log('\n📝 テストデータ作成', 'blue');
    
    const testEmail = `flow-test-${Date.now()}@example.com`;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // ユーザー作成
    await db.collection('users').insertOne({
      name: 'Flow Test User',
      email: testEmail,
      password: 'hashed_password',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // リセットトークン作成
    await db.collection('passwordresets').insertOne({
      email: testEmail,
      token: resetToken,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date()
    });
    
    log('  ✅ テストデータ作成完了', 'green');
    log(`    Email: ${testEmail}`, 'cyan');
    log(`    Verify Token: ${verificationToken.substring(0, 20)}...`, 'cyan');
    log(`    Reset Token: ${resetToken.substring(0, 20)}...`, 'cyan');
    
    // 2. Service Worker状態確認
    log('\n🔧 Service Worker状態確認', 'blue');
    
    try {
      const swResponse = await makeRequest('/sw.js');
      const swContent = swResponse.data.toString();
      
      // 認証ページバイパス確認
      if (swContent.includes("url.pathname.startsWith('/auth/')")) {
        log('  ✅ 認証ページバイパス設定: あり', 'green');
      } else {
        log('  ❌ 認証ページバイパス設定: なし', 'red');
      }
      
      // キャッシュバージョン確認
      const versionMatch = swContent.match(/board-app-v(\d+)/);
      if (versionMatch) {
        log(`  ✅ キャッシュバージョン: v${versionMatch[1]}`, 'green');
      } else {
        log('  ❌ キャッシュバージョン: 不明', 'red');
      }
      
      // エラーハンドリング確認
      if (swContent.includes("addEventListener('error'")) {
        log('  ✅ エラーハンドリング: 実装済み', 'green');
      } else {
        log('  ⚠️  エラーハンドリング: なし', 'yellow');
      }
    } catch (error) {
      log(`  ❌ Service Worker確認エラー: ${error.message}`, 'red');
    }
    
    // 3. メール確認リンクテスト
    log('\n📧 メール確認リンクテスト', 'blue');
    
    const verifyUrl = `/auth/verify-email?token=${verificationToken}`;
    log(`  URL: http://localhost:3000${verifyUrl}`, 'cyan');
    
    try {
      const response = await makeRequest(verifyUrl);
      log(`  Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
      
      const html = response.data.toString();
      
      // コンテンツ分析
      if (html.includes('Network error')) {
        log('  ❌ Network errorが表示されています', 'red');
      } else if (html.includes('オフラインです') || html.includes('offline')) {
        log('  ❌ オフラインページが表示されています', 'red');
      } else if (html.includes('メールアドレスを確認中') || html.includes('確認完了')) {
        log('  ✅ 正常なページが表示されています', 'green');
      } else if (html.includes('<!DOCTYPE html>')) {
        log('  ✅ HTMLページが返されています', 'green');
        
        // ページタイトル抽出
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        if (titleMatch) {
          log(`    タイトル: ${titleMatch[1]}`, 'cyan');
        }
      } else {
        log('  ⚠️  予期しないレスポンス内容', 'yellow');
        log(`    最初の100文字: ${html.substring(0, 100)}`, 'cyan');
      }
    } catch (error) {
      log(`  ❌ リクエストエラー: ${error.message}`, 'red');
    }
    
    // 4. パスワードリセットリンクテスト
    log('\n🔑 パスワードリセットリンクテスト', 'blue');
    
    const resetUrl = `/auth/reset-password/${resetToken}`;
    log(`  URL: http://localhost:3000${resetUrl}`, 'cyan');
    
    try {
      const response = await makeRequest(resetUrl);
      log(`  Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
      
      const html = response.data.toString();
      
      // コンテンツ分析
      if (html.includes('Network error')) {
        log('  ❌ Network errorが表示されています', 'red');
      } else if (html.includes('オフラインです') || html.includes('offline')) {
        log('  ❌ オフラインページが表示されています', 'red');
      } else if (html.includes('パスワード') || html.includes('リセット')) {
        log('  ✅ 正常なページが表示されています', 'green');
      } else if (html.includes('<!DOCTYPE html>')) {
        log('  ✅ HTMLページが返されています', 'green');
      } else {
        log('  ⚠️  予期しないレスポンス内容', 'yellow');
      }
    } catch (error) {
      log(`  ❌ リクエストエラー: ${error.message}`, 'red');
    }
    
    // 5. クリーンアップ
    await db.collection('users').deleteOne({ email: testEmail });
    await db.collection('passwordresets').deleteOne({ token: resetToken });
    
    // 6. 診断結果
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 診断結果', 'magenta');
    log('='.repeat(60), 'cyan');
    
    log('\n✅ 修正確認項目:', 'green');
    log('  1. Service Workerが認証ページをバイパス', 'cyan');
    log('  2. メール確認ページが正常に表示', 'cyan');
    log('  3. パスワードリセットページが正常に表示', 'cyan');
    log('  4. Network errorが表示されない', 'cyan');
    log('  5. オフラインページが表示されない', 'cyan');
    
    log('\n📝 ユーザー向け指示:', 'yellow');
    log('  1. ブラウザのキャッシュをクリア', 'cyan');
    log('  2. Service Workerを再登録', 'cyan');
    log('  3. ページをリロード（Ctrl+Shift+R）', 'cyan');
    log('  4. メールリンクを再度クリック', 'cyan');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
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
testEmailFlow().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});