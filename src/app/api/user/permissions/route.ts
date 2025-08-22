import { NextRequest, NextResponse } from 'next/server';

import { requireEmailVerifiedSession, getOptionalSession, ApiAuthError, createApiErrorResponse } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { UserRole } from '@/lib/permissions/types';
import { getUserPermissions } from '@/lib/permissions/utils';

export async function GET(req: NextRequest) {
  try {
    // 🔒 25人天才エンジニア会議による緊急修正: 適切な認証チェック
    const session = await getOptionalSession();
    
    // テストトークンチェック（開発環境のみ）
    let effectiveSession = session;
    if (!session?.user?.email && process.env.NODE_ENV !== 'production') {
      const testToken = req.cookies.get('test-auth-token')?.value;
      if (testToken) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(testToken, process.env.NEXTAUTH_SECRET || 'test-secret');
          effectiveSession = {
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
    
    // ゲストユーザー（未認証）の場合
    if (!effectiveSession?.user) {
      return NextResponse.json(
        { 
          role: UserRole.GUEST,
          permissions: getUserPermissions('', UserRole.GUEST).permissions,
          userId: null
        },
        { status: 200 }
      );
    }
    
    // 🚨 メール未確認ユーザーの場合はゲスト扱い（会員制掲示板として必須）
    if (effectiveSession.user.email && !effectiveSession.user.emailVerified) {
      console.log('📧 [API Security] メール未確認ユーザーをゲスト扱い:', effectiveSession.user.email);
      return NextResponse.json(
        { 
          role: UserRole.GUEST,
          permissions: getUserPermissions('', UserRole.GUEST).permissions,
          userId: null,
          emailVerified: false,
          message: 'メール確認が必要です'
        },
        { status: 200 }
      );
    }

    // データベース接続
    await connectDB();

    // ユーザー情報取得
    let user;
    if (effectiveSession.user.id && !effectiveSession.user.email) {
      // テストトークンの場合はIDで検索
      user = await User.findById(effectiveSession.user.id)
        .select('_id role name email emailVerified');
    } else {
      user = await User.findOne({ email: effectiveSession.user.email })
        .select('_id role name email emailVerified');
    }

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 🚨 データベース情報での再度のメール確認チェック（念の為）
    if (!user.emailVerified) {
      console.log('📧 [API Security] DB情報でメール未確認を確認:', user.email);
      return NextResponse.json(
        { 
          role: UserRole.GUEST,
          permissions: getUserPermissions('', UserRole.GUEST).permissions,
          userId: null,
          emailVerified: false,
          message: 'メール確認が必要です'
        },
        { status: 200 }
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
    // 🔒 API認証エラーの適切なハンドリング
    if (error instanceof ApiAuthError) {
      return createApiErrorResponse(error);
    }
    
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: '権限情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}