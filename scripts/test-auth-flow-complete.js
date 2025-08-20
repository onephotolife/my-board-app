#!/usr/bin/env node

/**
 * 完全な認証フローテスト
 * 14人天才会議 - 天才5
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const http = require('http');
const https = require('https');
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

function makeRequest(path, method = 'POST', body = null, cookies = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AuthFlowTest/1.0',
        'Accept': 'application/json',
      },
    };
    
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      const setCookies = res.headers['set-cookie'];
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: parsed,
            cookies: setCookies,
            headers: res.headers 
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data,
            cookies: setCookies,
            headers: res.headers 
          });
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

async function testCompleteAuthFlow() {
  log('\n🧠 天才5: 完全な認証フローテスト\n', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  let mongoClient;
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // テスト用のユーザー情報
    const testUsers = [
      {
        email: `verified-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Verified User',
        emailVerified: true,
        scenario: 'メール確認済み'
      },
      {
        email: `unverified-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Unverified User',
        emailVerified: false,
        scenario: 'メール未確認'
      },
      {
        email: `null-verified-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Null Verified User',
        emailVerified: null,
        scenario: 'emailVerified=null'
      },
      {
        email: `no-field-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'No Field User',
        emailVerified: undefined,
        scenario: 'emailVerifiedフィールドなし'
      }
    ];
    
    log('\n📝 テストシナリオ準備', 'blue');
    log('=' .repeat(70), 'cyan');
    
    for (const testUser of testUsers) {
      results.total++;
      
      log(`\n🔐 シナリオ: ${testUser.scenario}`, 'magenta');
      log('-'.repeat(50), 'cyan');
      
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const verificationToken = uuidv4();
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);
      
      // ユーザー作成
      const userData = {
        email: testUser.email,
        password: hashedPassword,
        name: testUser.name,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: tokenExpiry,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // emailVerifiedの設定
      if (testUser.emailVerified !== undefined) {
        userData.emailVerified = testUser.emailVerified;
      }
      
      await db.collection('users').insertOne(userData);
      
      log(`  📧 Email: ${testUser.email}`, 'cyan');
      log(`  ✉️  emailVerified: ${testUser.emailVerified}`, 
          testUser.emailVerified === true ? 'green' : 'yellow');
      
      // ログイン試行
      log('\n  🔑 ログイン試行...', 'blue');
      
      try {
        // NextAuthのsigninエンドポイントを直接テスト
        const csrfResponse = await makeRequest('/api/auth/csrf', 'GET');
        const csrfToken = csrfResponse.data?.csrfToken;
        
        const loginResponse = await makeRequest('/api/auth/callback/credentials', 'POST', {
          email: testUser.email,
          password: testUser.password,
          csrfToken: csrfToken
        });
        
        const shouldSucceed = testUser.emailVerified === true;
        const loginSuccess = loginResponse.status === 200 || loginResponse.status === 302;
        
        if (shouldSucceed && loginSuccess) {
          log(`    ✅ 期待通り: ログイン成功 (Status: ${loginResponse.status})`, 'green');
          results.passed++;
          results.details.push({
            scenario: testUser.scenario,
            expected: 'ログイン成功',
            actual: 'ログイン成功',
            status: 'passed'
          });
        } else if (!shouldSucceed && !loginSuccess) {
          log(`    ✅ 期待通り: ログイン拒否 (Status: ${loginResponse.status})`, 'green');
          results.passed++;
          results.details.push({
            scenario: testUser.scenario,
            expected: 'ログイン拒否',
            actual: 'ログイン拒否',
            status: 'passed'
          });
        } else if (shouldSucceed && !loginSuccess) {
          log(`    ❌ エラー: ログインできるはずが拒否された (Status: ${loginResponse.status})`, 'red');
          results.failed++;
          results.details.push({
            scenario: testUser.scenario,
            expected: 'ログイン成功',
            actual: 'ログイン拒否',
            status: 'failed'
          });
        } else {
          log(`    ❌ セキュリティエラー: ログインできないはずが成功した (Status: ${loginResponse.status})`, 'red');
          log(`    🚨 重大なセキュリティ問題です！`, 'red');
          results.failed++;
          results.details.push({
            scenario: testUser.scenario,
            expected: 'ログイン拒否',
            actual: 'ログイン成功',
            status: 'failed',
            critical: true
          });
        }
        
        // レスポンスの詳細
        if (loginResponse.data && typeof loginResponse.data === 'object') {
          if (loginResponse.data.error) {
            log(`    📝 エラーメッセージ: ${loginResponse.data.error}`, 'cyan');
          }
        }
        
      } catch (error) {
        const shouldSucceed = testUser.emailVerified === true;
        
        if (!shouldSucceed) {
          log(`    ✅ 期待通り: ログイン拒否 (エラー: ${error.message})`, 'green');
          results.passed++;
          results.details.push({
            scenario: testUser.scenario,
            expected: 'ログイン拒否',
            actual: 'ログイン拒否',
            status: 'passed'
          });
        } else {
          log(`    ❌ エラー: ${error.message}`, 'red');
          results.failed++;
          results.details.push({
            scenario: testUser.scenario,
            expected: 'ログイン成功',
            actual: 'エラー',
            status: 'failed',
            error: error.message
          });
        }
      }
      
      // クリーンアップ
      await db.collection('users').deleteOne({ email: testUser.email });
    }
    
    // 追加テスト: 実際の登録フロー
    log('\n\n📝 実際の登録フローテスト', 'blue');
    log('=' .repeat(70), 'cyan');
    
    results.total++;
    
    const newUserEmail = `new-user-${Date.now()}@example.com`;
    const newUserPassword = 'NewUserPassword123!';
    const newUserName = 'New Test User';
    
    log('\n  1️⃣ 新規ユーザー登録', 'yellow');
    
    try {
      const registerResponse = await makeRequest('/api/auth/register', 'POST', {
        email: newUserEmail,
        password: newUserPassword,
        name: newUserName
      });
      
      if (registerResponse.status === 201) {
        log(`    ✅ 登録成功`, 'green');
        
        // 登録直後のログイン試行
        log('\n  2️⃣ メール確認前のログイン試行', 'yellow');
        
        const loginBeforeVerify = await makeRequest('/api/auth/callback/credentials', 'POST', {
          email: newUserEmail,
          password: newUserPassword
        });
        
        if (loginBeforeVerify.status !== 200) {
          log(`    ✅ 期待通り: メール確認前はログイン拒否`, 'green');
          
          // メール確認を実行
          log('\n  3️⃣ メール確認処理', 'yellow');
          
          const user = await db.collection('users').findOne({ email: newUserEmail });
          if (user && user.emailVerificationToken) {
            const verifyResponse = await makeRequest(
              `/api/auth/verify-email?token=${user.emailVerificationToken}`,
              'GET'
            );
            
            if (verifyResponse.status === 200) {
              log(`    ✅ メール確認成功`, 'green');
              
              // メール確認後のログイン試行
              log('\n  4️⃣ メール確認後のログイン試行', 'yellow');
              
              const loginAfterVerify = await makeRequest('/api/auth/callback/credentials', 'POST', {
                email: newUserEmail,
                password: newUserPassword
              });
              
              if (loginAfterVerify.status === 200 || loginAfterVerify.status === 302) {
                log(`    ✅ メール確認後はログイン成功`, 'green');
                results.passed++;
                results.details.push({
                  scenario: '完全な登録フロー',
                  expected: '正常動作',
                  actual: '正常動作',
                  status: 'passed'
                });
              } else {
                log(`    ❌ メール確認後もログイン失敗`, 'red');
                results.failed++;
                results.details.push({
                  scenario: '完全な登録フロー',
                  expected: 'メール確認後ログイン成功',
                  actual: 'ログイン失敗',
                  status: 'failed'
                });
              }
            }
          }
        } else {
          log(`    ❌ セキュリティエラー: メール確認前にログイン成功！`, 'red');
          results.failed++;
          results.details.push({
            scenario: '完全な登録フロー',
            expected: 'メール確認前ログイン拒否',
            actual: 'ログイン成功',
            status: 'failed',
            critical: true
          });
        }
      }
      
      // クリーンアップ
      await db.collection('users').deleteOne({ email: newUserEmail });
      
    } catch (error) {
      log(`    ❌ エラー: ${error.message}`, 'red');
      results.failed++;
      results.details.push({
        scenario: '完全な登録フロー',
        expected: '正常動作',
        actual: 'エラー',
        status: 'failed',
        error: error.message
      });
    }
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
  
  // 結果サマリー
  log('\n\n' + '='.repeat(70), 'cyan');
  log('📊 テスト結果サマリー', 'magenta');
  log('='.repeat(70), 'cyan');
  
  log(`\n総テスト数: ${results.total}`, 'cyan');
  log(`✅ 成功: ${results.passed}`, 'green');
  log(`❌ 失敗: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  const successRate = results.total > 0 ? 
    (results.passed / results.total * 100).toFixed(1) : 0;
  log(`\n成功率: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  // 詳細結果
  log('\n詳細結果:', 'yellow');
  results.details.forEach(detail => {
    const icon = detail.status === 'passed' ? '✅' : '❌';
    const color = detail.status === 'passed' ? 'green' : 'red';
    log(`  ${icon} ${detail.scenario}: ${detail.expected} → ${detail.actual}`, color);
    if (detail.critical) {
      log(`     🚨 重大なセキュリティ問題`, 'red');
    }
    if (detail.error) {
      log(`     エラー: ${detail.error}`, 'cyan');
    }
  });
  
  // セキュリティチェック
  const criticalIssues = results.details.filter(d => d.critical);
  if (criticalIssues.length > 0) {
    log('\n\n🚨 重大なセキュリティ問題が検出されました！', 'red');
    log('メール未確認のユーザーがログインできる状態です。', 'red');
    log('早急に修正が必要です。', 'red');
  } else if (results.failed === 0) {
    log('\n\n🎉 完璧！すべてのセキュリティテストに合格しました！', 'green');
    log('メール確認システムは正常に動作しています。', 'green');
  }
  
  log('\n' + '='.repeat(70), 'cyan');
  log('🏁 テスト完了', 'green');
  log('='.repeat(70) + '\n', 'cyan');
  
  process.exit(results.failed > 0 || criticalIssues.length > 0 ? 1 : 0);
}

// 実行
testCompleteAuthFlow().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});