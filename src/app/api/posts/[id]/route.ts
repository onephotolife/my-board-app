import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb';
import Post from '@/lib/models/Post';

// PUT: 投稿を更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと内容は必須です' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const { id } = await params;
    const post = await Post.findById(id);

    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 投稿者のみ編集可能
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'この投稿を編集する権限がありません' },
        { status: 403 }
      );
    }

    post.title = title;
    post.content = content;
    await post.save();

    return NextResponse.json({
      message: '投稿が更新されました',
      post,
    });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: '投稿の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE: 投稿を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { id } = await params;
    const post = await Post.findById(id);

    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 投稿者のみ削除可能
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'この投稿を削除する権限がありません' },
        { status: 403 }
      );
    }

    await post.deleteOne();

    return NextResponse.json({
      message: '投稿が削除されました',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: '投稿の削除に失敗しました' },
      { status: 500 }
    );
  }
}