import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email } = await request.json();
    
    // 既存ユーザーを確認
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      // 既存ユーザーをリセット
      existingUser.emailVerified = false;
      existingUser.emailVerificationToken = undefined;
      existingUser.emailVerificationTokenExpiry = undefined;
      await existingUser.save();
      
      return NextResponse.json({
        message: 'ユーザーをリセットしました',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          emailVerified: existingUser.emailVerified
        }
      });
    } else {
      // 新規作成
      const hashedPassword = await bcrypt.hash('Test1234!', 10);
      
      const newUser = await User.create({
        email,
        password: hashedPassword,
        name: `Test User (${email})`,
        emailVerified: false
      });
      
      return NextResponse.json({
        message: '新規ユーザーを作成しました',
        user: {
          id: newUser._id,
          email: newUser.email,
          emailVerified: newUser.emailVerified
        }
      });
    }
  } catch (error: any) {
    console.error('❌ エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}