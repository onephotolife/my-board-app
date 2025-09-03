import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  console.warn('🔍 セッションデバッグ開始');
  
  try {
    // 1. NextAuth セッションの取得
    const session = await auth();
    console.warn('📊 NextAuth セッション:', session);
    
    // 2. JWTトークンの取得
    const token = await getToken({ 
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET 
    });
    console.warn('🎫 JWT トークン:', token);
    
    // 3. Cookieの確認
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(c => 
      c.name.includes('authjs') || 
      c.name.includes('next-auth') ||
      c.name.includes('session')
    );
    console.warn('🍪 認証関連Cookie:', authCookies);
    
    // 4. 環境変数の確認（値は隠す）
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅ 設定済み' : '❌ 未設定',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ 設定済み' : '❌ 未設定',
      NODE_ENV: process.env.NODE_ENV,
    };
    console.warn('🔧 環境変数:', envCheck);
    
    // 5. リクエストヘッダーの確認
    const headers = {
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
      cookie: request.headers.get('cookie') ? '✅ あり' : '❌ なし',
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
    };
    console.warn('📋 リクエストヘッダー:', headers);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user || null,
        expires: session?.expires || null,
      },
      token: {
        exists: !!token,
        id: token?.id || null,
        email: token?.email || null,
        emailVerified: token?.emailVerified || null,
      },
      cookies: {
        total: allCookies.length,
        authCookies: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite,
        })),
      },
      environment: envCheck,
      headers: headers,
      url: {
        current: request.url,
        expected: process.env.NEXTAUTH_URL,
        match: request.url.includes(process.env.NEXTAUTH_URL || ''),
      },
    };
    
    console.warn('🎯 デバッグ情報全体:', JSON.stringify(debugInfo, null, 2));
    
    return NextResponse.json(debugInfo, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('❌ セッションデバッグエラー:', error);
    return NextResponse.json({
      error: 'セッションデバッグ中にエラーが発生しました',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}