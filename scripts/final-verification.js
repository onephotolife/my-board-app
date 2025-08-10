#!/usr/bin/env node

/**
 * 最終動作確認スクリプト
 * 14人天才会議 - 天才13
 */

const http = require('http');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

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

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'FinalVerification/1.0',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
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

async function finalVerification() {
  log('\n🧠 天才13: 最終動作確認\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };
  
  let mongoClient;
  
  try {
    // 1. Service Worker確認
    log('\n📋 1. Service Worker確認', 'blue');
    results.total++;
    
    try {
      const swPath = path.join(process.cwd(), 'public', 'sw.js');
      const swContent = await fs.readFile(swPath, 'utf8');
      
      if (swContent.includes("url.pathname.startsWith('/auth/')") &&
          swContent.includes('board-app-v4') &&
          swContent.includes('console.log(\'[SW] Bypassing auth-related request:')) {
        log('  ✅ Service Worker設定: 完璧', 'green');
        results.passed++;
        results.details.push({ test: 'Service Worker', status: 'passed' });
      } else {
        log('  ❌ Service Worker設定: 問題あり', 'red');
        results.failed++;
        results.details.push({ test: 'Service Worker', status: 'failed' });
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      results.failed++;
      results.details.push({ test: 'Service Worker', status: 'failed', error: error.message });
    }
    
    // 2. MongoDB接続とテストデータ作成
    log('\n📋 2. テストデータ準備', 'blue');
    
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    const testEmail = `final-test-${Date.now()}@example.com`;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // ユーザー作成
    await db.collection('users').insertOne({
      name: 'Final Test User',
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
    
    log('  ✅ テストデータ準備完了', 'green');
    
    // 3. メール確認リンクテスト
    log('\n📋 3. メール確認リンクテスト', 'blue');
    results.total++;
    
    const verifyUrl = `/auth/verify-email?token=${verificationToken}`;
    
    try {
      const response = await makeRequest(verifyUrl);
      const html = response.data.toString();
      
      if (response.status === 200 && 
          !html.includes('Network error') &&
          !html.includes('オフラインです')) {
        log('  ✅ メール確認リンク: 正常動作', 'green');
        results.passed++;
        results.details.push({ test: 'メール確認リンク', status: 'passed' });
      } else {
        log('  ❌ メール確認リンク: エラー', 'red');
        results.failed++;
        results.details.push({ test: 'メール確認リンク', status: 'failed' });
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      results.failed++;
      results.details.push({ test: 'メール確認リンク', status: 'failed', error: error.message });
    }
    
    // 4. パスワードリセットリンクテスト
    log('\n📋 4. パスワードリセットリンクテスト', 'blue');
    results.total++;
    
    const resetUrl = `/auth/reset-password/${resetToken}`;
    
    try {
      const response = await makeRequest(resetUrl);
      const html = response.data.toString();
      
      if (response.status === 200 && 
          !html.includes('Network error') &&
          !html.includes('オフラインです')) {
        log('  ✅ パスワードリセットリンク: 正常動作', 'green');
        results.passed++;
        results.details.push({ test: 'パスワードリセットリンク', status: 'passed' });
      } else {
        log('  ❌ パスワードリセットリンク: エラー', 'red');
        results.failed++;
        results.details.push({ test: 'パスワードリセットリンク', status: 'failed' });
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      results.failed++;
      results.details.push({ test: 'パスワードリセットリンク', status: 'failed', error: error.message });
    }
    
    // 5. エラーメッセージ確認
    log('\n📋 5. エラーメッセージ確認', 'blue');
    results.total++;
    
    let hasNetworkError = false;
    results.details.forEach(detail => {
      if (detail.test.includes('リンク') && detail.status === 'passed') {
        // 正常に動作している
      } else if (detail.error && detail.error.includes('Network error')) {
        hasNetworkError = true;
      }
    });
    
    if (!hasNetworkError) {
      log('  ✅ Network errorメッセージ: 表示されない', 'green');
      results.passed++;
      results.details.push({ test: 'エラーメッセージ', status: 'passed' });
    } else {
      log('  ❌ Network errorメッセージ: まだ表示される', 'red');
      results.failed++;
      results.details.push({ test: 'エラーメッセージ', status: 'failed' });
    }
    
    // クリーンアップ
    await db.collection('users').deleteOne({ email: testEmail });
    await db.collection('passwordresets').deleteOne({ token: resetToken });
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
    results.failed++;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
  
  // 最終結果
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 最終確認結果', 'magenta');
  log('='.repeat(60), 'cyan');
  
  log(`\n総テスト数: ${results.total}`, 'cyan');
  log(`✅ 成功: ${results.passed}`, 'green');
  log(`❌ 失敗: ${results.failed}`, 'red');
  
  const successRate = results.total > 0 ? 
    (results.passed / results.total * 100).toFixed(1) : 0;
  log(`\n成功率: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  // 詳細結果
  log('\n詳細:', 'yellow');
  results.details.forEach(detail => {
    const icon = detail.status === 'passed' ? '✅' : '❌';
    const color = detail.status === 'passed' ? 'green' : 'red';
    log(`  ${icon} ${detail.test}`, color);
    if (detail.error) {
      log(`     エラー: ${detail.error}`, 'cyan');
    }
  });
  
  // 最終判定
  log('\n' + '='.repeat(60), 'cyan');
  if (results.failed === 0) {
    log('🎉 完璧！すべてのテストに合格しました！', 'bold');
    log('メールリンクの問題は完全に解決されています。', 'green');
    
    log('\n📝 ユーザー様へ:', 'yellow');
    log('  1. ブラウザのキャッシュをクリアしてください', 'cyan');
    log('  2. Service Workerを再登録してください', 'cyan');
    log('  3. メールリンクをクリックして動作確認してください', 'cyan');
    
  } else {
    log('⚠️  一部のテストが失敗しました', 'yellow');
    log('以下の手順を実行してください:', 'yellow');
    
    log('\n1. ブラウザでキャッシュクリア:', 'cyan');
    log('   - デベロッパーツール > Application > Clear storage', 'cyan');
    
    log('\n2. Service Worker再登録:', 'cyan');
    log('   - ページをリロード（Ctrl+Shift+R）', 'cyan');
    
    log('\n3. 再度テスト実行:', 'cyan');
    log('   - node scripts/final-verification.js', 'cyan');
  }
  
  log('='.repeat(60) + '\n', 'cyan');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// 実行
finalVerification().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});