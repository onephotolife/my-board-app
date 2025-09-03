import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { requireEmailVerifiedSession, ApiAuthError, createApiErrorResponse } from '@/lib/api-auth';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';

// GET /api/user - ユーザー情報取得
export async function GET(request: NextRequest) {
  try {
    // 🔒 25人天才エンジニア会議による緊急修正: メール確認済みセッション必須
    const session = await requireEmailVerifiedSession();

    // データベース接続
    await connectDB();

    // ユーザー情報を取得
    const user = await User.findOne({ email: session.user.email })
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    // 🔒 API認証エラーの適切なハンドリング
    if (error instanceof ApiAuthError) {
      return createApiErrorResponse(error);
    }
    
    console.error('User fetch error:', error);
    return NextResponse.json(
      { error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}