import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Post from '@/models/Post';
import { getUnifiedSession } from '@/lib/auth/session-helper';
import { z } from 'zod';

// バリデーションスキーマ
const PostUpdateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内にしてください'),
  content: z.string().min(1, '本文は必須です').max(1000, '本文は1000文字以内にしてください'),
  tags: z.array(z.string()).optional(),
  status: z.enum(['published', 'draft']).optional(),
});

// GET: 個別投稿取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const post = await Post.findById(id).lean();

    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 削除済みの投稿は表示しない
    if (post.status === 'deleted') {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // セッション情報を取得（統合セッションヘルパー使用）
    const session = await getUnifiedSession(request);

    // 権限情報を追加
    const postWithPermissions = {
      ...post,
      canEdit: session?.user?.id === post.author.toString(),
      canDelete: session?.user?.id === post.author.toString(),
    };

    return NextResponse.json(postWithPermissions);
  } catch (error) {
    console.error('投稿取得エラー:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT: 投稿更新（作成者のみ）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id } = await params;

    // 投稿の存在確認
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 所有者チェック
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json(
        { error: '編集権限がありません' },
        { status: 403 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();

    // バリデーション
    const validatedData = PostUpdateSchema.parse(body);

    // 投稿を更新
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      message: '投稿を更新しました',
      post: updatedPost,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }
    console.error('投稿更新エラー:', error);
    return NextResponse.json(
      { error: '投稿の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE: 投稿削除（作成者のみ）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id } = await params;

    // 投稿の存在確認
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 所有者チェック
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json(
        { error: '削除権限がありません' },
        { status: 403 }
      );
    }

    // ソフトデリート（statusを'deleted'に変更）
    await Post.findByIdAndUpdate(id, { status: 'deleted' });

    return NextResponse.json({
      message: '投稿を削除しました',
    });
  } catch (error) {
    console.error('投稿削除エラー:', error);
    return NextResponse.json(
      { error: '投稿の削除に失敗しました' },
      { status: 500 }
    );
  }
}