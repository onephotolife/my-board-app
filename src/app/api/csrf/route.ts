import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * CSRFトークン取得エンドポイント
 * クライアントが初期化時にトークンを取得するために使用
 */
export async function GET(request: NextRequest) {
  try {
    // 新しいCSRFトークンを生成
    const token = crypto.randomBytes(32).toString('hex');
    
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
    const sessionToken = crypto.randomBytes(16).toString('hex');
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