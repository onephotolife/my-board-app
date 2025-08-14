import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { RateLimiter } from '@/lib/security/rate-limiter';
import { InputSanitizer } from '@/lib/security/sanitizer';
import { verifyCSRFToken, createCSRFErrorResponse, getOrCreateCSRFToken } from '@/lib/security/csrf';

// 保護されたパス（認証が必要）
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/board',
  '/board/new',
  '/board/*/edit',  // ワイルドカードパターン
  '/posts/new',
  '/posts/*/edit',  // ワイルドカードパターン
];

// 保護されたAPIエンドポイント（認証が必要）
const protectedApiPaths = [
  '/api/posts',
  '/api/users/profile',
  '/api/users/update',
  '/api/users/delete',
  '/api/admin',
];

// 公開パス（認証不要）
const publicPaths = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/verify-email',
  '/auth/reset-password',
  '/auth/error',
  '/api/auth',
  '/api/register',
  '/api/verify-email',
  '/api/request-reset',
  '/api/reset-password',
  '/api/health',
];

// パスが保護されているかチェック
function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some(path => {
    if (path.includes('*')) {
      // ワイルドカードパターンのマッチング
      const pattern = path.replace('*', '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(pathname);
    }
    return pathname.startsWith(path);
  });
}

// APIパスが保護されているかチェック
function isProtectedApiPath(pathname: string): boolean {
  return protectedApiPaths.some(path => pathname.startsWith(path));
}

// パスが公開されているかチェック
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const startTime = Date.now();
  
  // 静的ファイルはスキップ
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }
  
  // APIルートのセキュリティチェック
  if (pathname.startsWith('/api/')) {
    // レート制限チェック
    const rateLimitResult = await RateLimiter.check(request);
    
    if (!rateLimitResult.allowed) {
      const limitResponse = NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
      
      limitResponse.headers.set('X-RateLimit-Limit', '5');
      limitResponse.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
      limitResponse.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime));
      limitResponse.headers.set('Retry-After', String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)));
      
      console.warn(`Rate limit exceeded: ${request.ip} - ${pathname}`);
      return limitResponse;
    }
    
    // CSRF保護チェック（POST、PUT、DELETE、PATCHリクエスト）
    const method = request.method.toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // CSRF除外パス
      const csrfExcludedPaths = [
        '/api/auth',
        '/api/register',
        '/api/verify-email',
        '/api/request-reset',
        '/api/reset-password',
      ];
      
      const isExcluded = csrfExcludedPaths.some(path => pathname.startsWith(path));
      
      if (!isExcluded) {
        const isValidCSRF = await verifyCSRFToken(request);
        
        if (!isValidCSRF) {
          console.warn(`CSRF token validation failed: ${pathname}`);
          return createCSRFErrorResponse();
        }
      }
    }
  }
  
  // クエリパラメータのサニタイゼーション
  const url = new URL(request.url);
  let paramsSanitized = false;

  searchParams.forEach((value, key) => {
    const sanitized = InputSanitizer.sanitizeText(value);
    if (sanitized !== value) {
      url.searchParams.set(key, sanitized);
      paramsSanitized = true;
      console.warn(`Sanitized query parameter: ${key}`);
    }
  });

  // パラメータが変更された場合、新しいURLにリダイレクト
  if (paramsSanitized) {
    return NextResponse.redirect(url);
  }
  
  const response = NextResponse.next();
  
  // セキュリティヘッダーの設定
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // CSP設定
  if (isDevelopment) {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://api.github.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')
    );
  } else {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://api.github.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; ')
    );
  }
  
  // その他のセキュリティヘッダー
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HTTPS環境でのみStrict-Transport-Securityを設定
  if (!isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // 認証チェック（ページルート）
  if (isProtectedPath(pathname)) {
    // JWTトークンを取得
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      // 未認証の場合、サインインページへリダイレクト
      // 元のURLをcallbackUrlとして保持
      const url = new URL('/auth/signin', request.url);
      
      // 完全なURLをcallbackUrlとして保存（クエリパラメータも含む）
      const callbackUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      url.searchParams.set('callbackUrl', callbackUrl);
      
      return NextResponse.redirect(url);
    }
    
    // メール未確認チェック
    if (token && !token.emailVerified) {
      // メール未確認の場合、確認ページへリダイレクト
      const url = new URL('/auth/verify-email', request.url);
      return NextResponse.redirect(url);
    }
  }
  
  // 認証チェック（APIエンドポイント）
  if (isProtectedApiPath(pathname)) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      // 未認証の場合、401エラーを返す
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // メール未確認の場合
    if (!token.emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required' },
        { status: 403 }
      );
    }
  }
  
  // 認証済みユーザーが認証ページにアクセスした場合
  if (pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (token && token.emailVerified) {
      // callbackUrlがある場合はそこへ、なければダッシュボードへ
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
  }
  
  // レスポンスタイムの記録
  const duration = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need protection
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};