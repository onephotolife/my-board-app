#!/usr/bin/env node

/**
 * Postsルート競合解決策 - 単体テスト検証スクリプト
 * STRICT120プロトコル準拠
 * 認証必須: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 認証情報
const AUTH_EMAIL = 'one.photolife+1@gmail.com';
const AUTH_PASSWORD = '?@thc123THC@?';
const BASE_URL = 'http://localhost:3000';

// テスト設定
const TEST_CONFIG = {
  timeout: 30000,
  retryCount: 3,
  debugMode: true
};

// ログ設定
const LOG_FILE = path.join(__dirname, 'unit-test-results.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  console.log(`[${timestamp}] [${level}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  logStream.write(JSON.stringify(logEntry) + '\n');
}

// ===============================
// テストケース1: ファイル構造検証
// ===============================
async function testFileStructure() {
  log('INFO', '=== ファイル構造検証開始 ===');
  
  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // 競合ファイルの存在確認
    const conflictingPaths = [
      'src/app/posts/new/page.tsx',
      'src/app/posts/[id]/page.tsx',
      'src/app/(main)/posts/new/page.tsx',
      'src/app/(main)/posts/[id]/page.tsx'
    ];
    
    for (const filePath of conflictingPaths) {
      const fullPath = path.join(process.cwd(), filePath);
      const exists = fs.existsSync(fullPath);
      
      if (exists) {
        const stats = fs.statSync(fullPath);
        log('DEBUG', `ファイル検出: ${filePath}`, {
          size: stats.size,
          modified: stats.mtime
        });
        testResults.warnings.push({
          file: filePath,
          message: '競合ファイルが存在',
          size: stats.size
        });
      } else {
        log('DEBUG', `ファイル不在: ${filePath}`);
        testResults.passed.push({
          file: filePath,
          message: 'ファイルが削除済み'
        });
      }
    }
    
    // レイアウトファイルの確認
    const layoutFiles = [
      'src/app/layout.tsx',
      'src/app/(main)/layout.tsx'
    ];
    
    for (const layoutFile of layoutFiles) {
      const fullPath = path.join(process.cwd(), layoutFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const hasAppLayout = content.includes('AppLayout');
        const hasClientHeader = content.includes('ClientHeader');
        
        log('DEBUG', `レイアウト分析: ${layoutFile}`, {
          hasAppLayout,
          hasClientHeader
        });
        
        testResults.passed.push({
          file: layoutFile,
          components: { hasAppLayout, hasClientHeader }
        });
      }
    }
    
  } catch (error) {
    log('ERROR', 'ファイル構造検証エラー', error.message);
    testResults.failed.push({
      test: 'file-structure',
      error: error.message
    });
  }
  
  return testResults;
}

// ===============================
// テストケース2: 依存関係検証
// ===============================
async function testDependencies() {
  log('INFO', '=== 依存関係検証開始 ===');
  
  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // package.jsonの依存関係確認
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
    );
    
    const requiredDeps = [
      'next',
      'react',
      'react-dom',
      '@mui/material',
      'next-auth',
      'mongoose'
    ];
    
    for (const dep of requiredDeps) {
      const version = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
      if (version) {
        log('DEBUG', `依存関係確認: ${dep}@${version}`);
        testResults.passed.push({
          dependency: dep,
          version: version
        });
      } else {
        log('WARN', `依存関係不足: ${dep}`);
        testResults.failed.push({
          dependency: dep,
          message: '依存関係が見つかりません'
        });
      }
    }
    
    // Next.jsバージョン確認
    const nextVersion = packageJson.dependencies.next;
    if (nextVersion && nextVersion.includes('15')) {
      testResults.passed.push({
        test: 'next-version',
        message: 'Next.js 15が使用されています'
      });
    } else {
      testResults.warnings.push({
        test: 'next-version',
        message: `Next.js バージョン: ${nextVersion}`
      });
    }
    
  } catch (error) {
    log('ERROR', '依存関係検証エラー', error.message);
    testResults.failed.push({
      test: 'dependencies',
      error: error.message
    });
  }
  
  return testResults;
}

// ===============================
// テストケース3: ビルド可能性検証
// ===============================
async function testBuildability() {
  log('INFO', '=== ビルド可能性検証開始 ===');
  
  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // TypeScriptコンパイルチェック
    log('DEBUG', 'TypeScriptコンパイルチェック開始');
    const { stdout: tscOutput, stderr: tscError } = await execPromise(
      'npx tsc --noEmit --skipLibCheck',
      { timeout: 60000 }
    );
    
    if (tscError) {
      log('WARN', 'TypeScript警告', tscError);
      testResults.warnings.push({
        test: 'typescript',
        warnings: tscError
      });
    } else {
      log('DEBUG', 'TypeScriptコンパイル成功');
      testResults.passed.push({
        test: 'typescript',
        message: 'コンパイルエラーなし'
      });
    }
    
    // ESLintチェック（オプション）
    try {
      const { stdout: lintOutput } = await execPromise(
        'npm run lint -- --max-warnings 0',
        { timeout: 30000 }
      );
      
      log('DEBUG', 'ESLintチェック完了');
      testResults.passed.push({
        test: 'eslint',
        message: 'Lintエラーなし'
      });
    } catch (lintError) {
      // Lintエラーは警告として扱う
      testResults.warnings.push({
        test: 'eslint',
        message: 'Lint警告あり'
      });
    }
    
  } catch (error) {
    log('ERROR', 'ビルド可能性検証エラー', error.message);
    testResults.failed.push({
      test: 'buildability',
      error: error.message
    });
  }
  
  return testResults;
}

// ===============================
// テストケース4: コンポーネント利用状況
// ===============================
async function testComponentUsage() {
  log('INFO', '=== コンポーネント利用状況検証開始 ===');
  
  const testResults = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // AppLayout使用箇所の検索
    const { stdout: appLayoutUsage } = await execPromise(
      'grep -r "AppLayout" src --include="*.tsx" --include="*.ts" | wc -l'
    );
    
    const appLayoutCount = parseInt(appLayoutUsage.trim());
    log('DEBUG', `AppLayout使用箇所: ${appLayoutCount}件`);
    
    // ClientHeader使用箇所の検索
    const { stdout: clientHeaderUsage } = await execPromise(
      'grep -r "ClientHeader" src --include="*.tsx" --include="*.ts" | wc -l'
    );
    
    const clientHeaderCount = parseInt(clientHeaderUsage.trim());
    log('DEBUG', `ClientHeader使用箇所: ${clientHeaderCount}件`);
    
    // AuthGuard使用箇所の検索
    const { stdout: authGuardUsage } = await execPromise(
      'grep -r "AuthGuard" src --include="*.tsx" --include="*.ts" | wc -l'
    );
    
    const authGuardCount = parseInt(authGuardUsage.trim());
    log('DEBUG', `AuthGuard使用箇所: ${authGuardCount}件`);
    
    testResults.passed.push({
      test: 'component-usage',
      stats: {
        AppLayout: appLayoutCount,
        ClientHeader: clientHeaderCount,
        AuthGuard: authGuardCount
      }
    });
    
    // 競合の可能性を評価
    if (appLayoutCount > 0 && clientHeaderCount > 0) {
      testResults.warnings.push({
        test: 'layout-conflict',
        message: 'AppLayoutとClientHeaderの両方が使用されています'
      });
    }
    
  } catch (error) {
    log('ERROR', 'コンポーネント利用状況検証エラー', error.message);
    testResults.failed.push({
      test: 'component-usage',
      error: error.message
    });
  }
  
  return testResults;
}

// ===============================
// メイン実行関数
// ===============================
async function main() {
  log('INFO', '========================================');
  log('INFO', '単体テスト検証スクリプト開始');
  log('INFO', `実行時刻: ${new Date().toISOString()}`);
  log('INFO', '========================================');
  
  const allResults = {
    fileStructure: null,
    dependencies: null,
    buildability: null,
    componentUsage: null,
    summary: {
      totalPassed: 0,
      totalFailed: 0,
      totalWarnings: 0
    }
  };
  
  try {
    // 各テストを順次実行
    allResults.fileStructure = await testFileStructure();
    allResults.dependencies = await testDependencies();
    allResults.buildability = await testBuildability();
    allResults.componentUsage = await testComponentUsage();
    
    // サマリー集計
    for (const [key, results] of Object.entries(allResults)) {
      if (key !== 'summary' && results) {
        allResults.summary.totalPassed += results.passed.length;
        allResults.summary.totalFailed += results.failed.length;
        allResults.summary.totalWarnings += results.warnings.length;
      }
    }
    
    // 結果出力
    log('INFO', '========================================');
    log('INFO', 'テスト結果サマリー');
    log('INFO', `✅ 成功: ${allResults.summary.totalPassed}`);
    log('INFO', `❌ 失敗: ${allResults.summary.totalFailed}`);
    log('INFO', `⚠️  警告: ${allResults.summary.totalWarnings}`);
    log('INFO', '========================================');
    
    // 詳細結果をファイルに保存
    const resultFile = path.join(__dirname, 'unit-test-detailed-results.json');
    fs.writeFileSync(resultFile, JSON.stringify(allResults, null, 2));
    log('INFO', `詳細結果を保存: ${resultFile}`);
    
    // 終了コード決定
    const exitCode = allResults.summary.totalFailed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    log('ERROR', '予期しないエラー', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    log('ERROR', 'スクリプト実行失敗', error);
    process.exit(1);
  });
}

module.exports = {
  testFileStructure,
  testDependencies,
  testBuildability,
  testComponentUsage
};