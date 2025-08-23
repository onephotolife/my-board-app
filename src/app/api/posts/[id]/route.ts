import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import { checkPostOwnership, createErrorResponse, AuthUser } from '@/lib/middleware/auth';
import { updatePostSchema, formatValidationErrors } from '@/lib/validations/post';
import { broadcastEvent } from '@/lib/socket/socket-manager';

// 認証チェックヘルパー
async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
    });

    if (!token) {
      return null;
    }

    // メール確認チェック
    if (!token.emailVerified) {
      return null;
    }

    return {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };
  } catch (error) {
    console.error('認証チェックエラー:', error);
    return null;
  }
}

// GET: 個別投稿取得（認証必須）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    
    await connectDB();
    
    // 投稿を取得
    const post = await Post.findById(id);
    
    if (!post) {
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }
    
    // 削除済みの投稿は表示しない
    if (post.status === 'deleted') {
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }
    
    // 閲覧数を増加（作成者以外の場合）
    if (post.author._id !== user.id) {
      await post.incrementViews();
    }
    
    // 権限情報を追加
    const isOwner = post.author._id === user.id;
    const postWithPermissions = {
      ...post.toJSON(),
      canEdit: isOwner,
      canDelete: isOwner,
      isLikedByUser: post.likes?.includes(user.id) || false,
    };
    
    return NextResponse.json({
      success: true,
      data: postWithPermissions,
    });
  } catch (error) {
    console.error('投稿取得エラー:', error);
    return createErrorResponse('投稿の取得に失敗しました', 500, 'FETCH_ERROR');
  }
}

// PUT: 投稿更新（作成者のみ）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    
    // 投稿の所有者チェック
    const { isOwner, post, error } = await checkPostOwnership(id, user.id);
    
    if (error) {
      return createErrorResponse(error, post ? 403 : 404, post ? 'FORBIDDEN' : 'NOT_FOUND');
    }
    
    if (!isOwner) {
      return createErrorResponse('この投稿を編集する権限がありません', 403, 'FORBIDDEN');
    }
    
    // リクエストボディの取得
    const body = await req.json();
    
    // バリデーション
    const validatedData = updatePostSchema.parse(body);
    
    await connectDB();
    
    // 投稿を更新
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        updatedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
    
    if (!updatedPost) {
      return createErrorResponse('投稿の更新に失敗しました', 500, 'UPDATE_ERROR');
    }
    
    // Socket.ioで投稿更新をブロードキャスト
    broadcastEvent('post:updated', {
      post: updatedPost.toJSON(),
      author: user,
    });
    
    return NextResponse.json({
      success: true,
      data: updatedPost,
      message: '投稿が更新されました',
    });
  } catch (error) {
    console.error('投稿更新エラー:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'バリデーションエラー',
            details: formatValidationErrors(error),
          },
        },
        { status: 400 }
      );
    }
    
    return createErrorResponse('投稿の更新に失敗しました', 500, 'UPDATE_ERROR');
  }
}

// DELETE: 投稿削除（作成者のみ）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    
    // 投稿の所有者チェック
    const { isOwner, post, error } = await checkPostOwnership(id, user.id);
    
    if (error) {
      return createErrorResponse(error, post ? 403 : 404, post ? 'FORBIDDEN' : 'NOT_FOUND');
    }
    
    if (!isOwner) {
      return createErrorResponse('この投稿を削除する権限がありません', 403, 'FORBIDDEN');
    }
    
    await connectDB();
    
    // ソフトデリート
    const deletedPost = await Post.findById(id);
    if (deletedPost) {
      await deletedPost.softDelete();
    }
    
    // Socket.ioで投稿削除をブロードキャスト
    broadcastEvent('post:deleted', {
      postId: id,
      author: user,
    });
    
    return NextResponse.json({
      success: true,
      message: '投稿が削除されました',
    });
  } catch (error) {
    console.error('投稿削除エラー:', error);
    return createErrorResponse('投稿の削除に失敗しました', 500, 'DELETE_ERROR');
  }
}

// PATCH: いいね機能（トグル）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      console.log('🚫 いいねAPI: 認証失敗');
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    console.log('✅ いいねAPI: 認証成功', { userId: user.id, email: user.email });

    const { id } = await params;
    const { action } = await req.json();
    
    if (action !== 'toggle_like') {
      return createErrorResponse('無効なアクションです', 400, 'INVALID_ACTION');
    }
    
    await connectDB();
    
    // 投稿を取得
    const post = await Post.findById(id);
    
    if (!post) {
      console.log('🚫 投稿が見つかりません:', id);
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }
    
    // 削除済みの投稿にはいいねできない
    if (post.status === 'deleted') {
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }
    
    console.log('📝 いいね処理前:', { 
      postId: id, 
      currentLikes: post.likes,
      userId: user.id,
      alreadyLiked: post.likes.includes(user.id)
    });
    
    // いいねをトグル
    const updatedPost = await post.toggleLike(user.id);
    
    const isLiked = updatedPost.likes.includes(user.id);
    
    console.log('📝 いいね処理後:', { 
      postId: id, 
      newLikes: updatedPost.likes,
      isLiked,
      likeCount: updatedPost.likes.length
    });
    
    // Socket.ioでいいね更新をブロードキャスト
    broadcastEvent('post:liked', {
      postId: id,
      likeCount: updatedPost.likes.length,
      userId: user.id,
      action: isLiked ? 'liked' : 'unliked',
    });
    
    return NextResponse.json({
      success: true,
      data: {
        isLiked,
        likeCount: updatedPost.likes.length,
      },
      message: isLiked ? 'いいねしました' : 'いいねを取り消しました',
    });
  } catch (error) {
    console.error('いいね処理エラー:', error);
    return createErrorResponse('いいね処理に失敗しました', 500, 'LIKE_ERROR');
  }
}