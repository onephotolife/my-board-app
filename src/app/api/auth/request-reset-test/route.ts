// Test endpoint that returns the reset URL directly
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import PasswordReset from '@/models/PasswordReset';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    console.warn('Test endpoint - Request for email:', email);
    console.warn('MONGODB_URI:', process.env.MONGODB_URI);
    
    await dbConnect();
    
    const user = await User.findOne({ email }).select('name email emailVerified');
    
    console.warn('Found user:', user ? { email: user.email, emailVerified: user.emailVerified } : 'null');
    
    if (!user || !user.emailVerified) {
      return NextResponse.json({
        error: 'ユーザーが見つからないか、メール未確認です'
      }, { status: 404 });
    }
    
    // Delete old tokens
    await PasswordReset.deleteMany({ 
      email, 
      $or: [
        { used: true },
        { expiresAt: { $lt: new Date() } }
      ]
    });
    
    // Create new token with required fields
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    const resetToken = new PasswordReset({ 
      email,
      token,
      expiresAt,
      used: false
    });
    await resetToken.save();
    
    // Generate reset URL
    const host = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`;
    
    // Return URL directly for testing
    return NextResponse.json({
      success: true,
      message: 'パスワードリセットURLを生成しました',
      resetUrl,
      expiresAt,
      note: 'このURLを使用してパスワードをリセットできます（有効期限: 1時間）'
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}