#!/usr/bin/env node

/**
 * CSRF保護テストスクリプト
 * CSRFトークンなしのリクエストが正しく拒否されることを確認
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const isHTTPS = BASE_URL.startsWith('https');
const client = isHTTPS ? https : http;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * HTTPリクエストを送信
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || BASE_URL + options.path);
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHTTPS ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'CSRF-Test-Client',
        ...options.headers,
      },
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * CSRFトークンを取得
 */
async function getCSRFToken() {
  try {
    const response = await makeRequest({
      path: '/api/csrf',
      method: 'GET',
    });
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      return {
        token: data.token,
        header: data.header || 'x-csrf-token',
        cookies: response.headers['set-cookie'] || [],
      };
    }
    
    return null;
  } catch (error) {
    console.error('CSRF token fetch error:', error.message);
    return null;
  }
}

/**
 * CSRFテスト実行
 */
async function runCSRFTests() {
  log('\n========================================', 'cyan');
  log('CSRF保護テスト開始', 'cyan');
  log('========================================\n', 'cyan');
  
  const results = [];
  let passCount = 0;
  let failCount = 0;
  
  // テスト1: CSRFトークン取得
  log('テスト1: CSRFトークン取得エンドポイント', 'blue');
  const csrfData = await getCSRFToken();
  
  if (csrfData && csrfData.token) {
    log('✓ CSRFトークン取得成功', 'green');
    log(`  トークン: ${csrfData.token.substring(0, 20)}...`, 'cyan');
    log(`  ヘッダー名: ${csrfData.header}`, 'cyan');
    passCount++;
    results.push({ test: 'CSRFトークン取得', status: 'PASS' });
  } else {
    log('✗ CSRFトークン取得失敗', 'red');
    failCount++;
    results.push({ test: 'CSRFトークン取得', status: 'FAIL' });
  }
  
  // テスト2: CSRFトークンなしのPOSTリクエスト
  log('\nテスト2: CSRFトークンなしのPOSTリクエスト', 'blue');
  try {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Post',
        content: 'Test Content',
        author: 'Test Author',
      }),
    });
    
    if (response.statusCode === 403) {
      log('✓ CSRFトークンなしのリクエストが正しく拒否された', 'green');
      log(`  ステータスコード: ${response.statusCode}`, 'cyan');
      
      const data = JSON.parse(response.body);
      if (data.error && data.error.includes('CSRF')) {
        log(`  エラーメッセージ: ${data.error}`, 'cyan');
      }
      passCount++;
      results.push({ test: 'CSRFトークンなしPOST', status: 'PASS' });
    } else {
      log('✗ CSRFトークンなしのリクエストが拒否されなかった', 'red');
      log(`  ステータスコード: ${response.statusCode}`, 'yellow');
      failCount++;
      results.push({ test: 'CSRFトークンなしPOST', status: 'FAIL' });
    }
  } catch (error) {
    log('✗ リクエストエラー: ' + error.message, 'red');
    failCount++;
    results.push({ test: 'CSRFトークンなしPOST', status: 'ERROR' });
  }
  
  // テスト3: 無効なCSRFトークンでのPOSTリクエスト
  log('\nテスト3: 無効なCSRFトークンでのPOSTリクエスト', 'blue');
  try {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'invalid-token-12345',
      },
      body: JSON.stringify({
        title: 'Test Post',
        content: 'Test Content',
        author: 'Test Author',
      }),
    });
    
    if (response.statusCode === 403) {
      log('✓ 無効なCSRFトークンのリクエストが正しく拒否された', 'green');
      log(`  ステータスコード: ${response.statusCode}`, 'cyan');
      passCount++;
      results.push({ test: '無効なCSRFトークンPOST', status: 'PASS' });
    } else {
      log('✗ 無効なCSRFトークンのリクエストが拒否されなかった', 'red');
      log(`  ステータスコード: ${response.statusCode}`, 'yellow');
      failCount++;
      results.push({ test: '無効なCSRFトークンPOST', status: 'FAIL' });
    }
  } catch (error) {
    log('✗ リクエストエラー: ' + error.message, 'red');
    failCount++;
    results.push({ test: '無効なCSRFトークンPOST', status: 'ERROR' });
  }
  
  // テスト4: CSRFトークンありのPOSTリクエスト
  if (csrfData && csrfData.token) {
    log('\nテスト4: 有効なCSRFトークンでのPOSTリクエスト', 'blue');
    try {
      // Cookieヘッダーを構築
      const cookieHeader = csrfData.cookies.map(cookie => 
        cookie.split(';')[0]
      ).join('; ');
      
      const response = await makeRequest({
        path: '/api/posts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [csrfData.header]: csrfData.token,
          'Cookie': cookieHeader,
        },
        body: JSON.stringify({
          title: 'Test Post',
          content: 'Test Content',
          author: 'Test Author',
        }),
      });
      
      // 401は認証エラー（CSRFは通過）、403はCSRFエラー
      if (response.statusCode === 401) {
        log('✓ CSRFトークンが受け入れられた（認証で拒否）', 'green');
        log(`  ステータスコード: ${response.statusCode}`, 'cyan');
        passCount++;
        results.push({ test: '有効なCSRFトークンPOST', status: 'PASS' });
      } else if (response.statusCode === 403) {
        log('✗ 有効なCSRFトークンが拒否された', 'red');
        log(`  ステータスコード: ${response.statusCode}`, 'yellow');
        const data = JSON.parse(response.body);
        log(`  エラー: ${data.error}`, 'yellow');
        failCount++;
        results.push({ test: '有効なCSRFトークンPOST', status: 'FAIL' });
      } else {
        log('△ 予期しないレスポンス', 'yellow');
        log(`  ステータスコード: ${response.statusCode}`, 'yellow');
        results.push({ test: '有効なCSRFトークンPOST', status: 'UNKNOWN' });
      }
    } catch (error) {
      log('✗ リクエストエラー: ' + error.message, 'red');
      failCount++;
      results.push({ test: '有効なCSRFトークンPOST', status: 'ERROR' });
    }
  }
  
  // テスト5: GETリクエストはCSRF不要
  log('\nテスト5: GETリクエストはCSRFトークン不要', 'blue');
  try {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'GET',
    });
    
    if (response.statusCode !== 403) {
      log('✓ GETリクエストはCSRFトークンなしで通過', 'green');
      log(`  ステータスコード: ${response.statusCode}`, 'cyan');
      passCount++;
      results.push({ test: 'GETリクエスト', status: 'PASS' });
    } else {
      log('✗ GETリクエストがCSRFで拒否された', 'red');
      failCount++;
      results.push({ test: 'GETリクエスト', status: 'FAIL' });
    }
  } catch (error) {
    log('✗ リクエストエラー: ' + error.message, 'red');
    failCount++;
    results.push({ test: 'GETリクエスト', status: 'ERROR' });
  }
  
  // 結果サマリー
  log('\n========================================', 'cyan');
  log('テスト結果サマリー', 'cyan');
  log('========================================\n', 'cyan');
  
  const totalTests = passCount + failCount;
  const passRate = totalTests > 0 ? (passCount / totalTests * 100).toFixed(1) : 0;
  
  log(`合計テスト数: ${totalTests}`, 'blue');
  log(`成功: ${passCount}`, 'green');
  log(`失敗: ${failCount}`, failCount > 0 ? 'red' : 'green');
  log(`成功率: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow');
  
  // 詳細結果
  log('\n詳細結果:', 'blue');
  results.forEach(result => {
    const color = result.status === 'PASS' ? 'green' : 
                   result.status === 'FAIL' ? 'red' : 'yellow';
    const icon = result.status === 'PASS' ? '✓' : 
                 result.status === 'FAIL' ? '✗' : '△';
    log(`  ${icon} ${result.test}: ${result.status}`, color);
  });
  
  // 推奨事項
  if (failCount > 0) {
    log('\n推奨事項:', 'yellow');
    log('  1. CSRFミドルウェアが正しく設定されているか確認', 'yellow');
    log('  2. CSRFトークンの生成・検証ロジックを確認', 'yellow');
    log('  3. APIエンドポイントの保護設定を確認', 'yellow');
  } else {
    log('\n✓ すべてのCSRF保護テストに合格しました！', 'green');
  }
  
  return failCount === 0;
}

// メイン実行
async function main() {
  try {
    const success = await runCSRFTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log('\nテスト実行エラー: ' + error.message, 'red');
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}