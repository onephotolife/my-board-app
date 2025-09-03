import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    await connectDB();
    
    console.warn('🔍 テスト認証開始:', email);
    
    // ユーザーを検索
    const user = await User.findOne({ email });
    
    if (!user) {
      console.warn('❌ ユーザーが見つかりません');
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    console.warn('📝 ユーザー情報:', {
      id: user._id.toString(),
      email: user.email,
      emailVerified: user.emailVerified,
      emailVerifiedType: typeof user.emailVerified,
      role: user.role
    });
    
    // パスワード検証（comparePasswordメソッド）
    let isValidMethod = false;
    if (user.comparePassword) {
      isValidMethod = await user.comparePassword(password);
      console.warn('🔐 comparePasswordメソッド:', isValidMethod ? '✅' : '❌');
    }
    
    // パスワード検証（直接bcrypt）
    const isValidDirect = await bcrypt.compare(password, user.password);
    console.warn('🔐 bcrypt.compare直接:', isValidDirect ? '✅' : '❌');
    
    // emailVerifiedチェック
    const emailVerifiedCheck = {
      isTrue: user.emailVerified === true,
      isDate: user.emailVerified instanceof Date,
      value: user.emailVerified,
      type: typeof user.emailVerified
    };
    console.warn('📧 emailVerified検証:', emailVerifiedCheck);
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      },
      passwordCheck: {
        compareMethod: isValidMethod,
        bcryptDirect: isValidDirect
      },
      emailVerifiedCheck
    });
    
  } catch (error) {
    console.error('テスト認証エラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}