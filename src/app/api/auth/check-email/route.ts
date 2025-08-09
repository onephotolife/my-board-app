import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import { z } from 'zod';

// メールアドレス検証スキーマ
const checkEmailSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

// レート制限用のマップ
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const RATE_LIMIT_MAX = 10; // 1分間に10回まで

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIp);

  if (!clientData) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (now > clientData.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_MAX) {
    return false;
  }

  clientData.count += 1;
  return true;
}

// 古いエントリをクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000); // 1分ごとにクリーンアップ

export async function POST(request: NextRequest) {
  try {
    // IPアドレス取得（レート制限用）
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // レート制限チェック
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { 
          error: 'リクエストが多すぎます。しばらくお待ちください。',
          available: null,
        },
        { status: 429 }
      );
    }

    // リクエストボディの取得と検証
    const body = await request.json();
    const validationResult = checkEmailSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: validationResult.error.issues[0].message,
          available: null,
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // データベース接続
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      // セキュリティのため、詳細なエラーは返さない
      return NextResponse.json(
        { 
          error: 'サーバーエラーが発生しました',
          available: null,
        },
        { status: 500 }
      );
    }

    // タイミング攻撃を防ぐため、最小応答時間を設定
    const startTime = Date.now();

    // メールアドレスの存在確認
    try {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase() 
      }).select('_id'); // IDのみ取得（パフォーマンス向上）

      // タイミング攻撃防止（最小100ms応答時間）
      const elapsedTime = Date.now() - startTime;
      const minResponseTime = 100;
      if (elapsedTime < minResponseTime) {
        await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
      }

      // 利用可能かどうかを返す
      return NextResponse.json({
        available: !existingUser,
        message: existingUser 
          ? 'このメールアドレスは既に登録されています' 
          : 'このメールアドレスは利用可能です',
      });

    } catch (dbError) {
      console.error('User lookup error:', dbError);
      
      // タイミング攻撃防止
      const elapsedTime = Date.now() - startTime;
      const minResponseTime = 100;
      if (elapsedTime < minResponseTime) {
        await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
      }

      return NextResponse.json(
        { 
          error: 'データベースエラーが発生しました',
          available: null,
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Email check API error:', error);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        available: null,
      },
      { status: 500 }
    );
  }
}

// その他のHTTPメソッドは許可しない
export async function GET() {
  return NextResponse.json(
    { error: 'メソッドが許可されていません' },
    { status: 405 }
  );
}