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
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';

/**
 * フォロー状態を確認
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
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
    
    // フォロー状態を確認
    const isFollowing = await currentUser.isFollowing(params.userId);
    
    // ターゲットユーザーの情報を取得
    const targetUser = await User.findById(params.userId)
      .select('name email avatar bio followingCount followersCount');
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'ターゲットユーザーが見つかりません' },
        { status: 404 }
      );
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
    console.error('フォロー状態確認エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * ユーザーをフォロー
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
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
    
    // ターゲットユーザーの存在確認
    const targetUser = await User.findById(params.userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'フォロー対象のユーザーが見つかりません' },
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
    await currentUser.follow(params.userId);
    
    // 更新後のユーザー情報を返す
    const updatedTargetUser = await User.findById(params.userId)
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
    console.error('フォローエラー:', error);
    
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
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * ユーザーをアンフォロー
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
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
    await currentUser.unfollow(params.userId);
    
    // 更新後のユーザー情報を返す
    const updatedTargetUser = await User.findById(params.userId)
      .select('name email avatar bio followingCount followersCount');
    
    return NextResponse.json({
      success: true,
      message: 'フォローを解除しました',
      data: {
        user: updatedTargetUser,
        isFollowing: false,
      },
    });
    
  } catch (error: any) {
    console.error('アンフォローエラー:', error);
    
    if (error.message === 'フォローしていません') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}