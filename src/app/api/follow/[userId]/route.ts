/**
 * フォロー/アンフォロー API エンドポイント
 * 
 * POST /api/follow/[userId] - ユーザーをフォロー
 * DELETE /api/follow/[userId] - ユーザーをアンフォロー
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Follow from '@/lib/models/Follow';
import { authOptions } from '@/lib/auth';
import { executeWithOptionalTransaction } from '@/lib/db/transaction-helper';

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
    
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Current user not found' 
        },
        { status: 404 }
      );
    }
    
    // 自分自身をフォローしようとしていないかチェック
    if (currentUser._id.toString() === userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cannot follow yourself' 
        },
        { status: 400 }
      );
    }
    
    // ターゲットユーザーの存在確認
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Target user not found' 
        },
        { status: 404 }
      );
    }
    
    // 既にフォローしているかチェック
    const existingFollow = await Follow.findOne({
      follower: currentUser._id,
      following: targetUser._id
    });
    
    if (existingFollow) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Already following this user' 
        },
        { status: 409 }
      );
    }
    
    // フォロー実行（環境に応じてトランザクション使用/不使用）
    await executeWithOptionalTransaction(async (session) => {
      // フォロー関係を作成
      await Follow.create([{
        follower: currentUser._id,
        following: targetUser._id,
        isReciprocal: false
      }], session ? { session } : undefined);
      
      // カウントを更新
      await User.findByIdAndUpdate(
        currentUser._id,
        { $inc: { followingCount: 1 } },
        session ? { session } : undefined
      );
      
      await User.findByIdAndUpdate(
        targetUser._id,
        { $inc: { followersCount: 1 } },
        session ? { session } : undefined
      );
      
      // 相互フォローチェック
      const reverseFindQuery = Follow.findOne({
        follower: targetUser._id,
        following: currentUser._id
      });
      const reverseFollow = session 
        ? await reverseFindQuery.session(session)
        : await reverseFindQuery;
      
      if (reverseFollow) {
        // 両方のフォロー関係を相互フォローに更新
        await Follow.updateMany(
          {
            $or: [
              { follower: currentUser._id, following: targetUser._id },
              { follower: targetUser._id, following: currentUser._id }
            ]
          },
          { $set: { isReciprocal: true } },
          session ? { session } : undefined
        );
        
        // 相互フォロー数を更新
        await User.findByIdAndUpdate(
          currentUser._id,
          { $inc: { mutualFollowsCount: 1 } },
          session ? { session } : undefined
        );
        
        await User.findByIdAndUpdate(
          targetUser._id,
          { $inc: { mutualFollowsCount: 1 } },
          session ? { session } : undefined
        );
      }
    }, { retryOnFailure: true });
    
    // 更新後のユーザー情報を返す
    const updatedTargetUser = await User.findById(userId)
      .select('name email avatar bio followingCount followersCount');
    
    return NextResponse.json({
      success: true,
      message: 'Successfully followed user',
      data: {
        user: updatedTargetUser,
        isFollowing: true
      }
    });
    
  } catch (error: any) {
    console.error('Follow error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Current user not found' 
        },
        { status: 404 }
      );
    }
    
    // ターゲットユーザーの存在確認
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Target user not found' 
        },
        { status: 404 }
      );
    }
    
    // フォロー関係の存在確認
    const existingFollow = await Follow.findOne({
      follower: currentUser._id,
      following: targetUser._id
    });
    
    if (!existingFollow) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Not following this user' 
        },
        { status: 400 }
      );
    }
    
    // アンフォロー実行（環境に応じてトランザクション使用/不使用）
    await executeWithOptionalTransaction(async (session) => {
      // 相互フォローだった場合の処理
      if (existingFollow.isReciprocal) {
        // 相手側のフォロー関係を非相互に更新
        await Follow.findOneAndUpdate(
          {
            follower: targetUser._id,
            following: currentUser._id
          },
          { $set: { isReciprocal: false } },
          session ? { session } : undefined
        );
        
        // 相互フォロー数を減らす
        await User.findByIdAndUpdate(
          currentUser._id,
          { $inc: { mutualFollowsCount: -1 } },
          session ? { session } : undefined
        );
        
        await User.findByIdAndUpdate(
          targetUser._id,
          { $inc: { mutualFollowsCount: -1 } },
          session ? { session } : undefined
        );
      }
      
      // フォロー関係を削除
      await Follow.findByIdAndDelete(
        existingFollow._id, 
        session ? { session } : undefined
      );
      
      // カウントを更新
      await User.findByIdAndUpdate(
        currentUser._id,
        { $inc: { followingCount: -1 } },
        session ? { session } : undefined
      );
      
      await User.findByIdAndUpdate(
        targetUser._id,
        { $inc: { followersCount: -1 } },
        session ? { session } : undefined
      );
    }, { retryOnFailure: true });
    
    // 更新後のユーザー情報を返す
    const updatedTargetUser = await User.findById(userId)
      .select('name email avatar bio followingCount followersCount');
    
    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user',
      data: {
        user: updatedTargetUser,
        isFollowing: false
      }
    });
    
  } catch (error: any) {
    console.error('Unfollow error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}