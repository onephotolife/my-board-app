/**
 * CSRF 429エラー解決確認テスト（認証付き）
 * 実行日時: 2025-08-31
 * 認証情報使用: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const fetch = require('node-fetch');

// 設定
const BASE_URL = 'http://localhost:3000';
const AUTH_EMAIL = 'one.photolife+1@gmail.com';
const AUTH_PASSWORD = '?@thc123THC@?';

// ログ用のタイムスタンプ
const timestamp = () => new Date().toISOString();

// Cookie保存用
let cookies = {};

// Cookieパース用関数
function parseCookies(setCookieHeaders) {
  const result = {};
  if (Array.isArray(setCookieHeaders)) {
    setCookieHeaders.forEach(header => {
      const [cookie] = header.split(';');
      const [name, value] = cookie.split('=');
      result[name] = value;
    });
  } else if (setCookieHeaders) {
    const [cookie] = setCookieHeaders.split(';');
    const [name, value] = cookie.split('=');
    result[name] = value;
  }
  return result;
}

// Cookie文字列生成
function getCookieString() {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

// Step 1: CSRFトークン取得（認証前）
async function getCSRFToken() {
  console.log(`\n[${timestamp()}] Step 1: CSRFトークン取得開始`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/csrf`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': getCookieString()
      },
      redirect: 'manual',
    });
    
    // Cookieを保存
    const setCookieHeaders = response.headers.raw()['set-cookie'];
    if (setCookieHeaders) {
      Object.assign(cookies, parseCookies(setCookieHeaders));
    }
    
    if (!response.ok) {
      console.error(`  ❌ CSRFトークン取得失敗: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`  Response: ${text.substring(0, 200)}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`  ✅ CSRFトークン取得成功: ${data.token?.substring(0, 20)}...`);
    console.log(`  Cookies: ${Object.keys(cookies).join(', ')}`);
    return data.token;
  } catch (error) {
    console.error(`  ❌ CSRFトークン取得エラー:`, error.message);
    return null;
  }
}

// Step 2: 認証実行
async function authenticate(csrfToken) {
  console.log(`\n[${timestamp()}] Step 2: 認証開始`);
  console.log(`  Email: ${AUTH_EMAIL}`);
  
  try {
    // NextAuthのcredentials認証エンドポイント
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': getCookieString(),
        'x-csrf-token': csrfToken || ''
      },
      body: new URLSearchParams({
        email: AUTH_EMAIL,
        password: AUTH_PASSWORD,
        csrfToken: csrfToken || '',
        callbackUrl: BASE_URL,
        json: 'true'
      }),
      redirect: 'manual',
    });
    
    // Cookieを保存
    const setCookieHeaders = response.headers.raw()['set-cookie'];
    if (setCookieHeaders) {
      Object.assign(cookies, parseCookies(setCookieHeaders));
    }
    
    if (response.status === 302 || response.status === 200) {
      console.log(`  ✅ 認証成功`);
      console.log(`  Session Cookie取得: ${cookies['next-auth.session-token'] ? 'あり' : 'なし'}`);
      return true;
    } else {
      console.error(`  ❌ 認証失敗: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`  Response: ${text.substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ 認証エラー:`, error.message);
    return false;
  }
}

// Step 3: ホームページアクセス（認証済み）
async function accessHome() {
  console.log(`\n[${timestamp()}] Step 3: ホームページアクセス（認証済み）`);
  
  try {
    const response = await fetch(BASE_URL, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Cookie': getCookieString(),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      redirect: 'follow',
    });
    
    if (response.ok) {
      const html = await response.text();
      const hasError = html.includes('429') || html.includes('Too Many Requests');
      
      if (hasError) {
        console.error(`  ❌ 429エラーが検出されました`);
        return false;
      } else {
        console.log(`  ✅ ページ正常表示（429エラーなし）`);
        console.log(`  Response Size: ${html.length} bytes`);
        return true;
      }
    } else {
      console.error(`  ❌ アクセス失敗: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ アクセスエラー:`, error.message);
    return false;
  }
}

// Step 4: CSRFトークン再取得テスト（複数回）
async function testMultipleTokenFetch() {
  console.log(`\n[${timestamp()}] Step 4: CSRFトークン複数回取得テスト`);
  
  const results = [];
  const count = 5;
  
  for (let i = 1; i <= count; i++) {
    console.log(`  テスト ${i}/${count}...`);
    try {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/api/csrf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cookie': getCookieString()
        },
      });
      const elapsed = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        results.push({
          success: true,
          status: response.status,
          time: elapsed,
          token: data.token?.substring(0, 20)
        });
        console.log(`    ✅ 成功 (${elapsed}ms)`);
      } else {
        results.push({
          success: false,
          status: response.status,
          time: elapsed,
          error: response.statusText
        });
        console.log(`    ❌ 失敗: ${response.status} (${elapsed}ms)`);
      }
      
      // 短い待機
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({
        success: false,
        error: error.message
      });
      console.log(`    ❌ エラー: ${error.message}`);
    }
  }
  
  // 結果集計
  const successCount = results.filter(r => r.success).length;
  const avgTime = results.reduce((sum, r) => sum + (r.time || 0), 0) / results.length;
  
  console.log(`\n  集計結果:`);
  console.log(`    成功率: ${successCount}/${count} (${(successCount/count*100).toFixed(0)}%)`);
  console.log(`    平均応答時間: ${avgTime.toFixed(0)}ms`);
  console.log(`    429エラー: ${results.filter(r => r.status === 429).length}回`);
  
  return successCount === count;
}

// メインテスト実行
async function runTest() {
  console.log('====================================');
  console.log('CSRF 429エラー解決確認テスト（認証付き）');
  console.log('====================================');
  
  const results = {
    csrfToken: false,
    auth: false,
    homeAccess: false,
    multipleTokens: false
  };
  
  // Step 1: CSRFトークン取得
  const csrfToken = await getCSRFToken();
  results.csrfToken = !!csrfToken;
  
  if (!csrfToken) {
    console.error('\n⚠️  CSRFトークン取得失敗のため、テスト中断');
    printResults(results);
    return;
  }
  
  // Step 2: 認証
  results.auth = await authenticate(csrfToken);
  
  if (!results.auth) {
    console.error('\n⚠️  認証失敗のため、テスト中断');
    printResults(results);
    return;
  }
  
  // Step 3: ホームページアクセス
  results.homeAccess = await accessHome();
  
  // Step 4: 複数回トークン取得
  results.multipleTokens = await testMultipleTokenFetch();
  
  // 結果表示
  printResults(results);
}

// 結果表示
function printResults(results) {
  console.log('\n====================================');
  console.log('テスト結果サマリー');
  console.log('====================================');
  console.log(`CSRFトークン取得: ${results.csrfToken ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`認証: ${results.auth ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`ホームページアクセス: ${results.homeAccess ? '✅ 成功（429エラーなし）' : '❌ 失敗または429エラー'}`);
  console.log(`複数回トークン取得: ${results.multipleTokens ? '✅ 成功（全て成功）' : '❌ 失敗（一部失敗）'}`);
  
  const allPassed = Object.values(results).every(v => v);
  console.log(`\n総合結果: ${allPassed ? '✅ 全テスト合格' : '❌ 一部テスト失敗'}`);
  
  if (allPassed) {
    console.log('\n🎉 CSRF 429エラーが解決されました！');
  } else {
    console.log('\n⚠️  まだ問題が残っています。追加の対策が必要です。');
  }
}

// テスト実行
runTest().catch(error => {
  console.error('テスト実行エラー:', error);
  process.exit(1);
});