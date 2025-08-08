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
    const host = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
    
    return NextResponse.redirect(
      new URL('/auth/signin?verified=true', baseUrl)
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'メール確認中にエラーが発生しました' },
      { status: 500 }
    );
  }
}