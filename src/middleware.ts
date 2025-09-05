import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { apiRateLimiter, authRateLimiter } from '@/lib/security/rate-limiter-v2';
import { CSRFProtection } from '@/lib/security/csrf-protection';
import { SanitizerV2 } from '@/lib/security/sanitizer-v2';
// import { auditLogger, AuditEvent } from '@/lib/security/audit-logger';

type AuthTokenLike =
  | { id?: string; email?: string; emailVerified?: boolean; role?: string }
  | null
  | undefined;

// 保護されたパス（認証が必要）
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/board',
  '/board/new',
  '/board/*/edit', // ワイルドカードパターン
  '/posts/new',
  '/posts/*/edit', // ワイルドカードパターン
  '/tags', // タグ一覧ページ
  '/tags/*', // タグ詳細ページ
];

// 保護されたAPIエンドポイント（認証が必要）
const protectedApiPaths = [
  '/api/posts',
  '/api/users/profile',
  '/api/users/update',
  '/api/users/delete',
  '/api/admin',
  '/api/tags', // タグ関連API
];

// 公開パス（認証不要）
// const publicPaths = [
//   '/',
//   '/auth/signin',
//   '/auth/signup',
//   '/auth/verify-email',
//   '/auth/reset-password',
//   '/auth/error',
//   '/api/auth',
//   '/api/register',
//   '/api/verify-email',
//   '/api/request-reset',
//   '/api/reset-password',
//   '/api/health',
// ];

// パスが保護されているかチェック
function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((path) => {
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
  return protectedApiPaths.some((path) => pathname.startsWith(path));
}

// パスが公開されているかチェック
// function isPublicPath(pathname: string): boolean {
//   return publicPaths.some(path => pathname.startsWith(path));
// }

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
    // レート制限除外パス
    const rateLimitExcludedPaths = ['/api/health', '/api/version'];

    // Solution 2 Enhanced: 開発環境で初期化関連エンドポイントのレート制限を除外
    const isDevelopment = process.env.NODE_ENV === 'development';
    const developmentExcludedPaths = [
      '/api/csrf',
      '/api/auth/session',
      '/api/performance',
      '/api/profile', // UserContext無限ループ問題の一時的な対処
    ];

    // 開発環境の除外チェック
    const isDevExcluded =
      isDevelopment && developmentExcludedPaths.some((path) => pathname.startsWith(path));

    // レート制限をスキップするかチェック
    const skipRateLimit = rateLimitExcludedPaths.some((path) => pathname === path) || isDevExcluded;

    // デバッグログ
    if (isDevExcluded) {
      console.warn('[RateLimit] Development exclusion applied:', {
        pathname,
        isDevelopment,
        skipRateLimit: true,
        timestamp: new Date().toISOString(),
      });
    }

    if (!skipRateLimit) {
      // 新しいレート制限チェック（エンドポイント別）
      let rateLimiter = apiRateLimiter;
      // /api/auth/sessionとCSRF関連は通常のAPIレート制限
      if (pathname === '/api/auth/session') {
        // セッションチェックは頻繁にアクセスされるため緩和
        rateLimiter = apiRateLimiter;
      } else if (pathname.startsWith('/api/auth')) {
        rateLimiter = authRateLimiter;
      }

      const identifier =
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const rateLimitResult = await rateLimiter.check(identifier);

      if (!rateLimitResult.allowed) {
        const limitResponse = NextResponse.json(
          {
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
          },
          { status: 429 }
        );

        limitResponse.headers.set('X-RateLimit-Limit', '5');
        limitResponse.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
        limitResponse.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime));
        limitResponse.headers.set(
          'Retry-After',
          String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
        );

        console.warn(
          `Rate limit exceeded: ${request.headers.get('x-forwarded-for') || 'unknown'} - ${pathname}`
        );
        return limitResponse;
      }
    }

    // CSRF保護（有効化）
    const method = request.method.toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfExcludedPaths = [
        '/api/auth',
        '/api/register',
        '/api/verify-email',
        '/api/request-reset',
        '/api/reset-password',
        '/api/csrf/token',
        '/api/performance', // パフォーマンスメトリクス収集用エンドポイント
        '/api/test-csrf', // デバッグ用エンドポイント
        '/api/debug-csrf', // CSRF問題調査用デバッグエンドポイント
        // '/api/users', // CSRF保護を再有効化（コメントアウト）
      ];

      const isExcluded = csrfExcludedPaths.some((path) => pathname.startsWith(path));

      if (!isExcluded) {
        // 開発環境ではCSRF検証をスキップ（警告のみ）
        const isProduction = process.env.NODE_ENV === 'production';
        const isValidCSRF = CSRFProtection.verifyToken(request);

        if (!isValidCSRF) {
          if (!isProduction) {
            // 開発環境では警告のみでリクエストを通す
            console.warn(
              `[CSRF-DEV] Development mode: CSRF token validation failed but allowing request: ${pathname}`
            );
            console.warn(`[CSRF-DEV] NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
          } else {
            // 本番環境では厳格に403エラーを返す
            console.warn(`CSRF token validation failed: ${pathname}`);

            // 監査ログに記録（Edge Runtimeではコンソールログのみ）
            console.error('[AUDIT] CSRF_VIOLATION:', {
              ip:
                request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown',
              userAgent: request.headers.get('user-agent'),
              pathname,
              method,
              severity: 'CRITICAL',
            });

            return CSRFProtection.createErrorResponse();
          }
        }
      }
    }
  }

  // クエリパラメータのサニタイゼーション
  const url = new URL(request.url);
  let paramsSanitized = false;

  searchParams.forEach((value, key) => {
    // callbackUrlは特別処理（サニタイゼーションから除外）
    if (key === 'callbackUrl') {
      try {
        // URLデコードして検証
        const decodedValue = decodeURIComponent(value);

        // 相対URLまたは同一オリジンのみ許可
        if (decodedValue.startsWith('/')) {
          // 相対URLはそのまま許可
          return;
        }

        // 絶対URLの場合は同一オリジンチェック
        const callbackUrl = new URL(decodedValue, request.url);
        const currentUrl = new URL(request.url);

        if (callbackUrl.origin !== currentUrl.origin) {
          // 異なるオリジンへのリダイレクトは削除
          url.searchParams.delete(key);
          paramsSanitized = true;
          console.warn(`Removed cross-origin callbackUrl: ${decodedValue}`);
        }
      } catch {
        // 不正なURLは削除
        url.searchParams.delete(key);
        paramsSanitized = true;
        console.warn(`Removed invalid callbackUrl: ${value}`);
      }
      return;
    }

    // その他のパラメータは従来通りサニタイズ
    const sanitized = SanitizerV2.sanitizeHTML(value);
    if (sanitized !== value) {
      url.searchParams.set(key, sanitized);
      paramsSanitized = true;
      console.warn(`Sanitized query parameter: ${key}`);

      // XSS試行を監査ログに記録（Edge Runtimeではコンソールログのみ）
      console.error('[AUDIT] XSS_ATTEMPT:', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        data: { key, originalValue: value, sanitizedValue: sanitized },
        severity: 'HIGH',
      });
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
        "form-action 'self'",
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
        'upgrade-insecure-requests',
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
    console.warn('🔍 Middleware: 保護されたパス:', pathname);

    // JWTトークンを取得（NextAuth v4対応）
    // デバッグ情報を追加
    const cookieHeader = request.headers.get('cookie');
    console.warn('🍪 [Middleware Debug] クッキーヘッダー:', cookieHeader);

    // E2Eテスト用のモック認証バイパス
    const isMockAuth =
      cookieHeader?.includes('mock-session-token-for-e2e-testing') ||
      cookieHeader?.includes('e2e-mock-auth=mock-session-token-for-e2e-testing');

    let token: AuthTokenLike;
    if (isMockAuth && process.env.NODE_ENV === 'development') {
      // E2Eテスト用のモックトークンを作成
      console.warn('🧪 [E2E-BYPASS] Mock authentication detected for testing');
      token = {
        id: 'mock-user-id',
        email: 'one.photolife+1@gmail.com',
        name: 'E2E Test User',
        emailVerified: true,
        role: 'user',
      } as AuthTokenLike;
    } else {
      token = (await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
        // NextAuth v4用の追加設定
        secureCookie: process.env.NODE_ENV === 'production',
        cookieName:
          process.env.NODE_ENV === 'production'
            ? '__Secure-next-auth.session-token'
            : 'next-auth.session-token',
      })) as AuthTokenLike;
    }

    const t = token as AuthTokenLike;
    console.warn('🎫 Middleware: トークン状態:', {
      exists: !!t,
      id: t?.id,
      email: t?.email,
      emailVerified: t?.emailVerified,
      pathname,
      timestamp: new Date().toISOString(),
    });

    // 🔐 41人天才会議による修正: トークンの有効性を厳密にチェック
    if (!t || !t.id) {
      // 未認証の場合、サインインページへリダイレクト
      // 元のURLをcallbackUrlとして保持
      const url = new URL('/auth/signin', request.url);

      // 完全なURLをcallbackUrlとして保存（クエリパラメータも含む）
      const callbackUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      url.searchParams.set('callbackUrl', callbackUrl);

      console.warn('🚫 Middleware: 未認証のためリダイレクト:', url.toString());
      return NextResponse.redirect(url);
    }

    // メール確認チェック（会員制掲示板として必須）
    if (t && !t.emailVerified) {
      // メール未確認の場合、確認ページへリダイレクト
      const url = new URL('/auth/email-not-verified', request.url);
      console.warn('📧 Middleware: メール未確認のためリダイレクト');
      return NextResponse.redirect(url);
    }
  }

  // 認証チェック（APIエンドポイント）
  if (isProtectedApiPath(pathname)) {
    const cookieHeader = request.headers.get('cookie');
    console.warn('🍪 [Middleware API Debug] クッキーヘッダー:', cookieHeader);

    // E2Eテスト用のモック認証バイパス
    const isMockAuth =
      cookieHeader?.includes('mock-session-token-for-e2e-testing') ||
      cookieHeader?.includes('e2e-mock-auth=mock-session-token-for-e2e-testing');

    let token: AuthTokenLike;
    if (isMockAuth && process.env.NODE_ENV === 'development') {
      // E2Eテスト用のモックトークンを作成
      console.warn('🧪 [E2E-API-BYPASS] Mock authentication detected for API testing');
      token = {
        id: 'mock-user-id',
        email: 'one.photolife+1@gmail.com',
        name: 'E2E Test User',
        emailVerified: true,
        role: 'user',
      } as AuthTokenLike;
    } else {
      token = (await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
        secureCookie: process.env.NODE_ENV === 'production',
        cookieName:
          process.env.NODE_ENV === 'production'
            ? '__Secure-next-auth.session-token'
            : 'next-auth.session-token',
      })) as AuthTokenLike;
    }

    const t = token as AuthTokenLike;
    console.warn('🔍 [Middleware API] 認証チェック:', {
      pathname,
      hasToken: !!t,
      userId: t?.id,
      emailVerified: t?.emailVerified,
      environment: process.env.NODE_ENV,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    });

    if (!t) {
      // 未認証の場合、401エラーを返す
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // メール未確認の場合
    if (!t.emailVerified) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 403 });
    }
  }

  // 🔐 41人天才会議による重要な修正:
  // 認証済みユーザーが認証ページにアクセスしてもリダイレクトしない
  // これにより無限ループを防止
  if (pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup')) {
    const cookieHeader = request.headers.get('cookie');
    console.warn('🍪 [Middleware Auth Debug] クッキーヘッダー:', cookieHeader);

    // E2Eテスト用のモック認証バイパス
    const isMockAuth =
      cookieHeader?.includes('mock-session-token-for-e2e-testing') ||
      cookieHeader?.includes('e2e-mock-auth=mock-session-token-for-e2e-testing');

    let token: AuthTokenLike;
    if (isMockAuth && process.env.NODE_ENV === 'development') {
      // E2Eテスト用のモックトークンを作成
      console.warn('🧪 [E2E-AUTH-BYPASS] Mock authentication detected for auth page testing');
      token = {
        id: 'mock-user-id',
        email: 'one.photolife+1@gmail.com',
        name: 'E2E Test User',
        emailVerified: true,
        role: 'user',
      } as AuthTokenLike;
    } else {
      token = (await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
        secureCookie: process.env.NODE_ENV === 'production',
        cookieName:
          process.env.NODE_ENV === 'production'
            ? '__Secure-next-auth.session-token'
            : 'next-auth.session-token',
      })) as AuthTokenLike;
    }

    const t = token as AuthTokenLike;
    console.warn('🔍 [Middleware] 認証ページアクセス:', {
      pathname,
      hasToken: !!t,
      tokenId: t?.id,
      emailVerified: t?.emailVerified,
      callbackUrl: searchParams.get('callbackUrl'),
      timestamp: new Date().toISOString(),
    });

    // 重要: 認証済みでもサインインページへのアクセスを許可
    // リダイレクトはログイン処理後にクライアント側で実行
    if (t && t.id && t.emailVerified) {
      console.warn('ℹ️ [Middleware] 認証済みユーザーですが、サインインページへのアクセスを許可');
      // リダイレクトせずにページを表示
      return NextResponse.next();
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
