import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import PasswordReset from '@/models/PasswordReset';
import { getEmailService } from '@/lib/email/mailer-fixed';
import { z } from 'zod';

// メールアドレスの検証スキーマ
const requestResetSchema = z.object({
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .min(1, 'メールアドレスは必須です')
    .max(255, 'メールアドレスが長すぎます')
    .transform(email => email.toLowerCase().trim()),
});

// レート制限（シンプルなインメモリ実装）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分
const RATE_LIMIT_MAX_ATTEMPTS = 3; // 最大3回

function checkRateLimit(clientIp: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIp);

  if (!clientData) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (now > clientData.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (clientData.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, resetTime: clientData.resetTime };
  }

  clientData.count += 1;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // IPアドレス取得（レート制限用）
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // レート制限チェック
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      const remainingTime = Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 60000);
      return NextResponse.json(
        { 
          error: `リクエストが多すぎます。${remainingTime}分後に再試行してください。`,
          type: 'RATE_LIMIT',
        },
        { status: 429 }
      );
    }

    // リクエストボディの検証
    const body = await request.json();
    const parseResult = requestResetSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: parseResult.error.issues[0].message,
          type: 'VALIDATION',
        },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;

    // MongoDB接続
    try {
      await dbConnect();
      console.log('✅ パスワードリセット: MongoDB接続成功');
    } catch (dbError) {
      console.error('❌ MongoDB接続エラー:', dbError);
      // 開発環境では詳細なエラーを返す
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { 
            error: 'データベース接続エラー',
            details: dbError instanceof Error ? dbError.message : 'Unknown database error',
            type: 'DATABASE_CONNECTION',
          },
          { status: 500 }
        );
      }
      // 本番環境では一般的なエラーメッセージ
      return NextResponse.json(
        { 
          error: 'サーバーエラーが発生しました。時間をおいて再試行してください。',
          type: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }

    // タイミング攻撃防止のための最小応答時間
    const startTime = Date.now();

    // ユーザー検索
    const user = await User.findOne({ email }).select('name email emailVerified');
    
    if (user && user.emailVerified) {
      // 古いトークンを削除
      await PasswordReset.deleteMany({ 
        email, 
        $or: [
          { used: true },
          { expiresAt: { $lt: new Date() } }
        ]
      });

      // 最近のトークンがあるか確認（スパム防止）
      const recentToken = await PasswordReset.findOne({
        email,
        used: false,
        expiresAt: { $gt: new Date() },
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // 5分以内
      });

      let resetToken;
      if (recentToken) {
        resetToken = recentToken;
      } else {
        // 新しいトークンを作成
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間後
        
        resetToken = new PasswordReset({ 
          email,
          token,
          expiresAt,
          used: false
        });
        await resetToken.save();
      }

      // リセットURLの生成
      const host = request.headers.get('host');
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      const resetUrl = `${baseUrl}/auth/reset-password/${resetToken.token}`;

      // メール送信（開発環境ではコンソール出力）
      try {
        const emailService = getEmailService();
        const emailResult = await emailService.sendPasswordResetEmail(email, {
          userName: user.name || 'ユーザー',
          resetUrl: resetUrl,
          expiresIn: '1時間',
        });

        if (!emailResult.success) {
          console.error('メール送信失敗:', emailResult);
        } else {
          console.log('✅ パスワードリセットメール送信成功:', email);
        }
      } catch (emailError) {
        console.error('メール送信エラー:', emailError);
        // メール送信エラーでも成功レスポンスを返す（セキュリティのため）
      }
    } else {
      console.log('ℹ️ ユーザーが存在しないか、メール未確認:', email);
    }

    // タイミング攻撃防止（最小500ms応答時間）
    const elapsedTime = Date.now() - startTime;
    const minResponseTime = 500;
    if (elapsedTime < minResponseTime) {
      await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
    }

    // 常に成功レスポンスを返す（メールアドレスの存在確認を防ぐため）
    return NextResponse.json(
      {
        message: 'パスワードリセットのメールを送信しました。メールボックスをご確認ください。',
        success: true,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ パスワードリセットAPIエラー:', error);
    
    // 開発環境では詳細なエラー情報を返す
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'サーバーエラーが発生しました',
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
    
    // 本番環境では一般的なエラーメッセージ
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました。時間をおいて再試行してください。',
        type: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// その他のHTTPメソッドは許可しない
export async function GET() {
  return NextResponse.json(
    { error: 'メソッドが許可されていません', type: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'メソッドが許可されていません', type: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'メソッドが許可されていません', type: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}