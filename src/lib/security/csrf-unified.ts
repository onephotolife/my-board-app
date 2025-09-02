/**
 * 統一CSRFミドルウェア
 * Edge Runtime対応版
 * STRICT120プロトコル準拠
 */

import { NextRequest, NextResponse } from 'next/server';

export class UnifiedCSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly COOKIE_NAME = 'app-csrf-token';
  private static readonly HEADER_NAME = 'x-csrf-token';
  private static readonly SESSION_COOKIE_NAME = 'app-csrf-session';
  
  /**
   * CSRFトークンの生成（Edge Runtime対応）
   */
  static generateToken(): string {
    console.log('[CSRF-UNIFIED-DEBUG] Generating new token');
    const array = new Uint8Array(this.TOKEN_LENGTH);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(array);
    } else {
      // フォールバック
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    console.log('[CSRF-UNIFIED-DEBUG] Token generated:', token.substring(0, 10) + '...');
    return token;
  }
  
  /**
   * セッショントークンの生成（Edge Runtime対応）
   */
  static generateSessionToken(): string {
    const array = new Uint8Array(16);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Edge Runtime対応の安全な文字列比較
   */
  static safeCompare(a: string, b: string): boolean {
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
   * CSRFトークンをレスポンスに設定
   */
  static setToken(response: NextResponse): string {
    const token = this.generateToken();
    const sessionToken = this.generateSessionToken();
    
    console.log('[CSRF-UNIFIED-DEBUG] Setting tokens in response');
    
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
    bodyToken?: string;
  } {
    const cookieToken = request.cookies.get(this.COOKIE_NAME)?.value;
    const headerToken = request.headers.get(this.HEADER_NAME) || 
                       request.headers.get('app-csrf-token');
    const sessionToken = request.cookies.get(this.SESSION_COOKIE_NAME)?.value;
    
    let bodyToken: string | undefined;
    
    // ボディからトークンを取得（必要に応じて）
    // 注意: bodyの読み取りは副作用があるため、慎重に扱う
    
    return { cookieToken, headerToken, sessionToken, bodyToken };
  }
  
  /**
   * CSRFトークンの検証（三層検証）
   */
  static verifyToken(request: NextRequest): boolean {
    // GETリクエストはスキップ
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      console.log('[CSRF-UNIFIED-DEBUG] Skipping GET/HEAD/OPTIONS request');
      return true;
    }
    
    // 除外パス
    const pathname = request.nextUrl.pathname;
    const excludePaths = [
      '/api/auth',
      '/api/csrf/token',
      '/_next',
      '/favicon.ico',
    ];
    
    if (excludePaths.some(path => pathname.startsWith(path))) {
      console.log('[CSRF-UNIFIED-DEBUG] Excluded path:', pathname);
      return true;
    }
    
    const { cookieToken, headerToken, sessionToken } = this.getTokenFromRequest(request);
    
    // デバッグログ
    console.log('[CSRF-UNIFIED-DEBUG] Verification details:', {
      path: pathname,
      method: request.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      hasSession: !!sessionToken,
      cookieTokenSample: cookieToken ? cookieToken.substring(0, 10) + '...' : 'null',
      headerTokenSample: headerToken ? headerToken.substring(0, 10) + '...' : 'null',
    });
    
    // 三層検証
    // 1. Cookieトークンが存在する
    if (!cookieToken) {
      console.warn('[CSRF-UNIFIED-DEBUG] Missing cookie token');
      return false;
    }
    
    // 2. セッショントークンが存在する
    if (!sessionToken) {
      console.warn('[CSRF-UNIFIED-DEBUG] Missing session token');
      return false;
    }
    
    // 3. ヘッダートークンがCookieトークンと一致する
    if (!headerToken) {
      console.warn('[CSRF-UNIFIED-DEBUG] Missing header token');
      return false;
    }
    
    // 安全な比較
    const isValid = this.safeCompare(cookieToken, headerToken);
    
    if (!isValid) {
      console.warn('[CSRF-UNIFIED-DEBUG] Token mismatch');
      return false;
    }
    
    console.log('[CSRF-UNIFIED-DEBUG] CSRF validation passed');
    return true;
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
    if (!this.verifyToken(request)) {
      return this.createErrorResponse();
    }
    return null;
  }
}

// シングルトンインスタンス
export const csrfUnified = UnifiedCSRFProtection;