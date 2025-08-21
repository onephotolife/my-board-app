import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

import { auth } from '@/lib/auth';

/**
 * 統合セッションヘルパー
 * 通常のNextAuthセッションとテストトークンの両方をサポート
 */
export async function getUnifiedSession(req?: NextRequest) {
  // 1. まず通常のNextAuthセッションをチェック
  const session = await auth();
  
  if (session?.user?.email) {
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image
      },
      expires: session.expires
    };
  }
  
  // 2. 開発環境でテストトークンをチェック
  if (process.env.NODE_ENV !== 'production' && req) {
    // Cookieからトークンを取得
    const testToken = req.cookies.get('test-auth-token')?.value;
    
    // HeadersからもCookieをチェック（fetch経由の場合）
    const cookieHeader = req.headers.get('cookie');
    const headerToken = cookieHeader?.match(/test-auth-token=([^;]+)/)?.[1];
    
    const token = testToken || headerToken;
    
    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.NEXTAUTH_SECRET || 'test-secret'
        ) as any;
        
        return {
          user: {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            image: null
          },
          expires: new Date(decoded.exp * 1000).toISOString()
        };
      } catch (error) {
        console.error('Invalid test token:', error);
      }
    }
  }
  
  return null;
}

/**
 * ユーザー情報取得ヘルパー
 */
export async function getUserFromSession(req?: NextRequest) {
  const session = await getUnifiedSession(req);
  
  if (!session?.user) {
    return null;
  }
  
  // DBからユーザー情報を取得
  const { default: connectDB } = await import('@/lib/mongodb');
  const { default: User } = await import('@/lib/models/User');
  
  await connectDB();
  
  let user;
  if (session.user.id && !session.user.email) {
    // IDのみの場合（テストトークン）
    user = await User.findById(session.user.id);
  } else if (session.user.email) {
    // Emailがある場合（通常のセッション）
    user = await User.findOne({ email: session.user.email });
  }
  
  return user;
}