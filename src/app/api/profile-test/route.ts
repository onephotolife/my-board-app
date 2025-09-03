import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

import { auth } from '@/lib/auth';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://yoshitaka_yamagishi:d82YJQKGwdAl4xZl@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority';

export async function PUT(req: NextRequest) {
  try {
    // 認証確認
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // リクエストボディを取得
    const body = await req.json();
    const { name, bio } = body;
    
    console.warn('[TEST API] Received:', { name, bio });

    // MongoDB接続
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
    }

    // 直接コレクションを操作
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // 更新前のデータを確認
    const beforeUser = await usersCollection.findOne({ email: session.user.email });
    console.warn('[TEST API] Before update - bio:', beforeUser?.bio);
    
    // 更新実行
    const updateResult = await usersCollection.updateOne(
      { email: session.user.email },
      {
        $set: {
          name: name || beforeUser?.name,
          bio: bio !== undefined ? bio : '',
          updatedAt: new Date()
        }
      }
    );
    
    console.warn('[TEST API] Update result:', updateResult);
    
    // 更新後のデータを取得
    const afterUser = await usersCollection.findOne({ email: session.user.email });
    console.warn('[TEST API] After update - bio:', afterUser?.bio);
    
    // レスポンス作成
    const userProfile = {
      id: afterUser?._id.toString(),
      email: afterUser?.email,
      name: afterUser?.name,
      bio: afterUser?.bio || '',
      avatar: afterUser?.avatar || '',
      emailVerified: afterUser?.emailVerified,
      createdAt: afterUser?.createdAt,
      updatedAt: afterUser?.updatedAt,
    };

    return NextResponse.json(
      { 
        message: 'プロフィールを更新しました',
        user: userProfile,
        debug: {
          receivedBio: bio,
          savedBio: afterUser?.bio,
          updateResult: {
            matched: updateResult.matchedCount,
            modified: updateResult.modifiedCount
          }
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[TEST API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}