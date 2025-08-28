/**
 * フォロー/アンフォロー API エンドポイント
 * 
 * POST /api/users/[userId]/follow - ユーザーをフォロー
 * DELETE /api/users/[userId]/follow - ユーザーをアンフォロー
 * GET /api/users/[userId]/follow - フォロー状態を確認
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Follow from '@/lib/models/Follow';
import { authOptions } from '@/lib/auth';
import { isValidObjectId, debugObjectId } from '@/lib/validators/objectId';

/**
 * フォロー状態を確認
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 15: paramsをawaitする
    const { userId } = await params;
    
    // デバッグログ追加
    const idDebug = debugObjectId(userId);
    console.log('[Follow API GET] ID validation:', idDebug);
    
    // ID形式の検証（400エラーとして返す）
    if (!isValidObjectId(userId)) {
      console.warn('[Follow API GET] Invalid ObjectID format:', idDebug);
      return NextResponse.json(
        { 
          error: '無効なユーザーID形式です',
          code: 'INVALID_OBJECT_ID_FORMAT',
          details: `ID must be 24 character hex string, got ${idDebug.length} characters`
        },
        { status: 400 }
      );
    }
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }
    
    // ターゲットユーザーの情報を取得（フォロー状態確認前に実施）
    let targetUser;
    try {
      targetUser = await User.findById(userId)
        .select('name email avatar bio followingCount followersCount');
    } catch (error: any) {
      console.error(`[Follow API GET] Target user lookup error for ID ${userId}:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { 
          error: 'ユーザーが見つかりません',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }
    
    if (!targetUser) {
      console.warn(`[Follow API GET] Target user ${userId} does not exist`);
      return NextResponse.json(
        { 
          error: 'ターゲットユーザーが見つかりません',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // フォロー状態を確認
    let isFollowing;
    try {
      isFollowing = await currentUser.isFollowing(userId);
    } catch (error: any) {
      console.error(`[Follow API GET] isFollowing check failed:`, {
        currentUserId: currentUser._id,
        targetUserId: userId,
        error: error.message,
        stack: error.stack
      });
      // フォロー状態確認に失敗した場合はfalseとして扱う
      isFollowing = false;
    }
    
    // 相互フォロー状態を確認
    const isFollowedBy = await targetUser.isFollowing(currentUser._id.toString());
    
    return NextResponse.json({
      success: true,
      data: {
        user: targetUser,
        isFollowing,
        isFollowedBy,
        isMutual: isFollowing && isFollowedBy,
      },
    });
    
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error('[Follow API GET] Unexpected error:', {
      error,
      userId: (await params).userId,
      requestId,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        requestId // トレース用
      },
      { status: 500 }
    );
  }
}

/**
 * ユーザーをフォロー
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 15: paramsをawaitする
    const { userId } = await params;
    
    // デバッグログ追加
    const idDebug = debugObjectId(userId);
    console.log('[Follow API POST] ID validation:', idDebug);
    
    // ID形式の検証（400エラーとして返す）
    if (!isValidObjectId(userId)) {
      console.warn('[Follow API POST] Invalid ObjectID format:', idDebug);
      return NextResponse.json(
        { 
          error: '無効なユーザーID形式です',
          code: 'INVALID_OBJECT_ID_FORMAT',
          details: `ID must be 24 character hex string, got ${idDebug.length} characters`
        },
        { status: 400 }
      );
    }
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }
    
    // ターゲットユーザーの存在確認（エラーハンドリング強化）
    let targetUser;
    try {
      targetUser = await User.findById(userId);
    } catch (error: any) {
      console.error(`[Follow API POST] Target user lookup error for ID ${userId}:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { 
          error: 'フォロー対象のユーザーが見つかりません',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }
    
    if (!targetUser) {
      console.warn(`[Follow API POST] Target user ${userId} does not exist`);
      return NextResponse.json(
        { 
          error: 'フォロー対象のユーザーが見つかりません',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    // プライベートアカウントのチェック
    if (targetUser.isPrivate) {
      // TODO: フォローリクエスト機能の実装
      return NextResponse.json(
        { error: 'このユーザーは承認制です（未実装）' },
        { status: 403 }
      );
    }
    
    // フォロー実行
    await currentUser.follow(userId);
    
    // 更新後のユーザー情報を返す
    const updatedTargetUser = await User.findById(userId)
      .select('name email avatar bio followingCount followersCount');
    
    return NextResponse.json({
      success: true,
      message: 'フォローしました',
      data: {
        user: updatedTargetUser,
        isFollowing: true,
      },
    });
    
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error('[Follow API POST] Error:', {
      error: error.message || error,
      userId: (await params).userId,
      requestId,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    // エラーメッセージの判定
    if (error.message === '自分自身をフォローすることはできません') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (error.message === '既にフォローしています') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        requestId // トレース用
      },
      { status: 500 }
    );
  }
}

/**
 * ユーザーをアンフォロー
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 15: paramsをawaitする
    const { userId } = await params;
    
    // デバッグログ追加
    const idDebug = debugObjectId(userId);
    console.log('[Follow API DELETE] ID validation:', idDebug);
    
    // ID形式の検証（400エラーとして返す）
    if (!isValidObjectId(userId)) {
      console.warn('[Follow API DELETE] Invalid ObjectID format:', idDebug);
      return NextResponse.json(
        { 
          error: '無効なユーザーID形式です',
          code: 'INVALID_OBJECT_ID_FORMAT',
          details: `ID must be 24 character hex string, got ${idDebug.length} characters`
        },
        { status: 400 }
      );
    }
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }
    
    // アンフォロー実行
    await currentUser.unfollow(userId);
    
    // 更新後のユーザー情報を返す（エラーハンドリング追加）
    let updatedTargetUser;
    try {
      updatedTargetUser = await User.findById(userId)
        .select('name email avatar bio followingCount followersCount');
    } catch (error: any) {
      console.error(`[Follow API DELETE] Target user lookup error for ID ${userId}:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { 
          error: 'アンフォロー対象のユーザーが見つかりません',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }
    
    if (!updatedTargetUser) {
      console.warn(`[Follow API DELETE] Target user ${userId} does not exist after unfollow`);
      return NextResponse.json(
        { 
          error: 'アンフォロー対象のユーザーが見つかりません',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'フォローを解除しました',
      data: {
        user: updatedTargetUser,
        isFollowing: false,
      },
    });
    
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error('[Follow API DELETE] Error:', {
      error: error.message || error,
      userId: (await params).userId,
      requestId,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    if (error.message === 'フォローしていません') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        requestId // トレース用
      },
      { status: 500 }
    );
  }
}