import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Post from '@/models/Post';
import { auth } from '@/lib/auth';
import cacheManager from '@/lib/cache';
import { withRateLimit } from '@/lib/rateLimit';

/**
 * いいね機能のAPIエンドポイント
 */

// POST: いいねの追加/削除（トグル）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // レート制限を適用（1分間に30回まで）
  return withRateLimit(request, async (req) => {
    try {
      // 認証チェック
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'ログインが必要です' },
          { status: 401 }
        );
      }

      await connectDB();
      
      const { id } = await params;
      const userId = session.user.id;

      // 投稿を取得
      const post = await Post.findById(id);
      
      if (!post) {
        return NextResponse.json(
          { error: '投稿が見つかりません' },
          { status: 404 }
        );
      }

      // 削除済みの投稿にはいいねできない
      if (post.status === 'deleted') {
        return NextResponse.json(
          { error: '投稿が見つかりません' },
          { status: 404 }
        );
      }

      // いいねをトグル
      const isLiked = post.toggleLike(userId);
      await post.save();

      // キャッシュを無効化
      await cacheManager.invalidateByTag('posts');
      await cacheManager.invalidatePattern(`post:${id}*`);

      return NextResponse.json({
        success: true,
        isLiked,
        likeCount: post.likeCount,
        message: isLiked ? 'いいねしました' : 'いいねを取り消しました'
      });

    } catch (error: any) {
      console.error('Like toggle error:', error);
      return NextResponse.json(
        { error: 'いいねの処理に失敗しました' },
        { status: 500 }
      );
    }
  }, {
    windowMs: 60 * 1000, // 1分
    max: 30, // 最大30回
    message: 'いいねの操作が多すぎます。しばらく待ってから再試行してください。'
  });
}

// GET: いいねステータスの取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    // キャッシュから取得を試みる
    const cacheKey = `like:${id}:${session?.user?.id || 'anonymous'}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    await connectDB();
    
    const post = await Post.findById(id).select('likes status');
    
    if (!post || post.status === 'deleted') {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    const response = {
      likeCount: post.likes.length,
      isLiked: session?.user?.id ? post.likes.includes(session.user.id) : false,
      requiresAuth: !session?.user?.id
    };

    // キャッシュに保存（30秒）
    await cacheManager.set(cacheKey, response, {
      ttl: 30,
      tags: ['likes', `post:${id}`]
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Get like status error:', error);
    return NextResponse.json(
      { error: 'いいね情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}