import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import { 
  AuthError, 
  AuthErrorCode, 
  AuthSuccessResponse,
  AUTH_ERROR_MESSAGES 
} from '@/lib/errors/auth-errors';
import { isTokenValid } from '@/lib/auth/tokens';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // トークンの存在チェック
    if (!token) {
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN,
        AUTH_ERROR_MESSAGES[AuthErrorCode.INVALID_TOKEN],
        400
      );
    }

    console.log('🔍 メール確認トークン検証開始:', token);

    // データベース接続
    try {
      await connectDB();
      console.log('✅ データベース接続成功');
    } catch (dbError) {
      console.error('❌ データベース接続エラー:', dbError);
      throw new AuthError(
        AuthErrorCode.DATABASE_ERROR,
        AUTH_ERROR_MESSAGES[AuthErrorCode.DATABASE_ERROR],
        500
      );
    }

    // トークンでユーザー検索
    const user = await User.findOne({ emailVerificationToken: token });
    
    if (!user) {
      console.log('⚠️ トークンに一致するユーザーが見つかりません');
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN,
        'トークンが無効です。メール内のリンクが正しいか確認してください。',
        400,
        undefined,
        false
      );
    }
    
    // 既に確認済みの場合
    if (user.emailVerified) {
      console.log('ℹ️ 既にメール確認済み:', user.email);
      const response: AuthSuccessResponse = {
        success: true,
        message: 'メールアドレスは既に確認済みです。',
        data: {
          alreadyVerified: true,
          email: user.email
        },
        redirectUrl: '/auth/signin'
      };
      return NextResponse.json(response, { status: 200 });
    }

    // 有効期限チェック
    if (!isTokenValid(user.emailVerificationTokenExpiry)) {
      console.log('⚠️ トークンが期限切れ:', {
        expiry: user.emailVerificationTokenExpiry,
        now: new Date()
      });
      
      throw new AuthError(
        AuthErrorCode.TOKEN_EXPIRED,
        '確認リンクの有効期限が切れています。メールの再送信をお試しください。',
        400,
        {
          expiry: user.emailVerificationTokenExpiry,
          email: user.email
        },
        true // 再送信可能
      );
    }

    // トランザクション処理でユーザー情報を更新
    try {
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpiry = undefined;
      await user.save();

      console.log('✅ メール確認完了:', {
        email: user.email,
        _id: user._id
      });
      
      // 更新の確認
      const updatedUser = await User.findById(user._id);
      console.log('🔍 更新確認:', {
        emailVerified: updatedUser?.emailVerified,
        tokenCleared: !updatedUser?.emailVerificationToken
      });

      const response: AuthSuccessResponse = {
        success: true,
        message: 'メールアドレスの確認が完了しました！',
        data: {
          email: user.email,
          verified: true
        },
        redirectUrl: '/auth/signin?verified=true'
      };

      return NextResponse.json(response, { status: 200 });
      
    } catch (saveError) {
      console.error('❌ ユーザー更新エラー:', saveError);
      throw new AuthError(
        AuthErrorCode.DATABASE_ERROR,
        'ユーザー情報の更新に失敗しました。',
        500
      );
    }
    
  } catch (error) {
    console.error('メール確認エラー:', error);
    
    // AuthErrorの場合はそのまま返す
    if (error instanceof AuthError) {
      return NextResponse.json(
        error.toJSON(),
        { status: error.statusCode }
      );
    }
    
    // その他のエラー
    const genericError = new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      AUTH_ERROR_MESSAGES[AuthErrorCode.INTERNAL_ERROR],
      500,
      process.env.NODE_ENV === 'development' ? error : undefined
    );
    
    return NextResponse.json(
      genericError.toJSON(),
      { status: 500 }
    );
  }
}

// POSTメソッドも追加（クライアントからのリクエスト用）
export async function POST(request: NextRequest) {
  return GET(request);
}