import RateLimit from '@/models/RateLimit';
import { AuthError, AuthErrorCode } from '@/lib/errors/auth-errors';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // ミリ秒単位の時間枠
  blockDurationMs?: number; // ブロック期間（ミリ秒）
  cooldownMs?: number; // クールダウン期間（ミリ秒）
}

// デフォルトのレート制限設定
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'email-resend': {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1時間
    cooldownMs: 60 * 1000, // 60秒のクールダウン
    blockDurationMs: 60 * 60 * 1000, // 1時間のブロック
  },
  'login': {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15分
    blockDurationMs: 30 * 60 * 1000, // 30分のブロック
  },
  'register': {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1時間
    blockDurationMs: 60 * 60 * 1000, // 1時間のブロック
  },
  'password-reset': {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1時間
    cooldownMs: 60 * 1000, // 60秒のクールダウン
    blockDurationMs: 60 * 60 * 1000, // 1時間のブロック
  },
};

/**
 * レート制限をチェックして更新
 * @param identifier IPアドレスまたはメールアドレス
 * @param action アクションの種類
 * @param config レート制限の設定（オプション）
 * @returns 残りのクールダウン秒数（ある場合）
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  config?: RateLimitConfig
): Promise<{ allowed: boolean; cooldownSeconds?: number; retriesRemaining?: number }> {
  const effectiveConfig = config || RATE_LIMIT_CONFIGS[action] || {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,
  };

  const now = new Date();
  
  // 既存のレート制限レコードを検索
  let rateLimitRecord = await RateLimit.findOne({ identifier, action });

  if (!rateLimitRecord) {
    // 新規レコード作成
    rateLimitRecord = await RateLimit.create({
      identifier,
      action,
      attempts: 1,
      lastAttempt: now,
    });
    
    return { 
      allowed: true, 
      retriesRemaining: effectiveConfig.maxAttempts - 1 
    };
  }

  // ブロック期間チェック
  if (rateLimitRecord.blockedUntil && rateLimitRecord.blockedUntil > now) {
    const cooldownSeconds = Math.ceil(
      (rateLimitRecord.blockedUntil.getTime() - now.getTime()) / 1000
    );
    throw new AuthError(
      AuthErrorCode.RATE_LIMITED,
      `リクエストが多すぎます。${cooldownSeconds}秒後に再試行してください。`,
      429,
      { cooldownSeconds }
    );
  }

  // クールダウン期間チェック
  if (effectiveConfig.cooldownMs) {
    const timeSinceLastAttempt = now.getTime() - rateLimitRecord.lastAttempt.getTime();
    if (timeSinceLastAttempt < effectiveConfig.cooldownMs) {
      const cooldownSeconds = Math.ceil(
        (effectiveConfig.cooldownMs - timeSinceLastAttempt) / 1000
      );
      return { 
        allowed: false, 
        cooldownSeconds,
        retriesRemaining: effectiveConfig.maxAttempts - rateLimitRecord.attempts 
      };
    }
  }

  // 時間枠チェック
  const timeSinceFirstAttempt = now.getTime() - rateLimitRecord.createdAt.getTime();
  if (timeSinceFirstAttempt > effectiveConfig.windowMs) {
    // 時間枠をリセット
    rateLimitRecord.attempts = 1;
    rateLimitRecord.lastAttempt = now;
    rateLimitRecord.blockedUntil = undefined;
    await rateLimitRecord.save();
    
    return { 
      allowed: true, 
      retriesRemaining: effectiveConfig.maxAttempts - 1 
    };
  }

  // 試行回数を増やす
  rateLimitRecord.attempts++;
  rateLimitRecord.lastAttempt = now;

  // 最大試行回数を超えた場合
  if (rateLimitRecord.attempts > effectiveConfig.maxAttempts) {
    if (effectiveConfig.blockDurationMs) {
      rateLimitRecord.blockedUntil = new Date(now.getTime() + effectiveConfig.blockDurationMs);
    }
    await rateLimitRecord.save();
    
    throw new AuthError(
      AuthErrorCode.TOO_MANY_REQUESTS,
      `試行回数が上限に達しました。${effectiveConfig.windowMs / 60000}分後に再試行してください。`,
      429,
      { retriesRemaining: 0 }
    );
  }

  await rateLimitRecord.save();
  
  return { 
    allowed: true, 
    retriesRemaining: effectiveConfig.maxAttempts - rateLimitRecord.attempts 
  };
}

/**
 * レート制限をリセット
 * @param identifier IPアドレスまたはメールアドレス
 * @param action アクションの種類
 */
export async function resetRateLimit(identifier: string, action: string): Promise<void> {
  await RateLimit.deleteOne({ identifier, action });
}

/**
 * IPアドレスを取得
 * @param request リクエストオブジェクト
 * @returns IPアドレス
 */
export function getClientIp(request: Request): string {
  // Vercelなどのプロキシ環境でのIPアドレス取得
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // デフォルト
  return '127.0.0.1';
}