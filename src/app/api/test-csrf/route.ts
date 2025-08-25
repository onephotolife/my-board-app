import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRFデバッグ用テストエンドポイント
 */
export async function POST(request: NextRequest) {
  // リクエストヘッダーとクッキーの詳細を取得
  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('app-csrf-token')?.value;
  const sessionToken = request.cookies.get('app-csrf-session')?.value;
  
  // デバッグ情報を返す
  return NextResponse.json({
    debug: {
      headerToken: headerToken ? headerToken.substring(0, 10) + '...' : null,
      cookieToken: cookieToken ? cookieToken.substring(0, 10) + '...' : null,
      sessionToken: sessionToken ? sessionToken.substring(0, 10) + '...' : null,
      tokensMatch: headerToken === cookieToken,
      allPresent: !!(headerToken && cookieToken && sessionToken),
      headers: {
        'x-csrf-token': !!headerToken,
        'content-type': request.headers.get('content-type'),
      },
      cookies: {
        'app-csrf-token': !!cookieToken,
        'app-csrf-session': !!sessionToken,
      }
    },
    message: 'Debug endpoint - CSRF check results'
  });
}