import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';
import PasswordReset from '@/models/PasswordReset';

/**
 * 開発環境専用: 最新のパスワードリセットトークンを取得
 * E2Eテスト用のエンドポイント
 */
export async function POST(request: NextRequest) {
  // 本番環境では使用不可
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is not available in production' },
      { status: 403 }
    );
  }

  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // 最新の有効なリセットトークンを取得
    const passwordReset = await PasswordReset.findOne({
      email: email.toLowerCase(),
      used: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    if (!passwordReset) {
      // トークンが見つからない場合は、新しく作成
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      
      const newReset = await PasswordReset.create({
        email: email.toLowerCase(),
        token,
        expiresAt: new Date(Date.now() + 3600000), // 1時間後
        used: false
      });
      
      return NextResponse.json({ 
        token: newReset.token,
        created: true,
        expiresAt: newReset.expiresAt
      });
    }
    
    return NextResponse.json({ 
      token: passwordReset.token,
      created: false,
      expiresAt: passwordReset.expiresAt
    });
    
  } catch (error) {
    console.error('Error getting reset token:', error);
    return NextResponse.json(
      { error: 'Failed to get reset token' },
      { status: 500 }
    );
  }
}

// GET メソッドも実装（デバッグ用）
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is not available in production' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  
  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  try {
    await dbConnect();
    
    const tokens = await PasswordReset.find({
      email: email.toLowerCase()
    }).sort({ createdAt: -1 }).limit(5);
    
    return NextResponse.json({
      email,
      tokens: tokens.map(t => ({
        token: t.token.substring(0, 10) + '...',
        used: t.used,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error listing reset tokens:', error);
    return NextResponse.json(
      { error: 'Failed to list reset tokens' },
      { status: 500 }
    );
  }
}