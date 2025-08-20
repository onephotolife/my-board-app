#!/usr/bin/env node

/**
 * デプロイ前チェックリストスクリプト
 * 本番環境へのデプロイ前に必要なチェックを自動実行
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// チェック結果を格納
const results = {
  passed: [],
  warnings: [],
  failed: [],
};

// ユーティリティ関数
function log(message, type = 'info') {
  const color = {
    info: colors.cyan,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
  }[type] || colors.reset;
  
  console.log(`${color}${message}${colors.reset}`);
}

function checkmark() {
  return `${colors.green}✓${colors.reset}`;
}

function crossmark() {
  return `${colors.red}✗${colors.reset}`;
}

function warningmark() {
  return `${colors.yellow}⚠${colors.reset}`;
}

// チェック関数
function runCommand(command, silent = false) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function checkFileContent(filePath, searchString) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  return content.includes(searchString);
}

// メインチェック処理
async function runChecks() {
  console.log(`\n${colors.bold}🚀 デプロイ前チェックリスト${colors.reset}\n`);
  console.log('=' .repeat(50));
  
  // 1. 環境変数チェック
  console.log(`\n${colors.blue}📋 環境変数チェック${colors.reset}`);
  
  const requiredEnvFiles = [
    '.env.example',
    '.env.production.example',
  ];
  
  requiredEnvFiles.forEach(file => {
    if (fileExists(file)) {
      log(`${checkmark()} ${file} が存在します`, 'success');
      results.passed.push(`環境変数テンプレート: ${file}`);
    } else {
      log(`${crossmark()} ${file} が見つかりません`, 'error');
      results.failed.push(`環境変数テンプレート: ${file}`);
    }
  });
  
  // 本番環境変数ファイルの警告
  if (fileExists('.env.production.local')) {
    log(`${warningmark()} .env.production.local が存在します（Gitにコミットしないでください）`, 'warning');
    results.warnings.push('.env.production.local がローカルに存在');
  }
  
  // 2. 依存関係チェック
  console.log(`\n${colors.blue}📦 依存関係チェック${colors.reset}`);
  
  const auditResult = runCommand('npm audit --audit-level=high --json', true);
  if (auditResult.success) {
    try {
      const auditData = JSON.parse(auditResult.output);
      const vulnerabilities = auditData.metadata.vulnerabilities;
      
      if (vulnerabilities.high === 0 && vulnerabilities.critical === 0) {
        log(`${checkmark()} 高危険度の脆弱性なし`, 'success');
        results.passed.push('セキュリティ監査: パス');
      } else {
        log(`${crossmark()} 高危険度の脆弱性が見つかりました`, 'error');
        log(`  Critical: ${vulnerabilities.critical}, High: ${vulnerabilities.high}`, 'error');
        results.failed.push(`脆弱性: Critical ${vulnerabilities.critical}, High ${vulnerabilities.high}`);
      }
      
      if (vulnerabilities.moderate > 0) {
        log(`${warningmark()} 中程度の脆弱性: ${vulnerabilities.moderate}件`, 'warning');
        results.warnings.push(`中程度の脆弱性: ${vulnerabilities.moderate}件`);
      }
    } catch (e) {
      log(`${warningmark()} 監査結果の解析に失敗しました`, 'warning');
      results.warnings.push('npm audit の解析失敗');
    }
  }
  
  // 3. TypeScriptチェック
  console.log(`\n${colors.blue}📝 TypeScriptチェック${colors.reset}`);
  
  const tscResult = runCommand('npx tsc --noEmit', true);
  if (tscResult.success) {
    log(`${checkmark()} TypeScriptコンパイルエラーなし`, 'success');
    results.passed.push('TypeScript: エラーなし');
  } else {
    log(`${crossmark()} TypeScriptコンパイルエラーがあります`, 'error');
    results.failed.push('TypeScriptコンパイルエラー');
  }
  
  // 4. ESLintチェック
  console.log(`\n${colors.blue}🔍 ESLintチェック${colors.reset}`);
  
  const lintResult = runCommand('npm run lint', true);
  if (lintResult.success) {
    log(`${checkmark()} ESLintエラーなし`, 'success');
    results.passed.push('ESLint: エラーなし');
  } else {
    log(`${warningmark()} ESLint警告またはエラーがあります`, 'warning');
    results.warnings.push('ESLint警告あり');
  }
  
  // 5. ビルドチェック
  console.log(`\n${colors.blue}🏗️  ビルドチェック${colors.reset}`);
  
  log('ビルドを実行中...（時間がかかる場合があります）', 'info');
  const buildResult = runCommand('npm run build', true);
  if (buildResult.success) {
    log(`${checkmark()} ビルド成功`, 'success');
    results.passed.push('ビルド: 成功');
    
    // ビルドサイズチェック
    const buildDir = '.next';
    if (fileExists(buildDir)) {
      const sizeResult = runCommand(`du -sh ${buildDir}`, true);
      if (sizeResult.success) {
        const size = sizeResult.output.split('\t')[0];
        log(`  ビルドサイズ: ${size}`, 'info');
        
        // サイズが大きすぎる場合の警告
        const sizeValue = parseFloat(size);
        if (size.includes('G') || (size.includes('M') && sizeValue > 500)) {
          log(`${warningmark()} ビルドサイズが大きいです`, 'warning');
          results.warnings.push(`ビルドサイズ: ${size}`);
        }
      }
    }
  } else {
    log(`${crossmark()} ビルド失敗`, 'error');
    results.failed.push('ビルド: 失敗');
  }
  
  // 6. テスト実行
  console.log(`\n${colors.blue}🧪 テスト実行${colors.reset}`);
  
  const testResult = runCommand('npm run test:unit -- --passWithNoTests', true);
  if (testResult.success) {
    log(`${checkmark()} ユニットテスト成功`, 'success');
    results.passed.push('ユニットテスト: パス');
  } else {
    log(`${crossmark()} テスト失敗`, 'error');
    results.failed.push('ユニットテスト: 失敗');
  }
  
  // 7. 必須ファイルチェック
  console.log(`\n${colors.blue}📁 必須ファイルチェック${colors.reset}`);
  
  const requiredFiles = [
    'package.json',
    'package-lock.json',
    'next.config.js',
    'vercel.json',
    'src/middleware.ts',
    'src/app/layout.tsx',
    'src/app/page.tsx',
  ];
  
  requiredFiles.forEach(file => {
    if (fileExists(file)) {
      log(`${checkmark()} ${file}`, 'success');
      results.passed.push(`ファイル: ${file}`);
    } else {
      log(`${crossmark()} ${file} が見つかりません`, 'error');
      results.failed.push(`ファイル不足: ${file}`);
    }
  });
  
  // 8. セキュリティ設定チェック
  console.log(`\n${colors.blue}🔒 セキュリティ設定チェック${colors.reset}`);
  
  // middleware.tsのセキュリティチェック
  if (checkFileContent('src/middleware.ts', 'RateLimiter')) {
    log(`${checkmark()} レート制限が実装されています`, 'success');
    results.passed.push('レート制限: 実装済み');
  } else {
    log(`${warningmark()} レート制限の実装を確認してください`, 'warning');
    results.warnings.push('レート制限: 要確認');
  }
  
  if (checkFileContent('vercel.json', 'Content-Security-Policy')) {
    log(`${checkmark()} CSPヘッダーが設定されています`, 'success');
    results.passed.push('CSPヘッダー: 設定済み');
  } else {
    log(`${crossmark()} CSPヘッダーが設定されていません`, 'error');
    results.failed.push('CSPヘッダー: 未設定');
  }
  
  // 9. Git状態チェック
  console.log(`\n${colors.blue}📊 Git状態チェック${colors.reset}`);
  
  const gitStatus = runCommand('git status --porcelain', true);
  if (gitStatus.success) {
    if (gitStatus.output.trim() === '') {
      log(`${checkmark()} すべての変更がコミットされています`, 'success');
      results.passed.push('Git: クリーン');
    } else {
      log(`${warningmark()} コミットされていない変更があります`, 'warning');
      results.warnings.push('Git: 未コミットの変更あり');
      const changes = gitStatus.output.trim().split('\n').slice(0, 5);
      changes.forEach(change => log(`  ${change}`, 'warning'));
      if (gitStatus.output.trim().split('\n').length > 5) {
        log(`  ... 他 ${gitStatus.output.trim().split('\n').length - 5} ファイル`, 'warning');
      }
    }
  }
  
  // 現在のブランチ確認
  const currentBranch = runCommand('git branch --show-current', true);
  if (currentBranch.success) {
    const branch = currentBranch.output.trim();
    if (branch === 'main' || branch === 'master') {
      log(`${checkmark()} メインブランチにいます: ${branch}`, 'success');
      results.passed.push(`ブランチ: ${branch}`);
    } else {
      log(`${warningmark()} 現在のブランチ: ${branch}（メインブランチではありません）`, 'warning');
      results.warnings.push(`ブランチ: ${branch}`);
    }
  }
  
  // 10. パフォーマンスチェック
  console.log(`\n${colors.blue}⚡ パフォーマンスチェック${colors.reset}`);
  
  // package.jsonのチェック
  if (checkFileContent('package.json', '"build:analyze"')) {
    log(`${checkmark()} バンドル分析スクリプトが設定されています`, 'success');
    results.passed.push('バンドル分析: 利用可能');
  } else {
    log(`${warningmark()} バンドル分析スクリプトがありません`, 'warning');
    results.warnings.push('バンドル分析: 未設定');
  }
  
  // 画像最適化チェック
  if (fileExists('next.config.js')) {
    if (checkFileContent('next.config.js', 'images:')) {
      log(`${checkmark()} 画像最適化が設定されています`, 'success');
      results.passed.push('画像最適化: 設定済み');
    } else {
      log(`${warningmark()} 画像最適化設定を確認してください`, 'warning');
      results.warnings.push('画像最適化: 要確認');
    }
  }
  
  // 結果サマリー
  console.log('\n' + '=' .repeat(50));
  console.log(`\n${colors.bold}📊 チェック結果サマリー${colors.reset}\n`);
  
  console.log(`${colors.green}✅ 成功: ${results.passed.length}項目${colors.reset}`);
  if (results.passed.length > 0 && results.passed.length <= 10) {
    results.passed.forEach(item => console.log(`  • ${item}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️  警告: ${results.warnings.length}項目${colors.reset}`);
    results.warnings.forEach(item => console.log(`  • ${item}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n${colors.red}❌ 失敗: ${results.failed.length}項目${colors.reset}`);
    results.failed.forEach(item => console.log(`  • ${item}`));
  }
  
  // 最終判定
  console.log('\n' + '=' .repeat(50));
  if (results.failed.length === 0) {
    console.log(`\n${colors.green}${colors.bold}✅ デプロイ可能です！${colors.reset}`);
    if (results.warnings.length > 0) {
      console.log(`${colors.yellow}（${results.warnings.length}件の警告があります。確認を推奨します）${colors.reset}`);
    }
    console.log(`\n次のコマンドでデプロイを実行できます:`);
    console.log(`${colors.cyan}  npm run deploy:prod${colors.reset}`);
    console.log(`または`);
    console.log(`${colors.cyan}  vercel --prod${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ デプロイできません${colors.reset}`);
    console.log(`${colors.red}${results.failed.length}件の問題を修正してください${colors.reset}\n`);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}予期しないエラーが発生しました:${colors.reset}`, error);
  process.exit(1);
});

// メイン実行
runChecks().catch((error) => {
  console.error(`\n${colors.red}チェック中にエラーが発生しました:${colors.reset}`, error);
  process.exit(1);
});