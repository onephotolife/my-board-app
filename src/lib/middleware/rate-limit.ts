/**
 * レート制限ミドルウェア
 * 20人天才エンジニア会議により設計
 * 
 * DDoS攻撃、ブルートフォース攻撃、API濫用を防ぐ
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import RateLimit from '@/models/RateLimit';

// レート制限設定
export interface RateLimitConfig {
  windowMs: number;     // 時間窓（ミリ秒）
  maxRequests: number;  // 最大リクエスト数
  message?: string;     // エラーメッセージ
  skipSuccessfulRequests?: boolean; // 成功したリクエストをスキップ
  keyGenerator?: (req: NextRequest) => string; // キー生成関数
}

// デフォルト設定
const defaultConfigs: Record<string, RateLimitConfig> = {
  // 認証関連
  'auth.register': {
    windowMs: 15 * 60 * 1000,  // 15分
    maxRequests: 5,             // 5回まで
    message: '登録の試行回数が多すぎます。15分後に再試行してください。',
  },
  'auth.login': {
    windowMs: 15 * 60 * 1000,  // 15分
    maxRequests: 10,            // 10回まで
    message: 'ログインの試行回数が多すぎます。15分後に再試行してください。',
  },
  'auth.verify': {
    windowMs: 15 * 60 * 1000,  // 15分
    maxRequests: 10,            // 10回まで
    message: '検証の試行回数が多すぎます。15分後に再試行してください。',
  },
  'auth.resend': {
    windowMs: 60 * 60 * 1000,  // 1時間
    maxRequests: 3,             // 3回まで
    message: 'メール再送信の回数が多すぎます。1時間後に再試行してください。',
  },
  'auth.reset': {
    windowMs: 60 * 60 * 1000,  // 1時間
    maxRequests: 5,             // 5回まで
    message: 'パスワードリセットの試行回数が多すぎます。1時間後に再試行してください。',
  },
  // API関連
  'api.general': {
    windowMs: 1 * 60 * 1000,   // 1分
    maxRequests: 60,            // 60回まで
    message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
  },
};

/**
 * IPアドレスを取得
 */
function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * レート制限チェック
 */
export async function checkRateLimit(
  req: NextRequest,
  configKey: string,
  customConfig?: Partial<RateLimitConfig>
): Promise<{ allowed: boolean; retryAfter?: number; message?: string }> {
  try {
    // 設定を取得
    const baseConfig = defaultConfigs[configKey] || defaultConfigs['api.general'];
    const config = { ...baseConfig, ...customConfig };
    
    // データベース接続
    await connectDB();
    
    // クライアント識別子を生成
    const clientIp = config.keyGenerator ? config.keyGenerator(req) : getClientIp(req);
    const identifier = `${configKey}:${clientIp}`;
    
    // 現在時刻
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // 既存のレート制限レコードを取得
    let rateLimit = await RateLimit.findOne({
      identifier,
      resetAt: { $gt: new Date(now) },
    });
    
    if (!rateLimit) {
      // 新規レコード作成
      rateLimit = new RateLimit({
        identifier,
        count: 1,
        windowStart: new Date(windowStart),
        resetAt: new Date(now + config.windowMs),
      });
      await rateLimit.save();
      
      return { allowed: true };
    }
    
    // 時間窓内のリクエスト数をチェック
    if (rateLimit.count >= config.maxRequests) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - now) / 1000);
      
      // 不正なアクセスをログに記録
      console.warn('🚫 Rate limit exceeded:', {
        identifier,
        count: rateLimit.count,
        maxRequests: config.maxRequests,
        retryAfter,
        clientIp,
        userAgent: req.headers.get('user-agent'),
      });
      
      return {
        allowed: false,
        retryAfter,
        message: config.message || `Too many requests. Please retry after ${retryAfter} seconds.`,
      };
    }
    
    // カウントを増やす
    rateLimit.count += 1;
    await rateLimit.save();
    
    return { allowed: true };
    
  } catch (error) {
    // エラー時は制限をかけない（サービスの可用性を優先）
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }
}

/**
 * レート制限ミドルウェアファクトリー
 */
export function rateLimitMiddleware(
  configKey: string,
  customConfig?: Partial<RateLimitConfig>
) {
  return async function middleware(req: NextRequest) {
    const result = await checkRateLimit(req, configKey, customConfig);
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: result.message,
          retryAfter: result.retryAfter,
          type: 'RATE_LIMIT',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter || 60),
            'X-RateLimit-Limit': String(
              customConfig?.maxRequests || 
              defaultConfigs[configKey]?.maxRequests || 
              60
            ),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(
              Date.now() + (result.retryAfter || 60) * 1000
            ).toISOString(),
          },
        }
      );
    }
    
    // リクエストを続行
    return null;
  };
}

/**
 * 古いレート制限レコードをクリーンアップ
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    await connectDB();
    const result = await RateLimit.deleteMany({
      resetAt: { $lt: new Date() },
    });
    
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired rate limit records`);
    }
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
  }
}

// 定期的なクリーンアップ（5分ごと）
if (typeof global !== 'undefined' && !global.rateLimitCleanupInterval) {
  global.rateLimitCleanupInterval = setInterval(cleanupRateLimits, 5 * 60 * 1000);
}