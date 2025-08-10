#!/usr/bin/env node

/**
 * セキュリティ監査最終確認
 * 14人天才会議 - 天才10
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

function makeRequest(path, method = 'GET', body = null, cookies = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'SecurityAudit/1.0',
      },
    };
    
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }
    
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

async function securityAuditFinal() {
  log('\n🧠 天才10: セキュリティ監査最終確認\n', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  let mongoClient;
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    critical: 0,
    details: []
  };
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // テストケース
    const testCases = [
      {
        name: 'メール未確認（false）',
        email: `unverified-${Date.now()}@example.com`,
        emailVerified: false,
        shouldLogin: false,
        description: 'メール未確認ユーザーはログインできない'
      },
      {
        name: 'メール確認済み（true）',
        email: `verified-${Date.now()}@example.com`,
        emailVerified: true,
        shouldLogin: true,
        description: 'メール確認済みユーザーはログインできる'
      },
      {
        name: 'emailVerified=null',
        email: `null-${Date.now()}@example.com`,
        emailVerified: null,
        shouldLogin: false,
        description: 'emailVerified=nullはログインできない'
      },
      {
        name: 'emailVerifiedフィールドなし',
        email: `nofield-${Date.now()}@example.com`,
        emailVerified: undefined,
        shouldLogin: false,
        description: 'emailVerifiedフィールドがない場合はログインできない'
      }
    ];
    
    const password = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    log('\n📋 セキュリティテスト開始', 'blue');
    log('=' .repeat(70), 'cyan');
    
    for (const testCase of testCases) {
      results.total++;
      
      log(`\n🔐 テスト: ${testCase.name}`, 'magenta');
      log(`  説明: ${testCase.description}`, 'cyan');
      log('─'.repeat(60), 'cyan');
      
      // ユーザー作成
      const userData = {
        email: testCase.email,
        password: hashedPassword,
        name: `Test User ${testCase.name}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // emailVerifiedの設定
      if (testCase.emailVerified !== undefined) {
        userData.emailVerified = testCase.emailVerified;
      }
      
      await db.collection('users').insertOne(userData);
      
      log(`  📧 Email: ${testCase.email}`, 'cyan');
      log(`  ✉️  emailVerified: ${testCase.emailVerified}`, 
          testCase.emailVerified === true ? 'green' : 'yellow');
      
      // CSRFトークン取得
      const csrfResponse = await makeRequest('/api/auth/csrf');
      const csrfToken = csrfResponse.data?.csrfToken;
      const cookies = csrfResponse.cookies?.join('; ');
      
      // ログイン試行
      log('\n  🔑 ログイン試行...', 'blue');
      
      try {
        const loginResponse = await makeRequest(
          '/api/auth/callback/credentials',
          'POST',
          {
            email: testCase.email,
            password: password,
            csrfToken: csrfToken
          },
          cookies
        );
        
        // 結果判定 - 重要: CredentialsSigninエラーはログイン失敗を意味する
        const location = loginResponse.headers?.location || '';
        const hasCredentialsError = location.includes('error=CredentialsSignin');
        const loginSuccess = loginResponse.status === 302 && !hasCredentialsError;
        
        log(`    Status: ${loginResponse.status}`, 'cyan');
        if (location) {
          if (hasCredentialsError) {
            log(`    エラー: CredentialsSignin（ログイン拒否）`, 'yellow');
          } else {
            log(`    Location: ${location}`, 'cyan');
          }
        }
        
        // 結果評価
        if (testCase.shouldLogin && loginSuccess) {
          log('    ✅ 正常: 期待通りログイン成功', 'green');
          results.passed++;
          results.details.push({
            test: testCase.name,
            expected: 'ログイン成功',
            actual: 'ログイン成功',
            status: 'passed'
          });
        } else if (!testCase.shouldLogin && !loginSuccess) {
          log('    ✅ 正常: 期待通りログイン拒否', 'green');
          results.passed++;
          results.details.push({
            test: testCase.name,
            expected: 'ログイン拒否',
            actual: 'ログイン拒否',
            status: 'passed'
          });
        } else if (testCase.shouldLogin && !loginSuccess) {
          log('    ❌ エラー: ログインできるはずが拒否された', 'red');
          results.failed++;
          results.details.push({
            test: testCase.name,
            expected: 'ログイン成功',
            actual: 'ログイン拒否',
            status: 'failed'
          });
        } else {
          log('    ❌ セキュリティエラー: ログインできないはずが成功した', 'red');
          log('    🚨 重大なセキュリティ問題です！', 'red');
          results.failed++;
          results.critical++;
          results.details.push({
            test: testCase.name,
            expected: 'ログイン拒否',
            actual: 'ログイン成功',
            status: 'failed',
            critical: true
          });
        }
        
      } catch (error) {
        log(`    ❌ エラー: ${error.message}`, 'red');
        results.failed++;
        results.details.push({
          test: testCase.name,
          expected: testCase.shouldLogin ? 'ログイン成功' : 'ログイン拒否',
          actual: 'エラー',
          status: 'failed',
          error: error.message
        });
      }
      
      // クリーンアップ
      await db.collection('users').deleteOne({ email: testCase.email });
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
  log('📊 セキュリティ監査結果', 'magenta');
  log('='.repeat(70), 'cyan');
  
  log(`\n総テスト数: ${results.total}`, 'cyan');
  log(`✅ 成功: ${results.passed}`, 'green');
  log(`❌ 失敗: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`🚨 重大な問題: ${results.critical}`, results.critical > 0 ? 'red' : 'green');
  
  const successRate = results.total > 0 ? 
    (results.passed / results.total * 100).toFixed(1) : 0;
  log(`\n成功率: ${successRate}%`, successRate >= 100 ? 'green' : 
      successRate >= 80 ? 'yellow' : 'red');
  
  // 詳細結果
  log('\n詳細:', 'yellow');
  results.details.forEach(detail => {
    const icon = detail.status === 'passed' ? '✅' : '❌';
    const color = detail.status === 'passed' ? 'green' : 'red';
    log(`  ${icon} ${detail.test}`, color);
    log(`     期待: ${detail.expected} → 実際: ${detail.actual}`, 'cyan');
    if (detail.critical) {
      log(`     🚨 重大なセキュリティ問題`, 'red');
    }
    if (detail.error) {
      log(`     エラー: ${detail.error}`, 'yellow');
    }
  });
  
  // 最終判定
  log('\n' + '='.repeat(70), 'cyan');
  
  if (results.critical > 0) {
    log('🚨 セキュリティ監査: 失敗', 'red');
    log('重大なセキュリティ問題が検出されました。', 'red');
    log('メール未確認のユーザーがログインできる状態です。', 'red');
    log('早急に修正が必要です。', 'red');
  } else if (results.failed > 0) {
    log('⚠️  セキュリティ監査: 部分的成功', 'yellow');
    log('一部のテストが失敗しましたが、重大な問題はありません。', 'yellow');
  } else {
    log('🎉 セキュリティ監査: 完全成功！', 'green');
    log('すべてのセキュリティテストに合格しました！', 'green');
    log('メール確認システムは正常に動作しています。', 'green');
    log('\n✅ 確認された動作:', 'green');
    log('  - メール未確認（false）のユーザーはログインできない', 'cyan');
    log('  - メール確認済み（true）のユーザーはログインできる', 'cyan');
    log('  - emailVerified=nullのユーザーはログインできない', 'cyan');
    log('  - emailVerifiedフィールドがないユーザーはログインできない', 'cyan');
  }
  
  log('='.repeat(70) + '\n', 'cyan');
  
  process.exit(results.critical > 0 ? 1 : 0);
}

// 実行
securityAuditFinal().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});