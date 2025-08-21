import { NextRequest, NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';

// 開発環境でのみ使用：ユーザーのメール確認トークンを取得
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '本番環境では使用できません' },
        { status: 403 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      token: user.emailVerificationToken,
      emailVerified: user.emailVerified,
      tokenExpiry: user.emailVerificationTokenExpiry
    });

  } catch (error) {
    console.error('トークン取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}