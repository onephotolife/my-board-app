'use client';

import { createContext, useContext, ReactNode, useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';

interface CSRFContextType {
  token: string | null;
  header: string;
  refreshToken: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextType>({
  token: null,
  header: 'x-csrf-token',
  refreshToken: async () => {},
});

export function useCSRFContext() {
  return useContext(CSRFContext);
}

interface CSRFProviderProps {
  children: ReactNode;
}

/**
 * CSRFトークンを管理するプロバイダーコンポーネント
 * アプリケーション起動時に自動的にトークンを取得
 */
export function CSRFProvider({ children }: CSRFProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const header = 'x-csrf-token';
  const fetchTokenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 5000; // 最小5秒間隔

  const fetchToken = async (force: boolean = false) => {
    // デバウンス: 前回の取得から最小間隔を確保
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    if (!force && timeSinceLastFetch < MIN_FETCH_INTERVAL) {
      console.log('⏳ [CSRF] トークン取得をスキップ (デバウンス)', {
        timeSinceLastFetch,
        minInterval: MIN_FETCH_INTERVAL
      });
      return;
    }
    
    lastFetchTimeRef.current = now;
    
    try {
      console.log('🔄 [CSRF] トークン取得開始', {
        sessionStatus: status,
        hasSession: !!session,
        timestamp: new Date().toISOString(),
        forced: force
      });
      
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        
        // メタタグにも設定
        let metaTag = document.querySelector('meta[name="app-csrf-token"]');
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', 'app-csrf-token');
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', data.token);
        
        console.log('✅ [CSRF] トークン更新完了', {
          tokenPreview: data.token?.substring(0, 20) + '...',
          metaTagUpdated: true,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ [CSRF] トークン取得失敗:', response.statusText);
      }
    } catch (error) {
      console.error('❌ [CSRF] トークン取得エラー:', error);
    } finally {
      setIsInitialized(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 初回マウント時にトークンを取得（強制実行）
    fetchToken(true);
    
    // ページフォーカス時にトークンをリフレッシュ（デバウンス付き）
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        // デバウンス: 既存のタイムアウトをクリア
        if (fetchTokenTimeoutRef.current) {
          clearTimeout(fetchTokenTimeoutRef.current);
        }
        
        // 1秒後に実行（連続フォーカスイベントをまとめる）
        fetchTokenTimeoutRef.current = setTimeout(() => {
          fetchToken();
          fetchTokenTimeoutRef.current = null;
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
      if (fetchTokenTimeoutRef.current) {
        clearTimeout(fetchTokenTimeoutRef.current);
      }
    };
  }, []);

  // セッション変更を監視してCSRFトークンを再取得
  useEffect(() => {
    // セッションIDが変更された場合のみトークンを再取得
    const currentSessionId = session?.user?.id || session?.user?.email || null;
    
    if (status === 'authenticated' && currentSessionId && currentSessionId !== previousSessionId) {
      console.log('🔑 [CSRF] 新しいセッション確立を検知、CSRFトークンを再取得', {
        previousSessionId,
        currentSessionId,
        userEmail: session?.user?.email
      });
      setPreviousSessionId(currentSessionId);
      fetchToken();
    }
  }, [status, session, previousSessionId]);

  const refreshToken = async () => {
    await fetchToken(true); // 手動リフレッシュは強制実行
  };

  // 初期化中のローディング表示（解決策2）
  if (isLoading) {
    return (
      <>
        {/* MUIのLinearProgressバー */}
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 9999 
        }}>
          <LinearProgress />
        </Box>
        
        {/* スケルトンUI - コンテンツは表示するが操作を無効化 */}
        <Box sx={{ 
          opacity: 0.7, 
          pointerEvents: 'none',
          position: 'relative'
        }}>
          <CSRFContext.Provider value={{ token, header, refreshToken }}>
            {children}
          </CSRFContext.Provider>
        </Box>
      </>
    );
  }

  return (
    <CSRFContext.Provider value={{ token, header, refreshToken }}>
      {children}
    </CSRFContext.Provider>
  );
}

/**
 * CSRFトークンを自動的に含むfetchラッパー
 * トークンが初期化されていない場合は最大3秒待機
 */
export function useSecureFetch() {
  const { token, header, refreshToken } = useCSRFContext();
  const tokenRef = useRef<string | null>(null);
  const isWaitingRef = useRef(false);
  
  // トークンをrefで保持（再レンダリング回避）
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  
  return useCallback(async (url: string, options: RequestInit = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    
    // GETリクエストはCSRFトークン不要
    if (method === 'GET' || method === 'HEAD') {
      return fetch(url, options);
    }
    
    // トークン取得待ち（最大3秒）
    if (!tokenRef.current && !isWaitingRef.current) {
      isWaitingRef.current = true;
      console.log('⏳ [CSRF] トークン初期化待機中...', {
        url,
        method,
        timestamp: new Date().toISOString()
      });
      
      let waitTime = 0;
      const waitInterval = 100; // 100ms間隔でチェック
      const maxWaitTime = 3000; // 最大3秒
      
      while (!tokenRef.current && waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, waitInterval));
        waitTime += waitInterval;
        
        // 1秒ごとに進捗ログ
        if (waitTime % 1000 === 0) {
          console.log(`⏳ [CSRF] 待機中... ${waitTime/1000}秒経過`);
        }
      }
      
      isWaitingRef.current = false;
      
      if (!tokenRef.current) {
        console.warn('⚠️ [CSRF] Token not available after timeout', {
          url,
          method,
          waitedMs: waitTime,
          timestamp: new Date().toISOString()
        });
        // トークン再取得を試みる
        await refreshToken();
        // 追加で少し待機
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log('✅ [CSRF] トークン取得成功', {
          waitedMs: waitTime,
          tokenPreview: tokenRef.current?.substring(0, 20) + '...'
        });
      }
    }
    
    // ヘッダーにCSRFトークンを追加
    const headers = new Headers(options.headers);
    if (tokenRef.current) {
      headers.set(header, tokenRef.current);
      console.log('🔒 [CSRF] トークンをリクエストに添付', {
        url,
        method,
        hasToken: true,
        tokenPreview: tokenRef.current.substring(0, 20) + '...'
      });
    } else {
      console.warn('⚠️ [CSRF] トークンなしでリクエスト送信', {
        url,
        method,
        hasToken: false
      });
    }
    
    return fetch(url, {
      ...options,
      headers,
      credentials: options.credentials || 'include',
    });
  }, [header, refreshToken]);
}