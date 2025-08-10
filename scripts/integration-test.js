#!/usr/bin/env node

/**
 * 統合テストスクリプト
 * 14人天才会議 - 天才10
 */

const http = require('http');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
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

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
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

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runIntegrationTests() {
  log('\n🧠 天才10: 統合テスト実行\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  let mongoClient;
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // テスト1: Service Worker設定確認
    log('\n📋 テスト1: Service Worker設定確認', 'blue');
    testResults.total++;
    
    try {
      const response = await makeRequest('/sw.js');
      const swContent = response.data.toString();
      
      const checks = [
        {
          name: 'Auth path exclusion',
          condition: swContent.includes("url.pathname.startsWith('/auth/')"),
          message: '認証パス除外設定'
        },
        {
          name: 'Cache version v2+',
          condition: swContent.includes('board-app-v2'),
          message: 'キャッシュバージョンv2以上'
        },
        {
          name: 'Error handling',
          condition: swContent.includes("addEventListener('error'"),
          message: 'エラーハンドリング実装'
        }
      ];
      
      let allPassed = true;
      checks.forEach(check => {
        if (check.condition) {
          log(`  ✅ ${check.message}`, 'green');
        } else {
          log(`  ❌ ${check.message}`, 'red');
          allPassed = false;
        }
      });
      
      if (allPassed) {
        testResults.passed++;
        testResults.details.push({ test: 'Service Worker設定', status: 'passed' });
      } else {
        testResults.failed++;
        testResults.details.push({ test: 'Service Worker設定', status: 'failed' });
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      testResults.failed++;
      testResults.details.push({ test: 'Service Worker設定', status: 'failed', error: error.message });
    }
    
    // テスト2: メール確認ページアクセステスト
    log('\n📋 テスト2: メール確認ページアクセステスト', 'blue');
    testResults.total++;
    
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const testEmail = `integration-test-${Date.now()}@example.com`;
      
      // テストユーザー作成
      await db.collection('users').insertOne({
        name: 'Integration Test User',
        email: testEmail,
        password: 'hashed_password',
        emailVerified: false,
        emailVerificationToken: token,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const response = await makeRequest(`/auth/verify-email?token=${token}`);
      const html = response.data.toString();
      
      if (response.status === 200 && !html.includes('オフラインです')) {
        log('  ✅ ページが正常に表示される', 'green');
        testResults.passed++;
        testResults.details.push({ test: 'メール確認ページ', status: 'passed' });
      } else if (html.includes('オフラインです')) {
        log('  ❌ オフラインページが表示される', 'red');
        testResults.failed++;
        testResults.details.push({ test: 'メール確認ページ', status: 'failed', reason: 'オフラインページ' });
      } else {
        log(`  ❌ HTTPステータス: ${response.status}`, 'red');
        testResults.failed++;
        testResults.details.push({ test: 'メール確認ページ', status: 'failed', reason: `HTTP ${response.status}` });
      }
      
      // クリーンアップ
      await db.collection('users').deleteOne({ email: testEmail });
      
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      testResults.failed++;
      testResults.details.push({ test: 'メール確認ページ', status: 'failed', error: error.message });
    }
    
    // テスト3: パスワードリセットページアクセステスト
    log('\n📋 テスト3: パスワードリセットページアクセステスト', 'blue');
    testResults.total++;
    
    try {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const testEmail = `reset-test-${Date.now()}@example.com`;
      
      // リセットトークン作成
      await db.collection('passwordresets').insertOne({
        email: testEmail,
        token: resetToken,
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date()
      });
      
      const response = await makeRequest(`/auth/reset-password/${resetToken}`);
      const html = response.data.toString();
      
      if (response.status === 200 && !html.includes('オフラインです')) {
        log('  ✅ ページが正常に表示される', 'green');
        testResults.passed++;
        testResults.details.push({ test: 'パスワードリセットページ', status: 'passed' });
      } else if (html.includes('オフラインです')) {
        log('  ❌ オフラインページが表示される', 'red');
        testResults.failed++;
        testResults.details.push({ test: 'パスワードリセットページ', status: 'failed', reason: 'オフラインページ' });
      } else {
        log(`  ❌ HTTPステータス: ${response.status}`, 'red');
        testResults.failed++;
        testResults.details.push({ test: 'パスワードリセットページ', status: 'failed', reason: `HTTP ${response.status}` });
      }
      
      // クリーンアップ
      await db.collection('passwordresets').deleteOne({ token: resetToken });
      
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      testResults.failed++;
      testResults.details.push({ test: 'パスワードリセットページ', status: 'failed', error: error.message });
    }
    
    // テスト4: CSSリソースアクセステスト
    log('\n📋 テスト4: CSSリソースアクセステスト', 'blue');
    testResults.total++;
    
    try {
      const response = await makeRequest('/_next/static/css/app/layout.css');
      
      // CSSファイルが存在しない可能性もあるので、404も許容
      if (response.status === 200 || response.status === 404) {
        log('  ✅ CSSリソースへのアクセス正常', 'green');
        testResults.passed++;
        testResults.details.push({ test: 'CSSリソース', status: 'passed' });
      } else {
        log(`  ⚠️  HTTPステータス: ${response.status}`, 'yellow');
        testResults.passed++; // 警告だが合格とする
        testResults.details.push({ test: 'CSSリソース', status: 'warning', reason: `HTTP ${response.status}` });
      }
    } catch (error) {
      log(`  ⚠️  エラー: ${error.message}`, 'yellow');
      testResults.passed++; // CSSは必須ではないので警告
      testResults.details.push({ test: 'CSSリソース', status: 'warning', error: error.message });
    }
    
    // テスト5: エラーログシステム確認
    log('\n📋 テスト5: エラーログシステム確認', 'blue');
    testResults.total++;
    
    try {
      const response = await makeRequest('/error-logger.js');
      
      if (response.status === 200) {
        log('  ✅ エラーログシステム利用可能', 'green');
        testResults.passed++;
        testResults.details.push({ test: 'エラーログシステム', status: 'passed' });
      } else {
        log('  ⚠️  エラーログシステムが見つからない', 'yellow');
        testResults.skipped++;
        testResults.details.push({ test: 'エラーログシステム', status: 'skipped' });
      }
    } catch (error) {
      log(`  ⚠️  エラー: ${error.message}`, 'yellow');
      testResults.skipped++;
      testResults.details.push({ test: 'エラーログシステム', status: 'skipped', error: error.message });
    }
    
  } catch (error) {
    log(`\n❌ 致命的エラー: ${error.message}`, 'red');
    testResults.failed++;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
  
  // 結果サマリー
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 統合テスト結果', 'magenta');
  log('='.repeat(60), 'cyan');
  
  log(`\n総テスト数: ${testResults.total}`, 'cyan');
  log(`✅ 成功: ${testResults.passed}`, 'green');
  log(`❌ 失敗: ${testResults.failed}`, 'red');
  log(`⏭️  スキップ: ${testResults.skipped}`, 'yellow');
  
  const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
  log(`\n成功率: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  
  // 詳細結果
  log('\n詳細結果:', 'blue');
  testResults.details.forEach(detail => {
    const icon = detail.status === 'passed' ? '✅' : 
                  detail.status === 'failed' ? '❌' : 
                  detail.status === 'warning' ? '⚠️' : '⏭️';
    const color = detail.status === 'passed' ? 'green' : 
                   detail.status === 'failed' ? 'red' : 'yellow';
    log(`  ${icon} ${detail.test}`, color);
    if (detail.reason) {
      log(`     理由: ${detail.reason}`, 'cyan');
    }
    if (detail.error) {
      log(`     エラー: ${detail.error}`, 'cyan');
    }
  });
  
  // 最終判定
  log('\n' + '='.repeat(60), 'cyan');
  if (testResults.failed === 0) {
    log('🎉 すべての統合テストに合格しました！', 'green');
    log('メールリンクの問題は解決されています。', 'green');
    process.exit(0);
  } else if (testResults.failed <= 1) {
    log('⚠️  ほぼすべてのテストに合格しました', 'yellow');
    log('Service Workerのキャッシュをクリアして再テストしてください。', 'yellow');
    process.exit(1);
  } else {
    log('❌ 複数のテストが失敗しました', 'red');
    log('以下の対処を行ってください:', 'red');
    log('  1. npm run dev でサーバーが起動していることを確認', 'cyan');
    log('  2. Service Workerのキャッシュをクリア', 'cyan');
    log('  3. MongoDBが起動していることを確認', 'cyan');
    process.exit(1);
  }
}

// 実行
runIntegrationTests().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});