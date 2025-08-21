import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { UserRole } from '@/lib/permissions/types';
import { getUserPermissions } from '@/lib/permissions/utils';

export async function GET(req: NextRequest) {
  try {
    // セッション確認
    let session = await auth();
    
    // テストトークンチェック（開発環境のみ）
    if (!session?.user?.email && process.env.NODE_ENV !== 'production') {
      const testToken = req.cookies.get('test-auth-token')?.value;
      if (testToken) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(testToken, process.env.NEXTAUTH_SECRET || 'test-secret');
          session = {
            user: {
              email: decoded.email,
              name: decoded.name,
              id: decoded.id
            }
          };
        } catch (error) {
          console.error('Invalid test token:', error);
        }
      }
    }
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          role: UserRole.GUEST,
          permissions: getUserPermissions('', UserRole.GUEST).permissions,
          userId: null
        },
        { status: 200 }
      );
    }

    // データベース接続
    await connectDB();

    // ユーザー情報取得
    let user;
    if (session.user.id && !session.user.email) {
      // テストトークンの場合はIDで検索
      user = await User.findById(session.user.id)
        .select('_id role name email');
    } else {
      user = await User.findOne({ email: session.user.email })
        .select('_id role name email');
    }

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // ロールを権限システムの型に変換
    const role = user.role === 'admin' ? UserRole.ADMIN :
                 user.role === 'moderator' ? UserRole.MODERATOR :
                 UserRole.USER;

    // 権限情報を取得
    const permissions = getUserPermissions(user._id.toString(), role);

    return NextResponse.json({
      userId: user._id.toString(),
      role,
      permissions: permissions.permissions,
      user: {
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: '権限情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}