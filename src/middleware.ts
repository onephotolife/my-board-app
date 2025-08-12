import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 保護されたパス（認証が必要）
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/posts/new',
  '/posts/*/edit',  // ワイルドカードパターン
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

// パスが公開されているかチェック
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
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
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // 認証チェック
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