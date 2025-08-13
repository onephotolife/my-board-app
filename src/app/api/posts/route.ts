import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Post from '@/models/Post';
import User from '@/lib/models/User';
import { auth } from '@/lib/auth';
import { z } from 'zod';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || '-createdAt';
    const author = searchParams.get('author');
    const status = searchParams.get('status') || 'published';

    const skip = (page - 1) * limit;

    // クエリ条件
    const query: any = { status };
    if (author) {
      query.author = author;
    }

    // セッション情報を取得（オプション）
    const session = await auth();
    console.log('API Session:', session ? { userId: session.user?.id, email: session.user?.email } : 'No session');

    // 投稿を取得
    const posts = await Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

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

    // 総数を取得
    const total = await Post.countDocuments(query);

    return NextResponse.json({
      posts: postsWithPermissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      isAuthenticated: !!session,
    });
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
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    await connectDB();

    // リクエストボディを取得
    const body = await request.json();

    // バリデーション
    const validatedData = PostCreateSchema.parse(body);

    // ユーザー情報を取得
    const user = await User.findById(session.user.id);
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