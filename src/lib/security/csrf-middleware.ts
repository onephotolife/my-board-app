import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { 
  getCSRFSyncManager, 
  generateCSRFTokenForRequest,
  verifyCSRFTokenForRequest,
  CSRFTokenInfo
} from './csrf-sync-manager';

/**
 * CSRF保護ミドルウェア設定
 */
export interface CSRFMiddlewareConfig {
  excludePaths?: string[];           // 除外するパス
  cookieName?: string;               // Cookieの名前
  headerName?: string;               // ヘッダーの名前
  enableSyncManager?: boolean;       // SyncManager有効化
  fallbackToLegacy?: boolean;       // レガシー実装へのフォールバック
  developmentBypass?: boolean;      // 開発環境バイパス
}

const DEFAULT_CONFIG: CSRFMiddlewareConfig = {
  excludePaths: [
    '/api/auth',
    '/api/health',
    '/api/register',
    '/api/verify-email',
    '/api/csrf'
  ],
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  enableSyncManager: true,
  fallbackToLegacy: true,
  developmentBypass: process.env.NODE_ENV === 'development'
};

/**
 * セッションIDの取得
 */
async function getSessionId(req: NextRequest): Promise<string | null> {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    });
    
    if (token) {
      return token.sub as string || token.id as string;
    }
  } catch (error) {
    console.error('[CSRF-MW] Failed to get session:', error);
  }
  
  return null;
}

/**
 * リクエストからCSRFトークンを抽出
 */
async function extractCSRFToken(
  req: NextRequest,
  config: CSRFMiddlewareConfig
): Promise<string | null> {
  // 1. ヘッダーから取得
  let token = req.headers.get(config.headerName!);
  if (token) return token;

  // 2. Cookieから取得
  const cookieToken = req.cookies.get(config.cookieName!)?.value;
  if (cookieToken) return cookieToken;

  // 3. ボディから取得（JSONの場合）
  if (req.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await req.clone().json();
      token = body._csrf || body.csrfToken || body[config.cookieName!];
      if (token) return token;
    } catch {
      // JSONパースエラーは無視
    }
  }

  // 4. フォームデータから取得
  if (req.headers.get('content-type')?.includes('form-data')) {
    try {
      const formData = await req.clone().formData();
      token = formData.get('_csrf') as string || 
              formData.get('csrfToken') as string ||
              formData.get(config.cookieName!) as string;
      if (token) return token;
    } catch {
      // フォームデータパースエラーは無視
    }
  }

  return null;
}

/**
 * レガシーCSRF検証（フォールバック用）
 */
async function legacyVerifyCSRFToken(
  req: NextRequest,
  token: string
): Promise<boolean> {
  // Cookieから取得して比較（Double Submit Cookie Pattern）
  const cookieTokens = [
    'app-csrf-token',
    'csrf-token-public',
    '__Host-csrf'
  ];

  for (const cookieName of cookieTokens) {
    const cookieToken = req.cookies.get(cookieName)?.value;
    if (cookieToken && cookieToken === token) {
      return true;
    }
  }

  return false;
}

/**
 * CSRFトークンの検証ミドルウェア
 */
export async function verifyCSRFMiddleware(
  req: NextRequest,
  config: CSRFMiddlewareConfig = DEFAULT_CONFIG
): Promise<{ valid: boolean; error?: string }> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // GET、HEAD、OPTIONSリクエストはスキップ
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // 除外パスのチェック
  const pathname = req.nextUrl.pathname;
  if (mergedConfig.excludePaths?.some(path => pathname.startsWith(path))) {
    return { valid: true };
  }

  // 開発環境バイパス
  if (mergedConfig.developmentBypass && process.env.NODE_ENV === 'development') {
    console.warn('[CSRF-MW] Development bypass enabled');
    return { valid: true };
  }

  // トークンの抽出
  const token = await extractCSRFToken(req, mergedConfig);
  if (!token) {
    return { valid: false, error: 'CSRF token not found' };
  }

  // SyncManagerを使用した検証
  if (mergedConfig.enableSyncManager) {
    try {
      const sessionId = await getSessionId(req);
      if (!sessionId && !mergedConfig.fallbackToLegacy) {
        return { valid: false, error: 'Session not found' };
      }

      if (sessionId) {
        const metadata: CSRFTokenInfo['metadata'] = {
          ipAddress: req.headers.get('x-forwarded-for') || req.ip || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          requestUrl: req.url
        };

        const isValid = await verifyCSRFTokenForRequest(token, sessionId, metadata);
        if (isValid) {
          return { valid: true };
        }
      }
    } catch (error) {
      console.error('[CSRF-MW] SyncManager verification error:', error);
    }
  }

  // レガシー実装へのフォールバック
  if (mergedConfig.fallbackToLegacy) {
    const isValid = await legacyVerifyCSRFToken(req, token);
    if (isValid) {
      console.log('[CSRF-MW] Fallback to legacy verification succeeded');
      return { valid: true };
    }
  }

  return { valid: false, error: 'CSRF token validation failed' };
}

/**
 * CSRFトークン生成エンドポイントのハンドラー
 */
export async function handleCSRFTokenGeneration(
  req: NextRequest
): Promise<NextResponse> {
  try {
    const sessionId = await getSessionId(req);
    
    // SyncManagerを使用してトークンを生成
    const { token, expiresAt } = await generateCSRFTokenForRequest(sessionId || undefined);
    
    // レスポンスの作成
    const response = NextResponse.json({
      token,
      header: 'x-csrf-token',
      expiresAt,
      message: 'CSRF token generated successfully'
    });

    // Cookieの設定
    const maxAge = Math.floor((expiresAt - Date.now()) / 1000);
    
    // httpOnlyクッキー（サーバー検証用）
    response.cookies.set({
      name: 'csrf-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge
    });

    // 公開クッキー（JavaScript読み取り用）
    response.cookies.set({
      name: 'csrf-token-public',
      value: token,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge
    });

    // レスポンスヘッダーにもトークンを含める
    response.headers.set('X-CSRF-Token', token);

    return response;
  } catch (error) {
    console.error('[CSRF-MW] Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

/**
 * CSRFエラーレスポンスの生成
 */
export function createCSRFErrorResponse(
  error: string = 'CSRF token validation failed'
): NextResponse {
  return NextResponse.json(
    {
      error,
      message: 'セキュリティトークンが無効です。ページを更新してから再度お試しください。',
      code: 'CSRF_VALIDATION_FAILED'
    },
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
}

/**
 * APIルートハンドラーのラッパー（CSRF保護付き）
 */
export function withCSRFProtection<T extends (...args: any[]) => any>(
  handler: T,
  config?: CSRFMiddlewareConfig
): T {
  return (async (req: NextRequest, ...args: any[]) => {
    const result = await verifyCSRFMiddleware(req, config);
    
    if (!result.valid) {
      return createCSRFErrorResponse(result.error);
    }
    
    return handler(req, ...args);
  }) as T;
}

/**
 * CSRFトークンの統計情報を取得
 */
export async function getCSRFStats() {
  const manager = getCSRFSyncManager();
  return await manager.getStats();
}