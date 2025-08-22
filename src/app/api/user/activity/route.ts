import { NextRequest, NextResponse } from 'next/server';

import { requireEmailVerifiedSession, ApiAuthError, createApiErrorResponse } from '@/lib/api-auth';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    // 🔒 25人天才エンジニア会議による緊急修正: メール確認済みセッション必須
    const session = await requireEmailVerifiedSession();

    await connectDB();

    // ユーザー情報を取得
    const user = await User.findOne({ email: session.user.email })
      .select('loginCount lastLogin createdAt');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      loginCount: user.loginCount || 1,
      lastLogin: user.lastLogin || new Date(),
      accountCreatedDate: user.createdAt
    });
  } catch (error) {
    // 🔒 API認証エラーの適切なハンドリング
    if (error instanceof ApiAuthError) {
      return createApiErrorResponse(error);
    }
    
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}