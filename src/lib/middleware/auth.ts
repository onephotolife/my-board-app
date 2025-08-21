import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';

// 認証ユーザー情報の型
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

// エラーレスポンスの生成
export const createErrorResponse = (message: string, status: number, code?: string) => {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: code || 'ERROR',
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
};

// 認証チェックミドルウェア
export async function withAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // トークンの取得（NextAuth v5対応）
      const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      });

      if (!token) {
        return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
      }

      // メール確認チェック
      if (!token.emailVerified) {
        return createErrorResponse('メールアドレスの確認が必要です', 403, 'EMAIL_NOT_VERIFIED');
      }

      // ユーザー情報の作成
      const user: AuthUser = {
        id: token.id as string || token.sub as string,
        email: token.email as string,
        name: token.name as string,
        emailVerified: true,
      };

      // ハンドラーの実行
      return await handler(req, user);
    } catch (error) {
      console.error('認証エラー:', error);
      return createErrorResponse('認証処理中にエラーが発生しました', 500, 'AUTH_ERROR');
    }
  };
}

// 投稿の所有者チェック
export async function checkPostOwnership(
  postId: string,
  userId: string
): Promise<{ isOwner: boolean; post?: any; error?: string }> {
  try {
    await connectDB();
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return { isOwner: false, error: '投稿が見つかりません' };
    }
    
    if (post.status === 'deleted') {
      return { isOwner: false, error: 'この投稿は削除されています' };
    }
    
    const isOwner = post.author._id.toString() === userId;
    
    return { isOwner, post: isOwner ? post : undefined };
  } catch (error) {
    console.error('投稿の所有者チェックエラー:', error);
    return { isOwner: false, error: 'データベースエラーが発生しました' };
  }
}

// レート制限（簡易版）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const RATE_LIMIT_MAX = 10; // 1分間に10リクエストまで

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

// クリーンアップ（定期的に古いエントリを削除）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);