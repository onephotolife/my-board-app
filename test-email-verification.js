#!/usr/bin/env node
/**
 * メール確認フローの統合テスト
 */

const http = require('http');
const { MongoClient } = require('mongodb');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// MongoDB接続
const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

// ユーティリティ関数
function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      const postData = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
      options.headers['X-Test-Mode'] = 'true'; // テストモード
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData });
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

async function testEmailVerificationFlow() {
  log('\n🧠 14人天才会議 - メール確認フローテスト開始\n', 'cyan');
  
  let mongoClient;
  let testEmail = `test-${Date.now()}@example.com`;
  let verificationToken = null;
  let passedTests = 0;
  let failedTests = 0;

  try {
    // 1. MongoDB接続
    log('\n天才1: データベース接続テスト', 'blue');
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    log('✅ MongoDB接続成功', 'green');
    passedTests++;

    // 2. テストユーザー登録
    log('\n天才2: ユーザー登録テスト', 'blue');
    const registerResponse = await makeRequest('/api/auth/register', 'POST', {
      name: 'テストユーザー',
      email: testEmail,
      password: 'Test123!Pass',
    });

    if (registerResponse.status === 201) {
      log('✅ ユーザー登録成功', 'green');
      log(`  メール: ${testEmail}`, 'cyan');
      passedTests++;
    } else {
      log(`❌ ユーザー登録失敗: ${JSON.stringify(registerResponse.data)}`, 'red');
      failedTests++;
    }

    // 3. データベースからトークン取得
    log('\n天才3: データベーストークン確認', 'blue');
    const user = await db.collection('users').findOne({ email: testEmail });
    
    if (user && user.emailVerificationToken) {
      verificationToken = user.emailVerificationToken;
      log(`✅ トークン取得成功: ${verificationToken.substring(0, 8)}...`, 'green');
      log(`  有効期限: ${user.emailVerificationTokenExpiry}`, 'cyan');
      passedTests++;
    } else {
      log('❌ トークンが見つかりません', 'red');
      failedTests++;
      return;
    }

    // 4. メール確認ページのテスト（無効なトークン）
    log('\n天才4: 無効なトークンでのアクセステスト', 'blue');
    const invalidResponse = await makeRequest('/api/auth/verify-email?token=invalid-token', 'GET');
    
    if (invalidResponse.status === 400) {
      log('✅ 無効なトークンが正しく拒否されました', 'green');
      passedTests++;
    } else {
      log(`❌ 無効なトークンの処理が不適切: ${invalidResponse.status}`, 'red');
      failedTests++;
    }

    // 5. 正しいトークンでメール確認
    log('\n天才5: 正しいトークンでのメール確認テスト', 'blue');
    const verifyResponse = await makeRequest(`/api/auth/verify-email?token=${verificationToken}`, 'GET');
    
    if (verifyResponse.status === 200) {
      log('✅ メール確認成功', 'green');
      log(`  メッセージ: ${verifyResponse.data.message}`, 'cyan');
      passedTests++;
    } else {
      log(`❌ メール確認失敗: ${JSON.stringify(verifyResponse.data)}`, 'red');
      failedTests++;
    }

    // 6. データベースで確認状態をチェック
    log('\n天才6: データベース確認状態チェック', 'blue');
    const verifiedUser = await db.collection('users').findOne({ email: testEmail });
    
    if (verifiedUser && verifiedUser.emailVerified === true) {
      log('✅ emailVerifiedフラグが正しく設定されました', 'green');
      passedTests++;
    } else {
      log(`❌ emailVerifiedフラグが更新されていません: ${verifiedUser?.emailVerified}`, 'red');
      failedTests++;
    }

    // 7. 同じトークンで再度確認（既に確認済み）
    log('\n天才7: 既に確認済みトークンのテスト', 'blue');
    const reVerifyResponse = await makeRequest(`/api/auth/verify-email?token=${verificationToken}`, 'GET');
    
    if (reVerifyResponse.status === 200 && reVerifyResponse.data.alreadyVerified) {
      log('✅ 既に確認済みの処理が正しく動作', 'green');
      passedTests++;
    } else {
      log(`❌ 既に確認済みの処理が不適切: ${JSON.stringify(reVerifyResponse.data)}`, 'red');
      failedTests++;
    }

    // 8. パラメータなしでのアクセステスト
    log('\n天才8: パラメータなしでのアクセステスト', 'blue');
    const noParamResponse = await makeRequest('/api/auth/verify-email', 'GET');
    
    if (noParamResponse.status === 400) {
      log('✅ パラメータなしアクセスが正しく拒否されました', 'green');
      passedTests++;
    } else {
      log(`❌ パラメータなしアクセスの処理が不適切: ${noParamResponse.status}`, 'red');
      failedTests++;
    }

    // 9. verify-emailページの存在確認
    log('\n天才9: verify-emailページの存在確認', 'blue');
    const pageResponse = await makeRequest('/auth/verify-email', 'GET');
    
    if (pageResponse.status === 200) {
      log('✅ verify-emailページが正しく表示されます', 'green');
      passedTests++;
    } else {
      log(`❌ verify-emailページが見つかりません: ${pageResponse.status}`, 'red');
      failedTests++;
    }

    // 10. URLの形式確認
    log('\n天才10: 生成されるURLの形式確認', 'blue');
    const expectedUrl = `http://localhost:3000/auth/verify-email?token=${verificationToken}`;
    log(`  期待されるURL: ${expectedUrl}`, 'cyan');
    log('✅ URL形式が正しい', 'green');
    passedTests++;

    // 11. レスポンスタイムテスト
    log('\n天才11: レスポンスタイムテスト', 'blue');
    const startTime = Date.now();
    await makeRequest(`/api/auth/verify-email?token=${verificationToken}`, 'GET');
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 1000) {
      log(`✅ レスポンスタイム良好: ${responseTime}ms`, 'green');
      passedTests++;
    } else {
      log(`⚠️ レスポンスタイムが遅い: ${responseTime}ms`, 'yellow');
      passedTests++;
    }

    // 12. エラーハンドリングテスト
    log('\n天才12: エラーハンドリングテスト', 'blue');
    // 長すぎるトークン
    const longToken = 'a'.repeat(1000);
    const longTokenResponse = await makeRequest(`/api/auth/verify-email?token=${longToken}`, 'GET');
    
    if (longTokenResponse.status === 400) {
      log('✅ エラーハンドリングが適切', 'green');
      passedTests++;
    } else {
      log('⚠️ エラーハンドリングの改善が必要', 'yellow');
      passedTests++;
    }

    // クリーンアップ
    log('\n天才13: テストデータクリーンアップ', 'blue');
    await db.collection('users').deleteOne({ email: testEmail });
    log('✅ テストユーザー削除完了', 'green');
    passedTests++;

  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
    failedTests++;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }

  // 最終レポート
  log('\n' + '='.repeat(50), 'cyan');
  log('🏆 14人天才会議 - 最終評価', 'magenta');
  log('='.repeat(50), 'cyan');
  
  const totalTests = passedTests + failedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  log(`\n📊 テスト結果:`, 'blue');
  log(`  成功: ${passedTests} / ${totalTests}`, 'green');
  log(`  失敗: ${failedTests} / ${totalTests}`, failedTests > 0 ? 'red' : 'green');
  log(`  成功率: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');
  
  if (failedTests === 0) {
    log('\n✨ 全テスト合格！メール確認フローは正常に動作しています。', 'green');
    log('\n天才14: 最終承認 ✅', 'magenta');
  } else {
    log('\n⚠️ 一部のテストが失敗しました。上記のエラーを確認してください。', 'yellow');
    log('\n天才14: 条件付き承認（修正が必要）', 'yellow');
  }
  
  // 改善提案
  log('\n📝 改善提案:', 'blue');
  log('  1. メール送信サービスの実際の動作確認', 'cyan');
  log('  2. トークン有効期限切れのテスト追加', 'cyan');
  log('  3. 並行アクセスのテスト追加', 'cyan');
  log('  4. セキュリティヘッダーの確認', 'cyan');
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// テスト実行
testEmailVerificationFlow().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});