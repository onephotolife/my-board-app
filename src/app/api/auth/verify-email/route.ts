import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import { getTokenType, isTokenValid } from '@/lib/utils/token-generator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    console.log('🔍 メール確認リクエスト受信:', {
      url: request.url,
      token: token ? `${token.substring(0, 8)}...` : 'null',
      tokenLength: token?.length,
      userAgent: request.headers.get('user-agent')
    });

    if (!token) {
      console.log('❌ トークンが提供されていません');
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 400 }
      );
    }

    // トークン形式の検証（UUIDとHex両方をサポート）
    const tokenType = getTokenType(token);
    if (tokenType === 'invalid') {
      console.log('❌ トークンの形式が無効です:', { 
        length: token.length,
        type: tokenType 
      });
      return NextResponse.json(
        { error: 'トークンの形式が無効です' },
        { status: 400 }
      );
    }
    
    console.log('🔍 トークンタイプ:', tokenType);

    console.log('🔍 メール確認トークン:', token);

    // データベース接続
    try {
      await connectDB();
      console.log('✅ データベース接続成功');
    } catch (dbError) {
      console.error('❌ データベース接続エラー:', dbError);
      return NextResponse.json(
        { error: 'データベース接続エラーが発生しました' },
        { status: 500 }
      );
    }

    // ユーザー検索（まず期限を考慮せずに検索）
    console.log('🔍 データベースでトークン検索中...');
    const userWithToken = await User.findOne({ emailVerificationToken: token });
    
    if (!userWithToken) {
      console.log('⚠️ トークンに一致するユーザーが見つかりません');
      
      // デバッグ用：類似するトークンがあるかチェック
      const similarTokens = await User.find(
        { emailVerificationToken: { $exists: true, $ne: null } },
        { emailVerificationToken: 1, email: 1 }
      ).limit(5);
      
      console.log('🔍 データベース内の既存トークン（最大5件）:', 
        similarTokens.map(u => ({
          email: u.email,
          token: u.emailVerificationToken ? `${u.emailVerificationToken.substring(0, 8)}...` : 'null'
        }))
      );
      
      return NextResponse.json(
        { error: 'トークンが無効です' },
        { status: 400 }
      );
    }
    
    console.log('✅ ユーザー見つかりました:', { 
      email: userWithToken.email, 
      emailVerified: userWithToken.emailVerified 
    });
    
    // 期限チェック（改善版ユーティリティを使用）
    const now = new Date();
    console.log('🕐 期限チェック:', {
      now: now.toISOString(),
      expiry: userWithToken.emailVerificationTokenExpiry?.toISOString(),
      isValid: isTokenValid(userWithToken.emailVerificationTokenExpiry)
    });
    
    // 期限が設定されていて、期限切れの場合
    if (userWithToken.emailVerificationTokenExpiry && !isTokenValid(userWithToken.emailVerificationTokenExpiry)) {
      console.log('⚠️ トークンが期限切れです');
      return NextResponse.json(
        { 
          error: '確認リンクの有効期限が切れています。',
          suggestion: '再送信ボタンをクリックして新しい確認メールを受け取ってください。',
          canResend: true
        },
        { status: 400 }
      );
    }
    
    const user = userWithToken;

    // 既に確認済みの場合
    if (user.emailVerified) {
      console.log('ℹ️ 既にメール確認済み');
      return NextResponse.json(
        { 
          message: 'メールアドレスは既に確認済みです',
          alreadyVerified: true 
        },
        { status: 200 }
      );
    }

    // ユーザー情報を更新
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    console.log('✅ メール確認完了:', user.email);
    console.log('📄 更新後のユーザー情報:', {
      email: user.email,
      emailVerified: user.emailVerified,
      _id: user._id
    });
    
    // MongoDB Atlasでの更新を確認
    const updatedUser = await User.findById(user._id);
    console.log('🔍 MongoDB Atlas確認:', {
      emailVerified: updatedUser?.emailVerified,
      tokenCleared: !updatedUser?.emailVerificationToken
    });

    // JSONレスポンスを返す（リダイレクトではなく）
    return NextResponse.json(
      { 
        message: 'メールアドレスの確認が完了しました',
        success: true,
        email: user.email
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('メール確認エラー:', error);
    
    // エラーの詳細をログに出力
    if (error instanceof Error) {
      console.error('エラー詳細:', error.message);
      console.error('スタックトレース:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'メール確認中にエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// POSTメソッドも追加（クライアントからのリクエスト用）
export async function POST(request: NextRequest) {
  return GET(request);
}