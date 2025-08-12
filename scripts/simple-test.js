#!/usr/bin/env node

/**
 * シンプルな認証テストスクリプト
 */

const http = require('http');

// テスト結果
const results = [];

// HTTPリクエストヘルパー（タイムアウト付き）
function makeRequest(path, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'SimpleAuthTester/1.0',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 200), // 最初の200文字のみ
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    // タイムアウト設定
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    req.end();
  });
}

// メインテスト実行
async function runTests() {
  console.log('🧪 認証保護テスト開始\n');

  // テスト1: ホームページアクセス
  console.log('📍 Test 1: ホームページアクセス');
  try {
    const response = await makeRequest('/');
    console.log(`  Status: ${response.statusCode}`);
    if (response.statusCode === 200) {
      console.log('  ✅ ホームページアクセス成功\n');
      results.push({ test: 'Homepage', status: 'PASS' });
    } else {
      console.log('  ❌ 予期しないステータスコード\n');
      results.push({ test: 'Homepage', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`  ❌ エラー: ${error.message}\n`);
    results.push({ test: 'Homepage', status: 'ERROR' });
  }

  // テスト2: 保護されたページ（/dashboard）
  console.log('📍 Test 2: /dashboard へのアクセス（未認証）');
  try {
    const response = await makeRequest('/dashboard');
    console.log(`  Status: ${response.statusCode}`);
    
    if (response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
      const location = response.headers.location;
      console.log(`  Redirect to: ${location}`);
      
      if (location && location.includes('/auth/signin')) {
        console.log('  ✅ サインインページへリダイレクト');
        
        if (location.includes('callbackUrl')) {
          console.log('  ✅ callbackURLパラメータあり\n');
          results.push({ test: 'Dashboard Protection', status: 'PASS' });
        } else {
          console.log('  ⚠️  callbackURLパラメータなし\n');
          results.push({ test: 'Dashboard Protection', status: 'PARTIAL' });
        }
      } else {
        console.log('  ❌ 不正なリダイレクト先\n');
        results.push({ test: 'Dashboard Protection', status: 'FAIL' });
      }
    } else if (response.statusCode === 200) {
      // HTMLレスポンスの場合もある（クライアントサイドリダイレクト）
      if (response.body.includes('ログイン') || response.body.includes('signin')) {
        console.log('  ✅ ログインページが表示されている\n');
        results.push({ test: 'Dashboard Protection', status: 'PASS' });
      } else {
        console.log('  ❌ 保護されていない（200 OK）\n');
        results.push({ test: 'Dashboard Protection', status: 'FAIL' });
      }
    } else {
      console.log('  ⚠️  予期しないステータスコード\n');
      results.push({ test: 'Dashboard Protection', status: 'UNKNOWN' });
    }
  } catch (error) {
    console.log(`  ❌ エラー: ${error.message}\n`);
    results.push({ test: 'Dashboard Protection', status: 'ERROR' });
  }

  // テスト3: APIエンドポイント
  console.log('📍 Test 3: API保護テスト（/api/posts）');
  try {
    const response = await makeRequest('/api/posts');
    console.log(`  Status: ${response.statusCode}`);
    
    if (response.statusCode === 401 || response.statusCode === 403) {
      console.log('  ✅ APIが保護されている\n');
      results.push({ test: 'API Protection', status: 'PASS' });
    } else if (response.statusCode === 200) {
      console.log('  ⚠️  APIが保護されていない可能性\n');
      results.push({ test: 'API Protection', status: 'WARN' });
    } else {
      console.log(`  ℹ️  ステータス: ${response.statusCode}\n`);
      results.push({ test: 'API Protection', status: 'INFO' });
    }
  } catch (error) {
    console.log(`  ❌ エラー: ${error.message}\n`);
    results.push({ test: 'API Protection', status: 'ERROR' });
  }

  // テスト4: CSRFトークン
  console.log('📍 Test 4: CSRFトークン取得');
  try {
    const response = await makeRequest('/api/auth/csrf');
    console.log(`  Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      try {
        const data = JSON.parse(response.body);
        if (data.csrfToken) {
          console.log(`  ✅ CSRFトークン取得成功\n`);
          results.push({ test: 'CSRF Token', status: 'PASS' });
        } else {
          console.log('  ⚠️  CSRFトークンが含まれていない\n');
          results.push({ test: 'CSRF Token', status: 'WARN' });
        }
      } catch {
        console.log('  ⚠️  レスポンスのパースに失敗\n');
        results.push({ test: 'CSRF Token', status: 'WARN' });
      }
    } else {
      console.log(`  ℹ️  ステータス: ${response.statusCode}\n`);
      results.push({ test: 'CSRF Token', status: 'INFO' });
    }
  } catch (error) {
    console.log(`  ❌ エラー: ${error.message}\n`);
    results.push({ test: 'CSRF Token', status: 'ERROR' });
  }

  // サマリー表示
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 テスト結果サマリー\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const warnings = results.filter(r => r.status === 'WARN' || r.status === 'PARTIAL').length;
  
  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`⚠️  WARN: ${warnings}`);
  console.log(`🔥 ERROR: ${errors}`);
  
  console.log('\n詳細:');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : 
                 r.status === 'FAIL' ? '❌' : 
                 r.status === 'ERROR' ? '🔥' : '⚠️';
    console.log(`  ${icon} ${r.test}: ${r.status}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 終了コード
  if (failed > 0 || errors > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// 実行
runTests().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});