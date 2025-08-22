#!/usr/bin/env node

/**
 * 最終統合テスト - 25人天才エンジニア会議
 * サーバーコンポーネント保護実装完了後の全機能検証
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

async function runTestSuite(name, command) {
  log(`\n🧪 ${name}`, 'cyan');
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command);
    const duration = Date.now() - startTime;
    
    // 成功率を抽出
    const successMatch = stdout.match(/成功率: (\d+\.\d+)%/);
    const successRate = successMatch ? successMatch[1] : '0.0';
    
    if (successRate === '100.0') {
      log(`  ✅ PASS (${duration}ms) - 成功率: ${successRate}%`, 'green');
      results.passed++;
      results.tests.push({ name, status: 'passed', duration, successRate });
    } else {
      log(`  ❌ FAIL (${duration}ms) - 成功率: ${successRate}%`, 'red');
      results.failed++;
      results.tests.push({ name, status: 'failed', duration, successRate });
    }
    
  } catch (error) {
    log(`  ❌ FAIL: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  log('🏆 最終統合テスト - 25人天才エンジニア会議', 'cyan');
  log('🛡️ サーバーコンポーネント保護実装完了後の全機能検証', 'cyan');
  console.log('='.repeat(80));

  // テストスイート1: 認証エラーシナリオテスト
  await runTestSuite(
    'テストスイート1: 認証エラーシナリオテスト',
    'node scripts/auth-error-scenario-test.js'
  );

  // テストスイート2: 会員限定ページ保護機能テスト
  await runTestSuite(
    'テストスイート2: 会員限定ページ保護機能テスト',
    'node scripts/member-protection-test.js'
  );

  // テストスイート3: サーバーコンポーネント保護テスト
  await runTestSuite(
    'テストスイート3: サーバーコンポーネント保護テスト',
    'node scripts/server-component-protection-test.js'
  );

  // 結果サマリー
  console.log('\n' + '='.repeat(80));
  log('📊 最終統合テスト結果', 'cyan');
  console.log('='.repeat(80));
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  log(`\n✅ 成功: ${results.passed}件`, 'green');
  log(`❌ 失敗: ${results.failed}件`, 'red');
  log(`📈 統合成功率: ${passRate}%`, passRate === '100.0' ? 'green' : 'red');
  
  // 各テストスイートの詳細
  log('\n📋 テストスイート詳細:', 'blue');
  results.tests.forEach(test => {
    const statusColor = test.status === 'passed' ? 'green' : 'red';
    const statusIcon = test.status === 'passed' ? '✅' : '❌';
    log(`  ${statusIcon} ${test.name}: ${test.successRate || 'N/A'}%`, statusColor);
  });
  
  if (results.failed > 0) {
    log('\n❌ 失敗したテストスイート:', 'red');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      log(`  - ${test.name}: ${test.error || test.successRate}`, 'red');
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (results.failed === 0) {
    log('🎉 サーバーコンポーネント保護実装が完璧に完了しました！', 'green');
    log('✨ 4層防御システム + 全機能 100%動作確認', 'green');
    log('🏢 企業級セキュリティレベル達成', 'green');
    log('🛡️ Layer 1: ミドルウェア保護 ✅', 'green');
    log('🛡️ Layer 2: サーバーコンポーネント保護 ✅', 'green');
    log('🛡️ Layer 3: クライアントコンポーネント保護 ✅', 'green');
    log('🛡️ Layer 4: API保護 ✅', 'green');
  } else {
    log('⚠️ 一部のテストスイートで問題があります', 'yellow');
  }
  
  console.log('='.repeat(80) + '\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
  log(`\n❌ 統合テスト実行エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});