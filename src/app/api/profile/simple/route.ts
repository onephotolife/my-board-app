import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await req.json();
    const { bio } = body;
    
    await dbConnect();
    
    // 直接MongoDBを操作
    const db = mongoose.connection.db;
    const result = await db.collection('users').updateOne(
      { email: session.user.email },
      { $set: { bio: bio || '' } }
    );
    
    console.log('Simple update result:', result);
    
    // 更新後のデータを取得
    const user = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { bio: 1, name: 1 } }
    );
    
    console.log('Updated bio:', user?.bio);
    
    return NextResponse.json({
      success: true,
      bio: user?.bio || ''
    });
    
  } catch (error) {
    console.error('Simple API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}