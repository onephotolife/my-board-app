import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import type { AuthUser } from '@/lib/middleware/auth';
import { createErrorResponse } from '@/lib/middleware/auth';
import { broadcastEvent } from '@/lib/socket/socket-manager';
import { verifyCSRFToken } from '@/lib/security/csrf';
import notificationService from '@/lib/services/notificationService';

// 認証チェックヘルパー
async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    console.log('[LIKE-API-DEBUG] Detailed auth debug:', {
      headers: Object.fromEntries(req.headers.entries()),
      cookies: req.headers.get('cookie'),
      url: req.url,
      method: req.method,
    });

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
    });

    console.log('[LIKE-API-DEBUG] Token details:', {
      hasToken: !!token,
      token: token ? {
        id: token.id,
        sub: token.sub,
        email: token.email,
        emailVerified: token.emailVerified,
        name: token.name,
        keys: Object.keys(token),
      } : null,
      timestamp: new Date().toISOString(),
    });

    if (!token) {
      console.log('[LIKE-API-DEBUG] ❌ No token found - checking environment');
      console.log('[LIKE-API-DEBUG] Environment check:', {
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        authSecretLength: process.env.AUTH_SECRET?.length || 0,
        nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
      });
      return null;
    }

    // メール確認チェック
    if (!token.emailVerified) {
      console.log('[LIKE-API-DEBUG] ❌ Email not verified:', {
        email: token.email,
        emailVerified: token.emailVerified,
      });
      return null;
    }

    const user = {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };

    console.log('[LIKE-API-DEBUG] ✅ Authentication successful:', {
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    });

    return user;
  } catch (error) {
    console.error('[LIKE-API-DEBUG] ❌ Authentication error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return null;
  }
}

// POST: いいね追加
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF検証
    const isValidCSRF = await verifyCSRFToken(req);
    if (!isValidCSRF) {
      return createErrorResponse('CSRFトークンが無効です', 403, 'CSRF_VALIDATION_FAILED');
    }

    console.log('[LIKE-API-DEBUG] 🚀 Like POST request started:', {
      method: 'POST',
      timestamp: new Date().toISOString(),
    });

    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      console.log('[LIKE-API-DEBUG] ❌ Authentication failed for POST');
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const { id: postId } = await params;
    console.log('[LIKE-API-DEBUG] Like action started:', {
      postId,
      userId: user.id,
      action: 'like',
    });

    await connectDB();

    // 投稿を取得
    const post = await Post.findById(postId);
    if (!post) {
      console.log('[LIKE-API-DEBUG] ❌ Post not found:', postId);
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }

    // 削除済みの投稿はいいねできない
    if (post.status === 'deleted') {
      console.log('[LIKE-API-DEBUG] ❌ Post is deleted:', postId);
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }

    // いいね前の状態を記録
    const initialLikesCount = post.likes ? post.likes.length : 0;
    const wasLiked = post.likes ? post.likes.includes(user.id) : false;

    console.log('[LIKE-API-DEBUG] Pre-like state:', {
      postId,
      userId: user.id,
      initialLikesCount,
      wasLiked,
      likes: post.likes,
    });

    // 既にいいね済みの場合は何もしない
    if (wasLiked) {
      console.log('[LIKE-API-DEBUG] ⚠️ Already liked, no action taken');
      return NextResponse.json({
        success: true,
        data: {
          postId,
          userId: user.id,
          likes: post.likes,
          likesCount: post.likes.length,
          isLiked: true,
          action: 'already_liked',
        },
        message: '既にいいね済みです',
      });
    }

    // $addToSetを使用してユーザーIDを重複なしで追加
    console.log('[LIKE-API-DEBUG] Before update - postId:', postId, 'userId:', user.id);
    
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $addToSet: { likes: user.id } },
      { new: true }
    );

    console.log('[LIKE-API-DEBUG] Update result:', {
      success: !!updatedPost,
      postId: updatedPost?._id,
      likes: updatedPost?.likes,
      likesLength: updatedPost?.likes?.length,
      likesType: typeof updatedPost?.likes,
      fullPost: JSON.stringify(updatedPost?.toObject ? updatedPost.toObject() : updatedPost)
    });

    if (!updatedPost) {
      console.log('[LIKE-API-DEBUG] ❌ Failed to update post');
      return createErrorResponse('いいねの処理に失敗しました', 500, 'LIKE_ERROR');
    }

    const finalLikesCount = updatedPost.likes ? updatedPost.likes.length : 0;

    console.log('[LIKE-API-DEBUG] ✅ Like added successfully:', {
      postId,
      userId: user.id,
      initialLikesCount,
      finalLikesCount,
      likesAdded: finalLikesCount - initialLikesCount,
      likes: updatedPost.likes,
      timestamp: new Date().toISOString(),
    });

    // Socket.IOでリアルタイム通知
    const eventData = {
      postId,
      userId: user.id,
      likes: updatedPost.likes,
      likesCount: finalLikesCount,
      action: 'liked',
    };

    console.log('[LIKE-API-DEBUG] Broadcasting socket event:', eventData);
    broadcastEvent('post:liked', eventData);

    // 通知作成（投稿者へ）
    if (updatedPost.author && updatedPost.author.toString() !== user.id) {
      const postPreview = updatedPost.title || updatedPost.content?.substring(0, 50) || '';
      
      notificationService.createLikeNotification(
        user.id,
        {
          name: user.name,
          email: user.email,
          avatar: null
        },
        postId,
        updatedPost.author.toString(),
        postPreview + '...'
      ).catch(error => {
        console.error('[LIKE-NOTIFICATION-ERROR] Failed to create notification:', error);
        // 通知作成の失敗はいいねの成功に影響しない
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        postId,
        userId: user.id,
        likes: updatedPost.likes,
        likesCount: finalLikesCount,
        isLiked: true,
        action: 'liked',
      },
      message: 'いいねしました',
    });

  } catch (error) {
    console.error('[LIKE-API-DEBUG] ❌ Like POST error:', error);
    return createErrorResponse('いいねの処理に失敗しました', 500, 'LIKE_ERROR');
  }
}

// DELETE: いいね削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF検証
    const isValidCSRF = await verifyCSRFToken(req);
    if (!isValidCSRF) {
      return createErrorResponse('CSRFトークンが無効です', 403, 'CSRF_VALIDATION_FAILED');
    }

    console.log('[LIKE-API-DEBUG] 🚀 Unlike DELETE request started:', {
      method: 'DELETE',
      timestamp: new Date().toISOString(),
    });

    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      console.log('[LIKE-API-DEBUG] ❌ Authentication failed for DELETE');
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const { id: postId } = await params;
    console.log('[LIKE-API-DEBUG] Unlike action started:', {
      postId,
      userId: user.id,
      action: 'unlike',
    });

    await connectDB();

    // 投稿を取得
    const post = await Post.findById(postId);
    if (!post) {
      console.log('[LIKE-API-DEBUG] ❌ Post not found:', postId);
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }

    // 削除済みの投稿は処理しない
    if (post.status === 'deleted') {
      console.log('[LIKE-API-DEBUG] ❌ Post is deleted:', postId);
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }

    // いいね削除前の状態を記録
    const initialLikesCount = post.likes ? post.likes.length : 0;
    const wasLiked = post.likes ? post.likes.includes(user.id) : false;

    console.log('[LIKE-API-DEBUG] Pre-unlike state:', {
      postId,
      userId: user.id,
      initialLikesCount,
      wasLiked,
      likes: post.likes,
    });

    // いいねしていない場合は何もしない
    if (!wasLiked) {
      console.log('[LIKE-API-DEBUG] ⚠️ Not liked, no action taken');
      return NextResponse.json({
        success: true,
        data: {
          postId,
          userId: user.id,
          likes: post.likes || [],
          likesCount: initialLikesCount,
          isLiked: false,
          action: 'not_liked',
        },
        message: 'いいねしていません',
      });
    }

    // $pullを使用してユーザーIDを削除
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $pull: { likes: user.id } },
      { new: true }
    );

    if (!updatedPost) {
      console.log('[LIKE-API-DEBUG] ❌ Failed to update post');
      return createErrorResponse('いいね取り消しの処理に失敗しました', 500, 'UNLIKE_ERROR');
    }

    const finalLikesCount = updatedPost.likes ? updatedPost.likes.length : 0;

    console.log('[LIKE-API-DEBUG] ✅ Like removed successfully:', {
      postId,
      userId: user.id,
      initialLikesCount,
      finalLikesCount,
      likesRemoved: initialLikesCount - finalLikesCount,
      likes: updatedPost.likes,
      timestamp: new Date().toISOString(),
    });

    // Socket.IOでリアルタイム通知
    const eventData = {
      postId,
      userId: user.id,
      likes: updatedPost.likes || [],
      likesCount: finalLikesCount,
      action: 'unliked',
    };

    console.log('[LIKE-API-DEBUG] Broadcasting socket event:', eventData);
    broadcastEvent('post:unliked', eventData);

    return NextResponse.json({
      success: true,
      data: {
        postId,
        userId: user.id,
        likes: updatedPost.likes || [],
        likesCount: finalLikesCount,
        isLiked: false,
        action: 'unliked',
      },
      message: 'いいねを取り消しました',
    });

  } catch (error) {
    console.error('[LIKE-API-DEBUG] ❌ Unlike DELETE error:', error);
    return createErrorResponse('いいね取り消しの処理に失敗しました', 500, 'UNLIKE_ERROR');
  }
}