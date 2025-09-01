import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import mongoose from 'mongoose';
import DOMPurify from 'isomorphic-dompurify';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import Comment from '@/lib/models/Comment';
import { createErrorResponse, AuthUser } from '@/lib/middleware/auth';
import { broadcastEvent } from '@/lib/socket/socket-manager';

// バリデーションスキーマ - 事前処理を使用
const preprocessString = (val: unknown) => {
  if (typeof val !== 'string') return '';
  return val.trim();
};

const commentSchema = z.object({
  content: z.preprocess(
    preprocessString,
    z.string()
      .min(1, 'コメントを入力してください')
      .max(500, 'コメントは500文字以内')
  )
});

// レート制限チェック（簡易実装）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(userKey: string, maxRequests = 10, windowMs = 60000): Promise<boolean> {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userKey);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userKey, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

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

    console.log('[COMMENT-AUTH-DEBUG] Token validation:', {
      hasToken: !!token,
      environment: process.env.NODE_ENV,
      secureCookie: process.env.NODE_ENV === 'production',
      timestamp: new Date().toISOString()
    });

    if (!token) {
      console.log('[COMMENT-AUTH-DEBUG] No token found');
      return null;
    }

    // メール確認チェック
    if (!token.emailVerified) {
      console.log('[COMMENT-AUTH-DEBUG] Email not verified');
      return null;
    }

    return {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };
  } catch (error) {
    console.error('[COMMENT-AUTH-ERROR] Authentication check failed:', error);
    return null;
  }
}

// GET: コメント一覧取得（認証必須）
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
    
    // パラメータバリデーション
    if (!id) {
      return createErrorResponse('投稿IDが必要です', 400, 'MISSING_POST_ID');
    }

    // ObjectId形式チェック
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(id)) {
      return createErrorResponse('無効な投稿IDフォーマットです', 400, 'INVALID_POST_ID_FORMAT');
    }
    
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const sort = searchParams.get('sort') || '-createdAt';

    // キャッシュヘッダー設定
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    headers.set('X-Content-Type-Options', 'nosniff');

    await connectDB();

    // 投稿の存在確認
    const post = await Post.findById(id);
    if (!post || post.status === 'deleted') {
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }

    // コメントが無効化されている場合
    if (!post.commentsEnabled) {
      return createErrorResponse('この投稿へのコメントは無効です', 403, 'COMMENTS_DISABLED');
    }

    // コメント取得クエリ
    const query = {
      postId: id,
      status: 'active'
    };

    const skip = (page - 1) * limit;

    // 並列実行で高速化
    const [comments, total] = await Promise.all([
      Comment.find(query)
        .sort(sort === 'createdAt' ? { createdAt: 1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query)
    ]);

    // 権限情報追加
    const enrichedComments = comments.map(comment => ({
      ...comment,
      canDelete: comment.author._id === user.id,
      canEdit: comment.author._id === user.id,
      canReport: comment.author._id !== user.id,
      likeCount: comment.likes ? comment.likes.length : 0,
      isLikedByUser: comment.likes ? comment.likes.includes(user.id) : false
    }));

    console.log('[COMMENT-SUCCESS] Comments fetched:', {
      postId: id,
      userId: user.id,
      count: comments.length,
      total,
      page,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: enrichedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }, { headers });

  } catch (error) {
    console.error('[COMMENT-ERROR] Failed to fetch comments:', error);
    return createErrorResponse('コメントの取得に失敗しました', 500, 'FETCH_ERROR');
  }
}

// POST: コメント投稿（認証必須・CSRF必須）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // レート制限チェック
    const userKey = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    const rateLimitOK = await checkRateLimit(userKey, 10, 60000); // 1分間に10回まで
    
    if (!rateLimitOK) {
      return createErrorResponse(
        'レート制限に達しました。しばらくお待ちください。',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // 認証チェック
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    // CSRFトークン検証（開発環境では警告のみ）
    const csrfToken = req.headers.get('x-csrf-token');
    
    // 本番環境以外（開発環境）ではCSRF検証をスキップ（警告ログのみ）
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction) {
      if (!csrfToken) {
        console.warn('[CSRF-WARNING] Development mode: CSRF token missing but allowing request');
        console.warn('[CSRF-WARNING] NODE_ENV:', process.env.NODE_ENV || 'undefined');
      }
    } else {
      // 本番環境では厳格にCSRFトークンを要求
      if (!csrfToken) {
        return createErrorResponse('CSRFトークンが必要です', 403, 'CSRF_TOKEN_MISSING');
      }
    }

    const { id } = await params;

    // パラメータバリデーション
    if (!id) {
      return createErrorResponse('投稿IDが必要です', 400, 'MISSING_POST_ID');
    }

    // ObjectId形式チェック
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(id)) {
      return createErrorResponse('無効な投稿IDフォーマットです', 400, 'INVALID_POST_ID_FORMAT');
    }

    // リクエストボディの取得とバリデーション
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return createErrorResponse('無効なJSONリクエスト', 400, 'INVALID_JSON');
    }
    
    const validationResult = commentSchema.safeParse(body);
    
    if (!validationResult.success) {
      // エラーの詳細をログ出力
      console.log('[VALIDATION-ERROR] Validation failed:', {
        errors: validationResult.error?.errors || [],
        receivedData: body
      });
      
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'バリデーションエラー',
            details: validationResult.error?.errors?.map(err => ({
              field: err.path.join('.'),
              message: err.message
            })) || []
          },
        },
        { status: 400 }
      );
    }

    await connectDB();

    // 投稿の存在確認
    const post = await Post.findById(id);
    if (!post || post.status === 'deleted') {
      return createErrorResponse('投稿が見つかりません', 404, 'NOT_FOUND');
    }

    if (!post.commentsEnabled) {
      return createErrorResponse('この投稿へのコメントは無効です', 403, 'COMMENTS_DISABLED');
    }

    // コメント作成処理
    // 注意: MongoDBトランザクションはレプリカセットが必要なため、
    // ローカル開発環境では使用せず、楽観的更新を使用
    try {
      // デバッグログ：コメント作成前
      console.log('[COMMENT-DEBUG] Creating comment with data:', {
        postId: id,
        content: validationResult.data.content.substring(0, 50),
        userId: user.id,
        timestamp: new Date().toISOString()
      });

      // 基本的なXSSエスケープ処理（一時的にDOMPurifyを無効化）
      const sanitizedContent = validationResult.data.content
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
        
      console.log('[XSS-BASIC-ESCAPE] Content sanitization:', {
        original: validationResult.data.content,
        sanitized: sanitizedContent,
        length: { original: validationResult.data.content.length, sanitized: sanitizedContent.length },
        timestamp: new Date().toISOString()
      });

      // コメント作成
      const comment = new Comment({
        content: sanitizedContent,
        postId: id,
        author: {
          _id: user.id,
          name: user.name,
          email: user.email,
          avatar: null
        },
        metadata: {
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'unknown',
          clientVersion: req.headers.get('x-client-version') || '1.0.0'
        }
      });

      // コメントを保存
      await comment.save();

      console.log('[COMMENT-SUCCESS] Comment saved, ID:', comment._id);

      // 投稿のコメント数を非同期で更新（失敗してもコメント投稿は成功とする）
      post.updateCommentCount().catch(error => {
        console.error('[COMMENT-WARNING] Failed to update comment count:', error.message);
      });

      // Socket.IOでリアルタイム通知
      broadcastEvent('comment:created', {
        postId: id,
        comment: {
          ...comment.toJSON(),
          canDelete: true,
          canEdit: true,
          canReport: false,
          likeCount: 0,
          isLikedByUser: false
        },
        commentCount: post.commentCount + 1
      });

      // ログ記録
      console.log('[COMMENT-SUCCESS] Comment created:', {
        commentId: comment._id,
        postId: id,
        userId: user.id,
        content: validationResult.data.content.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        data: {
          ...comment.toJSON(),
          canDelete: true,
          canEdit: true,
          canReport: false,
          likeCount: 0,
          isLikedByUser: false
        },
        message: 'コメントを投稿しました'
      }, { status: 201 });

    } catch (innerError) {
      console.error('[COMMENT-ERROR] Failed to create comment:', {
        message: innerError.message,
        stack: innerError.stack,
        name: innerError.name,
        code: innerError.code,
        details: innerError
      });
      // エラーを再スローせず、適切なエラーレスポンスを返す
      return createErrorResponse('コメントの作成に失敗しました', 500, 'CREATE_ERROR');
    }

  } catch (error) {
    console.error('[COMMENT-ERROR] Failed to create comment - Full Details:', {
      errorType: error.constructor.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      mongooseError: error.errors,
      validationErrors: error.errors ? Object.keys(error.errors) : null,
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'バリデーションエラー',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
        },
        { status: 400 }
      );
    }
    
    return createErrorResponse('コメントの作成に失敗しました', 500, 'CREATE_ERROR');
  }
}