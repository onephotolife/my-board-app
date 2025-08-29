/**
 * NextAuth v4 認証ヘルパー
 * STRICT120準拠 - 証拠ベース認証実装
 */

import { NextRequest } from 'next/server';

// デバッグログクラス
class AuthDebugLogger {
  private logs: any[] = [];
  
  log(category: string, data: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      category,
      data,
      module: 'auth-helper'
    };
    this.logs.push(entry);
    console.log('[AUTH-HELPER-DEBUG]', JSON.stringify(entry));
  }
  
  getAll() {
    return this.logs;
  }
  
  clear() {
    this.logs = [];
  }
}

const debugLogger = new AuthDebugLogger();

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  sessionToken?: string;
  csrfToken?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    emailVerified?: boolean;
  };
}

/**
 * NextAuth v4でCredentials Providerを使用してログイン
 */
export async function authenticateWithNextAuth(
  baseUrl: string,
  credentials: AuthCredentials
): Promise<AuthSession> {
  debugLogger.log('auth-start', { 
    baseUrl, 
    email: credentials.email,
    timestamp: new Date().toISOString()
  });

  try {
    // Step 1: CSRFトークンを取得
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!csrfResponse.ok) {
      throw new Error(`CSRF token fetch failed: ${csrfResponse.status}`);
    }

    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    debugLogger.log('csrf-obtained', { 
      csrfToken: csrfToken ? '***REDACTED***' : null,
      status: csrfResponse.status
    });

    // Step 2: Credentials Providerでログイン
    const signInResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        csrfToken: csrfToken,
        json: true,
      }),
      redirect: 'manual',
    });

    debugLogger.log('signin-response', {
      status: signInResponse.status,
      headers: {
        'set-cookie': signInResponse.headers.get('set-cookie') ? '***REDACTED***' : null,
        'content-type': signInResponse.headers.get('content-type')
      }
    });

    // Step 3: セッションクッキーを取得
    const setCookieHeader = signInResponse.headers.get('set-cookie');
    let sessionToken: string | undefined;
    
    if (setCookieHeader) {
      const matches = setCookieHeader.match(/next-auth\.session-token=([^;]+)/);
      if (matches && matches[1]) {
        sessionToken = matches[1];
        debugLogger.log('session-token-extracted', { 
          tokenPresent: true,
          tokenLength: sessionToken.length
        });
      }
    }

    // Step 4: セッション情報を取得
    if (sessionToken) {
      const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
        method: 'GET',
        headers: {
          'Cookie': `next-auth.session-token=${sessionToken}`,
          'Accept': 'application/json',
        },
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        
        debugLogger.log('session-retrieved', {
          user: sessionData.user ? {
            id: sessionData.user.id,
            email: sessionData.user.email,
            emailVerified: sessionData.user.emailVerified
          } : null
        });

        return {
          sessionToken,
          csrfToken,
          user: sessionData.user
        };
      }
    }

    // Fallback: セッショントークンが取得できない場合でもCSRFトークンは返す
    debugLogger.log('auth-partial-success', { 
      csrfToken: '***PRESENT***',
      sessionToken: false
    });

    return {
      csrfToken,
      sessionToken: undefined
    };

  } catch (error) {
    debugLogger.log('auth-error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * 認証済みリクエストを作成
 */
export function createAuthenticatedRequest(
  url: string,
  session: AuthSession,
  options: RequestInit = {}
): Request {
  const headers = new Headers(options.headers);
  
  if (session.sessionToken) {
    headers.set('Cookie', `next-auth.session-token=${session.sessionToken}`);
  }
  
  if (session.csrfToken) {
    headers.set('X-CSRF-Token', session.csrfToken);
  }

  debugLogger.log('request-created', {
    url,
    hasSessionToken: !!session.sessionToken,
    hasCsrfToken: !!session.csrfToken,
    method: options.method || 'GET'
  });

  return new Request(url, {
    ...options,
    headers
  });
}

/**
 * テスト用モックセッション作成
 */
export function createMockSession(userId: string, email: string): AuthSession {
  return {
    sessionToken: `mock-session-${userId}`,
    csrfToken: 'mock-csrf-token',
    user: {
      id: userId,
      email: email,
      name: 'Test User',
      emailVerified: true
    }
  };
}

export { debugLogger };