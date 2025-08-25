import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRFトークン取得エンドポイント
 * クライアントが初期化時にトークンを取得するために使用
 */
export async function GET(request: NextRequest) {
  try {
    // 新しいCSRFトークンを生成（Edge Runtime対応）
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // レスポンスを作成
    const response = NextResponse.json(
      { 
        token,
        message: 'CSRF token generated successfully'
      },
      { status: 200 }
    );
    
    // CSRFトークンをクッキーにセット（httpOnly, secure）
    response.cookies.set({
      name: 'app-csrf-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24時間
    });
    
    // セッショントークンもセット（CSRF検証に必要）
    const sessionArray = new Uint8Array(16);
    crypto.getRandomValues(sessionArray);
    const sessionToken = Array.from(sessionArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    response.cookies.set({
      name: 'app-csrf-session',
      value: sessionToken, // 別のトークンを使用
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24時間
    });
    
    // ヘッダーにもトークンを含める（クライアント側で保存用）
    response.headers.set('X-CSRF-Token', token);
    
    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}