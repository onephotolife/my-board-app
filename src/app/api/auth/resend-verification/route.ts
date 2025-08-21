import { NextRequest, NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import { getEmailService } from '@/lib/email/mailer-fixed';
import { generateEmailVerificationToken, generateTokenExpiry } from '@/lib/utils/token-generator';

export async function POST(request: NextRequest) {
  try {
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

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'メールアドレスは既に確認済みです' },
        { status: 200 }
      );
    }

    // 新しいトークンを生成（改善版：256ビットのエントロピー）
    const emailVerificationToken = generateEmailVerificationToken();
    const tokenExpiry = generateTokenExpiry(24); // 24時間有効

    // ユーザー情報を更新
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpiry = tokenExpiry;
    await user.save();

    console.log('📝 新しいトークン生成:', {
      email: email,
      token: emailVerificationToken,
      expiry: tokenExpiry.toISOString(),
    });

    // 確認メールを再送信
    try {
      const host = request.headers.get('host');
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${emailVerificationToken}`;
      
      const emailService = getEmailService();
      const emailResult = await emailService.sendVerificationEmail(
        email,
        {
          userName: user.name,
          verificationUrl: verificationUrl,
        }
      );

      if (!emailResult.success) {
        console.error('メール送信失敗:', emailResult);
        return NextResponse.json(
          { error: 'メール送信に失敗しました。しばらく時間をおいて再度お試しください。' },
          { status: 500 }
        );
      }

      console.log('✅ 確認メール再送信成功:', email);

      return NextResponse.json({
        message: '確認メールを再送信しました',
        success: true
      });

    } catch (emailError) {
      console.error('❌ メール送信エラー:', emailError);
      return NextResponse.json(
        { error: 'メール送信中にエラーが発生しました' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('再送信エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}