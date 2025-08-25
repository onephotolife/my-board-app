import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * CSRF問題調査用のデバッグエンドポイント
 */
export async function POST(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
  };

  try {
    // 1. ヘッダー情報
    debugInfo.headers = {
      'x-csrf-token': request.headers.get('x-csrf-token'),
      'content-type': request.headers.get('content-type'),
      'user-agent': request.headers.get('user-agent'),
      'cookie': request.headers.get('cookie') ? 'present' : 'missing',
    };

    // 2. クッキー情報
    debugInfo.cookies = {
      'app-csrf-token': request.cookies.get('app-csrf-token')?.value ? 'present' : 'missing',
      'app-csrf-session': request.cookies.get('app-csrf-session')?.value ? 'present' : 'missing',
      'session-token': request.cookies.get('next-auth.session-token')?.value ? 'present' : 'missing',
      'secure-session-token': request.cookies.get('__Secure-next-auth.session-token')?.value ? 'present' : 'missing',
    };

    // 3. NextAuth認証確認
    try {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      });
      
      debugInfo.auth = {
        hasToken: !!token,
        userId: token?.id || token?.sub,
        email: token?.email,
        emailVerified: token?.emailVerified,
        tokenType: token ? typeof token : 'null',
      };
    } catch (authError) {
      debugInfo.auth = {
        error: 'Auth check failed',
        message: authError instanceof Error ? authError.message : 'Unknown auth error',
      };
    }

    // 4. CSRF検証シミュレーション
    const cookieToken = request.cookies.get('app-csrf-token')?.value;
    const headerToken = request.headers.get('x-csrf-token');
    const sessionToken = request.cookies.get('app-csrf-session')?.value;

    debugInfo.csrf = {
      cookieToken: cookieToken ? `${cookieToken.substring(0, 10)}...` : null,
      headerToken: headerToken ? `${headerToken.substring(0, 10)}...` : null,
      sessionToken: sessionToken ? `${sessionToken.substring(0, 10)}...` : null,
      tokensMatch: cookieToken === headerToken,
      allPresent: !!(cookieToken && headerToken && sessionToken),
    };

    // 5. リクエストボディ
    try {
      const body = await request.json();
      debugInfo.body = {
        hasData: !!body,
        keys: body ? Object.keys(body) : [],
      };
    } catch (bodyError) {
      debugInfo.body = {
        error: 'Could not parse body',
      };
    }

    // 6. 環境情報
    debugInfo.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      host: request.headers.get('host'),
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      message: 'Debug information collected successfully',
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown',
      },
      debug: debugInfo,
    }, { status: 500 });
  }
}