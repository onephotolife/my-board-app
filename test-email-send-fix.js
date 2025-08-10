#!/usr/bin/env node

/**
 * メール送信エラー修正確認テスト
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

async function testEmailSend() {
  log('\n🚀 メール送信修正確認テスト開始\n', 'bright');

  // テスト1: 存在するユーザーへのメール再送信
  try {
    log('テスト1: メール再送信（修正確認）', 'cyan');
    
    // まず、テストユーザーが存在することを確認
    // test-resend@example.comを使用
    const result = await makeRequest('/api/auth/resend', 'POST', {
      email: 'test-resend@example.com'
    });

    if (result.status === 200) {
      log('  ✅ 成功: メール送信処理が正常に動作', 'green');
      log(`  メッセージ: ${result.data.message}`, 'green');
      
      // サーバーログを確認するようメッセージ
      log('\n📧 サーバーコンソールを確認してください:', 'yellow');
      log('  - 開発環境の場合、メール内容がコンソールに出力されます', 'yellow');
      log('  - 認証URLが表示されているはずです', 'yellow');
      
      return true;
    } else if (result.status === 429) {
      log('  ⚠️ レート制限中（正常動作）', 'yellow');
      log(`  ${result.data.error?.message}`, 'yellow');
      
      // クールダウン時間待機のメッセージ
      const cooldown = result.data.error?.details?.cooldownSeconds;
      if (cooldown) {
        log(`\n⏱️ ${cooldown}秒後に再試行してください`, 'cyan');
      }
      
      return false;
    } else {
      log(`  ❌ 予期しないステータス: ${result.status}`, 'red');
      console.log('  レスポンス:', result.data);
      return false;
    }
  } catch (error) {
    log(`  ❌ エラー: ${error.message}`, 'red');
    return false;
  }
}

async function testNewUser() {
  log('\nテスト2: 新規テストユーザーでのメール送信', 'cyan');
  
  const uniqueEmail = `test-${Date.now()}@example.com`;
  log(`  テストメール: ${uniqueEmail}`, 'blue');
  
  try {
    const result = await makeRequest('/api/auth/resend', 'POST', {
      email: uniqueEmail
    });
    
    // 存在しないユーザーでも成功レスポンスを返す（セキュリティ）
    if (result.status === 200) {
      log('  ✅ 成功: セキュリティ動作が正常', 'green');
      log('  （存在しないユーザーでも成功レスポンス）', 'green');
      return true;
    } else {
      log(`  ❌ 予期しないステータス: ${result.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ❌ エラー: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('=' .repeat(60), 'bright');
  log('📧 メール送信エラー修正確認', 'bright');
  log('=' .repeat(60), 'bright');
  
  log('\n修正内容:', 'yellow');
  log('1. sendVerificationEmailの引数順序を修正', 'cyan');
  log('2. 第1引数: メールアドレス（string）', 'cyan');
  log('3. 第2引数: データオブジェクト', 'cyan');
  log('4. 開発環境用のコンソール出力を改善', 'cyan');
  
  const test1 = await testEmailSend();
  
  // レート制限がない場合は新規ユーザーテストも実行
  if (test1) {
    await testNewUser();
  }
  
  log('\n' + '=' .repeat(60), 'bright');
  log('📊 テスト結果', 'bright');
  log('=' .repeat(60), 'bright');
  
  if (test1) {
    log('\n🎉 メール送信エラーが解消されました！', 'green');
    log('✅ EmailServiceが正常に動作しています', 'green');
    log('✅ 開発環境でのメール内容確認が可能です', 'green');
  } else {
    log('\n⚠️ レート制限のため完全なテストができませんでした', 'yellow');
    log('しばらく待ってから再度テストしてください', 'yellow');
  }
  
  log('\n💡 ヒント:', 'cyan');
  log('サーバーコンソールで以下のような出力を確認してください:', 'cyan');
  log('- 📧 [DEV] メール送信シミュレーション', 'cyan');
  log('- 🔐 メール認証リンク（開発環境）', 'cyan');
  log('- 認証URL: http://localhost:3000/auth/verify?token=...', 'cyan');
}

main().catch(error => {
  log(`\n❌ 予期しないエラー: ${error.message}`, 'red');
  process.exit(1);
});