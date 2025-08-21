import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  console.log('🧪 認証テストAPI開始');
  
  try {
    // 1. 通常のセッション取得
    const session = await auth();
    console.log('📊 Session:', session);
    
    // 2. JWTトークン取得（複数の方法で試す）
    let token = null;
    
    // 方法1: 通常の取得
    try {
      token = await getToken({ 
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET 
      });
      console.log('🎫 Token (方法1):', token);
    } catch (e) {
      console.error('Token取得エラー (方法1):', e);
    }
    
    // 方法2: フォールバック付き
    if (!token) {
      try {
        token = await getToken({ 
          req: request as any,
          secret: process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production'
        });
        console.log('🎫 Token (方法2):', token);
      } catch (e) {
        console.error('Token取得エラー (方法2):', e);
      }
    }
    
    // 3. Cookieの直接確認
    const cookieHeader = request.headers.get('cookie');
    const sessionToken = cookieHeader?.split(';')
      .find(c => c.trim().startsWith('authjs.session-token') || c.trim().startsWith('__Secure-authjs.session-token'));
    
    console.log('🍪 Session Token Cookie:', sessionToken ? 'あり' : 'なし');
    
    // 4. 環境変数確認
    const env = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '設定済み' : '未設定',
      NODE_ENV: process.env.NODE_ENV,
    };
    console.log('🔧 環境変数:', env);
    
    const result = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user || null,
      },
      token: {
        exists: !!token,
        data: token || null,
      },
      cookie: {
        hasSessionToken: !!sessionToken,
        raw: sessionToken || null,
      },
      environment: env,
      debug: {
        headers: {
          cookie: cookieHeader ? 'あり' : 'なし',
          host: request.headers.get('host'),
        },
        url: request.url,
      }
    };
    
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      }
    });
    
  } catch (error) {
    console.error('❌ テストAPIエラー:', error);
    return NextResponse.json({
      error: 'テスト中にエラーが発生しました',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}