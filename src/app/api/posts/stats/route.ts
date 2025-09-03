import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // ユーザー情報を取得
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 現在の日付情報
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 総投稿数を取得
    const totalPosts = await Post.countDocuments({
      author: user._id,
      status: { $ne: 'deleted' }
    });

    // 今月の投稿数を取得
    const monthlyPosts = await Post.countDocuments({
      author: user._id,
      status: { $ne: 'deleted' },
      createdAt: { $gte: startOfMonth }
    });

    // 最終投稿日を取得
    const lastPost = await Post.findOne({
      author: user._id,
      status: { $ne: 'deleted' }
    })
      .sort({ createdAt: -1 })
      .select('createdAt');

    return NextResponse.json({
      totalPosts,
      monthlyPosts,
      lastPostDate: lastPost ? lastPost.createdAt : null,
      accountCreatedDate: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching post stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}