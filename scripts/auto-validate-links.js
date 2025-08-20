#!/usr/bin/env node

/**
 * メールリンク自動検証スクリプト
 * 14人天才会議 - 天才8
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
        'User-Agent': 'EmailLinkValidator/1.0',
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
          contentType: res.headers['content-type'] || ''
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function validateLinks() {
  log('\n🧠 天才8: メールリンク自動検証\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  let mongoClient;
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // 1. 確認メールリンクのテスト
    log('\n📧 確認メールリンクテスト', 'blue');
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const testEmail = `autotest-${Date.now()}@example.com`;
    
    // テストユーザー作成
    await db.collection('users').insertOne({
      name: 'AutoTest User',
      email: testEmail,
      password: 'hashed_password',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const verifyUrl = `/auth/verify-email?token=${verificationToken}`;
    log(`  Testing: ${verifyUrl}`, 'cyan');
    
    try {
      const response = await makeRequest(verifyUrl);
      
      if (response.status === 200) {
        const html = response.data.toString();
        
        // オフラインページのチェック
        if (html.includes('オフラインです') || html.includes('offline')) {
          log('  ❌ オフラインページが表示されています', 'red');
          results.failed.push({
            test: 'Verify Email Link',
            reason: 'オフラインページが表示',
            url: verifyUrl
          });
        } 
        // 正常なページのチェック
        else if (html.includes('メールアドレスを確認中') || html.includes('確認完了')) {
          log('  ✅ 正常なページが表示されています', 'green');
          results.passed.push({
            test: 'Verify Email Link',
            url: verifyUrl
          });
        } 
        // 予期しないページ
        else {
          log('  ⚠️  予期しないページ内容', 'yellow');
          results.warnings.push({
            test: 'Verify Email Link',
            reason: '予期しないページ内容',
            url: verifyUrl
          });
        }
        
        // CSSプリロードエラーのチェック
        if (html.includes('preload') && html.includes('.css')) {
          log('  ⚠️  CSSプリロード警告の可能性', 'yellow');
          results.warnings.push({
            test: 'CSS Preload',
            reason: 'CSSプリロード警告の可能性',
            url: verifyUrl
          });
        }
      } else {
        log(`  ❌ HTTPステータス: ${response.status}`, 'red');
        results.failed.push({
          test: 'Verify Email Link',
          reason: `HTTPステータス ${response.status}`,
          url: verifyUrl
        });
      }
    } catch (error) {
      log(`  ❌ リクエストエラー: ${error.message}`, 'red');
      results.failed.push({
        test: 'Verify Email Link',
        reason: error.message,
        url: verifyUrl
      });
    }
    
    // 2. パスワードリセットリンクのテスト
    log('\n🔑 パスワードリセットリンクテスト', 'blue');
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // リセットトークン作成
    await db.collection('passwordresets').insertOne({
      email: testEmail,
      token: resetToken,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date()
    });
    
    const resetUrl = `/auth/reset-password/${resetToken}`;
    log(`  Testing: ${resetUrl}`, 'cyan');
    
    try {
      const response = await makeRequest(resetUrl);
      
      if (response.status === 200) {
        const html = response.data.toString();
        
        // オフラインページのチェック
        if (html.includes('オフラインです') || html.includes('offline')) {
          log('  ❌ オフラインページが表示されています', 'red');
          results.failed.push({
            test: 'Password Reset Link',
            reason: 'オフラインページが表示',
            url: resetUrl
          });
        } 
        // 正常なページのチェック
        else if (html.includes('パスワード') || html.includes('リセット')) {
          log('  ✅ 正常なページが表示されています', 'green');
          results.passed.push({
            test: 'Password Reset Link',
            url: resetUrl
          });
        } 
        // 予期しないページ
        else {
          log('  ⚠️  予期しないページ内容', 'yellow');
          results.warnings.push({
            test: 'Password Reset Link',
            reason: '予期しないページ内容',
            url: resetUrl
          });
        }
      } else {
        log(`  ❌ HTTPステータス: ${response.status}`, 'red');
        results.failed.push({
          test: 'Password Reset Link',
          reason: `HTTPステータス ${response.status}`,
          url: resetUrl
        });
      }
    } catch (error) {
      log(`  ❌ リクエストエラー: ${error.message}`, 'red');
      results.failed.push({
        test: 'Password Reset Link',
        reason: error.message,
        url: resetUrl
      });
    }
    
    // 3. Service Worker確認
    log('\n🔧 Service Worker確認', 'blue');
    
    try {
      const response = await makeRequest('/sw.js');
      
      if (response.status === 200) {
        const swContent = response.data.toString();
        
        // 認証ページ除外の確認
        if (swContent.includes("url.pathname.startsWith('/auth/')")) {
          log('  ✅ Service Workerに認証ページ除外設定あり', 'green');
          results.passed.push({
            test: 'Service Worker Auth Exclusion',
            url: '/sw.js'
          });
        } else {
          log('  ❌ Service Workerに認証ページ除外設定なし', 'red');
          results.failed.push({
            test: 'Service Worker Auth Exclusion',
            reason: '認証ページ除外設定が見つからない',
            url: '/sw.js'
          });
        }
        
        // キャッシュバージョン確認
        const versionMatch = swContent.match(/CACHE_NAME.*?v(\d+)/);
        if (versionMatch && versionMatch[1] >= 2) {
          log(`  ✅ キャッシュバージョン: v${versionMatch[1]}`, 'green');
          results.passed.push({
            test: 'Cache Version',
            url: '/sw.js'
          });
        } else {
          log('  ⚠️  キャッシュバージョンが古い可能性', 'yellow');
          results.warnings.push({
            test: 'Cache Version',
            reason: 'キャッシュバージョンが v2 未満',
            url: '/sw.js'
          });
        }
      } else {
        log(`  ❌ Service Worker取得失敗: ${response.status}`, 'red');
        results.failed.push({
          test: 'Service Worker',
          reason: `HTTPステータス ${response.status}`,
          url: '/sw.js'
        });
      }
    } catch (error) {
      log(`  ❌ Service Worker確認エラー: ${error.message}`, 'red');
      results.failed.push({
        test: 'Service Worker',
        reason: error.message,
        url: '/sw.js'
      });
    }
    
    // クリーンアップ
    await db.collection('users').deleteOne({ email: testEmail });
    await db.collection('passwordresets').deleteOne({ token: resetToken });
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
    results.failed.push({
      test: 'General',
      reason: error.message
    });
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
  
  // 結果サマリー
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 検証結果サマリー', 'magenta');
  log('='.repeat(60), 'cyan');
  
  log(`\n✅ 成功: ${results.passed.length} 項目`, 'green');
  results.passed.forEach(item => {
    log(`  - ${item.test}`, 'cyan');
  });
  
  if (results.warnings.length > 0) {
    log(`\n⚠️  警告: ${results.warnings.length} 項目`, 'yellow');
    results.warnings.forEach(item => {
      log(`  - ${item.test}: ${item.reason}`, 'cyan');
    });
  }
  
  if (results.failed.length > 0) {
    log(`\n❌ 失敗: ${results.failed.length} 項目`, 'red');
    results.failed.forEach(item => {
      log(`  - ${item.test}: ${item.reason}`, 'cyan');
    });
  }
  
  // 総合判定
  log('\n' + '='.repeat(60), 'cyan');
  if (results.failed.length === 0) {
    log('🎉 すべてのテストに合格しました！', 'green');
    log('メールリンクの問題は解決されています。', 'green');
  } else {
    log('⚠️  一部のテストが失敗しました', 'yellow');
    log('以下の対処を行ってください:', 'yellow');
    log('  1. ブラウザのキャッシュをクリア', 'cyan');
    log('  2. Service Workerを再登録', 'cyan');
    log('  3. npm run dev でサーバーを再起動', 'cyan');
  }
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// 実行
validateLinks().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});