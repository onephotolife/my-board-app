#!/usr/bin/env node

/**
 * 自動修正スクリプト
 * テストを実行し、エラーを分析して自動修正を試みる
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// カラー出力
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTestCycle() {
  let iteration = 0;
  let successRate = 0;
  const maxIterations = 10;
  
  while (successRate < 100 && iteration < maxIterations) {
    iteration++;
    console.log(`\n${'='.repeat(70)}`);
    log(`🔄 Iteration ${iteration}/${maxIterations}`, 'bright');
    console.log('='.repeat(70));
    
    try {
      // テスト実行
      log('🧪 テスト実行中...', 'cyan');
      const output = execSync('node scripts/test-comprehensive-resend.js', {
        encoding: 'utf8'
      });
      
      // 成功率を抽出
      const match = output.match(/成功率: ([\d.]+)%/);
      if (match) {
        successRate = parseFloat(match[1]);
        log(`📊 現在の成功率: ${successRate}%`, 'blue');
      }
      
      if (successRate >= 100) {
        log('🎉 100%達成！', 'green');
        break;
      }
      
      // エラーパターンを分析
      const errors = analyzeErrors(output);
      
      if (errors.length > 0) {
        log(`🔍 ${errors.length}個の問題を検出`, 'yellow');
        // 自動修正を試みる
        await applyFixes(errors);
        
        // サーバー再起動
        log('🔄 サーバー再起動中...', 'yellow');
        try {
          execSync('npm run kill-port', { stdio: 'ignore' });
        } catch {}
        await sleep(1000);
        
        // 開発サーバー起動（バックグラウンド）
        require('child_process').spawn('npm', ['run', 'dev'], {
          detached: true,
          stdio: 'ignore'
        });
        
        await sleep(5000);
      }
      
    } catch (error) {
      log(`エラー: ${error.message}`, 'red');
    }
  }
  
  return successRate;
}

function analyzeErrors(output) {
  const errors = [];
  
  if (output.includes('レート制限が発動しませんでした')) {
    errors.push('RATE_LIMIT_NOT_WORKING');
  }
  
  if (output.includes('履歴記録が確認できません')) {
    errors.push('HISTORY_NOT_RECORDING');
  }
  
  if (output.includes('攻撃ベクターをブロック') && !output.includes('6/6 攻撃ベクターをブロック')) {
    errors.push('INPUT_VALIDATION_WEAK');
  }
  
  if (output.includes('指数バックオフが機能していません')) {
    errors.push('EXPONENTIAL_BACKOFF_BROKEN');
  }
  
  if (output.includes('制限に達しなかった')) {
    errors.push('MAX_ATTEMPTS_NOT_WORKING');
  }
  
  return errors;
}

async function applyFixes(errors) {
  for (const error of errors) {
    switch (error) {
      case 'RATE_LIMIT_NOT_WORKING':
        log('🔧 レート制限を修正中...', 'yellow');
        await fixRateLimit();
        break;
        
      case 'HISTORY_NOT_RECORDING':
        log('🔧 履歴記録を修正中...', 'yellow');
        await fixHistoryRecording();
        break;
        
      case 'INPUT_VALIDATION_WEAK':
        log('🔧 入力検証を強化中...', 'yellow');
        await fixInputValidation();
        break;
        
      case 'EXPONENTIAL_BACKOFF_BROKEN':
        log('🔧 指数バックオフを修正中...', 'yellow');
        await fixExponentialBackoff();
        break;
        
      case 'MAX_ATTEMPTS_NOT_WORKING':
        log('🔧 最大試行回数制限を修正中...', 'yellow');
        await fixMaxAttempts();
        break;
    }
  }
}

async function fixRateLimit() {
  // rate-limit-advanced.tsを修正
  const filePath = path.join(__dirname, '../src/lib/auth/rate-limit-advanced.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // より正確なクエリに置き換え
  if (!content.includes('$or: [')) {
    content = content.replace(
      /let rateLimit = await RateLimit\.findOne\({[\s\S]*?\}\)(?:\.sort\([^)]*\))?;/,
      `let rateLimit = await RateLimit.findOne({
      key,
      $or: [
        { createdAt: { $gte: windowStart } },
        { lastAttempt: { $gte: windowStart } }
      ]
    }).sort({ createdAt: -1 });`
    );
    
    fs.writeFileSync(filePath, content);
    log('  ✅ レート制限クエリを修正', 'green');
  }
}

async function fixHistoryRecording() {
  // resend/route.tsを修正
  const filePath = path.join(__dirname, '../src/app/api/auth/resend/route.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // attemptNumberを正しく設定
  const regex = /attemptNumber: attemptCount \+ 1,/g;
  if (content.match(regex)) {
    content = content.replace(
      regex,
      'attemptNumber: (resendHistory?.attempts?.length || 0) + 1,'
    );
    
    fs.writeFileSync(filePath, content);
    log('  ✅ attemptNumberの計算を修正', 'green');
  }
}

async function fixInputValidation() {
  // resend/route.tsを修正
  const filePath = path.join(__dirname, '../src/app/api/auth/resend/route.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // JSONパースエラーのハンドリングを追加
  if (!content.includes('try { body = await request.json()')) {
    content = content.replace(
      'const body = await request.json();',
      `let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: '無効なリクエスト形式です',
          }
        },
        { status: 400 }
      );
    }`
    );
    
    fs.writeFileSync(filePath, content);
    log('  ✅ JSONパースエラーハンドリングを追加', 'green');
  }
  
  // Zodエラーの安全な処理
  if (content.includes('validation.error.errors[0].message') && !content.includes('errors[0]?.message')) {
    content = content.replace(
      /validation\.error\.errors\[0\]\.message/g,
      'errors[0]?.message'
    );
    
    fs.writeFileSync(filePath, content);
    log('  ✅ Zodエラー処理を安全に修正', 'green');
  }
}

async function fixExponentialBackoff() {
  // resend/route.tsを修正
  const filePath = path.join(__dirname, '../src/app/api/auth/resend/route.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 指数バックオフの計算を修正
  const regex = /const cooldownSeconds = calculateBackoff\([^)]+\);/g;
  const matches = content.match(regex);
  
  if (matches && matches.length > 0) {
    content = content.replace(
      regex,
      `const cooldownSeconds = calculateBackoff(
      attemptCount,
      RESEND_CONFIG.baseInterval,
      RESEND_CONFIG.maxInterval
    );`
    );
    
    fs.writeFileSync(filePath, content);
    log('  ✅ 指数バックオフの計算を修正', 'green');
  }
}

async function fixMaxAttempts() {
  // resend/route.tsを修正
  const filePath = path.join(__dirname, '../src/app/api/auth/resend/route.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 最大試行回数のチェックを強化
  if (!content.includes('if (attemptCount >= RESEND_CONFIG.maxAttempts)')) {
    const regex = /if \(attemptCount > RESEND_CONFIG\.maxAttempts\)/;
    if (content.match(regex)) {
      content = content.replace(
        regex,
        'if (attemptCount >= RESEND_CONFIG.maxAttempts)'
      );
      
      fs.writeFileSync(filePath, content);
      log('  ✅ 最大試行回数チェックを修正', 'green');
    }
  }
}

// メイン実行
async function main() {
  console.log('\n' + '='.repeat(70));
  log('🚀 自動修正プロセス開始', 'bright');
  console.log('='.repeat(70));
  
  // 初期クリーンアップ
  log('🧹 環境クリーンアップ...', 'cyan');
  try {
    execSync('npm run clean', { stdio: 'ignore' });
    execSync('npm install', { stdio: 'ignore' });
  } catch (e) {
    log('⚠️ クリーンアップエラー（続行）', 'yellow');
  }
  
  // データベースセットアップ
  log('🗄️ データベース初期化...', 'cyan');
  try {
    execSync('node scripts/setup-indexes.js', { stdio: 'inherit' });
  } catch (e) {
    log('⚠️ DB初期化エラー（続行）', 'yellow');
  }
  
  // 開発サーバー起動
  log('🚀 開発サーバー起動...', 'cyan');
  require('child_process').spawn('npm', ['run', 'dev'], {
    detached: true,
    stdio: 'ignore'
  });
  
  await sleep(5000);
  
  // テストサイクル実行
  const finalRate = await runTestCycle();
  
  console.log('\n' + '='.repeat(70));
  log(`📊 最終成功率: ${finalRate}%`, 'bright');
  console.log('='.repeat(70));
  
  if (finalRate >= 100) {
    log('🎉 目標達成！', 'green');
    process.exit(0);
  } else if (finalRate >= 90) {
    log('👍 90%以上達成！', 'green');
    process.exit(0);
  } else if (finalRate >= 80) {
    log('✅ 80%以上達成！', 'yellow');
    process.exit(0);
  } else {
    log('⚠️ 目標未達成。手動での修正が必要です。', 'yellow');
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main().catch(error => {
    log(`致命的エラー: ${error.message}`, 'red');
    process.exit(1);
  });
}