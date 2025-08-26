/**
 * フォロー中一覧取得 API エンドポイント
 * 
 * GET /api/users/[userId]/following - フォロー中のユーザー一覧を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Follow from '@/lib/models/Follow';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // 最大100件
    const includeReciprocal = searchParams.get('includeReciprocal') !== 'false';
    
    await dbConnect();
    
    // ターゲットユーザーの存在確認
    const targetUser = await User.findById(params.userId)
      .select('name email avatar bio followingCount followersCount isPrivate');
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }
    
    // プライベートアカウントのチェック
    if (targetUser.isPrivate) {
      // ログインしていない、または本人でない場合はアクセス拒否
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'このユーザーのフォロー中リストは非公開です' },
          { status: 403 }
        );
      }
      
      const currentUser = await User.findOne({ email: session.user.email });
      if (!currentUser || !currentUser._id.equals(targetUser._id)) {
        // 本人でない場合、フォローしているかチェック
        const isFollowing = await currentUser.isFollowing(params.userId);
        if (!isFollowing) {
          return NextResponse.json(
            { error: 'このユーザーのフォロー中リストは非公開です' },
            { status: 403 }
          );
        }
      }
    }
    
    // フォロー中のユーザーを取得
    const following = await targetUser.getFollowing(page, limit);
    
    // 現在のユーザーがログインしている場合、各ユーザーとの関係を追加
    let enrichedFollowing = following;
    if (session?.user?.email) {
      const currentUser = await User.findOne({ email: session.user.email });
      if (currentUser) {
        enrichedFollowing = await Promise.all(
          following.map(async (followRelation: any) => {
            const isFollowing = await currentUser.isFollowing(
              followRelation.following._id.toString()
            );
            const isFollowedBy = await User.findById(followRelation.following._id)
              .then(user => user?.isFollowing(currentUser._id.toString()) || false);
            
            return {
              ...followRelation,
              isFollowing,
              isFollowedBy,
              isMutual: isFollowing && isFollowedBy,
              isCurrentUser: currentUser._id.equals(followRelation.following._id),
            };
          })
        );
      }
    }
    
    // ページネーション情報
    const totalCount = targetUser.followingCount;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          avatar: targetUser.avatar,
          bio: targetUser.bio,
          followingCount: targetUser.followingCount,
        },
        following: enrichedFollowing,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
    
  } catch (error) {
    console.error('フォロー中一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}