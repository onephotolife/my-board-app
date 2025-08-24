/**
 * CSRF保護機能
 * Double Submit Cookie方式の実装
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly COOKIE_NAME = 'csrf-token';
  private static readonly HEADER_NAME = 'x-csrf-token';
  private static readonly SESSION_COOKIE_NAME = 'csrf-session';
  
  /**
   * CSRFトークンの生成
   */
  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }
  
  /**
   * セッショントークンの生成
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(16).toString('hex');
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
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24時間
    });
    
    // セッショントークンも設定
    response.cookies.set(this.SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
                       request.headers.get('csrf-token');
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
    
    // トークンが存在しない場合
    if (!cookieToken || !headerToken || !sessionToken) {
      console.warn('[CSRF] Missing tokens:', {
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
        hasSession: !!sessionToken,
        path: request.nextUrl.pathname,
        method: request.method,
      });
      return false;
    }
    
    // トークンの一致を確認（タイミング攻撃対策）
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(cookieToken),
        Buffer.from(headerToken)
      );
      
      if (!isValid) {
        console.warn('[CSRF] Token mismatch:', {
          path: request.nextUrl.pathname,
          method: request.method,
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('[CSRF] Verification error:', error);
      return false;
    }
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