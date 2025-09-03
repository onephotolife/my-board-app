import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const callbackUrl = searchParams.get('url') || '/dashboard';
    
    // セッションを取得
    const session = await getServerSession(authOptions);
    
    console.warn('🔍 [Redirect API] セッション状態:', {
      hasSession: !!session,
      email: session?.user?.email,
      emailVerified: session?.user?.emailVerified,
      callbackUrl,
      timestamp: new Date().toISOString()
    });
    
    // 認証済みの場合、指定されたURLへリダイレクト
    if (session?.user?.emailVerified) {
      console.warn('✅ [Redirect API] 認証済み、リダイレクト実行:', callbackUrl);
      
      // 安全なURLかチェック
      const safeUrl = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard';
      
      // 303 See Otherでリダイレクト（GETメソッドを強制）
      return NextResponse.redirect(new URL(safeUrl, request.url), {
        status: 303,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // 未認証の場合はサインインページへ
    console.warn('⚠️ [Redirect API] 未認証、サインインページへリダイレクト');
    return NextResponse.redirect(new URL('/auth/signin', request.url), {
      status: 303,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('❌ [Redirect API] エラー:', error);
    return NextResponse.json(
      { error: 'リダイレクト処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POSTリクエストもGETと同様に処理
  return GET(request);
}