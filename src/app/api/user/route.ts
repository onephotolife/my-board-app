import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';

// GET /api/user - ユーザー情報取得
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
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json(
      { error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}