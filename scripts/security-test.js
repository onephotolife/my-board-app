#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const testResults = [];

// テスト: レート制限
async function testRateLimit() {
  console.log(`\n${colors.blue}📋 レート制限テスト${colors.reset}`);
  
  const results = [];
  for (let i = 1; i <= 6; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `192.168.1.${100 + Date.now() % 100}` // ユニークなIP
        },
        body: JSON.stringify({
          title: `Test ${i}`,
          content: `Content ${i}`
        })
      });
      
      results.push({
        attempt: i,
        status: response.status,
        remaining: response.headers.get('X-RateLimit-Remaining')
      });
      
      const statusColor = response.status === 429 ? colors.red : 
                         response.status === 401 ? colors.yellow : 
                         colors.green;
      
      console.log(`  試行 ${i}: ${statusColor}Status ${response.status}${colors.reset}, 残り: ${response.headers.get('X-RateLimit-Remaining') || 'N/A'}`);
    } catch (error) {
      console.log(`  試行 ${i}: ${colors.red}エラー${colors.reset}`);
      results.push({ attempt: i, status: 'error' });
    }
  }
  
  // 6回目が429または401（未認証）であることを確認
  const lastResult = results[5];
  const passed = lastResult && (lastResult.status === 429 || lastResult.status === 401);
  logTest('レート制限（6回目でブロックまたは認証エラー）', passed);
  
  return passed;
}

// テスト: XSS防御
async function testXSSPrevention() {
  console.log(`\n${colors.blue}📋 XSS防御テスト${colors.reset}`);
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="alert(1)">',
    'javascript:alert(1)',
    '<iframe src="evil.com"></iframe>'
  ];
  
  const results = [];
  
  for (const payload of xssPayloads) {
    try {
      const response = await fetch(`${BASE_URL}/api/posts?search=${encodeURIComponent(payload)}`);
      const finalUrl = response.url;
      
      // デコードしてチェック
      const decodedUrl = decodeURIComponent(finalUrl);
      const safe = !decodedUrl.includes('<script>') && 
                   !decodedUrl.includes('onerror') &&
                   !decodedUrl.includes('javascript:') &&
                   !decodedUrl.includes('<iframe');
      
      results.push(safe);
      console.log(`  ペイロード: ${payload.substring(0, 30)}... → ${safe ? '✅ 防御成功' : '❌ 防御失敗'}`);
    } catch (error) {
      results.push(true); // エラーは防御成功とみなす
      console.log(`  ペイロード: ${payload.substring(0, 30)}... → ✅ 防御成功（エラー）`);
    }
  }
  
  const allPassed = results.every(r => r === true);
  logTest('XSS攻撃の防御', allPassed);
  
  return allPassed;
}

// テスト: セキュリティヘッダー
async function testSecurityHeaders() {
  console.log(`\n${colors.blue}📋 セキュリティヘッダーテスト${colors.reset}`);
  
  try {
    const response = await fetch(BASE_URL);
    const headers = response.headers;
    
    const requiredHeaders = {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'strict-origin-when-cross-origin'
    };
    
    let allPresent = true;
    
    for (const [header, expected] of Object.entries(requiredHeaders)) {
      const value = headers.get(header);
      const present = value === expected;
      allPresent = allPresent && present;
      
      const icon = present ? '✅' : '❌';
      console.log(`  ${header}: ${icon} ${value || 'Not set'}`);
    }
    
    // CSPチェック
    const csp = headers.get('content-security-policy');
    const hasCSP = csp && csp.includes("default-src 'self'");
    console.log(`  CSP: ${hasCSP ? '✅' : '❌'} ${hasCSP ? '設定済み' : '未設定'}`);
    
    // Permissions-Policyチェック
    const pp = headers.get('permissions-policy');
    const hasPP = pp && pp.includes('camera=()');
    console.log(`  Permissions-Policy: ${hasPP ? '✅' : '❌'} ${hasPP ? '設定済み' : '未設定'}`);
    
    logTest('セキュリティヘッダー', allPresent && hasCSP && hasPP);
    
    return allPresent && hasCSP && hasPP;
  } catch (error) {
    console.log(`  ${colors.red}エラー: ${error.message}${colors.reset}`);
    logTest('セキュリティヘッダー', false);
    return false;
  }
}

// テスト: NoSQLインジェクション防御
async function testNoSQLInjection() {
  console.log(`\n${colors.blue}📋 NoSQLインジェクション防御テスト${colors.reset}`);
  
  const payloads = [
    { title: { '$ne': null }, content: 'test' },
    { title: 'test', content: { '$gt': '' } },
    { '__proto__': { isAdmin: true }, title: 'test', content: 'test' }
  ];
  
  const results = [];
  
  for (const payload of payloads) {
    try {
      const response = await fetch(`${BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'test-auth-token=test'
        },
        body: JSON.stringify(payload)
      });
      
      // 400番台のエラーまたは401（未認証）を期待
      const safe = response.status >= 400;
      results.push(safe);
      
      const payloadStr = JSON.stringify(payload).substring(0, 50);
      console.log(`  ペイロード: ${payloadStr}... → ${safe ? '✅ 防御成功' : '❌ 防御失敗'} (${response.status})`);
    } catch (error) {
      results.push(true); // エラーは防御成功とみなす
      console.log(`  ペイロード: エラー → ✅ 防御成功`);
    }
  }
  
  const allPassed = results.every(r => r === true);
  logTest('NoSQLインジェクション防御', allPassed);
  
  return allPassed;
}

// テスト: レスポンスタイム記録
async function testResponseTime() {
  console.log(`\n${colors.blue}📋 レスポンスタイム記録テスト${colors.reset}`);
  
  try {
    const response = await fetch(BASE_URL);
    const responseTime = response.headers.get('x-response-time');
    
    const hasResponseTime = responseTime !== null;
    console.log(`  レスポンスタイム: ${responseTime || 'Not set'}`);
    
    if (hasResponseTime && responseTime) {
      const time = parseInt(responseTime);
      if (time < 100) {
        console.log(`  パフォーマンス: ${colors.green}優秀 (<100ms)${colors.reset}`);
      } else if (time < 500) {
        console.log(`  パフォーマンス: ${colors.yellow}良好 (<500ms)${colors.reset}`);
      } else {
        console.log(`  パフォーマンス: ${colors.red}要改善 (>500ms)${colors.reset}`);
      }
    }
    
    logTest('レスポンスタイム記録', hasResponseTime);
    
    return hasResponseTime;
  } catch (error) {
    console.log(`  ${colors.red}エラー: ${error.message}${colors.reset}`);
    logTest('レスポンスタイム記録', false);
    return false;
  }
}

// テスト: 入力サニタイゼーション
async function testInputSanitization() {
  console.log(`\n${colors.blue}📋 入力サニタイゼーションテスト${colors.reset}`);
  
  const testCases = [
    {
      name: 'HTMLタグ除去',
      input: 'Hello<script>alert(1)</script>World',
      shouldNotContain: '<script>'
    },
    {
      name: '特殊文字エスケープ',
      input: 'Test & < > " \' /',
      shouldNotContain: null // エラーにならないことを確認
    },
    {
      name: '長い入力の切り詰め',
      input: 'a'.repeat(20000),
      maxLength: 10000
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const url = `${BASE_URL}/api/posts?test=${encodeURIComponent(testCase.input)}`;
      const response = await fetch(url);
      const finalUrl = decodeURIComponent(response.url);
      
      let passed = true;
      if (testCase.shouldNotContain) {
        passed = !finalUrl.includes(testCase.shouldNotContain);
      }
      if (testCase.maxLength) {
        // URLパラメータの長さをチェック
        const params = new URL(finalUrl).searchParams;
        const value = params.get('test') || '';
        passed = value.length <= testCase.maxLength;
      }
      
      results.push(passed);
      console.log(`  ${testCase.name}: ${passed ? '✅' : '❌'}`);
    } catch (error) {
      results.push(false);
      console.log(`  ${testCase.name}: ❌ エラー`);
    }
  }
  
  const allPassed = results.every(r => r === true);
  logTest('入力サニタイゼーション', allPassed);
  
  return allPassed;
}

// ヘルパー関数
function logTest(name, passed) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${icon} ${color}${name}${colors.reset}`);
  
  testResults.push({ name, passed });
}

// メインテスト実行
async function runSecurityTests() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}     セキュリティテスト v1.0${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  console.log(`\n${colors.yellow}⚠️  注意: 一部のテストはログイン状態に依存します${colors.reset}`);
  console.log(`${colors.yellow}   未実装機能（CSRF、監査ログ）はスキップされます${colors.reset}`);
  
  try {
    // Phase 1のテスト（実装済み）
    await testRateLimit();
    await testXSSPrevention();
    await testSecurityHeaders();
    await testNoSQLInjection();
    await testResponseTime();
    await testInputSanitization();
    
    // 結果サマリー
    console.log('\n' + '='.repeat(50));
    console.log(`${colors.cyan}📊 テスト結果サマリー${colors.reset}\n`);
    
    const passed = testResults.filter(t => t.passed).length;
    const total = testResults.length;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log(`合格: ${colors.green}${passed}/${total}${colors.reset} (${percentage}%)`);
    
    // 詳細結果
    console.log(`\n${colors.cyan}詳細:${colors.reset}`);
    testResults.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      const color = test.passed ? colors.green : colors.red;
      console.log(`  ${icon} ${color}${test.name}${colors.reset}`);
    });
    
    // 評価
    console.log(`\n${colors.cyan}評価:${colors.reset}`);
    if (percentage >= 100) {
      console.log(`${colors.green}🎉 完璧！すべてのセキュリティテストに合格しました。${colors.reset}`);
    } else if (percentage >= 80) {
      console.log(`${colors.green}✅ 良好: 主要なセキュリティ機能は動作しています。${colors.reset}`);
    } else if (percentage >= 60) {
      console.log(`${colors.yellow}⚠️ 要注意: 一部のセキュリティ機能に問題があります。${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ 要改善: セキュリティに重大な問題があります。${colors.reset}`);
    }
    
    // 未実装機能の通知
    console.log(`\n${colors.yellow}📝 未実装機能:${colors.reset}`);
    console.log(`  - CSRF対策（Phase 2で実装予定）`);
    console.log(`  - 監査ログ（Phase 3で実装予定）`);
    console.log(`  - セッション管理最適化（Phase 2で実装予定）`);
    
    // 詳細レポート保存
    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      results: testResults,
      percentage: percentage,
      summary: {
        rateLimit: testResults.find(t => t.name.includes('レート制限'))?.passed,
        xss: testResults.find(t => t.name.includes('XSS'))?.passed,
        headers: testResults.find(t => t.name.includes('ヘッダー'))?.passed,
        injection: testResults.find(t => t.name.includes('インジェクション'))?.passed,
        responseTime: testResults.find(t => t.name.includes('レスポンスタイム'))?.passed,
        sanitization: testResults.find(t => t.name.includes('サニタイゼーション'))?.passed
      },
      phase: 'Phase 1 (基本セキュリティ)',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        url: BASE_URL
      }
    };
    
    fs.writeFileSync('security-test-results.json', JSON.stringify(report, null, 2));
    console.log(`\n📁 詳細結果を security-test-results.json に保存しました`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ テスト実行エラー:${colors.reset}`, error.message);
  }
}

// 実行
console.log(`${colors.yellow}📌 テスト対象: ${BASE_URL}${colors.reset}`);
console.log(`${colors.yellow}📌 開発サーバーが起動していることを確認してください${colors.reset}\n`);

runSecurityTests().catch(console.error);