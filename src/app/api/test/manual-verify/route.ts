import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';

// 開発環境でのみ使用：手動でメール確認を完了させる
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

    // メール確認を強制的に完了させる
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    console.warn('✅ 手動メール確認完了:', email);

    return NextResponse.json({
      message: 'メール確認が完了しました',
      email: user.email,
      emailVerified: user.emailVerified
    });

  } catch (error) {
    console.error('手動確認エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}