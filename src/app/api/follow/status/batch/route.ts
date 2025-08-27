import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Follow from '@/lib/models/Follow';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userIds } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid userIds' }, { status: 400 });
    }
    
    // 最大50人までの制限
    if (userIds.length > 50) {
      return NextResponse.json({ error: 'Too many userIds' }, { status: 400 });
    }
    
    await connectDB();
    
    console.log('🔍 [Batch Follow Status] Request:', {
      requestUserId: session.user.id,
      targetUserIds: userIds,
      count: userIds.length
    });
    
    // 現在のユーザーがフォローしているユーザーIDを取得
    const follows = await Follow.find({
      follower: session.user.id,
      following: { $in: userIds }
    }).select('following');
    
    const followingIds = follows.map(f => f.following.toString());
    
    console.log('✅ [Batch Follow Status] Response:', {
      requestUserId: session.user.id,
      followingCount: followingIds.length,
      followingIds: followingIds
    });
    
    return NextResponse.json({
      success: true,
      followingIds
    });
  } catch (error) {
    console.error('❌ [Batch Follow Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}