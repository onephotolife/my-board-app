'use client';

import { useState, useEffect } from 'react';

interface CSRFData {
  token: string | null;
  header: string;
  loading: boolean;
  error: Error | null;
}

/**
 * CSRFトークンを取得・管理するカスタムフック
 */
export function useCSRF(): CSRFData {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const CSRF_HEADER_NAME = 'x-csrf-token';

  useEffect(() => {
    const fetchCSRFToken = async () => {
      try {
        // CSRFトークンエンドポイントから取得
        const response = await fetch('/api/csrf', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }

        const data = await response.json();
        setToken(data.token);
        
        // メタタグにも設定（互換性のため）
        let metaTag = document.querySelector('meta[name="app-csrf-token"]');
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', 'app-csrf-token');
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', data.token);
        
      } catch (err) {
        console.error('CSRF token fetch error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        
        // フォールバック: メタタグから取得を試みる
        const metaTag = document.querySelector('meta[name="app-csrf-token"]');
        if (metaTag) {
          const metaToken = metaTag.getAttribute('content');
          if (metaToken) {
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
 * CSRFトークンを含むfetchラッパー
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
  
  // まずクッキーからトークンを取得を試みる
  let token = null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token-public' || name === 'app-csrf-token') {
      token = value;
      break;
    }
  }
  
  // クッキーから取得できない場合はメタタグから取得
  if (!token) {
    const metaTag = document.querySelector('meta[name="app-csrf-token"]');
    token = metaTag?.getAttribute('content');
  }
  
  if (!token) {
    console.warn('CSRF token not found for request:', url);
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
 * フォーム送信用のCSRFトークン付きデータ
 */
export function appendCSRFToken(formData: FormData | Record<string, any>): FormData | Record<string, any> {
  const metaTag = document.querySelector('meta[name="app-csrf-token"]');
  const token = metaTag?.getAttribute('content');
  
  if (token) {
    if (formData instanceof FormData) {
      formData.append('app-csrf-token', token);
    } else {
      return { ...formData, 'app-csrf-token': token };
    }
  }
  
  return formData;
}