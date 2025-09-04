import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import type { AuthUser } from '@/lib/middleware/auth';
import { checkPostOwnership, createErrorResponse } from '@/lib/middleware/auth';
import { updatePostSchema, formatValidationErrors } from '@/lib/validations/post';
import { broadcastEvent } from '@/lib/socket/socket-manager';
import { verifyCSRFToken } from '@/lib/security/csrf';
import { normalizePostDocument } from '@/lib/api/post-normalizer';
import Tag from '@/lib/models/Tag';
import { extractHashtags, normalizeTag } from '@/app/utils/hashtag';

// 認証チェックヘルパー
async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = await getToken({
      req,
      secret:
        process.env.NEXTAUTH_SECRET ||
        process.env.AUTH_SECRET ||
        'blankinai-member-board-secret-key-2024-production',
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
    });

    console.warn('[AUTH-DEBUG] Token validation:', {
      hasToken: !!token,
      environment: process.env.NODE_ENV,
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      timestamp: new Date().toISOString(),
    });

    if (!token) {
      console.warn('[AUTH-DEBUG] No token found');
      return null;
    }

    // メール確認チェック
    if (!token.emailVerified) {
      return null;
    }

    return {
      id: (token.id as string) || (token.sub as string),
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
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // CSRF検証
    const isValidCSRF = await verifyCSRFToken(req);
    if (!isValidCSRF) {
      return createErrorResponse('CSRFトークンが無効です', 403, 'CSRF_VALIDATION_FAILED');
    }

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

    // ハッシュタグの自動再抽出
    const extracted = extractHashtags(validatedData.content || '');
    const extractedKeys = extracted.map((t) => t.key);
    const providedKeys = Array.isArray(validatedData.tags)
      ? validatedData.tags.map((t) => normalizeTag(t)).filter(Boolean)
      : [];
    const allTagKeys = Array.from(new Set([...extractedKeys, ...providedKeys])).slice(0, 5);

    // 投稿を更新
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        tags: allTagKeys,
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

    // 人気タグの記録（追加分のみカウントは簡易化のため常に+1に統一）
    if (allTagKeys.length > 0) {
      const now = new Date();
      const ops = allTagKeys.map((key) => {
        const display = extracted.find((t) => t.key === key)?.display || key;
        return {
          updateOne: {
            filter: { key },
            update: {
              $setOnInsert: { display },
              $set: { lastUsedAt: now },
              $inc: { countTotal: 1 },
            },
            upsert: true,
          },
        } as const;
      });
      try {
        await Tag.bulkWrite(ops);
      } catch (e) {
        console.error('[TAGS-BULK-UPsert-ERROR]', e);
      }
    }

    // 正規化（UnifiedPost形式に変換）
    const normalizedPost = normalizePostDocument(updatedPost.toObject(), user.id);

    // Socket.ioで投稿更新をブロードキャスト
    broadcastEvent('post:updated', {
      post: normalizedPost,
      author: user,
    });

    return NextResponse.json({
      success: true,
      data: normalizedPost,
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
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // CSRF検証
    const isValidCSRF = await verifyCSRFToken(req);
    if (!isValidCSRF) {
      return createErrorResponse('CSRFトークンが無効です', 403, 'CSRF_VALIDATION_FAILED');
    }

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
