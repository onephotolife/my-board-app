import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // テストユーザーを検索
    const email = 'test1@example.com';
    
    console.log('🔍 Userモデル検索開始:', email);
    const user = await User.findOne({ email });
    console.log('👤 検索結果:', user ? { id: user._id, email: user.email } : 'null');
    
    // 全ユーザー数も確認
    const count = await User.countDocuments();
    console.log('📊 総ユーザー数:', count);
    
    // 最初の3件を取得
    const samples = await User.find({}).limit(3).select('email name');
    console.log('📋 サンプル:', samples.map(u => ({ email: u.email, name: u.name })));
    
    return NextResponse.json({
      found: !!user,
      user: user ? {
        id: user._id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      } : null,
      totalUsers: count,
      samples: samples.map(u => ({ email: u.email, name: u.name }))
    });
  } catch (error: any) {
    console.error('❌ エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}