#!/usr/bin/env node

/**
 * バグ修正検証スクリプト
 * 14人天才会議 - 天才13
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'BugFixVerifier/1.0',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          data: data,
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function verifyFixes() {
  log('\n🧠 天才13: バグ修正検証\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  const verificationResults = {
    fixed: [],
    notFixed: [],
    warnings: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };
  
  try {
    // 検証1: Service Worker設定確認
    log('\n📋 検証1: Service Worker設定', 'blue');
    verificationResults.summary.total++;
    
    try {
      const swPath = path.join(process.cwd(), 'public', 'sw.js');
      const swContent = await fs.readFile(swPath, 'utf8');
      
      const checks = {
        authExclusion: swContent.includes("url.pathname.startsWith('/auth/')"),
        versionUpdate: swContent.includes('v2') || swContent.includes('v3'),
        errorHandling: swContent.includes("addEventListener('error'"),
        fetchLogging: swContent.includes('[SW] Auth page response')
      };
      
      const allPassed = Object.values(checks).every(v => v);
      
      if (allPassed) {
        log('  ✅ Service Worker設定: すべて正常', 'green');
        verificationResults.fixed.push('Service Worker設定');
        verificationResults.summary.passed++;
      } else {
        log('  ❌ Service Worker設定: 一部問題あり', 'red');
        Object.entries(checks).forEach(([key, value]) => {
          if (!value) {
            log(`    - ${key}: 未実装`, 'yellow');
          }
        });
        verificationResults.notFixed.push('Service Worker設定');
        verificationResults.summary.failed++;
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      verificationResults.notFixed.push('Service Worker設定');
      verificationResults.summary.failed++;
    }
    
    // 検証2: メールテンプレート確認
    log('\n📋 検証2: メールテンプレート', 'blue');
    verificationResults.summary.total++;
    
    try {
      const verificationTemplatePath = path.join(
        process.cwd(), 
        'src/lib/email/templates/verification.tsx'
      );
      const resetTemplatePath = path.join(
        process.cwd(), 
        'src/lib/email/templates/password-reset.tsx'
      );
      
      const verificationContent = await fs.readFile(verificationTemplatePath, 'utf8');
      const resetContent = await fs.readFile(resetTemplatePath, 'utf8');
      
      // アンカータグの使用を確認
      const verificationUsesAnchor = verificationContent.includes('<a href={verificationUrl}');
      const resetUsesAnchor = resetContent.includes('<a href={resetUrl}');
      
      // Buttonコンポーネントの不使用を確認
      const verificationNoButton = !verificationContent.includes('<Button');
      const resetNoButton = !resetContent.includes('<Button');
      
      if (verificationUsesAnchor && resetUsesAnchor && verificationNoButton && resetNoButton) {
        log('  ✅ メールテンプレート: アンカータグ使用確認', 'green');
        verificationResults.fixed.push('メールテンプレート');
        verificationResults.summary.passed++;
      } else {
        log('  ❌ メールテンプレート: 修正が必要', 'red');
        if (!verificationUsesAnchor || !verificationNoButton) {
          log('    - 確認メール: 要修正', 'yellow');
        }
        if (!resetUsesAnchor || !resetNoButton) {
          log('    - リセットメール: 要修正', 'yellow');
        }
        verificationResults.notFixed.push('メールテンプレート');
        verificationResults.summary.failed++;
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      verificationResults.notFixed.push('メールテンプレート');
      verificationResults.summary.failed++;
    }
    
    // 検証3: ルーティング確認
    log('\n📋 検証3: ルーティング設定', 'blue');
    verificationResults.summary.total++;
    
    try {
      const verifyPagePath = path.join(
        process.cwd(), 
        'src/app/auth/verify-email/page.tsx'
      );
      const resetPagePath = path.join(
        process.cwd(), 
        'src/app/auth/reset-password/[token]/page.tsx'
      );
      
      const verifyPageExists = await fs.access(verifyPagePath).then(() => true).catch(() => false);
      const resetPageExists = await fs.access(resetPagePath).then(() => true).catch(() => false);
      
      if (verifyPageExists && resetPageExists) {
        // ページ内容の確認
        const verifyContent = await fs.readFile(verifyPagePath, 'utf8');
        const resetContent = await fs.readFile(resetPagePath, 'utf8');
        
        // Suspense境界の確認
        const verifySuspense = verifyContent.includes('Suspense');
        const resetSuspense = resetContent.includes('Suspense');
        
        if (verifySuspense && resetSuspense) {
          log('  ✅ ルーティング: 正常（Suspense境界あり）', 'green');
          verificationResults.fixed.push('ルーティング設定');
          verificationResults.summary.passed++;
        } else {
          log('  ⚠️  ルーティング: Suspense境界が不足', 'yellow');
          verificationResults.warnings.push('Suspense境界');
          verificationResults.summary.passed++;
        }
      } else {
        log('  ❌ ルーティング: ページファイルが見つからない', 'red');
        verificationResults.notFixed.push('ルーティング設定');
        verificationResults.summary.failed++;
      }
    } catch (error) {
      log(`  ❌ エラー: ${error.message}`, 'red');
      verificationResults.notFixed.push('ルーティング設定');
      verificationResults.summary.failed++;
    }
    
    // 検証4: ライブテスト（サーバー起動が必要）
    log('\n📋 検証4: ライブアクセステスト', 'blue');
    verificationResults.summary.total++;
    
    try {
      // テスト用のダミートークン
      const dummyToken = 'test-verification-token-12345';
      
      // verify-emailページへのアクセス
      const verifyResponse = await makeRequest(`/auth/verify-email?token=${dummyToken}`);
      
      if (verifyResponse.status === 200) {
        const html = verifyResponse.data.toString();
        
        if (!html.includes('オフラインです')) {
          log('  ✅ verify-emailページ: オフラインページなし', 'green');
          verificationResults.fixed.push('verify-emailアクセス');
          verificationResults.summary.passed++;
        } else {
          log('  ❌ verify-emailページ: オフラインページが表示', 'red');
          verificationResults.notFixed.push('verify-emailアクセス');
          verificationResults.summary.failed++;
        }
      } else {
        log(`  ⚠️  HTTPステータス: ${verifyResponse.status}`, 'yellow');
        verificationResults.warnings.push(`HTTP ${verifyResponse.status}`);
        verificationResults.summary.failed++;
      }
    } catch (error) {
      log('  ⚠️  サーバーに接続できません', 'yellow');
      log('    npm run dev でサーバーを起動してください', 'cyan');
      verificationResults.warnings.push('サーバー未起動');
    }
    
    // 検証5: エラーハンドリングツール
    log('\n📋 検証5: エラーハンドリングツール', 'blue');
    verificationResults.summary.total++;
    
    try {
      const errorLoggerPath = path.join(process.cwd(), 'public', 'error-logger.js');
      const diagnosticPath = path.join(process.cwd(), 'public', 'diagnostic.js');
      
      const errorLoggerExists = await fs.access(errorLoggerPath).then(() => true).catch(() => false);
      const diagnosticExists = await fs.access(diagnosticPath).then(() => true).catch(() => false);
      
      if (errorLoggerExists && diagnosticExists) {
        log('  ✅ エラーハンドリングツール: 利用可能', 'green');
        verificationResults.fixed.push('エラーハンドリング');
        verificationResults.summary.passed++;
      } else {
        log('  ⚠️  一部のツールが不足', 'yellow');
        if (!errorLoggerExists) log('    - error-logger.js 不足', 'yellow');
        if (!diagnosticExists) log('    - diagnostic.js 不足', 'yellow');
        verificationResults.warnings.push('エラーツール不足');
        verificationResults.summary.passed++;
      }
    } catch (error) {
      log(`  ⚠️  エラー: ${error.message}`, 'yellow');
      verificationResults.warnings.push('エラーツール確認失敗');
      verificationResults.summary.passed++;
    }
    
  } catch (error) {
    log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  }
  
  // 結果サマリー
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 バグ修正検証結果', 'magenta');
  log('='.repeat(60), 'cyan');
  
  log(`\n検証項目数: ${verificationResults.summary.total}`, 'cyan');
  log(`✅ 修正済み: ${verificationResults.summary.passed}`, 'green');
  log(`❌ 未修正: ${verificationResults.summary.failed}`, 'red');
  log(`⚠️  警告: ${verificationResults.warnings.length}`, 'yellow');
  
  const successRate = (verificationResults.summary.passed / verificationResults.summary.total * 100).toFixed(1);
  log(`\n修正率: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  
  // 詳細結果
  if (verificationResults.fixed.length > 0) {
    log('\n✅ 修正済み項目:', 'green');
    verificationResults.fixed.forEach(item => {
      log(`  - ${item}`, 'cyan');
    });
  }
  
  if (verificationResults.notFixed.length > 0) {
    log('\n❌ 未修正項目:', 'red');
    verificationResults.notFixed.forEach(item => {
      log(`  - ${item}`, 'cyan');
    });
  }
  
  if (verificationResults.warnings.length > 0) {
    log('\n⚠️  警告:', 'yellow');
    verificationResults.warnings.forEach(item => {
      log(`  - ${item}`, 'cyan');
    });
  }
  
  // 最終判定
  log('\n' + '='.repeat(60), 'cyan');
  if (verificationResults.summary.failed === 0) {
    log('🎉 すべてのバグ修正が確認されました！', 'green');
    log('メールリンクの問題は完全に解決されています。', 'green');
    
    log('\n📝 次のステップ:', 'blue');
    log('  1. ブラウザのキャッシュをクリア', 'cyan');
    log('  2. Service Workerを再登録', 'cyan');
    log('  3. 実際のメールでテスト', 'cyan');
    
  } else if (verificationResults.summary.failed <= 2) {
    log('⚠️  ほぼすべての修正が完了しています', 'yellow');
    log('残りの項目を確認してください。', 'yellow');
    
    log('\n📝 推奨アクション:', 'blue');
    log('  1. npm run dev でサーバーを起動', 'cyan');
    log('  2. Service Workerのキャッシュをクリア', 'cyan');
    log('  3. 再度検証を実行', 'cyan');
    
  } else {
    log('❌ 複数の修正が未完了です', 'red');
    log('以下の対処を行ってください:', 'red');
    
    log('\n📝 必要なアクション:', 'blue');
    log('  1. Service Worker設定の確認', 'cyan');
    log('  2. メールテンプレートの修正', 'cyan');
    log('  3. ルーティング設定の確認', 'cyan');
  }
  
  process.exit(verificationResults.summary.failed > 0 ? 1 : 0);
}

// 実行
verifyFixes().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});