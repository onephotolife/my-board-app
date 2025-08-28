/**
 * ユーザー存在確認 API エンドポイント
 * 
 * GET /api/users/[userId]/exists - ユーザーの存在を確認
 * 
 * STRICT120 AUTH_ENFORCED_TESTING_GUARD 準拠
 * 優先度2解決策: フォローAPI前のユーザー存在確認によるUX向上
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { authOptions } from '@/lib/auth';
import { isValidObjectId, debugObjectId } from '@/lib/validators/objectId';

/**
 * ユーザー存在確認
 * フォロー操作前の事前チェック用API
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 15: paramsをawaitする
    const { userId } = await params;
    
    // デバッグログ追加（Priority 2実装用）
    const idDebug = debugObjectId(userId);
    console.log('[User Exists API GET] ID validation:', idDebug);
    
    // ID形式の検証（400エラーとして返す）
    if (!isValidObjectId(userId)) {
      console.warn('[User Exists API GET] Invalid ObjectID format:', idDebug);
      return NextResponse.json(
        { 
          error: '無効なユーザーID形式です',
          code: 'INVALID_OBJECT_ID_FORMAT',
          details: `ID must be 24 character hex string, got ${idDebug.length} characters`
        },
        { status: 400 }
      );
    }
    
    // 認証確認（STRICT120 AUTH_ENFORCED_TESTING_GUARD準拠）
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // 現在のユーザーを取得（認証済みユーザーの検証）
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: '認証済みユーザーが見つかりません' },
        { status: 404 }
      );
    }
    
    // ターゲットユーザーの存在確認（Priority 2: 軽量チェック）
    let targetUser;
    try {
      targetUser = await User.findById(userId)
        .select('_id name email avatar createdAt emailVerified')  // 必要最小限のフィールド
        .lean();  // パフォーマンス最適化
    } catch (error: any) {
      console.error(`[User Exists API GET] Target user lookup error for ID ${userId}:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      });
      
      // MongooseのCastErrorを404として処理（Priority 1修正と同様）
      return NextResponse.json(
        { 
          exists: false,
          error: 'ユーザーが見つかりません',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }
    
    if (!targetUser) {
      console.warn(`[User Exists API GET] Target user ${userId} does not exist`);
      return NextResponse.json(
        { 
          exists: false,
          error: 'ユーザーが見つかりません',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // 自分自身のチェック
    const isSelf = targetUser._id.toString() === currentUser._id.toString();
    
    // ユーザー存在確認成功レスポンス
    return NextResponse.json({
      success: true,
      exists: true,
      data: {
        userId: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar,
        createdAt: targetUser.createdAt,
        emailVerified: targetUser.emailVerified,
        isSelf: isSelf
      },
    });
    
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error('[User Exists API GET] Unexpected error:', {
      error: error.message || error,
      userId: (await params).userId,
      requestId,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        exists: false,
        error: 'サーバーエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        requestId // トレース用
      },
      { status: 500 }
    );
  }
}