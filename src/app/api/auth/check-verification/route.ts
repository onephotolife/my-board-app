import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合も曖昧な応答を返す
      return NextResponse.json({
        exists: false,
        emailVerified: false,
        message: '認証情報をご確認ください'
      });
    }
    
    if (!user.emailVerified) {
      return NextResponse.json({
        exists: true,
        emailVerified: false,
        message: 'メールアドレスの確認が必要です',
        action: '登録時に送信された確認メールをご確認ください。メールが届いていない場合は、迷惑メールフォルダもご確認ください。'
      });
    }
    
    // メール確認済みの場合
    return NextResponse.json({
      exists: true,
      emailVerified: true,
      message: 'メールアドレスは確認済みです'
    });
    
  } catch (error) {
    console.error('Check verification error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}