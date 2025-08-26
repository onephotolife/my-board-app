'use client';

import { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

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

  return (
    <CSRFContext.Provider value={{ token, header, refreshToken }}>
      {children}
    </CSRFContext.Provider>
  );
}

/**
 * CSRFトークンを自動的に含むfetchラッパー
 */
export function useSecureFetch() {
  const { token, header } = useCSRFContext();
  
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const method = (options.method || 'GET').toUpperCase();
    
    // GETリクエストはCSRFトークン不要
    if (method === 'GET' || method === 'HEAD') {
      return fetch(url, options);
    }
    
    // ヘッダーにCSRFトークンを追加
    const headers = new Headers(options.headers);
    if (token) {
      headers.set(header, token);
    }
    
    return fetch(url, {
      ...options,
      headers,
      credentials: options.credentials || 'include',
    });
  };
}