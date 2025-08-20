#!/usr/bin/env node

/**
 * エラーハンドリング強化スクリプト
 * 14人天才会議 - 天才9
 */

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

// エラーログ収集用のコード
const errorLoggerCode = `
// エラーログ収集システム
(function() {
  const errorLog = [];
  const maxErrors = 50;
  
  // グローバルエラーハンドラー
  window.addEventListener('error', (event) => {
    const error = {
      timestamp: new Date().toISOString(),
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
      type: 'javascript-error'
    };
    
    errorLog.push(error);
    if (errorLog.length > maxErrors) errorLog.shift();
    
    // Service Worker関連のエラーを特別に処理
    if (error.message?.includes('Service Worker') || 
        error.message?.includes('sw.js') ||
        error.source?.includes('sw.js')) {
      console.warn('⚠️ Service Worker関連エラー:', error);
      
      // Service Workerの再登録を試みる
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.update().catch(err => {
            console.error('Service Worker更新失敗:', err);
          });
        });
      }
    }
    
    // オフラインページ関連のエラー
    if (error.message?.includes('offline') || 
        document.body?.textContent?.includes('オフラインです')) {
      console.warn('⚠️ オフラインページが検出されました');
      
      // 自動リトライ（認証ページの場合）
      const currentPath = window.location.pathname;
      if (currentPath.includes('/auth/')) {
        console.log('認証ページの再読み込みを試みます...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
  });
  
  // Promise rejection ハンドラー
  window.addEventListener('unhandledrejection', (event) => {
    const error = {
      timestamp: new Date().toISOString(),
      message: event.reason?.message || event.reason,
      stack: event.reason?.stack,
      type: 'unhandled-rejection'
    };
    
    errorLog.push(error);
    if (errorLog.length > maxErrors) errorLog.shift();
    
    console.error('未処理のPromise rejection:', error);
  });
  
  // CSSプリロードエラーの検出
  const checkPreloadErrors = () => {
    const links = document.querySelectorAll('link[rel="preload"]');
    links.forEach(link => {
      if (link.href.includes('.css')) {
        // CSSファイルの存在確認
        fetch(link.href, { method: 'HEAD' })
          .then(response => {
            if (!response.ok) {
              console.error('CSSプリロードエラー:', link.href);
              errorLog.push({
                timestamp: new Date().toISOString(),
                message: 'CSS preload failed: ' + link.href,
                type: 'css-preload-error'
              });
            }
          })
          .catch(err => {
            console.error('CSSファイル確認エラー:', err);
          });
      }
    });
  };
  
  // ページロード完了後にチェック
  if (document.readyState === 'complete') {
    checkPreloadErrors();
  } else {
    window.addEventListener('load', checkPreloadErrors);
  }
  
  // エラーログを取得する関数
  window.getErrorLog = () => errorLog;
  
  // エラーログをクリアする関数
  window.clearErrorLog = () => {
    errorLog.length = 0;
    console.log('エラーログがクリアされました');
  };
  
  // デバッグ情報を表示する関数
  window.showDebugInfo = () => {
    console.group('🔍 デバッグ情報');
    console.log('URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    console.log('Online:', navigator.onLine);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        console.log('Service Workers:', regs.length);
        regs.forEach(reg => {
          console.log('  - Scope:', reg.scope);
          console.log('  - Active:', reg.active?.state);
        });
      });
    }
    
    console.log('エラーログ数:', errorLog.length);
    if (errorLog.length > 0) {
      console.log('最新のエラー:', errorLog[errorLog.length - 1]);
    }
    console.groupEnd();
  };
  
  console.log('📊 エラーログシステムが初期化されました');
  console.log('利用可能なコマンド:');
  console.log('  - window.getErrorLog() : エラーログを取得');
  console.log('  - window.clearErrorLog() : エラーログをクリア');
  console.log('  - window.showDebugInfo() : デバッグ情報を表示');
})();
`;

// Service Worker用のエラーハンドリング強化コード
const swErrorHandlingCode = `
// Service Worker エラーハンドリング強化
self.addEventListener('error', (event) => {
  console.error('[SW Error]', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW Unhandled Rejection]', event.reason);
});

// フェッチエラーの詳細ログ
const originalFetch = self.fetch;
self.fetch = function(...args) {
  const request = args[0];
  const url = request.url || request;
  
  return originalFetch.apply(this, args)
    .then(response => {
      // 認証ページのレスポンスをログ
      if (url.includes('/auth/')) {
        console.log('[SW] Auth page response:', {
          url: url,
          status: response.status,
          ok: response.ok
        });
      }
      return response;
    })
    .catch(error => {
      console.error('[SW] Fetch error:', {
        url: url,
        error: error.message
      });
      throw error;
    });
};
`;

async function enhanceErrorHandling() {
  log('\n🧠 天才9: エラーハンドリング強化\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  try {
    // 1. エラーログ収集スクリプトの作成
    log('\n📝 エラーログ収集スクリプト作成', 'blue');
    
    const errorLoggerPath = path.join(process.cwd(), 'public', 'error-logger.js');
    await fs.writeFile(errorLoggerPath, errorLoggerCode);
    log('  ✅ error-logger.js 作成完了', 'green');
    
    // 2. HTMLファイルへの埋め込み方法を提示
    log('\n📌 エラーログシステムの導入方法:', 'yellow');
    log('\n  1. app/layout.tsx に以下を追加:', 'cyan');
    log('     <script src="/error-logger.js" defer></script>', 'cyan');
    
    log('\n  2. または各ページの <Head> セクションに追加:', 'cyan');
    log('     import Script from "next/script"', 'cyan');
    log('     <Script src="/error-logger.js" strategy="afterInteractive" />', 'cyan');
    
    // 3. Service Worker強化パッチの作成
    log('\n🔧 Service Worker強化パッチ', 'blue');
    
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    const swContent = await fs.readFile(swPath, 'utf8');
    
    // エラーハンドリングが既に含まれているかチェック
    if (!swContent.includes('self.addEventListener(\'error\'')) {
      const enhancedSwContent = swErrorHandlingCode + '\n\n' + swContent;
      await fs.writeFile(swPath, enhancedSwContent);
      log('  ✅ Service Workerにエラーハンドリング追加', 'green');
    } else {
      log('  ℹ️  Service Workerには既にエラーハンドリングあり', 'cyan');
    }
    
    // 4. 診断スクリプトの作成
    log('\n🔍 診断スクリプト作成', 'blue');
    
    const diagnosticCode = `
// 診断スクリプト
function diagnoseEmailLinkIssue() {
  console.group('📧 メールリンク問題診断');
  
  // 1. 現在のページ確認
  const currentPath = window.location.pathname;
  console.log('現在のパス:', currentPath);
  
  // 2. Service Worker状態確認
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      if (regs.length === 0) {
        console.warn('⚠️ Service Workerが登録されていません');
      } else {
        regs.forEach(reg => {
          console.log('Service Worker:', {
            scope: reg.scope,
            state: reg.active?.state,
            scriptURL: reg.active?.scriptURL
          });
        });
      }
    });
  }
  
  // 3. オンライン状態確認
  console.log('オンライン状態:', navigator.onLine);
  
  // 4. ページコンテンツ確認
  const bodyText = document.body.textContent;
  if (bodyText.includes('オフラインです')) {
    console.error('❌ オフラインページが表示されています');
    console.log('対処法:');
    console.log('  1. Service Workerをクリア');
    console.log('  2. ブラウザキャッシュをクリア');
    console.log('  3. ページを再読み込み');
  } else if (currentPath.includes('/auth/verify-email')) {
    console.log('✅ 確認ページが正常に表示されています');
  } else if (currentPath.includes('/auth/reset-password')) {
    console.log('✅ リセットページが正常に表示されています');
  }
  
  // 5. トークン確認
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || window.location.pathname.split('/').pop();
  if (token && token.length > 20) {
    console.log('トークン検出:', token.substring(0, 10) + '...');
  } else {
    console.warn('⚠️ 有効なトークンが見つかりません');
  }
  
  console.groupEnd();
}

// 自動診断
if (window.location.pathname.includes('/auth/')) {
  setTimeout(diagnoseEmailLinkIssue, 1000);
}
`;
    
    const diagnosticPath = path.join(process.cwd(), 'public', 'diagnostic.js');
    await fs.writeFile(diagnosticPath, diagnosticCode);
    log('  ✅ diagnostic.js 作成完了', 'green');
    
    // 5. 使用方法の説明
    log('\n' + '='.repeat(60), 'cyan');
    log('📚 使用方法', 'magenta');
    log('='.repeat(60), 'cyan');
    
    log('\n1️⃣  エラーログシステムの有効化:', 'green');
    log('  app/layout.tsx に以下を追加:', 'cyan');
    log('  <script src="/error-logger.js" defer></script>', 'cyan');
    
    log('\n2️⃣  診断ツールの使用:', 'green');
    log('  問題のページで開発者コンソールで実行:', 'cyan');
    log('  <script src="/diagnostic.js"></script>', 'cyan');
    
    log('\n3️⃣  デバッグコマンド:', 'green');
    log('  window.showDebugInfo()  - デバッグ情報表示', 'cyan');
    log('  window.getErrorLog()    - エラーログ取得', 'cyan');
    log('  diagnoseEmailLinkIssue() - メールリンク診断', 'cyan');
    
    log('\n' + '='.repeat(60), 'cyan');
    log('✅ エラーハンドリング強化完了！', 'green');
    log('='.repeat(60), 'cyan');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
  }
}

// 実行
enhanceErrorHandling().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});