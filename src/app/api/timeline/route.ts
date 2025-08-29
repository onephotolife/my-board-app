import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';
import Follow from '@/lib/models/Follow';
import { createErrorResponse, AuthUser } from '@/lib/middleware/auth';
import { normalizePostDocuments } from '@/lib/api/post-normalizer';
import { postFilterSchema } from '@/lib/validations/post';

// デバッグログ用ヘルパー
function debugLog(section: string, data: any) {
  console.log(`🔍 [Timeline API] ${section}:`, {
    timestamp: new Date().toISOString(),
    ...data
  });
}

// ページネーションのデフォルト値
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// GET: タイムライン取得（認証必須）
export async function GET(req: NextRequest) {
  try {
    debugLog('Start', { url: req.url });

    // 認証チェック
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
    });

    debugLog('Auth Check', {
      hasToken: !!token,
      userId: token?.id || token?.sub,
      email: token?.email,
      emailVerified: token?.emailVerified,
    });

    if (!token) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    if (!token.emailVerified) {
      return createErrorResponse('メールアドレスの確認が必要です', 403, 'EMAIL_NOT_VERIFIED');
    }

    const user: AuthUser = {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };

    // クエリパラメータの取得
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE)));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT))));
    const includeOwn = searchParams.get('includeOwn') !== 'false'; // デフォルトはtrue

    debugLog('Query Params', { page, limit, includeOwn });

    await connectDB();

    // 現在のユーザーを取得
    const currentUser = await User.findById(user.id).select('_id following');
    if (!currentUser) {
      debugLog('User Not Found', { userId: user.id });
      return createErrorResponse('ユーザーが見つかりません', 404, 'USER_NOT_FOUND');
    }

    // フォロー中のユーザーIDリストを取得
    const followingRelations = await Follow.find({ 
      follower: currentUser._id 
    }).select('following');
    
    const followingIds = followingRelations.map(rel => rel.following);
    
    debugLog('Following List', {
      currentUserId: currentUser._id.toString(),
      followingCount: followingIds.length,
      followingIds: followingIds.map(id => id.toString())
    });

    // タイムラインに表示するユーザーIDリスト作成
    const timelineUserIds = [...followingIds];
    if (includeOwn) {
      timelineUserIds.push(currentUser._id);
    }

    debugLog('Timeline User IDs', {
      count: timelineUserIds.length,
      includesOwn: includeOwn,
      userIds: timelineUserIds.map(id => id.toString())
    });

    // クエリ構築
    const query = {
      author: { $in: timelineUserIds },
      status: 'published'
    };

    // ページネーション計算
    const skip = (page - 1) * limit;

    debugLog('Query Details', {
      query,
      skip,
      limit
    });

    // データ取得（並列実行）
    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 }) // 新しい順
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    debugLog('Query Results', {
      postsFound: posts.length,
      totalPosts: total,
      firstPostDate: posts[0]?.createdAt,
      lastPostDate: posts[posts.length - 1]?.createdAt
    });

    // 投稿を正規化
    const normalizedPosts = normalizePostDocuments(posts, user.id);

    // レスポンス作成
    const response = {
      success: true,
      data: normalizedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      metadata: {
        followingCount: followingIds.length,
        includesOwnPosts: includeOwn,
        lastUpdated: new Date().toISOString(),
      },
    };

    debugLog('Response Summary', {
      postsReturned: normalizedPosts.length,
      pagination: response.pagination,
      metadata: response.metadata
    });

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('タイムライン取得エラー:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '無効なパラメータです',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    return createErrorResponse('タイムラインの取得に失敗しました', 500, 'FETCH_ERROR');
  }
}