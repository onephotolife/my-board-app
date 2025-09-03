import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';
import type { AuthUser } from '@/lib/middleware/auth';
import { checkRateLimit, createErrorResponse } from '@/lib/middleware/auth';
import { createPostSchema, postFilterSchema, sanitizePostInput, formatValidationErrors } from '@/lib/validations/post';
import { broadcastEvent } from '@/lib/socket/socket-manager';
import { normalizePostDocuments, normalizePostDocument } from '@/lib/api/post-normalizer';
import { verifyCSRFMiddleware } from '@/lib/security/csrf-middleware';
import { 
  CreatePostRequestSchema, 
  PostFilterSchema,
  validateCreateRequest,
  validatePostFilter
} from '@/schemas/post.schema';

// ページネーションのデフォルト値
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// GET: 投稿一覧取得（認証必須）
export async function GET(req: NextRequest) {
  try {
    // クッキーのデバッグ情報
    const cookieDebug = {
      'next-auth.session-token': req.cookies.get('next-auth.session-token')?.value ? 'present' : 'missing',
      '__Secure-next-auth.session-token': req.cookies.get('__Secure-next-auth.session-token')?.value ? 'present' : 'missing',
      cookieHeader: req.headers.get('cookie') ? 'present' : 'missing'
    };

    // 認証チェック（NextAuth v4対応）
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
    });

    console.warn('🔍 [API] 認証トークン確認:', {
      hasToken: !!token,
      userId: token?.id || token?.sub,
      email: token?.email,
      emailVerified: token?.emailVerified,
      tokenKeys: token ? Object.keys(token) : [],
      environment: process.env.NODE_ENV,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      cookies: cookieDebug
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
    const filterParams = {
      page: searchParams.get('page') || String(DEFAULT_PAGE),
      limit: searchParams.get('limit') || String(DEFAULT_LIMIT),
      category: searchParams.get('category') || undefined,
      tag: searchParams.get('tag') || undefined,
      search: searchParams.get('search') || undefined,
      author: searchParams.get('author') || undefined,
      sort: searchParams.get('sort') || '-createdAt',
    };

    // バリデーション
    const validatedFilter = postFilterSchema.parse(filterParams);
    const { page, limit, category, tag, search, author, sort } = validatedFilter;

    await connectDB();

    // クエリ構築
    const query: any = { status: 'published' };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (tag) {
      query.tags = { $in: [tag] };
    }
    
    if (search) {
      const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: searchRegex, $options: 'i' } },
        { content: { $regex: searchRegex, $options: 'i' } },
      ];
    }
    
    if (author) {
      query['author._id'] = author;
    }

    // ソート順の決定
    const sortOrder: any = {};
    if (sort.startsWith('-')) {
      sortOrder[sort.substring(1)] = -1;
    } else {
      sortOrder[sort] = 1;
    }

    // ページネーション計算
    const skip = (page - 1) * limit;

    // データ取得（並列実行）
    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    // 正規化と権限情報追加（UnifiedPost形式に変換）
    const normalizedPosts = normalizePostDocuments(posts, user.id);

    // レスポンス作成
    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('投稿一覧取得エラー:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '無効なパラメータです',
            details: formatValidationErrors(error),
          },
        },
        { status: 400 }
      );
    }
    
    return createErrorResponse('投稿の取得に失敗しました', 500, 'FETCH_ERROR');
  }
}

// POST: 新規投稿作成（認証必須）
export async function POST(req: NextRequest) {
  try {
    // CSRF検証
    const csrfResult = await verifyCSRFMiddleware(req, {
      developmentBypass: process.env.NODE_ENV === 'development',
      enableSyncManager: true,
      fallbackToLegacy: true
    });
    
    if (!csrfResult.valid) {
      console.error('[CSRF-ERROR] CSRF token validation failed for post creation', {
        error: csrfResult.error,
        userId: user.id,
        userEmail: user.email,
        timestamp: new Date().toISOString()
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('[CSRF-WARN] Development mode: CSRF validation failed but continuing...');
      } else {
        return createErrorResponse('CSRFトークンが無効です', 403, 'CSRF_VALIDATION_FAILED');
      }
    }

    // クッキーのデバッグ情報
    const cookieDebug = {
      'next-auth.session-token': req.cookies.get('next-auth.session-token')?.value ? 'present' : 'missing',
      '__Secure-next-auth.session-token': req.cookies.get('__Secure-next-auth.session-token')?.value ? 'present' : 'missing',
      cookieHeader: req.headers.get('cookie') ? 'present' : 'missing'
    };

    // 認証チェック（NextAuth v4対応）
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
      secureCookie: process.env.NODE_ENV === 'production',
      cookieName: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
    });

    console.warn('🔍 [API] 認証トークン確認:', {
      hasToken: !!token,
      userId: token?.id || token?.sub,
      email: token?.email,
      emailVerified: token?.emailVerified,
      tokenKeys: token ? Object.keys(token) : [],
      environment: process.env.NODE_ENV,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      cookies: cookieDebug
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

    // レート制限チェック
    if (!checkRateLimit(user.id)) {
      return createErrorResponse(
        '投稿の作成回数が制限に達しました。しばらく待ってから再試行してください。',
        429,
        'RATE_LIMIT'
      );
    }

    // リクエストボディの取得
    const body = await req.json();

    // バリデーション
    const validatedData = createPostSchema.parse(body);

    // サニタイズ
    validatedData.title = sanitizePostInput(validatedData.title);
    validatedData.content = sanitizePostInput(validatedData.content);
    validatedData.tags = validatedData.tags?.map(tag => sanitizePostInput(tag)) || [];

    await connectDB();

    // 投稿データの作成
    const postData = {
      ...validatedData,
      author: {        // /src/lib/models/Post.tsのスキーマに合わせる（オブジェクト形式）
        _id: user.id,
        name: user.name,
        email: user.email,
      },
      authorInfo: {    // authorInfoフィールドも追加（本番DBのスキーマ要件）
        name: user.name,
        email: user.email,
        avatar: null,  // avatarフィールドは現時点でユーザー情報に含まれないためnull
      },
      status: 'published',
      views: 0,
    };

    // 投稿の保存
    const post = await Post.create(postData);
    
    // 正規化（UnifiedPost形式に変換）
    const normalizedPost = normalizePostDocument(post.toObject(), user.id);

    // Socket.ioで新規投稿をブロードキャスト
    broadcastEvent('post:new', {
      post: normalizedPost,
      author: user,
    });

    return NextResponse.json(
      {
        success: true,
        data: normalizedPost,
        message: '投稿が作成されました',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('投稿作成エラー:', error);
    
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
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'データベースバリデーションエラー',
            details: error.message,
          },
        },
        { status: 400 }
      );
    }
    
    return createErrorResponse('投稿の作成に失敗しました', 500, 'CREATE_ERROR');
  }
}