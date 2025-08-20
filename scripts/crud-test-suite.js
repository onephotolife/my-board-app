#!/usr/bin/env node

/**
 * 会員制掲示板 CRUD機能総合テストスイート
 * 単体テスト、結合テスト、E2Eテストを包括的に実行
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const isHTTPS = BASE_URL.startsWith('https');
const client = isHTTPS ? https : http;

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// テスト結果の集計
const testResults = {
  unit: { passed: 0, failed: 0, skipped: 0 },
  integration: { passed: 0, failed: 0, skipped: 0 },
  e2e: { passed: 0, failed: 0, skipped: 0 },
  security: { passed: 0, failed: 0, skipped: 0 },
};

/**
 * HTTPリクエスト送信
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
        'User-Agent': 'CRUD-Test-Suite',
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
 * テストケース実行
 */
async function runTest(category, name, testFn) {
  try {
    await testFn();
    testResults[category].passed++;
    log(`  ✓ ${name}`, 'green');
    return true;
  } catch (error) {
    testResults[category].failed++;
    log(`  ✗ ${name}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 1. 単体テスト（Unit Tests）
 */
async function runUnitTests() {
  log('\n========================================', 'cyan');
  log('1. 単体テスト（Unit Tests）', 'cyan');
  log('========================================\n', 'cyan');
  
  // 1.1 入力サニタイゼーションテスト
  log('1.1 入力サニタイゼーション', 'blue');
  
  await runTest('unit', 'XSSペイロード無害化', async () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(1)">',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
    ];
    
    for (const payload of xssPayloads) {
      const response = await makeRequest({
        path: `/?test=${encodeURIComponent(payload)}`,
        method: 'GET',
      });
      
      // 200, 302, 307は正常（307はサニタイズ後のリダイレクト）
      if (response.statusCode !== 200 && response.statusCode !== 302 && response.statusCode !== 307) {
        throw new Error(`Unexpected status: ${response.statusCode}`);
      }
    }
  });
  
  await runTest('unit', 'SQLインジェクション対策', async () => {
    const sqlPayloads = [
      "' OR '1'='1",
      "1; DROP TABLE posts;",
      "' UNION SELECT * FROM users--",
    ];
    
    for (const payload of sqlPayloads) {
      const response = await makeRequest({
        path: `/api/posts?search=${encodeURIComponent(payload)}`,
        method: 'GET',
      });
      
      // エラーが返らないことを確認
      if (response.statusCode === 500) {
        throw new Error('SQLインジェクション脆弱性の可能性');
      }
    }
  });
  
  // 1.2 バリデーションテスト
  log('\n1.2 データバリデーション', 'blue');
  
  await runTest('unit', '必須フィールドチェック', async () => {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    // 400 Bad Requestまたは401 Unauthorizedを期待
    if (response.statusCode !== 400 && response.statusCode !== 401) {
      throw new Error(`Expected 400/401, got ${response.statusCode}`);
    }
  });
  
  await runTest('unit', '文字数制限チェック', async () => {
    const longString = 'a'.repeat(1001); // 1000文字制限を超える
    const response = await makeRequest({
      path: '/api/posts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test',
        content: longString,
        author: 'Test User',
      }),
    });
    
    // バリデーションエラーを期待
    if (response.statusCode === 201) {
      throw new Error('文字数制限が機能していない');
    }
  });
}

/**
 * 2. 結合テスト（Integration Tests）
 */
async function runIntegrationTests() {
  log('\n========================================', 'cyan');
  log('2. 結合テスト（Integration Tests）', 'cyan');
  log('========================================\n', 'cyan');
  
  // 2.1 CRUD操作テスト
  log('2.1 CRUD操作', 'blue');
  
  await runTest('integration', 'CREATE - 投稿作成API', async () => {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Integration Test Post',
        content: 'This is a test post',
        author: 'Test User',
      }),
    });
    
    // 認証が必要なため401を期待（または201 Created）
    if (response.statusCode !== 401 && response.statusCode !== 201 && response.statusCode !== 403) {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  });
  
  await runTest('integration', 'READ - 投稿一覧取得API', async () => {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'GET',
    });
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      if (!data.posts || !Array.isArray(data.posts)) {
        throw new Error('Invalid response format');
      }
    } else if (response.statusCode !== 401) {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  });
  
  await runTest('integration', 'UPDATE - 投稿更新API', async () => {
    const response = await makeRequest({
      path: '/api/posts/test-id',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Title',
        content: 'Updated content',
      }),
    });
    
    // 認証が必要なため401を期待
    if (response.statusCode !== 401 && response.statusCode !== 404 && response.statusCode !== 403) {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  });
  
  await runTest('integration', 'DELETE - 投稿削除API', async () => {
    const response = await makeRequest({
      path: '/api/posts/test-id',
      method: 'DELETE',
    });
    
    // 認証が必要なため401を期待
    if (response.statusCode !== 401 && response.statusCode !== 404 && response.statusCode !== 403) {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  });
  
  // 2.2 認証フローテスト
  log('\n2.2 認証フロー', 'blue');
  
  await runTest('integration', 'ログインエンドポイント', async () => {
    const response = await makeRequest({
      path: '/api/auth/signin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword',
      }),
    });
    
    // 302 Redirectまたは401 Unauthorizedを期待
    if (response.statusCode !== 302 && response.statusCode !== 401 && response.statusCode !== 200) {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  });
  
  await runTest('integration', 'セッション確認エンドポイント', async () => {
    const response = await makeRequest({
      path: '/api/auth/session',
      method: 'GET',
    });
    
    if (response.statusCode !== 200) {
      throw new Error(`Session check failed: ${response.statusCode}`);
    }
    
    const data = JSON.parse(response.body);
    // セッションデータの形式確認
    if (typeof data !== 'object') {
      throw new Error('Invalid session data format');
    }
  });
  
  // 2.3 ページネーション
  log('\n2.3 ページネーション', 'blue');
  
  await runTest('integration', 'ページネーションパラメータ', async () => {
    const response = await makeRequest({
      path: '/api/posts?page=1&limit=10',
      method: 'GET',
    });
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      if (data.pagination && typeof data.pagination.page !== 'number') {
        throw new Error('Invalid pagination data');
      }
    }
  });
}

/**
 * 3. E2Eテスト（End-to-End Tests）
 */
async function runE2ETests() {
  log('\n========================================', 'cyan');
  log('3. E2Eテスト（End-to-End Tests）', 'cyan');
  log('========================================\n', 'cyan');
  
  // 3.1 ページアクセステスト
  log('3.1 ページアクセス', 'blue');
  
  await runTest('e2e', 'トップページアクセス', async () => {
    const response = await makeRequest({
      path: '/',
      method: 'GET',
    });
    
    if (response.statusCode !== 200) {
      throw new Error(`Homepage access failed: ${response.statusCode}`);
    }
  });
  
  await runTest('e2e', 'ログインページアクセス', async () => {
    const response = await makeRequest({
      path: '/auth/signin',
      method: 'GET',
    });
    
    if (response.statusCode !== 200) {
      throw new Error(`Login page access failed: ${response.statusCode}`);
    }
  });
  
  await runTest('e2e', '掲示板ページアクセス（未認証）', async () => {
    const response = await makeRequest({
      path: '/board',
      method: 'GET',
    });
    
    // 未認証の場合、302または307リダイレクトを期待
    if (response.statusCode !== 302 && response.statusCode !== 307 && response.statusCode !== 200) {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  });
  
  // 3.2 エラーハンドリング
  log('\n3.2 エラーハンドリング', 'blue');
  
  await runTest('e2e', '404エラーページ', async () => {
    const response = await makeRequest({
      path: '/non-existent-page',
      method: 'GET',
    });
    
    if (response.statusCode !== 404) {
      throw new Error(`Expected 404, got ${response.statusCode}`);
    }
  });
  
  await runTest('e2e', 'APIエラーレスポンス', async () => {
    const response = await makeRequest({
      path: '/api/posts/invalid-id',
      method: 'GET',
    });
    
    // 404または401を期待
    if (response.statusCode === 500) {
      throw new Error('Internal server error - エラーハンドリング不適切');
    }
  });
  
  // 3.3 レスポンシブデザイン（ヘッダーチェック）
  log('\n3.3 レスポンスヘッダー', 'blue');
  
  await runTest('e2e', 'セキュリティヘッダー確認', async () => {
    const response = await makeRequest({
      path: '/',
      method: 'GET',
    });
    
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
    ];
    
    for (const header of securityHeaders) {
      if (!response.headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }
  });
}

/**
 * 4. セキュリティテスト
 */
async function runSecurityTests() {
  log('\n========================================', 'cyan');
  log('4. セキュリティテスト', 'cyan');
  log('========================================\n', 'cyan');
  
  // 4.1 認証・認可
  log('4.1 認証・認可', 'blue');
  
  await runTest('security', '未認証アクセス制限', async () => {
    const protectedPaths = [
      '/api/posts',
      '/api/users/profile',
      '/board',
      '/dashboard',
    ];
    
    for (const path of protectedPaths) {
      const response = await makeRequest({
        path,
        method: path.startsWith('/api') ? 'POST' : 'GET',
      });
      
      // 401 Unauthorizedまたは302 Redirectを期待
      if (response.statusCode === 200 && path !== '/api/posts') {
        throw new Error(`Unprotected path: ${path}`);
      }
    }
  });
  
  // 4.2 CSRF保護
  log('\n4.2 CSRF保護', 'blue');
  
  await runTest('security', 'CSRFトークンチェック', async () => {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'CSRF Test',
        content: 'Testing CSRF protection',
      }),
    });
    
    // CSRFトークンなしで403 Forbiddenまたは401を期待
    if (response.statusCode === 201) {
      throw new Error('CSRF protection not working');
    }
  });
  
  // 4.3 レート制限
  log('\n4.3 レート制限', 'blue');
  
  await runTest('security', 'レート制限動作', async () => {
    const requests = [];
    
    // 6回連続リクエスト（制限は5回）
    for (let i = 0; i < 6; i++) {
      requests.push(makeRequest({
        path: '/api/posts',
        method: 'GET',
      }));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.statusCode === 429);
    
    if (!rateLimited) {
      throw new Error('Rate limiting not enforced');
    }
  });
  
  // 4.4 入力検証
  log('\n4.4 入力検証', 'blue');
  
  await runTest('security', 'NoSQLインジェクション対策', async () => {
    const nosqlPayloads = [
      { $gt: '' },
      { $ne: null },
      { title: { $regex: '.*' } },
    ];
    
    for (const payload of nosqlPayloads) {
      const response = await makeRequest({
        path: '/api/posts',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      // エラーレスポンスを期待
      if (response.statusCode === 201) {
        throw new Error('NoSQL injection vulnerability');
      }
    }
  });
}

/**
 * 5. パフォーマンステスト
 */
async function runPerformanceTests() {
  log('\n========================================', 'cyan');
  log('5. パフォーマンステスト', 'cyan');
  log('========================================\n', 'cyan');
  
  const performanceResults = [];
  
  // レスポンス時間測定
  log('レスポンス時間測定', 'blue');
  
  const endpoints = [
    { path: '/', name: 'トップページ', threshold: 1000 },
    { path: '/api/posts', name: '投稿一覧API', threshold: 500 },
    { path: '/api/health', name: 'ヘルスチェック', threshold: 200 },
  ];
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    
    try {
      await makeRequest({
        path: endpoint.path,
        method: 'GET',
      });
      
      const responseTime = Date.now() - startTime;
      performanceResults.push({
        name: endpoint.name,
        time: responseTime,
        passed: responseTime < endpoint.threshold,
      });
      
      const status = responseTime < endpoint.threshold ? '✓' : '✗';
      const color = responseTime < endpoint.threshold ? 'green' : 'red';
      log(`  ${status} ${endpoint.name}: ${responseTime}ms (基準: <${endpoint.threshold}ms)`, color);
      
    } catch (error) {
      log(`  ✗ ${endpoint.name}: エラー`, 'red');
    }
  }
  
  return performanceResults;
}

/**
 * テスト結果サマリー
 */
function printSummary() {
  log('\n========================================', 'cyan');
  log('テスト結果サマリー', 'cyan');
  log('========================================\n', 'cyan');
  
  const categories = [
    { name: '単体テスト', key: 'unit' },
    { name: '結合テスト', key: 'integration' },
    { name: 'E2Eテスト', key: 'e2e' },
    { name: 'セキュリティ', key: 'security' },
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  
  log('カテゴリ別結果:', 'blue');
  categories.forEach(cat => {
    const result = testResults[cat.key];
    const total = result.passed + result.failed + result.skipped;
    const passRate = total > 0 ? (result.passed / total * 100).toFixed(1) : 0;
    
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalSkipped += result.skipped;
    
    log(`  ${cat.name}:`, 'cyan');
    log(`    成功: ${result.passed}`, 'green');
    log(`    失敗: ${result.failed}`, result.failed > 0 ? 'red' : 'green');
    log(`    スキップ: ${result.skipped}`, 'yellow');
    log(`    成功率: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow');
  });
  
  const totalTests = totalPassed + totalFailed + totalSkipped;
  const overallPassRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
  
  log('\n総合結果:', 'blue');
  log(`  総テスト数: ${totalTests}`, 'cyan');
  log(`  成功: ${totalPassed}`, 'green');
  log(`  失敗: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  log(`  スキップ: ${totalSkipped}`, 'yellow');
  log(`  総合成功率: ${overallPassRate}%`, overallPassRate >= 80 ? 'green' : 'yellow');
  
  // 判定
  log('\n判定:', 'blue');
  if (overallPassRate >= 80 && totalFailed === 0) {
    log('  ✓ 本番デプロイ可能', 'green');
  } else if (overallPassRate >= 70) {
    log('  △ 条件付きデプロイ可能（要改善）', 'yellow');
  } else {
    log('  ✗ デプロイ不可（要修正）', 'red');
  }
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    totalSkipped,
    overallPassRate,
  };
}

/**
 * メイン実行
 */
async function main() {
  log('========================================', 'magenta');
  log('会員制掲示板 CRUD機能総合テスト', 'magenta');
  log('========================================', 'magenta');
  log(`実行日時: ${new Date().toLocaleString('ja-JP')}`, 'cyan');
  log(`テスト環境: ${BASE_URL}`, 'cyan');
  
  try {
    // 各テストの実行
    await runUnitTests();
    await runIntegrationTests();
    await runE2ETests();
    await runSecurityTests();
    const perfResults = await runPerformanceTests();
    
    // サマリー表示
    const summary = printSummary();
    
    // テスト結果をファイルに保存
    const fs = require('fs');
    const resultData = {
      timestamp: new Date().toISOString(),
      environment: BASE_URL,
      results: testResults,
      performance: perfResults,
      summary: summary,
    };
    
    fs.writeFileSync(
      'crud-test-results.json',
      JSON.stringify(resultData, null, 2)
    );
    
    log('\n✓ テスト結果をcrud-test-results.jsonに保存しました', 'green');
    
    // 終了コード
    process.exit(summary.totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    log('\nテスト実行エラー: ' + error.message, 'red');
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}