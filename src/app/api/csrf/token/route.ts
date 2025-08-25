import { NextRequest, NextResponse } from 'next/server';
import { CSRFProtection } from '@/lib/security/csrf-protection';

/**
 * CSRFトークン取得エンドポイント
 * クライアントがCSRFトークンを取得するために使用
 */
export async function GET(request: NextRequest) {
  try {
    // レスポンスデータを準備
    const responseData = {
      success: true,
      csrfToken: '',
      message: 'CSRF token generated successfully',
    };
    
    // レスポンスを作成
    const response = NextResponse.json(responseData);
    
    // CSRFトークンをCookieに設定し、同じトークンを返す
    const token = CSRFProtection.setToken(response);
    
    // レスポンスボディにトークンを含める
    responseData.csrfToken = token;
    
    // トークンを含むレスポンスを再作成（Cookieを保持）
    const finalResponse = NextResponse.json(responseData);
    
    // Cookieをコピー
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie);
    });
    
    return finalResponse;
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