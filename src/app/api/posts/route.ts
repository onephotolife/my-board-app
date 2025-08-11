import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb';
import Post from '@/lib/models/Post';

// GET: 投稿一覧を取得（会員限定）
export async function GET(request: NextRequest) {
  try {
    console.log('=== GET /api/posts 開始 ===');
    
    // セッション確認（会員制なので必須）
    const session = await auth();
    console.log('セッション状態:', session ? `認証済み (${session.user?.email})` : '未認証');
    
    if (!session) {
      console.log('未認証のため投稿取得を拒否');
      // 401ではなく200で返す（クライアント側で制御）
      return NextResponse.json(
        { 
          error: 'ログインが必要です',
          requireAuth: true,
          posts: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          }
        },
        { status: 200 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // DB接続
    await connectDB();
    console.log('MongoDB接続完了');

    // すべての投稿を取得（会員なら全て見れる）
    const [posts, total] = await Promise.all([
      Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(),
    ]);
    
    console.log(`投稿取得完了: ${posts.length}件 / 全${total}件`);

    // 編集権限の付与
    const postsWithPermissions = posts.map(post => ({
      ...post,
      isOwner: session.user.id === post.author,
      canEdit: session.user.id === post.author,
      canDelete: session.user.id === post.author,
    }));

    return NextResponse.json({
      posts: postsWithPermissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      currentUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: 新規投稿を作成（会員限定）
export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/posts 開始 ===');
    
    const session = await auth();
    console.log('セッション状態:', session ? `認証済み (${session.user?.email})` : '未認証');
    
    if (!session) {
      console.log('未認証のため投稿作成を拒否');
      return NextResponse.json(
        { error: '投稿するにはログインが必要です' },
        { status: 401 }
      );
    }

    const { title, content } = await request.json();
    console.log('投稿内容:', { title, content: content?.substring(0, 50) + '...' });

    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと内容は必須です' },
        { status: 400 }
      );
    }

    await connectDB();
    console.log('MongoDB接続完了');

    const post = new Post({
      title,
      content,
      author: session.user.id,
      authorName: session.user.name || session.user.email?.split('@')[0] || '匿名',
      authorEmail: session.user.email,
    });

    await post.save();
    console.log('投稿保存完了:', post._id);
    
    // 保存後の確認
    const savedPost = await Post.findById(post._id);
    console.log('保存確認:', savedPost ? '成功' : '失敗');

    return NextResponse.json(
      post,
      { status: 201 }
    );
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: '投稿の作成に失敗しました' },
      { status: 500 }
    );
  }
}