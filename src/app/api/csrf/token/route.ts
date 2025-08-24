import { NextRequest, NextResponse } from 'next/server';
import { CSRFProtection } from '@/lib/security/csrf-protection';

/**
 * CSRFトークン取得エンドポイント
 * クライアントがCSRFトークンを取得するために使用
 */
export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'CSRF token generated',
    });
    
    // CSRFトークンをCookieに設定
    const token = CSRFProtection.setToken(response);
    
    // レスポンスボディにもトークンを含める（開発用）
    const responseData = {
      success: true,
      csrfToken: token,
      message: 'CSRF token generated successfully',
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[CSRF Token] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}