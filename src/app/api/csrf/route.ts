import { NextRequest, NextResponse } from 'next/server';

import { getOrCreateCSRFToken } from '@/lib/security/csrf';

/**
 * CSRFトークン取得エンドポイント
 * クライアントがCSRFトークンを取得するために使用
 */
export async function GET(request: NextRequest) {
  try {
    // CSRFトークンを取得または生成
    const token = await getOrCreateCSRFToken();
    
    // レスポンスを作成
    const response = NextResponse.json(
      { 
        token,
        header: 'x-csrf-token',
        message: 'CSRF token generated successfully' 
      },
      { status: 200 }
    );
    
    // CSRFトークンをレスポンスヘッダーにも設定
    response.headers.set('X-CSRF-Token', token);
    
    // Cookieにも設定（httpOnly=false でクライアントから読み取り可能）
    response.cookies.set('csrf-token-public', token, {
      httpOnly: false, // クライアントサイドから読み取り可能
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24時間
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate CSRF token',
        message: 'CSRFトークンの生成に失敗しました' 
      },
      { status: 500 }
    );
  }
}