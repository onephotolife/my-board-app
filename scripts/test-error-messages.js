#!/usr/bin/env node

/**
 * エラーメッセージテストスクリプト
 * 14人天才会議 - 天才8
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const http = require('http');
const https = require('https');

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
    const isHttps = path.startsWith('https://');
    const protocol = isHttps ? https : http;
    
    // URLパース
    let hostname = 'localhost';
    let port = 3000;
    let pathname = path;
    
    if (path.startsWith('http')) {
      const url = new URL(path);
      hostname = url.hostname;
      port = url.port || (isHttps ? 443 : 80);
      pathname = url.pathname + url.search;
    }
    
    const options = {
      hostname: hostname,
      port: port,
      path: pathname,
      method: method,
      headers: {
        'User-Agent': 'ErrorMessageTest/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    };
    
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }
    
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = protocol.request(options, (res) => {
      let data = '';
      const setCookies = res.headers['set-cookie'];
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          data: data,
          cookies: setCookies,
          headers: res.headers 
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

async function extractErrorMessage(html) {
  // HTMLからエラーメッセージを抽出
  const messages = [];
  
  // エラーメッセージのテキストパターンを直接検索
  const textPatterns = [
    'メールアドレスの確認が必要です',
    'アカウントを有効化するため',
    '登録時に送信された確認メール',
    'メールが届いていない場合は、迷惑メールフォルダ',
    'ログインできませんでした',
    'メールアドレスまたはパスワードが正しくありません',
    'パスワードをお忘れの場合は、パスワードリセット',
    '入力された情報でログインできませんでした',
    'メールアドレスとパスワードをご確認ください'
  ];
  
  textPatterns.forEach(pattern => {
    if (html.includes(pattern)) {
      messages.push(pattern);
    }
  });
  
  // div内のテキストを抽出（複数行対応）
  const divPattern = /<div[^>]*>([^]*?)<\/div>/gi;
  let match;
  while ((match = divPattern.exec(html)) !== null) {
    const content = match[1]
      .replace(/<[^>]*>/g, '') // HTMLタグを除去
      .replace(/\s+/g, ' ') // 改行や複数スペースを単一スペースに
      .trim();
    
    if (content) {
      textPatterns.forEach(pattern => {
        if (content.includes(pattern) && !messages.includes(pattern)) {
          messages.push(pattern);
        }
      });
    }
  }
  
  // デバッグ用：HTMLの一部を表示
  if (messages.length === 0 && html.length > 0) {
    const snippet = html.substring(0, 500);
    console.log('  [DEBUG] HTML snippet:', snippet.replace(/\n/g, ' ').substring(0, 200) + '...');
  }
  
  return messages;
}

async function testErrorMessages() {
  log('\n🧠 天才8: エラーメッセージテスト\n', 'cyan');
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
    
    // テストケース
    const testCases = [
      {
        name: 'メール未確認ユーザーのログイン',
        scenario: 'email_not_verified',
        createUser: true,
        email: `unverified-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        emailVerified: false,
        expectedMessages: [
          'メールアドレスの確認が必要です',
          'アカウントを有効化するため',
          '確認メール'
        ]
      },
      {
        name: '存在しないユーザーのログイン',
        scenario: 'user_not_found',
        createUser: false,
        email: `nonexistent-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        expectedMessages: [
          'ログインできませんでした',
          'メールアドレスまたはパスワード'
        ]
      },
      {
        name: 'パスワード間違い',
        scenario: 'wrong_password',
        createUser: true,
        email: `wrongpass-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        wrongPassword: 'WrongPassword123!',
        emailVerified: true,
        expectedMessages: [
          'ログインできませんでした',
          'メールアドレスまたはパスワード'
        ]
      },
      {
        name: 'メール確認済みユーザーの正常ログイン',
        scenario: 'success',
        createUser: true,
        email: `verified-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        emailVerified: true,
        expectedMessages: [],
        expectSuccess: true
      }
    ];
    
    log('\n📋 テストケース実行', 'blue');
    log('=' .repeat(70), 'cyan');
    
    for (const testCase of testCases) {
      results.total++;
      
      log(`\n🔍 ${testCase.name}`, 'magenta');
      log('─'.repeat(60), 'cyan');
      
      // ユーザー作成（必要な場合）
      if (testCase.createUser) {
        const hashedPassword = await bcrypt.hash(testCase.password, 10);
        await db.collection('users').insertOne({
          email: testCase.email,
          password: hashedPassword,
          name: `Test User ${testCase.name}`,
          emailVerified: testCase.emailVerified,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        log(`  📧 ユーザー作成: ${testCase.email}`, 'cyan');
        log(`  ✉️  emailVerified: ${testCase.emailVerified}`, 
            testCase.emailVerified ? 'green' : 'yellow');
      }
      
      // CSRFトークン取得
      const csrfResponse = await makeRequest('/api/auth/csrf');
      let csrfToken = null;
      let cookies = null;
      
      try {
        const csrfData = JSON.parse(csrfResponse.data);
        csrfToken = csrfData.csrfToken;
        cookies = csrfResponse.cookies?.join('; ');
      } catch (e) {
        // CSRFトークンが取得できない場合は続行
      }
      
      // ログイン試行
      log('\n  🔑 ログイン試行...', 'blue');
      
      const loginResponse = await makeRequest(
        '/api/auth/callback/credentials',
        'POST',
        {
          email: testCase.email,
          password: testCase.wrongPassword || testCase.password,
          csrfToken: csrfToken
        },
        cookies
      );
      
      log(`  Status: ${loginResponse.status}`, 
          loginResponse.status === 302 ? 'cyan' : 'yellow');
      
      // リダイレクト先を確認
      if (loginResponse.headers?.location) {
        const location = loginResponse.headers.location;
        log(`  Location: ${location}`, 'cyan');
        
        if (testCase.expectSuccess) {
          // 成功期待の場合
          if (!location.includes('error')) {
            log('  ✅ 期待通り: ログイン成功', 'green');
            results.passed++;
            results.details.push({
              test: testCase.name,
              status: 'passed',
              message: 'ログイン成功'
            });
          } else {
            log('  ❌ エラー: ログインできるはずが失敗', 'red');
            results.failed++;
            results.details.push({
              test: testCase.name,
              status: 'failed',
              message: 'ログインが失敗した'
            });
          }
        } else {
          // エラー期待の場合、エラーページを取得
          if (location.includes('error') || location.includes('signin')) {
            // エラーページまたはサインインページへのリダイレクト
            const errorPageResponse = await makeRequest(location);
            const errorMessages = await extractErrorMessage(errorPageResponse.data);
            
            log('\n  📝 表示されたメッセージ:', 'yellow');
            errorMessages.forEach(msg => {
              log(`    - ${msg}`, 'cyan');
            });
            
            // 期待するメッセージが含まれているか確認
            let allFound = true;
            log('\n  ✓ メッセージ検証:', 'yellow');
            
            for (const expected of testCase.expectedMessages) {
              const found = errorMessages.some(msg => 
                msg.includes(expected) || expected.includes(msg)
              );
              
              if (found) {
                log(`    ✅ "${expected}" が見つかりました`, 'green');
              } else {
                log(`    ❌ "${expected}" が見つかりません`, 'red');
                allFound = false;
              }
            }
            
            if (allFound && testCase.expectedMessages.length > 0) {
              log('  ✅ すべての期待メッセージが表示されました', 'green');
              results.passed++;
              results.details.push({
                test: testCase.name,
                status: 'passed',
                messages: errorMessages
              });
            } else if (testCase.expectedMessages.length === 0) {
              log('  ✅ エラーが適切に処理されました', 'green');
              results.passed++;
              results.details.push({
                test: testCase.name,
                status: 'passed',
                messages: errorMessages
              });
            } else {
              log('  ❌ 期待するメッセージが不足しています', 'red');
              results.failed++;
              results.details.push({
                test: testCase.name,
                status: 'failed',
                expected: testCase.expectedMessages,
                actual: errorMessages
              });
            }
          }
        }
      }
      
      // クリーンアップ
      if (testCase.createUser) {
        await db.collection('users').deleteOne({ email: testCase.email });
      }
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
  if (results.details.length > 0) {
    log('\n詳細:', 'yellow');
    results.details.forEach(detail => {
      const icon = detail.status === 'passed' ? '✅' : '❌';
      const color = detail.status === 'passed' ? 'green' : 'red';
      log(`  ${icon} ${detail.test}`, color);
      
      if (detail.messages) {
        log(`     表示メッセージ:`, 'cyan');
        detail.messages.forEach(msg => {
          log(`       - ${msg}`, 'cyan');
        });
      }
      
      if (detail.expected && detail.actual) {
        log(`     期待: ${detail.expected.join(', ')}`, 'yellow');
        log(`     実際: ${detail.actual.join(', ')}`, 'yellow');
      }
    });
  }
  
  // 最終判定
  log('\n' + '='.repeat(70), 'cyan');
  
  if (results.failed === 0) {
    log('🎉 すべてのエラーメッセージテストに合格！', 'green');
    log('適切なエラーメッセージが表示されています。', 'green');
  } else {
    log('⚠️  一部のテストが失敗しました', 'yellow');
    log('エラーメッセージの改善が必要です。', 'yellow');
  }
  
  log('='.repeat(70) + '\n', 'cyan');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// 実行
testErrorMessages().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});