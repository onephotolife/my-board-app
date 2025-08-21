import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';

// PUT /api/user/profile - プロフィール更新
export async function PUT(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { name, bio, avatar } = body;

    // データベース接続
    await connectDB();

    // ユーザー情報を更新
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        $set: {
          ...(name && { name }),
          ...(bio !== undefined && { bio }),
          ...(avatar && { avatar }),
          updatedAt: new Date(),
        }
      },
      { new: true, select: '-password' }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      emailVerified: updatedUser.emailVerified,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// GET /api/user/profile - プロフィール取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // データベース接続
    await connectDB();

    // ユーザー情報を取得
    const user = await User.findOne({ email: session.user.email })
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar || '',
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    );
  }
}