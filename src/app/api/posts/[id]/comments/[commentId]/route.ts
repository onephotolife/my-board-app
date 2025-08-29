import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import Comment from '@/lib/models/Comment';
import { createErrorResponse, AuthUser } from '@/lib/middleware/auth';
import { broadcastEvent } from '@/lib/socket/socket-manager';

// 認証チェックヘルパー
async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token'
    });

    console.log('[COMMENT-DELETE-AUTH-DEBUG] Token validation:', {
      hasToken: !!token,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    if (!token) {
      console.log('[COMMENT-DELETE-AUTH-DEBUG] No token found');
      return null;
    }

    // メール確認チェック
    if (!token.emailVerified) {
      console.log('[COMMENT-DELETE-AUTH-DEBUG] Email not verified');
      return null;
    }

    return {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };
  } catch (error) {
    console.error('[COMMENT-DELETE-AUTH-ERROR] Authentication check failed:', error);
    return null;
  }
}

// DELETE: コメント削除（認証必須・CSRF必須・所有者のみ）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, commentId: string }> }
) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    // CSRFトークン検証
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRFトークンが必要です', 403, 'CSRF_TOKEN_MISSING');
    }

    const { id, commentId } = await params;

    // パラメータバリデーション
    if (!id || !commentId) {
      return createErrorResponse('投稿IDまたはコメントIDが無効です', 400, 'INVALID_PARAMS');
    }

    // ObjectId形式チェック
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(id) || !objectIdPattern.test(commentId)) {
      return createErrorResponse('無効なIDフォーマットです', 400, 'INVALID_ID_FORMAT');
    }

    await connectDB();

    // 投稿の存在確認
    const post = await Post.findById(id);
    if (!post || post.status === 'deleted') {
      return createErrorResponse('投稿が見つかりません', 404, 'POST_NOT_FOUND');
    }

    // コメントの存在確認
    const comment = await Comment.findById(commentId);
    if (!comment || comment.status === 'deleted') {
      return createErrorResponse('コメントが見つかりません', 404, 'COMMENT_NOT_FOUND');
    }

    // コメントが指定された投稿のものか確認
    if (comment.postId !== id) {
      return createErrorResponse('コメントと投稿の関係が無効です', 400, 'INVALID_RELATIONSHIP');
    }

    // 権限チェック（コメントの所有者のみ削除可能）
    if (comment.author._id !== user.id) {
      console.log('[COMMENT-DELETE-ERROR] Permission denied:', {
        commentId,
        commentAuthor: comment.author._id,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      return createErrorResponse('このコメントを削除する権限がありません', 403, 'FORBIDDEN');
    }

    // ソフトデリート実行
    await comment.softDelete(user.id);

    // 投稿のコメント数更新
    await post.updateCommentCount();

    // Socket.IOでリアルタイム通知
    broadcastEvent('comment:deleted', {
      postId: id,
      commentId: commentId,
      commentCount: post.commentCount || 0,
      deletedBy: user.id
    });

    // 監査ログ記録
    console.log('[COMMENT-SUCCESS] Comment deleted:', {
      commentId,
      postId: id,
      userId: user.id,
      deletedAt: new Date().toISOString(),
      auditTrail: {
        action: 'COMMENT_DELETE',
        actor: user.email,
        resource: `comment:${commentId}`,
        context: `post:${id}`,
        ip: req.headers.get('x-forwarded-for') || req.ip,
        userAgent: req.headers.get('user-agent')
      }
    });

    return NextResponse.json({
      success: true,
      message: 'コメントを削除しました',
      data: {
        deletedCommentId: commentId,
        postId: id,
        updatedCommentCount: post.commentCount,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[COMMENT-DELETE-ERROR] Failed to delete comment:', error);

    // エラーの種類に応じた詳細ログ
    const errorDetails = {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      context: {
        postId: await params.then(p => p.id).catch(() => 'unknown'),
        commentId: await params.then(p => p.commentId).catch(() => 'unknown'),
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.ip
      }
    };

    console.error('[COMMENT-DELETE-ERROR] Error details:', errorDetails);

    return createErrorResponse('コメントの削除に失敗しました', 500, 'DELETE_ERROR');
  }
}

// PUT: コメント編集（将来拡張用・現在は未実装）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, commentId: string }> }
) {
  // 将来実装予定：コメント編集機能
  return createErrorResponse('コメント編集機能は実装予定です', 501, 'NOT_IMPLEMENTED');
}

// PATCH: コメント状態変更（管理者用・現在は未実装）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, commentId: string }> }
) {
  // 将来実装予定：管理者によるコメント状態変更（通報処理等）
  return createErrorResponse('コメント状態変更機能は実装予定です', 501, 'NOT_IMPLEMENTED');
}