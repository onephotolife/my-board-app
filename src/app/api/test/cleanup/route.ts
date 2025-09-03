import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';

// 開発環境でのみ使用：テストユーザーをクリーンアップ
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
    
    const result = await User.deleteOne({ email });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: 'ユーザーが存在しません' },
        { status: 404 }
      );
    }

    console.warn('🗑️ テストユーザー削除:', email);

    return NextResponse.json({
      message: 'ユーザーを削除しました',
      email: email
    });

  } catch (error) {
    console.error('クリーンアップエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}