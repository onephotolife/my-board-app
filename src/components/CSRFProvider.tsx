'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
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

  const fetchToken = async () => {
    try {
      console.log('🔄 [CSRF] トークン取得開始', {
        sessionStatus: status,
        hasSession: !!session,
        timestamp: new Date().toISOString()
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
    // 初回マウント時にトークンを取得
    fetchToken();
    
    // ページフォーカス時にトークンをリフレッシュ（セキュリティ強化）
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchToken();
      }
    };
    
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
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
    await fetchToken();
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