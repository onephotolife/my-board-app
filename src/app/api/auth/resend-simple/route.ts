import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

// グローバル変数の型定義
declare global {
  var rateLimits: Record<string, number> | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // 簡単な検証
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email address',
          }
        },
        { status: 400 }
      );
    }

    // 簡単なレート制限（メモリベース）
    const rateLimitKey = `resend:${email}`;
    const now = Date.now();
    
    // グローバル変数でレート制限を管理（簡易版）
    global.rateLimits = global.rateLimits || {};
    const lastAttempt = global.rateLimits[rateLimitKey];
    
    if (lastAttempt && now - lastAttempt < 60000) {
      const cooldown = Math.ceil((60000 - (now - lastAttempt)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Please wait ${cooldown} seconds`,
            details: { cooldownSeconds: cooldown }
          }
        },
        { status: 429 }
      );
    }
    
    global.rateLimits[rateLimitKey] = now;

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'Email resend requested',
      data: {
        cooldownSeconds: 60,
        retriesRemaining: 4,
        attemptNumber: 1,
        checkSpamFolder: false,
        supportAvailable: false,
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }
      },
      { status: 500 }
    );
  }
}