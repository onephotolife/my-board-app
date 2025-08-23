import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/models/Post';

export async function GET(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // ユーザー情報を取得（createdAtを含む）
    const user = await User.findOne({ email: session.user.email })
      .select('createdAt email name role')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // ユーザーの投稿統計を取得
    const totalPosts = await Post.countDocuments({
      $or: [
        { 'author.email': session.user.email },
        { 'author._id': user._id }
      ]
    });

    // 今日の投稿数を取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPosts = await Post.countDocuments({
      $or: [
        { 'author.email': session.user.email },
        { 'author._id': user._id }
      ],
      createdAt: { $gte: today }
    });

    // レスポンスデータ
    const stats = {
      totalPosts,
      todayPosts,
      lastLogin: new Date().toISOString(),
      memberSince: user.createdAt || new Date().toISOString(),
      email: user.email,
      name: user.name,
      role: user.role
    };

    console.log('[User Stats API] 統計情報取得成功:', {
      email: session.user.email,
      memberSince: stats.memberSince,
      totalPosts: stats.totalPosts
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[User Stats API] エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}