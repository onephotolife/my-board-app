#!/usr/bin/env node

/**
 * CSRFトークン対応認証テスト
 * 14人天才会議 - 天才9
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
        'User-Agent': 'CSRFTest/1.0',
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

async function testAuthWithCSRF() {
  log('\n🧠 天才9: CSRFトークン対応認証テスト\n', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  let mongoClient;
  
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
        shouldLogin: false
      },
      {
        name: 'メール確認済み（true）',
        email: `verified-${Date.now()}@example.com`,
        emailVerified: true,
        shouldLogin: true
      },
      {
        name: 'emailVerified=null',
        email: `null-${Date.now()}@example.com`,
        emailVerified: null,
        shouldLogin: false
      }
    ];
    
    const password = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    for (const testCase of testCases) {
      log(`\n📝 テストケース: ${testCase.name}`, 'magenta');
      log('─'.repeat(50), 'cyan');
      
      // ユーザー作成
      const userData = {
        email: testCase.email,
        password: hashedPassword,
        name: `Test User ${testCase.name}`,
        emailVerified: testCase.emailVerified,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('users').insertOne(userData);
      
      log(`  Email: ${testCase.email}`, 'cyan');
      log(`  emailVerified: ${testCase.emailVerified}`, 
          testCase.emailVerified === true ? 'green' : 'yellow');
      
      // 1. CSRFトークン取得
      log('\n  1️⃣ CSRFトークン取得中...', 'blue');
      
      const csrfResponse = await makeRequest('/api/auth/csrf');
      const csrfToken = csrfResponse.data?.csrfToken;
      const cookies = csrfResponse.cookies?.join('; ');
      
      if (!csrfToken) {
        log('    ❌ CSRFトークン取得失敗', 'red');
        continue;
      }
      
      log(`    ✅ CSRFトークン取得: ${csrfToken.substring(0, 20)}...`, 'green');
      
      // 2. ログイン試行
      log('\n  2️⃣ ログイン試行...', 'blue');
      log('    サーバーログを確認してください！', 'yellow');
      
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
        
        log(`    Status: ${loginResponse.status}`, 
            loginResponse.status === 401 ? 'yellow' : 'cyan');
        
        // 結果判定
        const loginSuccess = loginResponse.status === 200 || 
                           loginResponse.status === 302 ||
                           (loginResponse.headers?.location && 
                            !loginResponse.headers.location.includes('error'));
        
        if (testCase.shouldLogin && loginSuccess) {
          log('    ✅ 期待通り: ログイン成功', 'green');
        } else if (!testCase.shouldLogin && !loginSuccess) {
          log('    ✅ 期待通り: ログイン拒否', 'green');
        } else if (testCase.shouldLogin && !loginSuccess) {
          log('    ❌ エラー: ログインできるはずが拒否された', 'red');
          if (loginResponse.headers?.location) {
            log(`    Location: ${loginResponse.headers.location}`, 'cyan');
          }
        } else {
          log('    ❌ セキュリティエラー: ログインできないはずが成功した', 'red');
          log('    🚨 重大なセキュリティ問題です！', 'red');
          if (loginResponse.headers?.location) {
            log(`    Location: ${loginResponse.headers.location}`, 'cyan');
          }
        }
        
      } catch (error) {
        log(`    ❌ エラー: ${error.message}`, 'red');
      }
      
      // クリーンアップ
      await db.collection('users').deleteOne({ email: testCase.email });
    }
    
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 テスト完了', 'magenta');
    log('='.repeat(70), 'cyan');
    
    log('\n📝 重要なポイント:', 'yellow');
    log('  1. サーバーコンソールに以下のログが表示されるはず:', 'cyan');
    log('     - 🔐 [AUTH] authorize関数が呼ばれました', 'cyan');
    log('     - 📧 [AUTH] ユーザー情報', 'cyan');
    log('     - ❌ [AUTH] メール未確認のためログイン拒否（該当する場合）', 'cyan');
    log('     - ✅ [AUTH] ログイン成功（該当する場合）', 'cyan');
    
    log('\n  2. もしログが表示されない場合:', 'cyan');
    log('     - Next.jsサーバーの再起動が必要かもしれません', 'cyan');
    log('     - auth.config.tsの変更が反映されていない可能性があります', 'cyan');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
  
  log('\n' + '='.repeat(70), 'cyan');
  log('🏁 テスト終了', 'green');
  log('='.repeat(70) + '\n', 'cyan');
}

// 実行
testAuthWithCSRF().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});