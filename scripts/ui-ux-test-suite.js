#!/usr/bin/env node

/**
 * 会員制掲示板 UI/UX総合テストスイート
 * ユーザビリティ、アクセシビリティ、パフォーマンステストを実行
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const isHTTPS = BASE_URL.startsWith('https');
const client = isHTTPS ? https : http;

// カラー出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// テスト結果
const testResults = {
  unit: { passed: 0, failed: 0, warnings: 0 },
  integration: { passed: 0, failed: 0, warnings: 0 },
  e2e: { passed: 0, failed: 0, warnings: 0 },
  accessibility: { passed: 0, failed: 0, warnings: 0 },
  performance: { passed: 0, failed: 0, warnings: 0 },
  usability: { passed: 0, failed: 0, warnings: 0 },
};

// パフォーマンスメトリクス
const performanceMetrics = {
  fcp: [],
  lcp: [],
  tti: [],
  cls: [],
  fid: [],
};

/**
 * HTTPリクエスト
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
        'User-Agent': options.userAgent || 'UI-UX-Test-Suite',
        ...options.headers,
      },
    };

    const startTime = Date.now();
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: endTime - startTime,
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.setTimeout(options.timeout || 5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * テストケース実行
 */
async function runTest(category, name, testFn, severity = 'error') {
  try {
    const result = await testFn();
    if (result === 'warning') {
      testResults[category].warnings++;
      log(`  ⚠ ${name}`, 'yellow');
      return 'warning';
    }
    testResults[category].passed++;
    log(`  ✓ ${name}`, 'green');
    return true;
  } catch (error) {
    if (severity === 'warning') {
      testResults[category].warnings++;
      log(`  ⚠ ${name}: ${error.message}`, 'yellow');
      return 'warning';
    }
    testResults[category].failed++;
    log(`  ✗ ${name}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 1. 単体テスト - UIコンポーネント
 */
async function runUnitTests() {
  log('\n========================================', 'cyan');
  log('1. UIコンポーネント単体テスト', 'cyan');
  log('========================================\n', 'cyan');
  
  // 1.1 レスポンスヘッダー検証
  log('1.1 レスポンスヘッダー', 'blue');
  
  await runTest('unit', 'Content-Type設定', async () => {
    const response = await makeRequest({ path: '/' });
    if (!response.headers['content-type']?.includes('text/html')) {
      throw new Error('Incorrect Content-Type');
    }
  });
  
  await runTest('unit', 'キャッシュヘッダー', async () => {
    const response = await makeRequest({ path: '/' });
    const cacheControl = response.headers['cache-control'];
    if (!cacheControl) {
      return 'warning';
    }
  }, 'warning');
  
  // 1.2 HTMLメタタグ検証
  log('\n1.2 HTMLメタタグ', 'blue');
  
  await runTest('unit', 'Viewport設定', async () => {
    const response = await makeRequest({ path: '/' });
    if (!response.body.includes('viewport')) {
      throw new Error('Missing viewport meta tag');
    }
  });
  
  await runTest('unit', 'Description設定', async () => {
    const response = await makeRequest({ path: '/' });
    if (!response.body.includes('name="description"')) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('unit', 'Charset設定', async () => {
    const response = await makeRequest({ path: '/' });
    if (!response.body.includes('utf-8')) {
      throw new Error('Missing UTF-8 charset');
    }
  });
  
  // 1.3 基本要素の存在確認
  log('\n1.3 基本UI要素', 'blue');
  
  await runTest('unit', 'ナビゲーション要素', async () => {
    const response = await makeRequest({ path: '/' });
    if (!response.body.includes('nav') && !response.body.includes('navigation')) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('unit', 'メインコンテンツ領域', async () => {
    const response = await makeRequest({ path: '/' });
    if (!response.body.includes('main') && !response.body.includes('content')) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('unit', 'フッター要素', async () => {
    const response = await makeRequest({ path: '/' });
    if (!response.body.includes('footer')) {
      return 'warning';
    }
  }, 'warning');
}

/**
 * 2. 結合テスト - ユーザーフロー
 */
async function runIntegrationTests() {
  log('\n========================================', 'cyan');
  log('2. ユーザーフロー結合テスト', 'cyan');
  log('========================================\n', 'cyan');
  
  // 2.1 認証フロー
  log('2.1 認証フロー', 'blue');
  
  await runTest('integration', 'サインインページ表示', async () => {
    const response = await makeRequest({ path: '/auth/signin' });
    if (response.statusCode !== 200) {
      throw new Error(`Status ${response.statusCode}`);
    }
    if (!response.body.includes('sign') || !response.body.includes('login')) {
      return 'warning';
    }
  });
  
  await runTest('integration', 'サインアップページ表示', async () => {
    const response = await makeRequest({ path: '/auth/signup' });
    if (response.statusCode !== 200) {
      throw new Error(`Status ${response.statusCode}`);
    }
  });
  
  await runTest('integration', '未認証時のリダイレクト', async () => {
    const response = await makeRequest({ path: '/board' });
    if (response.statusCode !== 302 && response.statusCode !== 307) {
      throw new Error('No redirect for protected route');
    }
  });
  
  // 2.2 ナビゲーション
  log('\n2.2 ナビゲーション', 'blue');
  
  await runTest('integration', 'ホームページアクセス', async () => {
    const response = await makeRequest({ path: '/' });
    if (response.statusCode !== 200) {
      throw new Error(`Homepage error: ${response.statusCode}`);
    }
    if (response.responseTime > 2000) {
      return 'warning';
    }
  });
  
  await runTest('integration', '404エラーページ', async () => {
    const response = await makeRequest({ path: '/non-existent-page-12345' });
    if (response.statusCode !== 404) {
      throw new Error('404 page not working');
    }
  });
  
  // 2.3 API応答性
  log('\n2.3 API応答性', 'blue');
  
  await runTest('integration', 'ヘルスチェックAPI', async () => {
    const response = await makeRequest({ path: '/api/health' });
    if (response.responseTime > 200) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('integration', '投稿一覧API応答時間', async () => {
    const response = await makeRequest({ path: '/api/posts' });
    if (response.responseTime > 1000) {
      return 'warning';
    }
  }, 'warning');
}

/**
 * 3. E2Eテスト - 完全なユーザージャーニー
 */
async function runE2ETests() {
  log('\n========================================', 'cyan');
  log('3. E2Eユーザージャーニーテスト', 'cyan');
  log('========================================\n', 'cyan');
  
  // 3.1 レスポンシブデザイン
  log('3.1 レスポンシブデザイン', 'blue');
  
  const devices = [
    { name: 'Mobile', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
    { name: 'Tablet', userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' },
    { name: 'Desktop', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  ];
  
  for (const device of devices) {
    await runTest('e2e', `${device.name}表示`, async () => {
      const response = await makeRequest({
        path: '/',
        userAgent: device.userAgent,
      });
      if (response.statusCode !== 200) {
        throw new Error(`Failed on ${device.name}`);
      }
    });
  }
  
  // 3.2 エラーハンドリング
  log('\n3.2 エラーハンドリング', 'blue');
  
  await runTest('e2e', '不正なリクエスト処理', async () => {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid": "json"',
    });
    if (response.statusCode === 500) {
      throw new Error('Server error on invalid JSON');
    }
  });
  
  await runTest('e2e', 'タイムアウト処理', async () => {
    try {
      await makeRequest({
        path: '/',
        timeout: 1, // 1msでタイムアウト
      });
      throw new Error('Timeout not working');
    } catch (error) {
      if (!error.message.includes('timeout')) {
        throw error;
      }
    }
  });
  
  // 3.3 国際化準備
  log('\n3.3 国際化対応', 'blue');
  
  await runTest('e2e', '言語設定ヘッダー', async () => {
    const response = await makeRequest({
      path: '/',
      headers: { 'Accept-Language': 'ja-JP' },
    });
    if (!response.body.includes('lang=')) {
      return 'warning';
    }
  }, 'warning');
}

/**
 * 4. アクセシビリティテスト
 */
async function runAccessibilityTests() {
  log('\n========================================', 'cyan');
  log('4. アクセシビリティテスト', 'cyan');
  log('========================================\n', 'cyan');
  
  // 4.1 セマンティックHTML
  log('4.1 セマンティックHTML', 'blue');
  
  await runTest('accessibility', '見出し階層', async () => {
    const response = await makeRequest({ path: '/' });
    const h1Count = (response.body.match(/<h1/g) || []).length;
    if (h1Count !== 1) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('accessibility', 'ランドマーク要素', async () => {
    const response = await makeRequest({ path: '/' });
    const hasLandmarks = response.body.includes('role="main"') || 
                         response.body.includes('<main');
    if (!hasLandmarks) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('accessibility', 'Alt属性', async () => {
    const response = await makeRequest({ path: '/' });
    const imgCount = (response.body.match(/<img/g) || []).length;
    const altCount = (response.body.match(/alt="/g) || []).length;
    if (imgCount > 0 && altCount < imgCount) {
      return 'warning';
    }
  }, 'warning');
  
  // 4.2 フォームアクセシビリティ
  log('\n4.2 フォームアクセシビリティ', 'blue');
  
  await runTest('accessibility', 'ラベル要素', async () => {
    const response = await makeRequest({ path: '/auth/signin' });
    const inputCount = (response.body.match(/<input/g) || []).length;
    const labelCount = (response.body.match(/<label/g) || []).length;
    if (inputCount > 0 && labelCount === 0) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('accessibility', 'ARIAラベル', async () => {
    const response = await makeRequest({ path: '/' });
    const hasAria = response.body.includes('aria-label') || 
                    response.body.includes('aria-describedby');
    if (!hasAria) {
      return 'warning';
    }
  }, 'warning');
  
  // 4.3 キーボードナビゲーション
  log('\n4.3 キーボード操作', 'blue');
  
  await runTest('accessibility', 'Tabindex設定', async () => {
    const response = await makeRequest({ path: '/' });
    const hasNegativeTabindex = response.body.includes('tabindex="-1"');
    if (hasNegativeTabindex) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('accessibility', 'スキップリンク', async () => {
    const response = await makeRequest({ path: '/' });
    const hasSkipLink = response.body.includes('skip') && 
                        response.body.includes('main');
    if (!hasSkipLink) {
      return 'warning';
    }
  }, 'warning');
}

/**
 * 5. パフォーマンステスト
 */
async function runPerformanceTests() {
  log('\n========================================', 'cyan');
  log('5. パフォーマンステスト', 'cyan');
  log('========================================\n', 'cyan');
  
  // 5.1 ページロード速度
  log('5.1 ページロード速度', 'blue');
  
  const pages = [
    { path: '/', name: 'ホームページ', threshold: 1000 },
    { path: '/auth/signin', name: 'サインインページ', threshold: 800 },
    { path: '/api/health', name: 'ヘルスチェック', threshold: 100 },
  ];
  
  for (const page of pages) {
    await runTest('performance', `${page.name} (<${page.threshold}ms)`, async () => {
      const response = await makeRequest({ path: page.path });
      performanceMetrics.fcp.push(response.responseTime);
      if (response.responseTime > page.threshold) {
        throw new Error(`${response.responseTime}ms > ${page.threshold}ms`);
      }
    });
  }
  
  // 5.2 リソース最適化
  log('\n5.2 リソース最適化', 'blue');
  
  await runTest('performance', 'Gzip圧縮', async () => {
    const response = await makeRequest({
      path: '/',
      headers: { 'Accept-Encoding': 'gzip, deflate' },
    });
    const encoding = response.headers['content-encoding'];
    if (!encoding || !encoding.includes('gzip')) {
      return 'warning';
    }
  }, 'warning');
  
  await runTest('performance', 'Keep-Alive接続', async () => {
    const response = await makeRequest({ path: '/' });
    const connection = response.headers['connection'];
    if (!connection || !connection.includes('keep-alive')) {
      return 'warning';
    }
  }, 'warning');
  
  // 5.3 並行リクエスト処理
  log('\n5.3 並行処理能力', 'blue');
  
  await runTest('performance', '同時リクエスト処理', async () => {
    const requests = Array(5).fill(null).map(() => 
      makeRequest({ path: '/api/health' })
    );
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    const allSuccess = responses.every(r => r.statusCode === 200);
    if (!allSuccess) {
      throw new Error('Failed under concurrent load');
    }
    
    if (totalTime > 1000) {
      return 'warning';
    }
  });
}

/**
 * 6. ユーザビリティテスト
 */
async function runUsabilityTests() {
  log('\n========================================', 'cyan');
  log('6. ユーザビリティテスト', 'cyan');
  log('========================================\n', 'cyan');
  
  // 6.1 エラーメッセージ
  log('6.1 エラーメッセージ', 'blue');
  
  await runTest('usability', '404エラーメッセージ', async () => {
    const response = await makeRequest({ path: '/non-existent' });
    const hasUserFriendlyMessage = 
      response.body.includes('見つかりません') ||
      response.body.includes('not found') ||
      response.body.includes('404');
    if (!hasUserFriendlyMessage) {
      throw new Error('No user-friendly 404 message');
    }
  });
  
  await runTest('usability', 'API エラーレスポンス', async () => {
    const response = await makeRequest({
      path: '/api/posts/invalid-id',
      method: 'GET',
    });
    if (response.statusCode === 500) {
      throw new Error('Server error instead of proper error response');
    }
  });
  
  // 6.2 フィードバック
  log('\n6.2 ユーザーフィードバック', 'blue');
  
  await runTest('usability', 'フォーム送信フィードバック', async () => {
    const response = await makeRequest({
      path: '/api/posts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    if (response.statusCode === 400 || response.statusCode === 401) {
      const body = JSON.parse(response.body);
      if (!body.error && !body.message) {
        return 'warning';
      }
    }
  }, 'warning');
  
  // 6.3 一貫性
  log('\n6.3 UI一貫性', 'blue');
  
  await runTest('usability', 'ページタイトル設定', async () => {
    const response = await makeRequest({ path: '/' });
    if (!response.body.includes('<title>')) {
      throw new Error('Missing page title');
    }
  });
  
  await runTest('usability', 'Favicon設定', async () => {
    const response = await makeRequest({ path: '/' });
    const hasFavicon = 
      response.body.includes('favicon') ||
      response.body.includes('icon');
    if (!hasFavicon) {
      return 'warning';
    }
  }, 'warning');
}

/**
 * パフォーマンススコア計算
 */
function calculatePerformanceScore() {
  const scores = {
    fcp: 0,
    lcp: 0,
    tti: 0,
    overall: 0,
  };
  
  // FCP スコア計算
  if (performanceMetrics.fcp.length > 0) {
    const avgFcp = performanceMetrics.fcp.reduce((a, b) => a + b, 0) / performanceMetrics.fcp.length;
    if (avgFcp <= 1000) scores.fcp = 100;
    else if (avgFcp <= 1800) scores.fcp = 80;
    else if (avgFcp <= 3000) scores.fcp = 60;
    else scores.fcp = 40;
  }
  
  scores.overall = scores.fcp;
  
  return scores;
}

/**
 * テスト結果サマリー
 */
function printSummary() {
  log('\n========================================', 'cyan');
  log('テスト結果サマリー', 'cyan');
  log('========================================\n', 'cyan');
  
  const categories = [
    { name: 'UIコンポーネント', key: 'unit' },
    { name: 'ユーザーフロー', key: 'integration' },
    { name: 'E2E', key: 'e2e' },
    { name: 'アクセシビリティ', key: 'accessibility' },
    { name: 'パフォーマンス', key: 'performance' },
    { name: 'ユーザビリティ', key: 'usability' },
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;
  
  log('カテゴリ別結果:', 'blue');
  categories.forEach(cat => {
    const result = testResults[cat.key];
    const total = result.passed + result.failed + result.warnings;
    const passRate = total > 0 ? (result.passed / total * 100).toFixed(1) : 0;
    
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalWarnings += result.warnings;
    
    log(`\n  ${cat.name}:`, 'cyan');
    log(`    成功: ${result.passed}`, 'green');
    log(`    失敗: ${result.failed}`, result.failed > 0 ? 'red' : 'gray');
    log(`    警告: ${result.warnings}`, result.warnings > 0 ? 'yellow' : 'gray');
    log(`    合格率: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow');
  });
  
  // パフォーマンススコア
  const perfScore = calculatePerformanceScore();
  log('\n\nパフォーマンススコア:', 'blue');
  log(`  FCP: ${perfScore.fcp}/100`, perfScore.fcp >= 80 ? 'green' : 'yellow');
  log(`  総合: ${perfScore.overall}/100`, perfScore.overall >= 80 ? 'green' : 'yellow');
  
  // 総合結果
  const totalTests = totalPassed + totalFailed + totalWarnings;
  const overallPassRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
  
  log('\n\n総合結果:', 'blue');
  log(`  総テスト数: ${totalTests}`, 'cyan');
  log(`  成功: ${totalPassed}`, 'green');
  log(`  失敗: ${totalFailed}`, totalFailed > 0 ? 'red' : 'gray');
  log(`  警告: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'gray');
  log(`  成功率: ${overallPassRate}%`, overallPassRate >= 80 ? 'green' : 'yellow');
  
  // UI/UX品質判定
  log('\n\nUI/UX品質判定:', 'blue');
  
  const uxScore = calculateUXScore(totalPassed, totalFailed, totalWarnings, perfScore.overall);
  
  if (uxScore >= 90) {
    log('  ⭐⭐⭐⭐⭐ 優秀 - 本番デプロイ推奨', 'green');
  } else if (uxScore >= 80) {
    log('  ⭐⭐⭐⭐ 良好 - 軽微な改善後デプロイ可', 'green');
  } else if (uxScore >= 70) {
    log('  ⭐⭐⭐ 標準 - 改善推奨', 'yellow');
  } else if (uxScore >= 60) {
    log('  ⭐⭐ 要改善 - 重要な問題の修正必要', 'yellow');
  } else {
    log('  ⭐ 不合格 - 大幅な改善が必要', 'red');
  }
  
  log(`  UXスコア: ${uxScore}/100`, uxScore >= 80 ? 'green' : 'yellow');
  
  // 改善提案
  if (totalWarnings > 0 || totalFailed > 0) {
    log('\n\n改善提案:', 'blue');
    
    if (testResults.accessibility.warnings > 0) {
      log('  • アクセシビリティ: ARIA属性の追加、セマンティックHTMLの改善', 'yellow');
    }
    if (testResults.performance.failed > 0) {
      log('  • パフォーマンス: リソースの最適化、キャッシュ戦略の見直し', 'yellow');
    }
    if (testResults.usability.warnings > 0) {
      log('  • ユーザビリティ: エラーメッセージの改善、フィードバックの強化', 'yellow');
    }
  }
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    totalWarnings,
    overallPassRate,
    uxScore,
    performanceScore: perfScore.overall,
  };
}

/**
 * UXスコア計算
 */
function calculateUXScore(passed, failed, warnings, perfScore) {
  const successRate = (passed / (passed + failed + warnings)) * 100;
  const warningPenalty = warnings * 2;
  const failurePenalty = failed * 5;
  
  let score = successRate - warningPenalty - failurePenalty;
  score = (score + perfScore) / 2;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * メイン実行
 */
async function main() {
  log('========================================', 'magenta');
  log('会員制掲示板 UI/UX総合テスト', 'magenta');
  log('========================================', 'magenta');
  log(`実行日時: ${new Date().toLocaleString('ja-JP')}`, 'cyan');
  log(`テスト環境: ${BASE_URL}`, 'cyan');
  
  try {
    // 各テストの実行
    await runUnitTests();
    await runIntegrationTests();
    await runE2ETests();
    await runAccessibilityTests();
    await runPerformanceTests();
    await runUsabilityTests();
    
    // サマリー表示
    const summary = printSummary();
    
    // 結果をファイルに保存
    const resultData = {
      timestamp: new Date().toISOString(),
      environment: BASE_URL,
      results: testResults,
      performanceMetrics,
      summary,
    };
    
    await fs.writeFile(
      path.join(process.cwd(), 'ui-ux-test-results.json'),
      JSON.stringify(resultData, null, 2)
    );
    
    log('\n✓ テスト結果をui-ux-test-results.jsonに保存しました', 'green');
    
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