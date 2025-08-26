/**
 * フォロワー一覧取得 API エンドポイント
 * 
 * GET /api/users/[userId]/followers - フォロワー一覧を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Follow from '@/lib/models/Follow';
import { authOptions } from '@/lib/auth';

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
          { error: 'このユーザーのフォロワーは非公開です' },
          { status: 403 }
        );
      }
      
      const currentUser = await User.findOne({ email: session.user.email });
      if (!currentUser || !currentUser._id.equals(targetUser._id)) {
        // 本人でない場合、フォローしているかチェック
        const isFollowing = await currentUser.isFollowing(params.userId);
        if (!isFollowing) {
          return NextResponse.json(
            { error: 'このユーザーのフォロワーは非公開です' },
            { status: 403 }
          );
        }
      }
    }
    
    // フォロワーを取得
    const followers = await targetUser.getFollowers(page, limit);
    
    // 現在のユーザーがログインしている場合、各フォロワーとの関係を追加
    let enrichedFollowers = followers;
    if (session?.user?.email) {
      const currentUser = await User.findOne({ email: session.user.email });
      if (currentUser) {
        enrichedFollowers = await Promise.all(
          followers.map(async (followerRelation: any) => {
            const isFollowing = await currentUser.isFollowing(
              followerRelation.follower._id.toString()
            );
            return {
              ...followerRelation,
              isFollowing,
              isCurrentUser: currentUser._id.equals(followerRelation.follower._id),
            };
          })
        );
      }
    }
    
    // ページネーション情報
    const totalCount = targetUser.followersCount;
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
          followersCount: targetUser.followersCount,
        },
        followers: enrichedFollowers,
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
    console.error('フォロワー一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}