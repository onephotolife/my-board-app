#!/usr/bin/env node

/**
 * シンプルなメール認証テスト
 */

const http = require('http');

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTPリクエストヘルパー
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
      timeout: 10000,
    };

    if (body && method === 'POST') {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    if (body && method === 'POST') {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  log('\n🚀 メール認証テスト開始\n', 'bright');

  const tests = [
    {
      name: 'テスト1: 無効なトークン',
      path: '/api/auth/verify?token=invalid-token',
      expectedStatus: 400,
      checkResponse: (data) => data.success === false || data.error,
    },
    {
      name: 'テスト2: トークンなし',
      path: '/api/auth/verify',
      expectedStatus: 400,
      checkResponse: (data) => data.success === false || data.error,
    },
    {
      name: 'テスト3: 正常なトークン（実際のトークンが必要）',
      path: '/api/auth/verify?token=0911b103448e4a7b54bca7d1065f4624449382ef3962e1a20ab04d84a3a885dd',
      expectedStatus: 200,
      checkResponse: (data) => data.success === true || data.message,
    },
    {
      name: 'テスト4: 期限切れトークン',
      path: '/api/auth/verify?token=7da7d31c38a36c41fc59430e1bf765eb29cd90d95f30b82ee2efcc6ed62fecf3',
      expectedStatus: 400,
      checkResponse: (data) => (data.error?.code === 'TOKEN_EXPIRED') || (data.error?.message?.includes('期限')),
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      log(`\n実行中: ${test.name}`, 'cyan');
      const result = await makeRequest(test.path);
      
      const statusOk = result.status === test.expectedStatus;
      const responseOk = test.checkResponse(result.data);
      
      if (statusOk && responseOk) {
        log(`  ✅ 成功: ステータス ${result.status}`, 'green');
        if (result.data.message) {
          log(`  メッセージ: ${result.data.message}`, 'green');
        }
        if (result.data.error?.message) {
          log(`  エラー: ${result.data.error.message}`, 'yellow');
        }
        passed++;
      } else {
        log(`  ❌ 失敗: 期待 ${test.expectedStatus}, 実際 ${result.status}`, 'red');
        console.log('  レスポンス:', JSON.stringify(result.data, null, 2));
        failed++;
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      failed++;
    }
  }

  // メール再送信テスト
  try {
    log('\n実行中: テスト5: メール再送信', 'cyan');
    const result = await makeRequest('/api/auth/resend', 'POST', {
      email: 'test-resend@example.com'
    });
    
    if (result.status === 200 && result.data.success) {
      log(`  ✅ 成功: ${result.data.message}`, 'green');
      passed++;
    } else {
      log(`  ❌ 失敗: ステータス ${result.status}`, 'red');
      failed++;
    }
  } catch (error) {
    log(`  ❌ エラー: ${error.message}`, 'red');
    failed++;
  }

  // 結果サマリー
  log('\n' + '='.repeat(50), 'bright');
  log('📊 テスト結果', 'bright');
  log('='.repeat(50), 'bright');
  log(`  成功: ${passed}`, 'green');
  log(`  失敗: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`  合計: ${passed + failed}`, 'cyan');
  
  if (failed === 0) {
    log('\n🎉 すべてのテストが成功しました！', 'green');
  } else {
    log('\n⚠️ 一部のテストが失敗しました', 'yellow');
  }
}

// 既存のverify-emailエンドポイントもテスト
async function testOldEndpoint() {
  log('\n📝 既存のverify-emailエンドポイントもテスト', 'yellow');
  try {
    const result = await makeRequest('/api/auth/verify-email?token=test');
    log(`  ステータス: ${result.status}`, result.status === 200 ? 'green' : 'yellow');
    if (result.data.error) {
      log(`  エラー: ${result.data.error}`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ エラー: ${error.message}`, 'red');
  }
}

// メイン実行
async function main() {
  await runTests();
  await testOldEndpoint();
  
  log('\n✨ テスト完了\n', 'bright');
}

main().catch(error => {
  log(`\n❌ 予期しないエラー: ${error.message}`, 'red');
  process.exit(1);
});