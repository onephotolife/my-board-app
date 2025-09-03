'use client';

import { useEffect } from 'react';

export function DebugClient() {
  useEffect(() => {
    // ローカルストレージにログを保存（リロードしても残る）
    const debugLog = (message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      const log = { timestamp, message, data };
      
      // 既存のログを取得
      const existingLogs = JSON.parse(localStorage.getItem('auth-debug-logs') || '[]');
      existingLogs.push(log);
      
      // 最新20件のみ保持
      if (existingLogs.length > 20) {
        existingLogs.shift();
      }
      
      localStorage.setItem('auth-debug-logs', JSON.stringify(existingLogs));
      console.warn(`[AUTH-DEBUG] ${message}`, data);
    };
    
    // ページロード情報を記録
    debugLog('Page loaded', {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer,
      timestamp: Date.now()
    });
    
    // リロード検出
    const loadCount = parseInt(sessionStorage.getItem('load-count') || '0') + 1;
    sessionStorage.setItem('load-count', String(loadCount));
    
    if (loadCount > 3) {
      debugLog('🚨 INFINITE LOOP DETECTED', { loadCount });
      // 無限ループを強制停止
      sessionStorage.setItem('stop-redirect', 'true');
    }
    
    // クリーンアップ（5秒後にカウンターリセット）
    const timer = setTimeout(() => {
      sessionStorage.removeItem('load-count');
      sessionStorage.removeItem('stop-redirect');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return null;
}