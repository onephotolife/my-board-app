'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * CSRFトークン情報
 */
interface CSRFTokenData {
  token: string | null;
  header: string;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * CSRFトークンの自動更新設定
 */
interface UseCSRFSyncOptions {
  autoRefresh?: boolean;          // 自動更新有効化（デフォルト: true）
  refreshBeforeExpiry?: number;   // 期限前の更新時間（ミリ秒、デフォルト: 5分）
  retryOnError?: boolean;         // エラー時の再試行（デフォルト: true）
  retryDelay?: number;           // 再試行の遅延（ミリ秒、デフォルト: 3秒）
  maxRetries?: number;           // 最大再試行回数（デフォルト: 3）
}

const DEFAULT_OPTIONS: UseCSRFSyncOptions = {
  autoRefresh: true,
  refreshBeforeExpiry: 5 * 60 * 1000, // 5分
  retryOnError: true,
  retryDelay: 3000,
  maxRetries: 3
};

/**
 * CSRF同期フック
 * 
 * CSRFトークンの取得、管理、自動更新を行う
 */
export function useCSRFSync(options: UseCSRFSyncOptions = {}): CSRFTokenData & {
  refresh: () => Promise<void>;
  getHeaders: () => HeadersInit;
} {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const [tokenData, setTokenData] = useState<CSRFTokenData>({
    token: null,
    header: 'x-csrf-token',
    expiresAt: null,
    isLoading: false,
    error: null
  });
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  /**
   * Cookieからトークンを取得
   */
  const getTokenFromCookie = useCallback((): string | null => {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf-token-public' || name === 'csrf-token') {
        return value;
      }
    }
    return null;
  }, []);

  /**
   * メタタグからトークンを取得
   */
  const getTokenFromMeta = useCallback((): string | null => {
    if (typeof document === 'undefined') return null;
    
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag?.getAttribute('content') || null;
  }, []);

  /**
   * ローカルストレージからトークンを取得
   */
  const getTokenFromStorage = useCallback((): {
    token: string | null;
    expiresAt: number | null;
  } => {
    if (typeof window === 'undefined') return { token: null, expiresAt: null };
    
    try {
      const stored = localStorage.getItem('csrf-token-sync');
      if (stored) {
        const data = JSON.parse(stored);
        // 期限チェック
        if (data.expiresAt && Date.now() < data.expiresAt) {
          return data;
        }
        // 期限切れの場合は削除
        localStorage.removeItem('csrf-token-sync');
      }
    } catch (error) {
      console.error('[useCSRFSync] Failed to read from localStorage:', error);
    }
    
    return { token: null, expiresAt: null };
  }, []);

  /**
   * トークンをローカルストレージに保存
   */
  const saveTokenToStorage = useCallback((token: string, expiresAt: number) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('csrf-token-sync', JSON.stringify({
        token,
        expiresAt,
        savedAt: Date.now()
      }));
    } catch (error) {
      console.error('[useCSRFSync] Failed to save to localStorage:', error);
    }
  }, []);

  /**
   * サーバーから新しいトークンを取得
   */
  const fetchNewToken = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    
    setTokenData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!isMountedRef.current) return;
      
      // トークン情報を更新
      setTokenData({
        token: data.token,
        header: data.header || 'x-csrf-token',
        expiresAt: data.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
        isLoading: false,
        error: null
      });
      
      // ローカルストレージに保存
      if (data.token && data.expiresAt) {
        saveTokenToStorage(data.token, data.expiresAt);
      }
      
      // 再試行カウンターをリセット
      retryCountRef.current = 0;
      
      console.log('[useCSRFSync] Token fetched successfully');
      
    } catch (error) {
      console.error('[useCSRFSync] Failed to fetch token:', error);
      
      if (!isMountedRef.current) return;
      
      setTokenData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch token'
      }));
      
      // 再試行ロジック
      if (mergedOptions.retryOnError && retryCountRef.current < mergedOptions.maxRetries!) {
        retryCountRef.current++;
        console.log(`[useCSRFSync] Retrying... (${retryCountRef.current}/${mergedOptions.maxRetries})`);
        
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchNewToken();
          }
        }, mergedOptions.retryDelay);
      }
    }
  }, [saveTokenToStorage, mergedOptions.retryOnError, mergedOptions.maxRetries, mergedOptions.retryDelay]);

  /**
   * トークンの更新
   */
  const refresh = useCallback(async (): Promise<void> => {
    // 既存のタイマーをクリア
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    await fetchNewToken();
  }, [fetchNewToken]);

  /**
   * 自動更新のスケジューリング
   */
  const scheduleRefresh = useCallback((expiresAt: number) => {
    if (!mergedOptions.autoRefresh || !isMountedRef.current) return;
    
    // 既存のタイマーをクリア
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    const now = Date.now();
    const refreshTime = expiresAt - mergedOptions.refreshBeforeExpiry!;
    const delay = Math.max(0, refreshTime - now);
    
    if (delay > 0) {
      console.log(`[useCSRFSync] Scheduled refresh in ${Math.round(delay / 1000)}s`);
      
      refreshTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          refresh();
        }
      }, delay);
    }
  }, [mergedOptions.autoRefresh, mergedOptions.refreshBeforeExpiry, refresh]);

  /**
   * リクエストヘッダーの生成
   */
  const getHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = {};
    
    if (tokenData.token && tokenData.header) {
      headers[tokenData.header] = tokenData.token;
    }
    
    return headers;
  }, [tokenData.token, tokenData.header]);

  /**
   * 初期化
   */
  useEffect(() => {
    // マウント状態を設定
    isMountedRef.current = true;
    
    // 1. ローカルストレージから取得を試みる
    const stored = getTokenFromStorage();
    if (stored.token && stored.expiresAt) {
      setTokenData(prev => ({
        ...prev,
        token: stored.token,
        expiresAt: stored.expiresAt,
        error: null
      }));
      
      // 自動更新をスケジュール
      scheduleRefresh(stored.expiresAt);
      return;
    }
    
    // 2. Cookieから取得を試みる
    const cookieToken = getTokenFromCookie();
    if (cookieToken) {
      setTokenData(prev => ({
        ...prev,
        token: cookieToken,
        error: null
      }));
      
      // 期限が不明な場合は1時間後に更新
      const defaultExpiry = Date.now() + 60 * 60 * 1000;
      scheduleRefresh(defaultExpiry);
      return;
    }
    
    // 3. メタタグから取得を試みる
    const metaToken = getTokenFromMeta();
    if (metaToken) {
      setTokenData(prev => ({
        ...prev,
        token: metaToken,
        error: null
      }));
      
      // 期限が不明な場合は1時間後に更新
      const defaultExpiry = Date.now() + 60 * 60 * 1000;
      scheduleRefresh(defaultExpiry);
      return;
    }
    
    // 4. トークンが見つからない場合は新規取得
    fetchNewToken();
    
    // クリーンアップ関数
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []); // 初回マウント時のみ実行

  /**
   * トークンの期限が更新されたら自動更新をスケジュール
   */
  useEffect(() => {
    if (tokenData.expiresAt) {
      scheduleRefresh(tokenData.expiresAt);
    }
  }, [tokenData.expiresAt, scheduleRefresh]);

  return {
    ...tokenData,
    refresh,
    getHeaders
  };
}

/**
 * CSRFトークン付きfetch関数
 */
export function useCSRFFetch() {
  const csrf = useCSRFSync();
  
  const csrfFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const method = (options.method || 'GET').toUpperCase();
    
    // GET、HEADリクエストはCSRFトークン不要
    if (method === 'GET' || method === 'HEAD') {
      return fetch(url, options);
    }
    
    // CSRFトークンをヘッダーに追加
    const headers = new Headers(options.headers);
    const csrfHeaders = csrf.getHeaders();
    
    for (const [key, value] of Object.entries(csrfHeaders)) {
      headers.set(key, value as string);
    }
    
    return fetch(url, {
      ...options,
      headers
    });
  }, [csrf]);
  
  return {
    fetch: csrfFetch,
    ...csrf
  };
}