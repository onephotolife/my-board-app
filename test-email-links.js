#!/usr/bin/env node

/**
 * メールリンクテストスクリプト
 * 14人天才会議 - メールリンク問題調査用
 */

const http = require('http');

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
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
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

async function testEmailLinks() {
  log('\n🧠 14人天才会議 - メールリンク検証テスト\n', 'cyan');
  
  try {
    // 1. テストユーザー登録
    log('\n天才1: テストユーザー登録', 'blue');
    const testEmail = `test-${Date.now()}@example.com`;
    
    const registerResponse = await makeRequest('/api/auth/register', 'POST', {
      name: 'テストユーザー',
      email: testEmail,
      password: 'Test123!Pass',
    }, {
      'X-Test-Mode': 'true',
      'Host': 'localhost:3000',
    });

    if (registerResponse.status === 201) {
      log('✅ ユーザー登録成功', 'green');
      log(`  レスポンス: ${JSON.stringify(registerResponse.data, null, 2)}`, 'cyan');
    } else {
      log(`❌ ユーザー登録失敗: ${JSON.stringify(registerResponse.data)}`, 'red');
    }

    // 2. パスワードリセットリクエスト
    log('\n天才2: パスワードリセットリクエスト', 'blue');
    
    const resetResponse = await makeRequest('/api/auth/request-reset', 'POST', {
      email: testEmail,
    }, {
      'Host': 'localhost:3000',
    });

    if (resetResponse.status === 200) {
      log('✅ パスワードリセットリクエスト成功', 'green');
      log(`  レスポンス: ${JSON.stringify(resetResponse.data, null, 2)}`, 'cyan');
    } else {
      log(`❌ パスワードリセット失敗: ${JSON.stringify(resetResponse.data)}`, 'red');
    }

    // 3. verify-emailページの確認
    log('\n天才3: verify-emailページアクセステスト', 'blue');
    
    const verifyPageResponse = await makeRequest('/auth/verify-email?token=test', 'GET');
    
    if (verifyPageResponse.status === 200) {
      log('✅ verify-emailページアクセス成功', 'green');
      // HTMLの一部を確認
      const html = verifyPageResponse.data.toString();
      if (html.includes('オフライン')) {
        log('⚠️  警告: オフラインページが表示されています', 'yellow');
      } else if (html.includes('メールアドレスを確認中')) {
        log('✅ 正常なページが表示されています', 'green');
      }
    } else {
      log(`❌ verify-emailページアクセス失敗: ${verifyPageResponse.status}`, 'red');
    }

    // 4. reset-passwordページの確認
    log('\n天才4: reset-passwordページアクセステスト', 'blue');
    
    const resetPageResponse = await makeRequest('/auth/reset-password/test-token', 'GET');
    
    if (resetPageResponse.status === 200) {
      log('✅ reset-passwordページアクセス成功', 'green');
      const html = resetPageResponse.data.toString();
      if (html.includes('オフライン')) {
        log('⚠️  警告: オフラインページが表示されています', 'yellow');
      } else if (html.includes('パスワード')) {
        log('✅ 正常なページが表示されています', 'green');
      }
    } else {
      log(`❌ reset-passwordページアクセス失敗: ${resetPageResponse.status}`, 'red');
    }

    // 5. CSSリソースの確認
    log('\n天才5: CSSリソース確認', 'blue');
    
    const cssResponse = await makeRequest('/_next/static/chunks/src_app_globals_b805903d.css', 'GET');
    
    if (cssResponse.status === 200) {
      log('✅ CSSファイルアクセス成功', 'green');
    } else {
      log(`⚠️ CSSファイルアクセス失敗: ${cssResponse.status}`, 'yellow');
      log('  これがプリロードエラーの原因の可能性があります', 'yellow');
    }

  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
  }

  // 結果サマリー
  log('\n' + '='.repeat(50), 'cyan');
  log('📊 診断結果', 'magenta');
  log('='.repeat(50), 'cyan');
  
  log('\n🔍 考えられる問題:', 'yellow');
  log('  1. メール内のリンクURLが正しく生成されていない可能性', 'cyan');
  log('  2. ページコンポーネントのSSR/CSRの問題', 'cyan');
  log('  3. CSSプリロードの設定ミス', 'cyan');
  log('  4. ルーティング設定の問題', 'cyan');
  
  log('\n💡 推奨対応:', 'green');
  log('  1. メール送信時のURL生成ロジックを修正', 'cyan');
  log('  2. verify-emailとreset-passwordページの実装確認', 'cyan');
  log('  3. CSSプリロード設定の見直し', 'cyan');
}

// 実行
testEmailLinks().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});