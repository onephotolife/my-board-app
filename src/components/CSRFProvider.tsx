'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';

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
  const header = 'x-csrf-token';

  const fetchToken = async () => {
    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        
        // メタタグにも設定
        let metaTag = document.querySelector('meta[name="csrf-token"]');
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', 'csrf-token');
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', data.token);
        
        console.log('CSRF token initialized successfully');
      } else {
        console.error('Failed to fetch CSRF token:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
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