/**
 * Edge Runtime対応 CSRF保護ライブラリ
 * Web Crypto APIを使用してEdge Runtimeで動作
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const CSRF_TOKEN_NAME = 'app-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'app-csrf-token'; // Edge Runtimeでは__Host-プレフィックスを使用しない
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24時間

/**
 * CSRFトークンの生成（Web Crypto API使用）
 */
export async function generateCSRFToken(): Promise<string> {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * CSRFトークンの取得または生成
 */
export async function getOrCreateCSRFToken(): Promise<string> {
  const cookieStore = cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME);
  
  if (existingToken?.value) {
    return existingToken.value;
  }
  
  // 新しいトークンを生成
  const newToken = await generateCSRFToken();
  
  // Cookieに保存
  cookieStore.set(CSRF_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY / 1000,
    path: '/',
  });
  
  return newToken;
}

/**
 * 文字列の安全な比較（タイミング攻撃対策）
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * CSRFトークンの検証
 */
export async function verifyCSRFToken(request: NextRequest): Promise<boolean> {
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
    // Cookieからトークンを取得
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    if (!cookieToken) {
      console.warn('CSRF: Cookie token not found');
      return false;
    }
    
    // リクエストからトークンを取得（ヘッダーまたはボディ）
    let requestToken: string | null = null;
    
    // 1. ヘッダーから取得
    requestToken = request.headers.get(CSRF_HEADER_NAME);
    
    // 2. ボディから取得（JSON）
    if (!requestToken && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.clone().json();
        requestToken = body[CSRF_TOKEN_NAME] || body._csrf || body.csrfToken;
      } catch {
        // JSONパースエラーは無視
      }
    }
    
    // 3. フォームデータから取得
    if (!requestToken && request.headers.get('content-type')?.includes('form-data')) {
      try {
        const formData = await request.clone().formData();
        requestToken = formData.get(CSRF_TOKEN_NAME) as string;
      } catch {
        // フォームデータパースエラーは無視
      }
    }
    
    if (!requestToken) {
      console.warn('CSRF: Request token not found');
      return false;
    }
    
    // トークンの比較（タイミング攻撃対策）
    const isValid = safeCompare(cookieToken, requestToken);
    
    if (!isValid) {
      console.warn('CSRF: Token mismatch');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('CSRF verification error:', error);
    return false;
  }
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
 * CSRFトークンの再生成
 */
export async function regenerateCSRFToken(): Promise<string> {
  const cookieStore = cookies();
  const newToken = await generateCSRFToken();
  
  // 古いトークンを削除
  cookieStore.delete(CSRF_COOKIE_NAME);
  
  // 新しいトークンを設定
  cookieStore.set(CSRF_COOKIE_NAME, newToken, {
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