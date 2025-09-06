import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PipelineStage } from 'mongoose';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import Tag from '@/lib/models/Tag';
import type { AuthUser } from '@/lib/middleware/auth';
import { checkRateLimit, createErrorResponse } from '@/lib/middleware/auth';
import {
  createPostSchema,
  postFilterSchema,
  sanitizePostInput,
  formatValidationErrors,
} from '@/lib/validations/post';
import { broadcastEvent } from '@/lib/socket/socket-manager';
import { normalizePostDocuments, normalizePostDocument } from '@/lib/api/post-normalizer';
import { verifyCSRFMiddleware } from '@/lib/security/csrf-middleware';
import { extractHashtags, normalizeTag } from '@/app/utils/hashtag';
// NOTE: 追加のスキーマは未使用のためインポートしない（ESLint対策）

// ページネーションのデフォルト値
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

// next-auth/jwt の型定義互換問題に対処する安全ラッパ
async function getTokenFromRequest(req: NextRequest) {
  try {
    // 動的インポートでランタイムの実装に依存し、型不整合によるビルドエラーを回避
    const mod: unknown = await import('next-auth/jwt');
    const getToken = (
      mod as {
        getToken?: (opts: {
          req: NextRequest;
          secret?: string;
          secureCookie?: boolean;
          cookieName?: string;
        }) => Promise<Record<string, unknown> | null>;
      }
    ).getToken;
    if (typeof getToken === 'function') {
      return await getToken({
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
    }
  } catch {}
  return null;
}

// GET: 投稿一覧取得（認証必須）
export async function GET(req: NextRequest) {
  try {
    // クッキーのデバッグ情報
    const cookieDebug = {
      'next-auth.session-token': req.cookies.get('next-auth.session-token')?.value
        ? 'present'
        : 'missing',
      '__Secure-next-auth.session-token': req.cookies.get('__Secure-next-auth.session-token')?.value
        ? 'present'
        : 'missing',
      cookieHeader: req.headers.get('cookie') ? 'present' : 'missing',
    };

    // E2Eテスト用の認証バイパス
    let token = null;
    if (process.env.NODE_ENV === 'development') {
      const cookieHeader = req.headers.get('cookie');
      const isMockAuth =
        cookieHeader?.includes('mock-session-token-for-e2e-testing') ||
        cookieHeader?.includes('e2e-mock-auth=mock-session-token-for-e2e-testing');

      if (isMockAuth) {
        console.warn('🧪 [E2E-API] Mock authentication detected in /api/posts');
        token = {
          id: 'mock-user-id',
          email: 'one.photolife+1@gmail.com',
          name: 'E2E Test User',
          emailVerified: true,
          role: 'user',
        };
      }
    }

    // 通常の認証チェック（NextAuth v4対応）
    if (!token) {
      token = await getTokenFromRequest(req);
    }

    if (process.env.DEBUG_TAGS === 'true') {
      console.warn('🔍 [API] 認証トークン確認:', {
        hasToken: !!token,
        userId: token?.id || token?.sub,
        email: token?.email,
        emailVerified: token?.emailVerified,
        tokenKeys: token ? Object.keys(token) : [],
        environment: process.env.NODE_ENV,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        cookies: cookieDebug,
      });
    }

    if (!token) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    if (!token.emailVerified) {
      return createErrorResponse('メールアドレスの確認が必要です', 403, 'EMAIL_NOT_VERIFIED');
    }

    const user: AuthUser = {
      id: (token.id as string) || (token.sub as string),
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

    // クエリ構築（最小差分で既存のAND条件にORを組み込めるよう拡張）
    const baseQuery: Record<string, unknown> = { status: 'published' };
    const andConditions: Record<string, unknown>[] = [];

    if (category && category !== 'all') {
      baseQuery.category = category;
    }

    if (tag) {
      // 既存データ互換: 過去投稿で tags フィールド未設定でも本文に #<tag> があればヒットさせる
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tagEscaped = escape(tag);
      // 先頭/空白の後の #<tag> で末尾は空白/行末/句読点類で終了（日本語対応のため緩めに）
      const tagPattern = new RegExp(`(^|\\s)#${tagEscaped}(?=\\s|$|[\\p{P}])`, 'u');
      andConditions.push({
        $or: [{ tags: { $in: [tag] } }, { content: { $regex: tagPattern } }],
      });
    }

    if (search) {
      const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      andConditions.push({
        $or: [
          { title: { $regex: searchRegex, $options: 'i' } },
          { content: { $regex: searchRegex, $options: 'i' } },
        ],
      });
    }

    if (author) {
      baseQuery['author._id'] = author;
    }

    // ソート順の決定
    const sortOrder: Record<string, 1 | -1> = {};
    let useAggregateForLikes = false;
    let likesOrder: 1 | -1 = -1;
    if (sort.includes('likes')) {
      // likesは配列。人気順は配列サイズでソートするため集計パイプラインを使用
      useAggregateForLikes = true;
      likesOrder = sort.startsWith('-') ? -1 : 1;
    } else {
      if (sort.startsWith('-')) {
        sortOrder[sort.substring(1)] = -1;
      } else {
        sortOrder[sort] = 1;
      }
    }

    // ページネーション計算
    const skip = (page - 1) * limit;

    // 最終クエリ組み立て
    const finalQuery: Record<string, unknown> =
      andConditions.length > 0 ? { ...baseQuery, $and: andConditions } : { ...baseQuery };

    let posts: unknown[] = [];
    const totalPromise = Post.countDocuments(finalQuery);

    if (useAggregateForLikes) {
      // likes配列の要素数でソート
      const pipeline: PipelineStage[] = [
        { $match: finalQuery },
        { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
        { $sort: { likesCount: likesOrder, _id: -1 } },
        { $skip: skip },
        { $limit: limit },
      ];
      posts = await Post.aggregate(pipeline);
    } else {
      posts = await Post.find(finalQuery).sort(sortOrder).skip(skip).limit(limit).lean();
    }

    const total = await totalPromise;

    // 開発限定の観測ログ（PIIなし）
    if (process.env.DEBUG_TAGS === 'true') {
      try {
        console.warn('[TAG-API]', {
          tag,
          page,
          limit,
          total,
          finalQuery,
          sampleId:
            (Array.isArray(posts) && (posts as Array<{ _id?: unknown }>)[0]?.['_id']) || null,
        });
      } catch {}
    }

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
      fallbackToLegacy: true,
    });

    if (!csrfResult.valid) {
      console.error('[CSRF-ERROR] CSRF token validation failed for post creation', {
        error: csrfResult.error,
        timestamp: new Date().toISOString(),
      });

      if (process.env.NODE_ENV === 'development') {
        console.warn('[CSRF-WARN] Development mode: CSRF validation failed but continuing...');
      } else {
        return createErrorResponse('CSRFトークンが無効です', 403, 'CSRF_VALIDATION_FAILED');
      }
    }

    // クッキーのデバッグ情報
    const cookieDebug = {
      'next-auth.session-token': req.cookies.get('next-auth.session-token')?.value
        ? 'present'
        : 'missing',
      '__Secure-next-auth.session-token': req.cookies.get('__Secure-next-auth.session-token')?.value
        ? 'present'
        : 'missing',
      cookieHeader: req.headers.get('cookie') ? 'present' : 'missing',
    };

    // E2Eテスト用の認証バイパス
    let token = null;
    if (process.env.NODE_ENV === 'development') {
      const cookieHeader = req.headers.get('cookie');
      const isMockAuth =
        cookieHeader?.includes('mock-session-token-for-e2e-testing') ||
        cookieHeader?.includes('e2e-mock-auth=mock-session-token-for-e2e-testing');

      if (isMockAuth) {
        console.warn('🧪 [E2E-API] Mock authentication detected in /api/posts');
        token = {
          id: 'mock-user-id',
          email: 'one.photolife+1@gmail.com',
          name: 'E2E Test User',
          emailVerified: true,
          role: 'user',
        };
      }
    }

    // 通常の認証チェック（NextAuth v4対応）
    if (!token) {
      token = await getTokenFromRequest(req);
    }

    console.warn('🔍 [API] 認証トークン確認:', {
      hasToken: !!token,
      userId: token?.id || token?.sub,
      email: token?.email,
      emailVerified: token?.emailVerified,
      tokenKeys: token ? Object.keys(token) : [],
      environment: process.env.NODE_ENV,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      cookies: cookieDebug,
    });

    if (!token) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    if (!token.emailVerified) {
      return createErrorResponse('メールアドレスの確認が必要です', 403, 'EMAIL_NOT_VERIFIED');
    }

    const user: AuthUser = {
      id: (token.id as string) || (token.sub as string),
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
    validatedData.tags = validatedData.tags?.map((tag) => sanitizePostInput(tag)) || [];

    await connectDB();

    // ハッシュタグの自動抽出（本文＋提供タグを統合・正規化・ユニーク化・上限適用）
    const extracted = extractHashtags(validatedData.content || '');
    const extractedKeys = extracted.map((t) => t.key);
    const providedKeys = Array.isArray(validatedData.tags)
      ? validatedData.tags.map((t) => normalizeTag(t)).filter(Boolean)
      : [];
    const allTagKeys = Array.from(new Set([...extractedKeys, ...providedKeys])).slice(0, 5);

    // 投稿データの作成
    const postData = {
      ...validatedData,
      author: {
        // /src/lib/models/Post.tsのスキーマに合わせる（オブジェクト形式）
        _id: user.id,
        name: user.name,
        email: user.email,
      },
      authorInfo: {
        // authorInfoフィールドも追加（本番DBのスキーマ要件）
        name: user.name,
        email: user.email,
        avatar: null, // avatarフィールドは現時点でユーザー情報に含まれないためnull
      },
      status: 'published',
      views: 0,
      // 正規化済みタグを保存（既存スキーマの上限=5に合わせる）
      tags: allTagKeys,
    };

    // 投稿の保存
    const post = await Post.create(postData);

    // 人気タグの記録（1投稿内は同一タグを1回カウント）
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
