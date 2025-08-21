import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';

// PUT: パスワード変更
export async function PUT(req: NextRequest) {
  try {
    // セッション確認
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // バリデーション
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'すべてのフィールドを入力してください' },
        { status: 400 }
      );
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'パスワードの形式が正しくありません' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: '新しいパスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    // パスワードの複雑性チェック
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { error: 'パスワードは大文字、小文字、数字、特殊文字を含む必要があります' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: '新しいパスワードは現在のパスワードと異なる必要があります' },
        { status: 400 }
      );
    }

    // データベース接続
    await connectDB();

    // ユーザーを取得（パスワードフィールドを含む）
    const user = await User.findOne({ email: session.user.email }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 現在のパスワードを確認
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 400 }
      );
    }

    // パスワードを更新（pre('save')ミドルウェアで自動的にハッシュ化される）
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    // セキュリティのため、パスワード変更後は再ログインを促す
    // （実際のアプリケーションでは、全てのセッショントークンを無効化する処理を追加）

    return NextResponse.json(
      { 
        message: 'パスワードを変更しました。セキュリティのため、再度ログインしてください。',
        requireReauth: true 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'パスワードの変更に失敗しました' },
      { status: 500 }
    );
  }
}