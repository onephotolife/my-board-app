import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

// 環境変数デバッグエンドポイント（本番環境診断用）
export async function GET(request: NextRequest) {
  try {
    // セキュリティ：本番環境ではアクセス制限
    const isProduction = process.env.NODE_ENV === 'production';
    
    // 基本環境変数チェック
    const envStatus = {
      // NextAuth v5
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      
      // MongoDB
      MONGODB_URI: !!process.env.MONGODB_URI,
      MONGODB_URI_PRODUCTION: !!process.env.MONGODB_URI_PRODUCTION,
      MONGODB_ENV: process.env.MONGODB_ENV,
      
      // Environment
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL: process.env.VERCEL,
      
      // Email
      EMAIL_SERVER_HOST: !!process.env.EMAIL_SERVER_HOST,
      EMAIL_SERVER_USER: !!process.env.EMAIL_SERVER_USER,
      EMAIL_SERVER_PASSWORD: !!process.env.EMAIL_SERVER_PASSWORD,
      
      timestamp: new Date().toISOString()
    };
    
    // 本番環境では詳細な値は表示しない（セキュリティ）
    if (isProduction) {
      return NextResponse.json({
        production: true,
        status: 'Environment variables status check',
        critical_missing: [
          !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET && 'AUTH_SECRET or NEXTAUTH_SECRET',
          !process.env.MONGODB_URI && !process.env.MONGODB_URI_PRODUCTION && 'MONGODB_URI',
          !process.env.EMAIL_SERVER_HOST && 'EMAIL_SERVER_HOST'
        ].filter(Boolean),
        envStatus
      });
    }
    
    // 開発環境では詳細表示
    return NextResponse.json({
      production: false,
      envStatus,
      detailed: {
        AUTH_SECRET_LENGTH: process.env.AUTH_SECRET?.length || 0,
        NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET?.length || 0,
        MONGODB_URI_TYPE: process.env.MONGODB_URI?.includes('mongodb+srv') ? 'Atlas' : 'Local',
        EMAIL_HOST: process.env.EMAIL_SERVER_HOST,
      }
    });
    
  } catch (error) {
    console.error('Environment debug error:', error);
    return NextResponse.json(
      { 
        error: 'Environment check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}