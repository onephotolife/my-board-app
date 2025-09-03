'use client';

import { useState, useEffect } from 'react';

interface CSRFData {
  token: string | null;
  header: string;
  loading: boolean;
  error: Error | null;
}

/**
 * 新CSRFシステム（csrf-token-public）からトークンを取得
 */
function getCSRFTokenFromCookie(): string | null {
  if (typeof window === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token-public') {
      console.warn('[useCSRF] Found csrf-token-public:', value ? value.substring(0, 10) + '...' : 'null');
      return value || null;
    }
  }
  console.warn('[useCSRF] csrf-token-public not found in cookies');
  return null;
}

/**
 * CSRFトークンを取得・管理するカスタムフック（新システム優先）
 */
export function useCSRF(): CSRFData {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const CSRF_HEADER_NAME = 'x-csrf-token';

  useEffect(() => {
    const fetchCSRFToken = async () => {
      try {
        console.warn('[useCSRF] Starting token fetch process...');
        
        // 優先: 新CSRFシステムのクッキーから取得
        const cookieToken = getCSRFTokenFromCookie();
        
        if (cookieToken) {
          console.warn('[useCSRF] Using token from csrf-token-public cookie');
          setToken(cookieToken);
          setError(null);
          return;
        }
        
        console.warn('[useCSRF] Cookie token not found, fetching from /api/csrf...');
        
        // フォールバック: /api/csrfエンドポイントから取得（新システム）
        const response = await fetch('/api/csrf', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch CSRF token: ${response.status}`);
        }

        const data = await response.json();
        console.warn('[useCSRF] Fetched token from /api/csrf:', data.token ? data.token.substring(0, 10) + '...' : 'null');
        setToken(data.token);
        
        // 再度クッキーを確認（APIコール後にセットされている可能性）
        setTimeout(() => {
          const newCookieToken = getCSRFTokenFromCookie();
          if (newCookieToken && newCookieToken !== data.token) {
            console.warn('[useCSRF] Cookie updated after API call, using cookie token');
            setToken(newCookieToken);
          }
        }, 100);
        
      } catch (err) {
        console.error('[useCSRF] CSRF token fetch error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        
        // 最終フォールバック: 旧システムのメタタグから取得
        const metaTag = document.querySelector('meta[name="app-csrf-token"]');
        if (metaTag) {
          const metaToken = metaTag.getAttribute('content');
          if (metaToken) {
            console.warn('[useCSRF] Using fallback meta tag token');
            setToken(metaToken);
            setError(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCSRFToken();
  }, []);

  return {
    token,
    header: CSRF_HEADER_NAME,
    loading,
    error,
  };
}

/**
 * CSRFトークンを含むfetchラッパー（新システム統一）
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  
  // GETリクエストはCSRFトークン不要
  if (method === 'GET' || method === 'HEAD') {
    return fetch(url, options);
  }
  
  console.warn(`[csrfFetch] Processing ${method} request to ${url}`);
  
  // 新CSRFシステムからトークンを取得
  let token = getCSRFTokenFromCookie();
  
  // フォールバック: 旧システムのメタタグから取得
  if (!token) {
    const metaTag = document.querySelector('meta[name="app-csrf-token"]');
    token = metaTag?.getAttribute('content');
    if (token) {
      console.warn('[csrfFetch] Using fallback meta tag token');
    }
  }
  
  if (!token) {
    console.warn('[csrfFetch] CSRF token not found for request:', url);
  } else {
    console.warn('[csrfFetch] Using token:', token.substring(0, 10) + '...');
  }
  
  // ヘッダーにCSRFトークンを追加
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('x-csrf-token', token);
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
}

/**
 * フォーム送信用のCSRFトークン付きデータ（新システム統一）
 */
export function appendCSRFToken(formData: FormData | Record<string, any>): FormData | Record<string, any> {
  console.warn('[appendCSRFToken] Processing form data...');
  
  // 新CSRFシステムからトークンを取得
  let token = getCSRFTokenFromCookie();
  
  // フォールバック: 旧システムのメタタグから取得
  if (!token) {
    const metaTag = document.querySelector('meta[name="app-csrf-token"]');
    token = metaTag?.getAttribute('content');
    if (token) {
      console.warn('[appendCSRFToken] Using fallback meta tag token');
    }
  }
  
  if (token) {
    console.warn('[appendCSRFToken] Appending token:', token.substring(0, 10) + '...');
    if (formData instanceof FormData) {
      formData.append('csrf-token', token);
    } else {
      return { ...formData, 'csrf-token': token };
    }
  } else {
    console.warn('[appendCSRFToken] CSRF token not found');
  }
  
  return formData;
}