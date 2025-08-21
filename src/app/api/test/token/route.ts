import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request: Request) {
  console.log('🔍 トークン取得テスト開始');
  
  try {
    const results = [];
    
    // 1. デフォルト設定でトークン取得
    try {
      const token1 = await getToken({ 
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET 
      });
      results.push({
        method: 'デフォルト',
        success: !!token1,
        data: token1
      });
    } catch (e) {
      results.push({
        method: 'デフォルト',
        success: false,
        error: (e as Error).message
      });
    }
    
    // 2. Cookie名を指定して取得（開発環境）
    try {
      const token2 = await getToken({ 
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: 'authjs.session-token'
      });
      results.push({
        method: '開発環境Cookie名',
        success: !!token2,
        data: token2
      });
    } catch (e) {
      results.push({
        method: '開発環境Cookie名',
        success: false,
        error: (e as Error).message
      });
    }
    
    // 3. Cookie名を指定して取得（本番環境）
    try {
      const token3 = await getToken({ 
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
        cookieName: '__Secure-authjs.session-token',
        secureCookie: true
      });
      results.push({
        method: '本番環境Cookie名',
        success: !!token3,
        data: token3
      });
    } catch (e) {
      results.push({
        method: '本番環境Cookie名',
        success: false,
        error: (e as Error).message
      });
    }
    
    // 4. Raw Cookie情報
    const cookieHeader = request.headers.get('cookie');
    const cookies = cookieHeader ? cookieHeader.split(';').map(c => {
      const [name] = c.trim().split('=');
      return name;
    }) : [];
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        hasSecret: !!process.env.NEXTAUTH_SECRET
      },
      results,
      cookies: {
        all: cookies,
        sessionTokens: cookies.filter(c => c.includes('session-token'))
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error('❌ トークンテストエラー:', error);
    return NextResponse.json({
      error: 'トークンテスト中にエラーが発生',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}