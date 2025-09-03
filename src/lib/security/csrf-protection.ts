/**
 * CSRF保護機能
 * Double Submit Cookie方式の実装
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly COOKIE_NAME = 'app-csrf-token';
  private static readonly HEADER_NAME = 'x-csrf-token';
  private static readonly SESSION_COOKIE_NAME = 'app-csrf-session';
  
  /**
   * CSRFトークンの生成（Edge Runtime対応）
   */
  static generateToken(): string {
    // Edge RuntimeではWeb Crypto APIを使用
    const array = new Uint8Array(this.TOKEN_LENGTH);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(array);
    } else {
      // フォールバック（開発環境など）
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * セッショントークンの生成（Edge Runtime対応）
   */
  static generateSessionToken(): string {
    // Edge RuntimeではWeb Crypto APIを使用
    const array = new Uint8Array(16);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(array);
    } else {
      // フォールバック（開発環境など）
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * CSRFトークンをレスポンスに設定
   */
  static setToken(response: NextResponse): string {
    const token = this.generateToken();
    const sessionToken = this.generateSessionToken();
    
    // CSRFトークンをCookieに設定
    response.cookies.set(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24時間
    });
    
    // セッショントークンも設定
    response.cookies.set(this.SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    
    return token;
  }
  
  /**
   * リクエストからトークンを取得
   */
  static getTokenFromRequest(request: NextRequest): {
    cookieToken?: string;
    headerToken?: string;
    sessionToken?: string;
  } {
    const cookieToken = request.cookies.get(this.COOKIE_NAME)?.value;
    const headerToken = request.headers.get(this.HEADER_NAME) || 
                       request.headers.get('app-csrf-token');
    const sessionToken = request.cookies.get(this.SESSION_COOKIE_NAME)?.value;
    
    return { cookieToken, headerToken, sessionToken };
  }
  
  /**
   * CSRFトークンの検証
   */
  static verifyToken(request: NextRequest): boolean {
    // GETリクエストはスキップ
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return true;
    }
    
    const { cookieToken, headerToken, sessionToken } = this.getTokenFromRequest(request);
    
    // PRIORITY-2-DEBUG: CSRFトークンの詳細ログ
    console.warn('[CSRF-P2-DEBUG] Token validation details:', {
      path: request.nextUrl.pathname,
      method: request.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      hasSession: !!sessionToken,
      cookieTokenFull: cookieToken || 'null',
      headerTokenFull: headerToken || 'null',
      cookieLength: cookieToken?.length || 0,
      headerLength: headerToken?.length || 0,
      solution: 'PRIORITY-2-TOKEN-SYNC'
    });
    
    // トークンが存在しない場合
    if (!cookieToken || !headerToken || !sessionToken) {
      console.warn('[CSRF] Missing tokens:', {
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
        hasSession: !!sessionToken,
        cookieTokenSample: cookieToken ? cookieToken.substring(0, 10) + '...' : 'null',
        headerTokenSample: headerToken ? headerToken.substring(0, 10) + '...' : 'null',
        sessionTokenSample: sessionToken ? sessionToken.substring(0, 10) + '...' : 'null',
        path: request.nextUrl.pathname,
        method: request.method,
      });
      return false;
    }
    
    // トークンの一致を確認
    // Edge Runtimeではcrypto.timingSafeEqualが使えないため、
    // 単純な文字列比較を使用（本番環境では要改善）
    const isValid = cookieToken === headerToken;
    
    if (!isValid) {
      console.warn('[CSRF] Token mismatch:', {
        cookieTokenSample: cookieToken.substring(0, 10) + '...',
        headerTokenSample: headerToken.substring(0, 10) + '...',
        path: request.nextUrl.pathname,
        method: request.method,
      });
    }
    
    return isValid;
  }
  
  /**
   * CSRFエラーレスポンスの生成
   */
  static createErrorResponse(message?: string): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: message || 'CSRF token validation failed',
          code: 'CSRF_VALIDATION_FAILED',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 403 }
    );
  }
  
  /**
   * クライアント用トークン取得エンドポイント
   */
  static async getTokenForClient(request: NextRequest): Promise<NextResponse> {
    const response = NextResponse.json({
      success: true,
      csrfToken: this.generateToken(),
    });
    
    this.setToken(response);
    return response;
  }
  
  /**
   * ミドルウェア用ヘルパー
   */
  static middleware(request: NextRequest): NextResponse | null {
    // 除外パス
    const excludePaths = [
      '/api/auth',
      '/api/csrf/token',
      '/_next',
      '/favicon.ico',
    ];
    
    const pathname = request.nextUrl.pathname;
    
    // 除外パスはスキップ
    if (excludePaths.some(path => pathname.startsWith(path))) {
      return null;
    }
    
    // CSRF検証
    if (!this.verifyToken(request)) {
      return this.createErrorResponse();
    }
    
    return null;
  }
}

// シングルトンインスタンス
export const csrf = CSRFProtection;