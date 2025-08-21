import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Post from '@/models/Post';
import User from '@/lib/models/User';
import { getUnifiedSession, getUserFromSession } from '@/lib/auth/session-helper';
import { EnhancedSanitizer } from '@/lib/security/enhanced-sanitizer';
import { z } from 'zod';
import { postCache } from '@/lib/cache/memory-cache';

// バリデーションスキーマ
const PostCreateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内にしてください'),
  content: z.string().min(1, '本文は必須です').max(1000, '本文は1000文字以内にしてください'),
  tags: z.array(z.string()).optional(),
});

// GET: 投稿一覧取得
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    
    // パラメータのサニタイゼーション
    const page = EnhancedSanitizer.sanitizeNumber(searchParams.get('page'), 1, 1000) || 1;
    const limit = EnhancedSanitizer.sanitizeNumber(searchParams.get('limit'), 1, 100) || 20;
    const sort = EnhancedSanitizer.sanitizeURLParam(searchParams.get('sort') || '-createdAt');
    const author = EnhancedSanitizer.sanitizeObjectId(searchParams.get('author') || '') || undefined;
    const status = EnhancedSanitizer.sanitizeURLParam(searchParams.get('status') || 'published');
    const search = EnhancedSanitizer.sanitizeSearchQuery(searchParams.get('search') || '');

    const skip = (page - 1) * limit;
    
    // キャッシュキーの生成
    const cacheKey = `posts:${page}:${limit}:${sort}:${author || 'all'}:${status}`;

    // クエリ条件（サニタイズ済み）
    const query: any = { status };
    if (author) {
      query.author = author;
    }
    if (search) {
      // 検索クエリの追加（正規表現をエスケープ済み）
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    // キャッシュから取得を試みる
    const cachedResult = postCache.get(cacheKey);
    if (cachedResult) {
      console.log('キャッシュヒット:', cacheKey);
      return NextResponse.json(cachedResult);
    }

    // セッション情報を取得（統合セッションヘルパー使用）
    const session = await getUnifiedSession(request);
    console.log('API Session:', session ? { userId: session.user?.id, email: session.user?.email } : 'No session');

    // 投稿を取得（最適化済み）
    const postsQuery = Post.find(query)
      .select('title content author authorInfo status tags likes createdAt updatedAt') // 必要なフィールドのみ
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // プレーンオブジェクトで取得（パフォーマンス向上）
    
    // 環境変数でhintの使用を制御（本番環境での互換性のため）
    const useHint = process.env.USE_DB_HINTS === 'true';
    const posts = useHint
      ? await postsQuery.hint({ status: 1, createdAt: -1 }) // インデックスヒント（有効時のみ）
      : await postsQuery;

    // 権限情報を追加
    const postsWithPermissions = posts.map((post: any) => {
      // 投稿者判定のデバッグ
      const isOwner = session?.user?.id === post.author.toString();
      console.log('Post ownership check:', {
        postId: post._id,
        postAuthor: post.author.toString(),
        sessionUserId: session?.user?.id,
        isOwner
      });
      
      return {
        ...post,
        canEdit: isOwner,
        canDelete: isOwner,
        // セッション情報をデバッグ用に追加
        _debug: {
          sessionUserId: session?.user?.id,
          postAuthorId: post.author.toString()
        }
      };
    });

    // 総数を取得（最適化済み）
    const countQuery = Post.countDocuments(query);
    const total = useHint
      ? await countQuery.hint({ status: 1, createdAt: -1 }) // インデックスヒント（有効時のみ）
      : await countQuery;

    const result = {
      posts: postsWithPermissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      isAuthenticated: !!session,
    };
    
    // キャッシュに保存（60秒間）
    postCache.set(cacheKey, result, 60000);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('投稿一覧取得エラー:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: 新規投稿作成（認証必須）
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（統合セッションヘルパー使用）
    const session = await getUnifiedSession(request);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    await connectDB();

    // リクエストボディを取得
    const body = await request.json();
    
    // 入力のサニタイゼーション（強化版）
    const sanitizedBody = {
      title: EnhancedSanitizer.sanitizeText(body.title || ''),
      content: EnhancedSanitizer.sanitizeText(body.content || ''),
      tags: body.tags ? body.tags.map((tag: any) => EnhancedSanitizer.sanitizeText(tag)) : undefined
    };

    // バリデーション
    const validatedData = PostCreateSchema.parse(sanitizedBody);

    // ユーザー情報を取得（統合セッションヘルパー使用）
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 新規投稿を作成
    const newPost = await Post.create({
      ...validatedData,
      author: session.user.id,
      authorInfo: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      status: 'published',
    });

    return NextResponse.json(
      { message: '投稿を作成しました', post: newPost },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }
    console.error('投稿作成エラー:', error);
    return NextResponse.json(
      { error: '投稿の作成に失敗しました' },
      { status: 500 }
    );
  }
}