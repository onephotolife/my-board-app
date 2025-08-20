import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import { 
  AuthError, 
  AuthErrorCode, 
  AuthSuccessResponse,
  AUTH_ERROR_MESSAGES 
} from '@/lib/errors/auth-errors';
import { generateEmailVerificationToken } from '@/lib/auth/tokens';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { EmailService } from '@/lib/email/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // 入力検証
    if (!email) {
      throw new AuthError(
        AuthErrorCode.MISSING_REQUIRED_FIELD,
        'メールアドレスは必須です。',
        400
      );
    }

    // メールアドレスの形式検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AuthError(
        AuthErrorCode.INVALID_INPUT,
        'メールアドレスの形式が正しくありません。',
        400
      );
    }

    console.log('📧 メール再送信リクエスト:', email);

    // IPアドレス取得
    const clientIp = getClientIp(request);
    
    // レート制限チェック（IPベース）
    const ipRateLimit = await checkRateLimit(clientIp, 'email-resend');
    if (!ipRateLimit.allowed) {
      throw new AuthError(
        AuthErrorCode.RATE_LIMITED,
        `再送信は${ipRateLimit.cooldownSeconds}秒後にお試しください。`,
        429,
        { 
          cooldownSeconds: ipRateLimit.cooldownSeconds,
          retriesRemaining: ipRateLimit.retriesRemaining 
        }
      );
    }

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

    // ユーザー検索
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('⚠️ ユーザーが見つかりません:', email);
      // セキュリティのため、ユーザーが存在しない場合も成功レスポンスを返す
      const response: AuthSuccessResponse = {
        success: true,
        message: '登録されているメールアドレスの場合、確認メールを送信しました。',
        data: {
          cooldownSeconds: 60
        }
      };
      return NextResponse.json(response, { status: 200 });
    }

    // 既に確認済みの場合
    if (user.emailVerified) {
      console.log('ℹ️ 既にメール確認済み:', email);
      throw new AuthError(
        AuthErrorCode.ALREADY_VERIFIED,
        'メールアドレスは既に確認済みです。',
        409,
        { email }
      );
    }

    // メールアドレスベースのレート制限チェック
    const emailRateLimit = await checkRateLimit(email, 'email-resend');
    if (!emailRateLimit.allowed) {
      throw new AuthError(
        AuthErrorCode.RATE_LIMITED,
        `再送信は${emailRateLimit.cooldownSeconds}秒後にお試しください。`,
        429,
        { 
          cooldownSeconds: emailRateLimit.cooldownSeconds,
          retriesRemaining: emailRateLimit.retriesRemaining 
        }
      );
    }

    // 新しいトークンを生成
    const { token, expiry } = generateEmailVerificationToken();
    
    // ユーザー情報を更新
    user.emailVerificationToken = token;
    user.emailVerificationTokenExpiry = expiry;
    await user.save();

    console.log('🔑 新しいトークン生成:', {
      email: user.email,
      tokenPrefix: token.substring(0, 8) + '...',
      expiry: expiry
    });

    // メール送信
    try {
      const emailService = new EmailService();
      const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
      
      // 正しい引数の順序で呼び出す（第1引数: to, 第2引数: data）
      await emailService.sendVerificationEmail(
        user.email,  // 第1引数: 宛先メールアドレス
        {
          userName: user.name || user.email.split('@')[0],
          verificationUrl,
        }
      );

      console.log('✅ 確認メール再送信成功:', user.email);
      
      const response: AuthSuccessResponse = {
        success: true,
        message: '確認メールを再送信しました。メールをご確認ください。',
        data: {
          email: user.email,
          cooldownSeconds: 60,
          retriesRemaining: emailRateLimit.retriesRemaining
        }
      };

      return NextResponse.json(response, { status: 200 });
      
    } catch (emailError) {
      console.error('❌ メール送信エラー:', emailError);
      
      // メール送信に失敗した場合でも、セキュリティのため成功レスポンスを返す
      const response: AuthSuccessResponse = {
        success: true,
        message: '確認メールの送信処理を開始しました。',
        data: {
          cooldownSeconds: 60,
          retriesRemaining: emailRateLimit.retriesRemaining
        }
      };

      // 内部的にはエラーフラグを立てる
      user.emailSendFailed = true;
      await user.save();

      return NextResponse.json(response, { status: 200 });
    }
    
  } catch (error) {
    console.error('メール再送信エラー:', error);
    
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