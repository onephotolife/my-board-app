import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { sendEmail, getVerificationEmailHtml } from '@/lib/mail/sendMail';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'すべてのフィールドを入力してください' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上である必要があります' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // Create verification token
    const emailVerificationToken = uuidv4();

    // Create new user
    const user = new User({
      email,
      password,
      name,
      emailVerificationToken,
    });

    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${emailVerificationToken}`;
    const emailHtml = getVerificationEmailHtml(name, verificationUrl);
    
    await sendEmail({
      to: email,
      subject: 'メールアドレスの確認',
      html: emailHtml,
    });

    return NextResponse.json(
      { message: '登録が完了しました。メールを確認してアカウントを有効化してください。' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '登録中にエラーが発生しました' },
      { status: 500 }
    );
  }
}