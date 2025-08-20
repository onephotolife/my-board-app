
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
