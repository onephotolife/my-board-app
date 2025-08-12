import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import ResendHistory from '@/lib/models/ResendHistory';
import { 
  AuthError, 
  AuthErrorCode, 
  AuthSuccessResponse,
  AUTH_ERROR_MESSAGES 
} from '@/lib/errors/auth-errors';
import { generateEmailVerificationToken } from '@/lib/auth/tokens';
import { 
  checkRateLimit, 
  getClientIp,
  calculateBackoff 
} from '@/lib/auth/rate-limit-advanced';
import { EmailQueueService } from '@/lib/email/queue-service';
import { MetricsService } from '@/lib/monitoring/metrics';

// 厳格な入力検証スキーマ
const resendSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .max(100, 'メールアドレスが長すぎます')
    .email('有効なメールアドレスを入力してください')
    .refine(
      (email) => {
        // 危険な文字を検出
        const dangerousPatterns = [
          /[<>]/,           // HTMLタグ
          /[\r\n]/,         // 改行文字
          /[';]/,           // SQLインジェクション
          /[\u0000-\u001F]/, // 制御文字
        ];
        return !dangerousPatterns.some(pattern => pattern.test(email));
      },
      { message: '無効な文字が含まれています' }
    )
    .transform(val => val.toLowerCase().trim()),
  
  reason: z
    .enum(['not_received', 'expired', 'spam_folder', 'other'])
    .optional()
    .default('not_received'),
  
  captcha: z.string().optional(),
});

// 再送信設定
const RESEND_CONFIG = {
  maxAttempts: 5,
  baseInterval: 60,
  maxInterval: 3600,
  tokenExpiry: 24 * 60 * 60 * 1000,
  enableQueue: true,
  enableMetrics: true,
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const metrics = new MetricsService();
  
  try {
    // リクエストボディの取得
    let body;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'リクエストボディが空です',
            }
          },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '無効なJSON形式です',
          }
        },
        { status: 400 }
      );
    }
    
    // 型チェック
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '無効なリクエスト形式です',
          }
        },
        { status: 400 }
      );
    }
    
    // Zod検証
    const validation = resendSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error?.issues?.[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: firstError?.message || '入力データが無効です',
          }
        },
        { status: 400 }
      );
    }
    
    const { email, reason } = validation.data;
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    
    console.log('📧 メール再送信リクエスト:', {
      email,
      reason,
      ip: clientIp,
      timestamp: new Date().toISOString()
    });
    
    // データベース接続
    await connectDB();
    
    // ユーザー検索
    console.log('🔍 ユーザー検索:', { email: email.toLowerCase() });
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).select('+emailVerified +emailVerificationToken');
    console.log('👤 検索結果:', user ? { id: user._id, email: user.email } : 'null');
    
    if (!user) {
      // セキュリティのため成功レスポンス
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      const response: AuthSuccessResponse = {
        success: true,
        message: '登録されているメールアドレスの場合、確認メールを送信しました。',
        data: {
          cooldownSeconds: RESEND_CONFIG.baseInterval,
          checkSpamFolder: true,
          attemptNumber: 1,  // 追加
          retriesRemaining: RESEND_CONFIG.maxAttempts - 1  // 追加
        }
      };
      
      metrics.record('resend.user_not_found', { email });
      return NextResponse.json(response, { status: 200 });
    }
    
    // 既に確認済みチェック
    if (user.emailVerified) {
      console.log('ℹ️ 既にメール確認済み:', email);
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'このメールアドレスは既に確認済みです。',
          details: {
            email,
            verifiedAt: user.emailVerifiedAt
          }
        }
      }, { status: 409 });
    }
    
    // 再送信履歴を取得または作成
    let resendHistory = await ResendHistory.findOne({ userId: user._id });
    
    if (!resendHistory) {
      // 新規作成
      resendHistory = new ResendHistory({
        userId: user._id,
        email: user.email,
        attempts: [],
        totalAttempts: 0
      });
      await resendHistory.save();  // 追加！
      console.log('📝 新規ResendHistory作成:', { userId: user._id, email });
    } else {
      console.log('📋 既存ResendHistory取得:', { 
        userId: user._id, 
        email,
        currentAttempts: resendHistory.attempts.length,
        totalAttempts: resendHistory.totalAttempts 
      });
    }
    
    // 再送信回数チェック
    const attemptCount = resendHistory.attempts?.length || 0;
    console.log('🔢 現在の試行回数:', attemptCount, '/', RESEND_CONFIG.maxAttempts);
    
    if (attemptCount >= RESEND_CONFIG.maxAttempts) {
      console.log('❌ 再送信回数上限:', email, attemptCount);
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: `再送信回数の上限（${RESEND_CONFIG.maxAttempts}回）に達しました。サポートにお問い合わせください。`,
          details: {
            maxAttempts: RESEND_CONFIG.maxAttempts,
            currentAttempts: attemptCount,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
          }
        }
      }, { status: 429 });
    }
    
    // 指数バックオフによるクールダウン計算
    const cooldownSeconds = calculateBackoff(
      attemptCount,
      RESEND_CONFIG.baseInterval,
      RESEND_CONFIG.maxInterval
    );
    
    // レート制限チェック
    const rateLimit = await checkRateLimit(email, 'email-resend', {
      maxAttempts: 3,
      windowMs: cooldownSeconds * 1000,
      keyGenerator: (id) => `resend:${id}`
    });
    
    if (!rateLimit.allowed) {
      console.log('⏱️ レート制限:', email, rateLimit);
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `再送信は${rateLimit.cooldownSeconds}秒後にお試しください。`,
          details: {
            cooldownSeconds: rateLimit.cooldownSeconds,
            nextRetryAt: rateLimit.nextRetryAt,
            retriesRemaining: RESEND_CONFIG.maxAttempts - attemptCount - 1
          }
        }
      }, { status: 429 });
    }
    
    // 新しいトークン生成
    const { token, expiry } = generateEmailVerificationToken();
    
    // トランザクション処理
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // ユーザー情報更新
      user.emailVerificationToken = token;
      user.emailVerificationTokenExpiry = expiry;
      await user.save({ session });
      
      // 履歴に追加
      resendHistory.attempts.push({
        timestamp: new Date(),
        reason: reason || 'not_specified',
        ip: clientIp,
        userAgent,
        token: token.substring(0, 8) + '...',
        success: true
      });
      resendHistory.totalAttempts = resendHistory.attempts.length;
      resendHistory.lastSuccessAt = new Date();
      await resendHistory.save({ session });
      
      await session.commitTransaction();
      
    } catch (dbError) {
      await session.abortTransaction();
      throw dbError;
    } finally {
      session.endSession();
    }
    
    console.log('🔑 新しいトークン生成:', {
      email: user.email,
      tokenPrefix: token.substring(0, 8) + '...',
      expiry,
      attempt: attemptCount + 1
    });
    
    // メール送信（キューイング対応）
    try {
      const emailQueue = new EmailQueueService();
      const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
      
      // キューに追加
      const jobId = await emailQueue.addJob({
        type: 'verification',
        to: user.email,
        data: {
          userName: user.name || user.email.split('@')[0],
          verificationUrl,
          attemptNumber: attemptCount + 1,
          expiresIn: '24時間',
          reason: reason || 'user_request'
        },
        priority: attemptCount > 2 ? 'high' : 'normal',
        retryOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          }
        }
      });
      
      console.log('✅ メールキューに追加:', {
        jobId,
        email: user.email,
        priority: attemptCount > 2 ? 'high' : 'normal'
      });
      
      // メトリクス記録
      if (RESEND_CONFIG.enableMetrics) {
        metrics.record('resend.success', {
          email,
          attempt: attemptCount + 1,
          reason,
          duration: Date.now() - startTime
        });
      }
      
      // 次回のクールダウン時間を計算
      const nextCooldown = calculateBackoff(
        attemptCount + 1,
        RESEND_CONFIG.baseInterval,
        RESEND_CONFIG.maxInterval
      );
      
      const response: AuthSuccessResponse = {
        success: true,
        message: '確認メールを再送信しました。メールをご確認ください。',
        data: {
          cooldownSeconds: nextCooldown,
          retriesRemaining: RESEND_CONFIG.maxAttempts - attemptCount - 1,
          attemptNumber: attemptCount + 1,
          checkSpamFolder: attemptCount > 0,
          supportAvailable: attemptCount >= 2,
          jobId: process.env.NODE_ENV === 'development' ? jobId : undefined
        }
      };
      
      return NextResponse.json(response, { status: 200 });
      
    } catch (emailError: any) {
      console.error('❌ メール送信エラー:', emailError);
      
      // メトリクス記録
      metrics.record('resend.email_error', {
        email,
        error: emailError.message,
        attempt: attemptCount + 1
      });
      
      // エラーでも部分的な成功レスポンスを返す
      const response: AuthSuccessResponse = {
        success: true,
        message: '確認メールの送信処理を開始しました。数分以内に届かない場合は、迷惑メールフォルダをご確認ください。',
        data: {
          cooldownSeconds: RESEND_CONFIG.baseInterval * 2,
          retriesRemaining: RESEND_CONFIG.maxAttempts - attemptCount - 1,
          attemptNumber: attemptCount + 1,
          checkSpamFolder: true,
          supportEmail: attemptCount >= 2 ? process.env.SUPPORT_EMAIL : undefined
        }
      };
      
      return NextResponse.json(response, { status: 200 });
    }
    
  } catch (error: any) {
    console.error('メール再送信エラー:', error);
    
    // メトリクス記録
    if (RESEND_CONFIG.enableMetrics) {
      metrics.record('resend.error', {
        error: error.message,
        duration: Date.now() - startTime
      });
    }
    
    // AuthErrorの場合はそのまま返す
    if (error instanceof AuthError) {
      return NextResponse.json(
        error.toJSON(),
        { status: error.statusCode }
      );
    }
    
    // その他のエラー
    const genericError = new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'システムエラーが発生しました。しばらく待ってから再度お試しください。',
      500,
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
    
    return NextResponse.json(
      genericError.toJSON(),
      { status: 500 }
    );
  }
}

// OPTIONS メソッド（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}