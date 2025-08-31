'use client';

import { createContext, useContext, ReactNode, useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import { CSRFTokenManager } from '@/lib/security/csrf-token-manager';

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

  // トークンマネージャーの初期化
  useEffect(() => {
    if (!tokenManagerRef.current) {
      tokenManagerRef.current = CSRFTokenManager.getInstance();
    }
  }, []);

  const fetchToken = async (force: boolean = false) => {
    try {
      // initialTokenがあり、強制リフレッシュでない場合はスキップ
      if (initialToken && !force && !isInitialized) {
        console.log('[PERF] Using initial CSRF token, skipping API call');
        setToken(initialToken);
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      if (!tokenManagerRef.current) {
        tokenManagerRef.current = CSRFTokenManager.getInstance();
      }

      console.log('🔄 [CSRF Provider] トークン取得開始', {
        sessionStatus: status,
        hasSession: !!session,
        timestamp: new Date().toISOString(),
        forced: force
      });
      
      // トークンマネージャーを使用してトークンを取得
      let newToken: string;
      if (force) {
        newToken = await tokenManagerRef.current.refreshToken();
      } else {
        newToken = await tokenManagerRef.current.ensureToken();
      }
      
      setToken(newToken);
      
      console.log('✅ [CSRF Provider] トークン更新完了', {
        tokenPreview: newToken?.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [CSRF Provider] トークン取得エラー:', error);
      // エラー時も初期化完了とする（リトライは内部で実施済み）
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
      
      console.log('🔐 [SecureFetch] CSRFトークン取得中...', {
        url,
        method,
        timestamp: new Date().toISOString()
      });
      
      // ensureToken() で確実にトークンを取得（初期化保証）
      csrfToken = await tokenManagerRef.current.ensureToken();
      
      console.log('✅ [SecureFetch] CSRFトークン取得成功', {
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
      console.log('🔒 [SecureFetch] トークンをリクエストに添付', {
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