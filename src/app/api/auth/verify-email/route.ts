import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 400 }
      );
    }

    console.log('🔍 メール確認トークン:', token);

    // データベース接続
    try {
      await connectDB();
      console.log('✅ データベース接続成功');
    } catch (dbError) {
      console.error('❌ データベース接続エラー:', dbError);
      return NextResponse.json(
        { error: 'データベース接続エラーが発生しました' },
        { status: 500 }
      );
    }

    // ユーザー検索（まず期限を考慮せずに検索）
    const userWithToken = await User.findOne({ emailVerificationToken: token });
    
    if (!userWithToken) {
      console.log('⚠️ トークンに一致するユーザーが見つかりません');
      return NextResponse.json(
        { error: 'トークンが無効です' },
        { status: 400 }
      );
    }
    
    // 期限チェック
    const now = new Date();
    console.log('🕐 期限チェック:', {
      now: now.toISOString(),
      expiry: userWithToken.emailVerificationTokenExpiry?.toISOString(),
      isExpired: userWithToken.emailVerificationTokenExpiry ? userWithToken.emailVerificationTokenExpiry < now : 'no expiry set'
    });
    
    // 期限が設定されていて、期限切れの場合
    if (userWithToken.emailVerificationTokenExpiry && userWithToken.emailVerificationTokenExpiry < now) {
      console.log('⚠️ トークンが期限切れです');
      return NextResponse.json(
        { error: '確認リンクの有効期限が切れています。新規登録からやり直してください。' },
        { status: 400 }
      );
    }
    
    const user = userWithToken;

    // 既に確認済みの場合
    if (user.emailVerified) {
      console.log('ℹ️ 既にメール確認済み');
      return NextResponse.json(
        { 
          message: 'メールアドレスは既に確認済みです',
          alreadyVerified: true 
        },
        { status: 200 }
      );
    }

    // ユーザー情報を更新
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    console.log('✅ メール確認完了:', user.email);
    console.log('📄 更新後のユーザー情報:', {
      email: user.email,
      emailVerified: user.emailVerified,
      _id: user._id
    });
    
    // MongoDB Atlasでの更新を確認
    const updatedUser = await User.findById(user._id);
    console.log('🔍 MongoDB Atlas確認:', {
      emailVerified: updatedUser?.emailVerified,
      tokenCleared: !updatedUser?.emailVerificationToken
    });

    // JSONレスポンスを返す（リダイレクトではなく）
    return NextResponse.json(
      { 
        message: 'メールアドレスの確認が完了しました',
        success: true,
        email: user.email
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('メール確認エラー:', error);
    
    // エラーの詳細をログに出力
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
      console.error('スタックトレース:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'メール確認中にエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// POSTメソッドも追加（クライアントからのリクエスト用）
export async function POST(request: NextRequest) {
  return GET(request);
}