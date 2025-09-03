'use client';

import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';

import { CSRFTokenManager } from '@/lib/security/csrf-token-manager';

// グローバル型定義（Solution 1 - Enhanced）
declare global {
  interface Window {
    csrfTokenInitialized?: boolean;
    __CSRF_INIT_IN_PROGRESS__?: boolean;
    __CSRF_INIT_PROMISE__?: Promise<string>;
    __CSRF_TOKEN_CACHE__?: string;
    __CSRF_MOUNT_COUNT__?: number;
    __CSRF_MOUNT_HISTORY__?: Array<{
      timestamp: string;
      hasInitialToken: boolean;
      tokenFetchedRef: boolean;
      sessionStatus: string;
      mountCount: number;
      instanceId: string;
    }>;
    __API_CALL_TRACKER__?: {
      [endpoint: string]: {
        count: number;
        timestamps: string[];
        statuses: number[];
      }
    };
  }
}

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
  initialToken?: string | null;
}

/**
 * CSRFトークンを管理するプロバイダーコンポーネント
 * SOL-001: トークン初期化保証メカニズム実装
 */
export function CSRFProvider({ children, initialToken }: CSRFProviderProps) {
  const [token, setToken] = useState<string | null>(initialToken || null);
  const [isInitialized, setIsInitialized] = useState(!!initialToken);
  const [isLoading, setIsLoading] = useState(!initialToken);
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const header = 'x-csrf-token';
  const tokenManagerRef = useRef<CSRFTokenManager | null>(null);
  const fetchTokenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenFetchedRef = useRef<boolean>(false);

  // トークンマネージャーの初期化
  useEffect(() => {
    if (!tokenManagerRef.current) {
      tokenManagerRef.current = CSRFTokenManager.getInstance();
    }
  }, []);

  // API呼び出しをトラッキングする関数
  const trackApiCall = (endpoint: string, status: number) => {
    if (typeof window === 'undefined') return;
    
    window.__API_CALL_TRACKER__ = window.__API_CALL_TRACKER__ || {};
    const tracker = window.__API_CALL_TRACKER__[endpoint] || {
      count: 0,
      timestamps: [],
      statuses: []
    };
    
    tracker.count++;
    tracker.timestamps.push(new Date().toISOString());
    tracker.statuses.push(status);
    
    window.__API_CALL_TRACKER__[endpoint] = tracker;
    
    console.warn(`[API_TRACK] ${endpoint}:`, {
      totalCalls: tracker.count,
      recentStatus: status,
      last5Calls: tracker.timestamps.slice(-5)
    });
  };

  const fetchToken = async (force: boolean = false) => {
    try {
      // initialTokenがあり、強制リフレッシュでない場合はスキップ
      if (initialToken && !force && !isInitialized) {
        console.warn('[PERF] Using initial CSRF token, skipping API call');
        setToken(initialToken);
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      if (!tokenManagerRef.current) {
        tokenManagerRef.current = CSRFTokenManager.getInstance();
      }

      console.warn('🔄 [CSRF Provider] トークン取得開始', {
        sessionStatus: status,
        hasSession: !!session,
        timestamp: new Date().toISOString(),
        forced: force
      });
      
      // API呼び出しトラッキング開始
      trackApiCall('/api/csrf', 0); // 0 = pending
      
      // トークンマネージャーを使用してトークンを取得
      let newToken: string;
      if (force) {
        newToken = await tokenManagerRef.current.refreshToken();
      } else {
        newToken = await tokenManagerRef.current.ensureToken();
      }
      
      // API呼び出し成功をトラッキング
      trackApiCall('/api/csrf', 200);
      
      setToken(newToken);
      
      console.warn('✅ [CSRF Provider] トークン更新完了', {
        tokenPreview: newToken?.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [CSRF Provider] トークン取得エラー:', error);
      // API呼び出しエラーをトラッキング
      trackApiCall('/api/csrf', error instanceof Error && error.message.includes('429') ? 429 : 500);
      // エラー時も初期化完了とする（リトライは内部で実施済み）
    } finally {
      setIsInitialized(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // デバッグログ: マウント情報を記録
    const mountInfo = {
      timestamp: new Date().toISOString(),
      hasInitialToken: !!initialToken,
      tokenFetchedRef: tokenFetchedRef.current,
      sessionStatus: status,
      mountCount: window.__CSRF_MOUNT_COUNT__ = (window.__CSRF_MOUNT_COUNT__ || 0) + 1,
      instanceId: Math.random().toString(36).substr(2, 9)
    };
    
    console.warn('[DEBUG] CSRFProvider mount:', mountInfo);
    
    // グローバル配列に記録
    window.__CSRF_MOUNT_HISTORY__ = window.__CSRF_MOUNT_HISTORY__ || [];
    window.__CSRF_MOUNT_HISTORY__.push(mountInfo);
    
    // Enhanced グローバル初期化プロミスパターン（Solution 1 - Enhanced）
    if (typeof window !== 'undefined') {
      // 既に初期化中の場合は、既存のPromiseを待機
      if (window.__CSRF_INIT_IN_PROGRESS__) {
        console.warn('[CSRF] ⏳ Token initialization already in progress, waiting...');
        if (window.__CSRF_INIT_PROMISE__) {
          window.__CSRF_INIT_PROMISE__.then(token => {
            console.warn('[CSRF] ✅ Received token from global promise');
            setToken(token);
            setIsInitialized(true);
            setIsLoading(false);
          }).catch(error => {
            console.error('[CSRF] ❌ Global promise failed:', error);
            setIsInitialized(true);
            setIsLoading(false);
          });
        }
        return;
      }
      
      // キャッシュされたトークンが存在する場合
      if (window.__CSRF_TOKEN_CACHE__) {
        console.warn('[CSRF] ✅ Using cached token');
        setToken(window.__CSRF_TOKEN_CACHE__);
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }
      
      // 初回マウント時にトークンを取得（重複防止）
      if (!tokenFetchedRef.current) {
        tokenFetchedRef.current = true;
        
        // initialTokenがある場合はAPIコールをスキップ
        if (initialToken) {
          console.warn('[PERF] Using initial CSRF token from SSR, skipping API call');
          setToken(initialToken);
          setIsInitialized(true);
          setIsLoading(false);
          // グローバルキャッシュに保存
          window.__CSRF_TOKEN_CACHE__ = initialToken;
          // TokenManagerにも設定
          if (!tokenManagerRef.current) {
            tokenManagerRef.current = CSRFTokenManager.getInstance();
          }
          tokenManagerRef.current.setToken(initialToken);
        } else {
          // グローバル初期化フラグとPromiseを設定
          window.__CSRF_INIT_IN_PROGRESS__ = true;
          window.__CSRF_INIT_PROMISE__ = new Promise((resolve, reject) => {
            fetchToken(false).then(() => {
              const currentToken = tokenManagerRef.current?.getCurrentToken();
              if (currentToken) {
                window.__CSRF_TOKEN_CACHE__ = currentToken;
                resolve(currentToken);
              } else {
                reject(new Error('Failed to get token'));
              }
            }).catch(reject).finally(() => {
              window.__CSRF_INIT_IN_PROGRESS__ = false;
            });
          });
        }
      }
    }
    
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
      console.warn('[DEBUG] CSRFProvider unmount:', {
        instanceId: mountInfo.instanceId,
        lifetime: Date.now() - new Date(mountInfo.timestamp).getTime()
      });
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
      console.warn('🔑 [CSRF] 新しいセッション確立を検知、CSRFトークンを再取得', {
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
        }}
        >
          <LinearProgress />
        </Box>
        
        {/* スケルトンUI - コンテンツは表示するが操作を無効化 */}
        <Box sx={{ 
          opacity: 0.7, 
          pointerEvents: 'none',
          position: 'relative'
        }}
        >
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
 * SOL-001: トークン初期化保証メカニズムを使用
 */
export function useSecureFetch() {
  const { token, header, refreshToken } = useCSRFContext();
  const tokenManagerRef = useRef<CSRFTokenManager | null>(null);
  
  // トークンマネージャーの初期化
  useEffect(() => {
    if (!tokenManagerRef.current) {
      tokenManagerRef.current = CSRFTokenManager.getInstance();
    }
  }, []);
  
  return useCallback(async (url: string, options: RequestInit = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    
    // GETリクエストはCSRFトークン不要
    if (method === 'GET' || method === 'HEAD') {
      return fetch(url, options);
    }
    
    // トークンマネージャーからトークンを確実に取得
    let csrfToken: string | null = null;
    
    try {
      if (!tokenManagerRef.current) {
        tokenManagerRef.current = CSRFTokenManager.getInstance();
      }
      
      console.warn('🔐 [SecureFetch] CSRFトークン取得中...', {
        url,
        method,
        timestamp: new Date().toISOString()
      });
      
      // ensureToken() で確実にトークンを取得（初期化保証）
      csrfToken = await tokenManagerRef.current.ensureToken();
      
      console.warn('✅ [SecureFetch] CSRFトークン取得成功', {
        url,
        method,
        tokenPreview: csrfToken?.substring(0, 20) + '...'
      });
      
    } catch (error) {
      console.error('❌ [SecureFetch] CSRFトークン取得失敗:', error);
      
      // エラー時でも続行するが警告を出す
      console.warn('⚠️ [SecureFetch] CSRFトークンなしで続行', {
        url,
        method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // ヘッダーにCSRFトークンを追加
    const headers = new Headers(options.headers);
    
    if (csrfToken) {
      headers.set(header, csrfToken);
      console.warn('🔒 [SecureFetch] トークンをリクエストに添付', {
        url,
        method,
        hasToken: true,
        tokenPreview: csrfToken.substring(0, 20) + '...'
      });
    } else {
      console.warn('⚠️ [SecureFetch] トークンなしでリクエスト送信', {
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
  }, [header]);
}