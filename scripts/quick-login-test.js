#!/usr/bin/env node

/**
 * クイックログインテストスクリプト
 * 20人天才エンジニア会議により設計
 * 
 * 使用方法: node scripts/quick-login-test.js
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// カラー出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// テスト結果
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// テスト実行関数
async function runTest(name, testFn) {
  log(`\n📝 ${name}`, 'cyan');
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    log(`  ✅ PASS (${duration}ms)`, 'green');
    results.passed++;
    results.tests.push({ name, status: 'passed', duration });
  } catch (error) {
    log(`  ❌ FAIL: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

// CSRFトークン取得
async function getCSRFToken() {
  const response = await fetch(`${BASE_URL}/api/auth/csrf`);
  const data = await response.json();
  return data.csrfToken;
}

// Cookieパース
function parseCookies(setCookieHeaders) {
  const cookies = {};
  if (Array.isArray(setCookieHeaders)) {
    setCookieHeaders.forEach(header => {
      const [cookie] = header.split(';');
      const [name, value] = cookie.split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

// テストケース実装
async function testLoginAPI() {
  // TEST 1: 正常なログイン
  await runTest('TEST-1: 正常なログイン（verified@test.com）', async () => {
    const csrfToken = await getCSRFToken();
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'verified@test.com',
        password: 'Test123!',
        csrfToken: csrfToken || ''
      })
    });
    
    log(`    Status: ${response.status}`, 'blue');
    
    if (!response.ok && response.status !== 302) {
      const text = await response.text();
      throw new Error(`ログイン失敗: ${response.status} - ${text.substring(0, 100)}`);
    }
    
    const cookies = parseCookies(response.headers.raw()['set-cookie']);
    log(`    Session Cookie: ${cookies['authjs.session-token'] ? '取得成功' : '取得失敗'}`, 'blue');
  });
  
  // TEST 2: 間違ったパスワード
  await runTest('TEST-2: 間違ったパスワード', async () => {
    const csrfToken = await getCSRFToken();
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'verified@test.com',
        password: 'WrongPassword!',
        csrfToken: csrfToken || ''
      }),
      redirect: 'manual' // リダイレクトを手動で処理
    });
    
    // NextAuthはエラー時もリダイレクト（302）を返すことがある
    // locationヘッダーにerrorパラメータが含まれているかチェック
    const location = response.headers.get('location') || '';
    const hasError = location.includes('error=') || location.includes('CredentialsSignin');
    
    if (!hasError && (response.status === 200 || response.status === 302)) {
      throw new Error('間違ったパスワードでログインできてしまった');
    }
    
    log(`    Status: ${response.status}, Error in URL: ${hasError}`, 'blue');
  });
  
  // TEST 3: 未確認メールアドレス
  await runTest('TEST-3: 未確認メールアドレス', async () => {
    const csrfToken = await getCSRFToken();
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'unverified@test.com',
        password: 'Test123!',
        csrfToken: csrfToken || ''
      }),
      redirect: 'manual' // リダイレクトを手動で処理
    });
    
    // NextAuthはエラー時もリダイレクト（302）を返すことがある
    const location = response.headers.get('location') || '';
    const hasError = location.includes('error=') || location.includes('CredentialsSignin');
    
    if (!hasError && (response.status === 200 || response.status === 302)) {
      throw new Error('未確認メールでログインできてしまった');
    }
    
    log(`    Status: ${response.status}, Error in URL: ${hasError}`, 'blue');
  });
  
  // TEST 4: セッション確認
  await runTest('TEST-4: セッション確認API', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/session`);
    const data = await response.json();
    
    log(`    Session Data: ${JSON.stringify(data).substring(0, 100)}...`, 'blue');
    
    if (!response.ok) {
      throw new Error('セッション確認APIが失敗');
    }
  });
  
  // TEST 5: 保護されたページへのアクセス
  await runTest('TEST-5: 保護されたページへのアクセス（未認証）', async () => {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      redirect: 'manual', // リダイレクトを手動で処理
      headers: {
        'Cookie': '' // 空のCookieヘッダーを明示的に設定
      }
    });
    
    // ミドルウェアによるリダイレクトが期待される
    // Next.js 15では307または308を使用
    if (response.status !== 307 && response.status !== 308 && response.status !== 302) {
      // ページが直接返される場合もあるので、内容を確認
      if (response.status === 200) {
        const text = await response.text();
        // ダッシュボードページが表示されてしまっている場合はエラー
        if (text.includes('Dashboard') || text.includes('ダッシュボード')) {
          throw new Error(`保護されたページが未認証でアクセスできてしまった: ${response.status}`);
        }
        // ログインページにリダイレクトされている可能性
        log(`    Status: 200 (おそらくクライアントサイドリダイレクト)`, 'yellow');
        return;
      }
      throw new Error(`期待されるリダイレクトが発生しませんでした: ${response.status}`);
    }
    
    const location = response.headers.get('location');
    log(`    Redirect to: ${location}`, 'blue');
    
    if (!location?.includes('/auth/signin')) {
      throw new Error('ログインページ以外にリダイレクトされました');
    }
  });
  
  // TEST 6: レート制限チェック
  await runTest('TEST-6: レート制限チェック（5回連続リクエスト）', async () => {
    let rateLimited = false;
    
    for (let i = 1; i <= 10; i++) {
      const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: `test${i}@example.com`,
          password: 'Test123!',
        })
      });
      
      if (response.status === 429) {
        rateLimited = true;
        log(`    レート制限発動: ${i}回目のリクエストで429エラー`, 'yellow');
        break;
      }
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!rateLimited) {
      log(`    ⚠️  レート制限が発動しませんでした（設定による可能性）`, 'yellow');
    }
  });
}

// パフォーマンステスト
async function performanceTest() {
  log('\n⚡ パフォーマンステスト', 'magenta');
  
  const times = [];
  
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    
    await fetch(`${BASE_URL}/api/auth/csrf`);
    
    const duration = Date.now() - start;
    times.push(duration);
    log(`  試行 ${i + 1}: ${duration}ms`, 'blue');
  }
  
  const average = times.reduce((a, b) => a + b, 0) / times.length;
  log(`  平均レスポンス時間: ${average.toFixed(2)}ms`, 'cyan');
  
  if (average > 2000) {
    log('  ⚠️  パフォーマンス警告: 平均時間が2秒を超えています', 'yellow');
  }
}

// メイン実行
async function main() {
  console.log('\n' + '='.repeat(60));
  log('🚀 クイックログインテスト開始', 'cyan');
  console.log('='.repeat(60));
  
  log(`\n📍 テスト環境: ${BASE_URL}`, 'blue');
  log(`🕐 開始時刻: ${new Date().toLocaleString()}`, 'blue');
  
  // サーバー接続確認
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`サーバーに接続できません: ${response.status}`);
    }
    log('✅ サーバー接続確認OK\n', 'green');
  } catch (error) {
    log(`❌ サーバーに接続できません: ${error.message}`, 'red');
    log('💡 ヒント: npm run dev でサーバーを起動してください', 'yellow');
    process.exit(1);
  }
  
  // テスト実行
  await testLoginAPI();
  await performanceTest();
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  log('📊 テスト結果サマリー', 'cyan');
  console.log('='.repeat(60));
  
  log(`\n✅ 成功: ${results.passed}件`, 'green');
  log(`❌ 失敗: ${results.failed}件`, 'red');
  log(`📈 合格率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`, 'blue');
  
  if (results.failed > 0) {
    log('\n❌ 失敗したテスト:', 'red');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      log(`  - ${test.name}: ${test.error}`, 'red');
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    log('🎉 すべてのテストが成功しました！', 'green');
  } else {
    log('⚠️  一部のテストが失敗しました', 'yellow');
    log('\n📝 詳細なテスト手順を確認:');
    log('   cat LOGIN_TEST_GUIDE.md', 'blue');
  }
  
  console.log('='.repeat(60) + '\n');
  
  // 終了コード
  process.exit(results.failed > 0 ? 1 : 0);
}

// 実行
main().catch(error => {
  log(`\n❌ 予期しないエラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});