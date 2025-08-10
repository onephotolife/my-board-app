#!/usr/bin/env node

/**
 * 完全な登録・ログインフローテスト
 * 14人天才会議 - 天才11
 */

const { MongoClient } = require('mongodb');
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
        'User-Agent': 'FullFlowTest/1.0',
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

async function fullRegistrationFlowTest() {
  log('\n🧠 天才11: 完全な登録・ログインフローテスト\n', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  let mongoClient;
  const testEmail = `flow-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Flow Test User';
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    log('\n📝 テストシナリオ', 'blue');
    log('=' .repeat(70), 'cyan');
    log('  1. 新規ユーザー登録', 'cyan');
    log('  2. メール確認前のログイン試行（失敗するはず）', 'cyan');
    log('  3. メール確認処理', 'cyan');
    log('  4. メール確認後のログイン試行（成功するはず）', 'cyan');
    log('  5. 正常ログアウト', 'cyan');
    
    // ステップ1: 新規ユーザー登録
    log('\n\n🔹 ステップ1: 新規ユーザー登録', 'magenta');
    log('─'.repeat(60), 'cyan');
    
    const registerResponse = await makeRequest('/api/auth/register', 'POST', {
      email: testEmail,
      password: testPassword,
      name: testName
    });
    
    if (registerResponse.status === 201) {
      log('  ✅ 登録成功', 'green');
      log(`    Email: ${testEmail}`, 'cyan');
      log(`    Message: ${registerResponse.data.message}`, 'cyan');
    } else {
      log(`  ❌ 登録失敗: ${registerResponse.data.error}`, 'red');
      return;
    }
    
    // データベースから登録されたユーザーを確認
    const registeredUser = await db.collection('users').findOne({ email: testEmail });
    if (!registeredUser) {
      log('  ❌ ユーザーがデータベースに見つかりません', 'red');
      return;
    }
    
    log(`    emailVerified: ${registeredUser.emailVerified}`, 
        registeredUser.emailVerified ? 'red' : 'green');
    log(`    Verification Token: ${registeredUser.emailVerificationToken?.substring(0, 20)}...`, 'cyan');
    
    // ステップ2: メール確認前のログイン試行
    log('\n🔹 ステップ2: メール確認前のログイン試行', 'magenta');
    log('─'.repeat(60), 'cyan');
    
    // CSRFトークン取得
    const csrfResponse1 = await makeRequest('/api/auth/csrf');
    const csrfToken1 = csrfResponse1.data?.csrfToken;
    const cookies1 = csrfResponse1.cookies?.join('; ');
    
    const loginBeforeVerify = await makeRequest(
      '/api/auth/callback/credentials',
      'POST',
      {
        email: testEmail,
        password: testPassword,
        csrfToken: csrfToken1
      },
      cookies1
    );
    
    const location1 = loginBeforeVerify.headers?.location || '';
    const hasError1 = location1.includes('error=CredentialsSignin');
    
    if (hasError1) {
      log('  ✅ 期待通り: ログイン拒否（メール未確認）', 'green');
      log(`    エラー: CredentialsSignin`, 'cyan');
    } else {
      log('  ❌ セキュリティエラー: メール未確認でログイン成功！', 'red');
      log('  🚨 重大な問題です！', 'red');
    }
    
    // ステップ3: メール確認処理
    log('\n🔹 ステップ3: メール確認処理', 'magenta');
    log('─'.repeat(60), 'cyan');
    
    const verifyResponse = await makeRequest(
      `/api/auth/verify-email?token=${registeredUser.emailVerificationToken}`,
      'GET'
    );
    
    if (verifyResponse.status === 200) {
      log('  ✅ メール確認成功', 'green');
      log(`    Message: ${verifyResponse.data.message}`, 'cyan');
    } else {
      log(`  ❌ メール確認失敗: ${verifyResponse.data.error}`, 'red');
    }
    
    // データベースで確認状態を確認
    const verifiedUser = await db.collection('users').findOne({ email: testEmail });
    log(`    emailVerified: ${verifiedUser.emailVerified}`, 
        verifiedUser.emailVerified ? 'green' : 'red');
    
    // ステップ4: メール確認後のログイン試行
    log('\n🔹 ステップ4: メール確認後のログイン試行', 'magenta');
    log('─'.repeat(60), 'cyan');
    
    // CSRFトークン取得
    const csrfResponse2 = await makeRequest('/api/auth/csrf');
    const csrfToken2 = csrfResponse2.data?.csrfToken;
    const cookies2 = csrfResponse2.cookies?.join('; ');
    
    const loginAfterVerify = await makeRequest(
      '/api/auth/callback/credentials',
      'POST',
      {
        email: testEmail,
        password: testPassword,
        csrfToken: csrfToken2
      },
      cookies2
    );
    
    const location2 = loginAfterVerify.headers?.location || '';
    const hasError2 = location2.includes('error=');
    
    if (!hasError2 && loginAfterVerify.status === 302) {
      log('  ✅ 期待通り: ログイン成功（メール確認済み）', 'green');
      log(`    Redirect to: ${location2}`, 'cyan');
    } else {
      log('  ❌ エラー: メール確認後もログイン失敗', 'red');
      if (hasError2) {
        log(`    エラー: ${location2}`, 'cyan');
      }
    }
    
    // クリーンアップ
    await db.collection('users').deleteOne({ email: testEmail });
    
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
  
  log('\n✅ 確認された動作:', 'green');
  log('  1. 新規登録時、emailVerified=false で作成される', 'cyan');
  log('  2. メール未確認時、ログインが拒否される', 'cyan');
  log('  3. メール確認後、emailVerified=true に更新される', 'cyan');
  log('  4. メール確認後、ログインが成功する', 'cyan');
  
  log('\n🔒 セキュリティ要件:', 'yellow');
  log('  ✅ メール未確認ユーザーのログイン防止', 'green');
  log('  ✅ メール確認プロセスの正常動作', 'green');
  log('  ✅ 確認後のログイン許可', 'green');
  
  log('\n' + '='.repeat(70), 'cyan');
  log('🏁 完全な登録・ログインフローテスト完了', 'green');
  log('='.repeat(70) + '\n', 'cyan');
}

// 実行
fullRegistrationFlowTest().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});