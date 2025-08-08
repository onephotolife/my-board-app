import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
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

    await connectDB();

    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return NextResponse.json(
        { error: 'トークンが無効または期限切れです' },
        { status: 400 }
      );
    }

    // Update user
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    // Redirect to login page with success message
    return NextResponse.redirect(
      new URL('/auth/signin?verified=true', process.env.NEXTAUTH_URL!)
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'メール確認中にエラーが発生しました' },
      { status: 500 }
    );
  }
}