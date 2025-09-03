import crypto from 'crypto';

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

/**
 * CSRF保護ライブラリ
 * Double Submit Cookie パターンを使用
 */

const CSRF_TOKEN_NAME = 'app-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = '__Host-csrf';
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24時間

/**
 * CSRFトークンの生成
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * CSRFトークンのハッシュ化
 */
function hashToken(token: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('hex');
}

/**
 * CSRFトークンの取得または生成
 */
export async function getOrCreateCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const csrfCookieName = process.env.NODE_ENV === 'production' ? CSRF_COOKIE_NAME : 'app-csrf-token';
  const existingToken = cookieStore.get(csrfCookieName);
  
  if (existingToken?.value) {
    return existingToken.value;
  }
  
  // 新しいトークンを生成
  const newToken = generateCSRFToken();
  
  // Cookieに保存（httpOnly, secure, sameSite=strict）
  // 注意: __Host- プレフィックスはHTTPS環境でのみ使用可能
  cookieStore.set(csrfCookieName, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY / 1000,
    path: '/',
  });
  
  return newToken;
}

/**
 * CSRFトークンの検証
 */
export async function verifyCSRFToken(
  request: NextRequest,
  secret: string = process.env.NEXTAUTH_SECRET || 'default-secret'
): Promise<boolean> {
  // GET、HEAD、OPTIONSリクエストはスキップ
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }
  
  // APIルート以外はスキップ
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/api/')) {
    return true;
  }
  
  // 除外するAPIエンドポイント（認証関連など）
  const excludedPaths = [
    '/api/auth',
    '/api/health',
    '/api/register',
    '/api/verify-email',
  ];
  
  if (excludedPaths.some(path => pathname.startsWith(path))) {
    return true;
  }
  
  try {
    // 🔍 詳細デバッグ: Cookie解析の詳細ログを追加
    const rawCookieHeader = request.headers.get('cookie') || '';
    console.log('[CSRF-DEBUG] Raw cookie header:', rawCookieHeader.substring(0, 200) + '...');
    
    // NextRequest.cookiesの全取得を試行
    const allCookies = new Map();
    request.cookies.getAll().forEach(cookie => {
      allCookies.set(cookie.name, cookie.value);
      console.log(`[CSRF-DEBUG] Found cookie: ${cookie.name}=${cookie.value.substring(0, 10)}...`);
    });
    
    // Cookieからトークンを取得（新CSRFシステムを最優先）
    let cookieToken = null;
    const cookieNames = [
      'csrf-token-public',  // 🔧 新CSRFシステムを最優先
      'csrf-token',         // 新システムのHttpOnlyクッキー
      process.env.NODE_ENV === 'production' ? CSRF_COOKIE_NAME : 'app-csrf-token', // 旧システムをフォールバック
      'app-csrf-token'      // 旧システムのフォールバック2
    ];
    
    console.log('[CSRF-DEBUG] Looking for cookies:', cookieNames);
    
    for (const cookieName of cookieNames) {
      const token = request.cookies.get(cookieName)?.value;
      console.log(`[CSRF-DEBUG] Checking ${cookieName}: ${token ? token.substring(0, 10) + '...' : 'null'}`);
      if (token) {
        cookieToken = token;
        console.log(`[CSRF-DEBUG] Found token in cookie: ${cookieName}`);
        break;
      }
    }
    
    // リクエストからトークンを取得（ヘッダーまたはボディ）
    let requestToken: string | null = null;
    const sessionToken: string | null = null;
    
    // 1. ヘッダーから取得
    requestToken = request.headers.get(CSRF_HEADER_NAME);
    console.log(`[CSRF-DEBUG] Header token (${CSRF_HEADER_NAME}):`, requestToken ? requestToken.substring(0, 10) + '...' : 'null');
    
    // 2. ボディから取得（JSON）
    if (!requestToken && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.clone().json();
        requestToken = body[CSRF_TOKEN_NAME] || body._csrf || body.csrfToken;
        console.log('[CSRF-DEBUG] JSON body token:', requestToken ? requestToken.substring(0, 10) + '...' : 'null');
      } catch {
        console.log('[CSRF-DEBUG] JSON body parse failed');
      }
    }
    
    // 3. フォームデータから取得
    if (!requestToken && request.headers.get('content-type')?.includes('form-data')) {
      try {
        const formData = await request.clone().formData();
        requestToken = formData.get(CSRF_TOKEN_NAME) as string;
        console.log('[CSRF-DEBUG] Form data token:', requestToken ? requestToken.substring(0, 10) + '...' : 'null');
      } catch {
        console.log('[CSRF-DEBUG] Form data parse failed');
      }
    }

    // 結果のログ出力
    console.log('[CSRF] Missing tokens:', {
      hasCookie: !!cookieToken,
      hasHeader: !!requestToken,
      hasSession: !!sessionToken,
      cookieTokenSample: cookieToken ? cookieToken.substring(0, 10) + '...' : 'null',
      headerTokenSample: requestToken ? requestToken.substring(0, 10) + '...' : 'null',
      sessionTokenSample: sessionToken ? sessionToken.substring(0, 10) + '...' : 'null',
      path: pathname,
      method: request.method
    });
    
    if (!cookieToken) {
      console.warn('CSRF: Cookie token not found in any of:', cookieNames);
      console.warn('[CSRF-DEBUG] Available cookies:', Array.from(allCookies.keys()));
      return false;
    }
    
    if (!requestToken) {
      console.warn('CSRF: Request token not found');
      return false;
    }
    
    // トークンの比較（タイミング攻撃対策）
    if (process.env.NODE_ENV === 'development') {
      console.log('[CSRF] Token comparison:', {
        cookieToken: cookieToken.substring(0, 10) + '...',
        requestToken: requestToken.substring(0, 10) + '...',
        cookieTokenLength: cookieToken.length,
        requestTokenLength: requestToken.length,
        tokensMatch: cookieToken === requestToken,
        path: pathname,
        method: request.method
      });
    }
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(requestToken)
    );
    
    if (!isValid) {
      console.warn('[CSRF] Token mismatch:', {
        cookieTokenSample: cookieToken.substring(0, 10) + '...',
        headerTokenSample: requestToken.substring(0, 10) + '...',
        path: pathname,
        method: request.method
      });
      
      // 開発環境ではCSRFトークン不一致でも警告だけ出して通す
      if (process.env.NODE_ENV === 'development') {
        console.warn('[CSRF-DEV] Development mode: CSRF token validation failed but allowing request:', pathname);
        console.warn('[CSRF-DEV] NODE_ENV:', process.env.NODE_ENV);
        return true; // 🔧 開発環境では通す（デバッグ用）
      }
      return false;
    }
    
    console.log('[CSRF-SUCCESS] Token validation successful');
    return true;
  } catch (error) {
    console.error('CSRF verification error:', error);
    return false;
  }
}

/**
 * CSRFトークンをレスポンスヘッダーに設定
 */
export function setCSRFHeader(response: Response, token: string): void {
  response.headers.set('X-CSRF-Token', token);
}

/**
 * CSRFエラーレスポンスの生成
 */
export function createCSRFErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'CSRF token validation failed',
      message: 'セキュリティトークンが無効です。ページを更新してから再度お試しください。',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * React Hook用: CSRFトークンの取得
 * クライアントサイドで使用
 */
export function useCSRFToken(): { token: string | null; header: string } {
  if (typeof window === 'undefined') {
    return { token: null, header: CSRF_HEADER_NAME };
  }
  
  // メタタグからトークンを取得
  const metaTag = document.querySelector('meta[name="app-csrf-token"]');
  const token = metaTag?.getAttribute('content') || null;
  
  // Cookieから取得（フォールバック）
  if (!token) {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(c => c.trim().startsWith(CSRF_COOKIE_NAME));
    if (csrfCookie) {
      return {
        token: csrfCookie.split('=')[1],
        header: CSRF_HEADER_NAME,
      };
    }
  }
  
  return { token, header: CSRF_HEADER_NAME };
}

/**
 * Fetch APIのラッパー（CSRF対応）
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  
  // GETリクエストはCSRFトークン不要
  if (method === 'GET' || method === 'HEAD') {
    return fetch(url, options);
  }
  
  // CSRFトークンを取得
  const { token, header } = useCSRFToken();
  
  if (!token) {
    console.warn('CSRF token not found for request:', url);
  }
  
  // ヘッダーにCSRFトークンを追加
  const headers = new Headers(options.headers);
  if (token) {
    headers.set(header, token);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * CSRFトークンの再生成（セキュリティ強化）
 */
export async function regenerateCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const newToken = generateCSRFToken();
  const csrfCookieName = process.env.NODE_ENV === 'production' ? CSRF_COOKIE_NAME : 'app-csrf-token';
  
  // 古いトークンを削除
  cookieStore.delete(csrfCookieName);
  
  // 新しいトークンを設定
  cookieStore.set(csrfCookieName, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY / 1000,
    path: '/',
  });
  
  return newToken;
}

/**
 * CSRFトークンの検証ミドルウェア（高階関数）
 */
export function withCSRFProtection<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (req: NextRequest, ...args: any[]) => {
    const isValid = await verifyCSRFToken(req);
    
    if (!isValid) {
      return createCSRFErrorResponse();
    }
    
    return handler(req, ...args);
  }) as T;
}