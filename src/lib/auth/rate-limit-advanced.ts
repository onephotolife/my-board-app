import type { NextRequest } from 'next/server';

import { RateLimit } from '@/lib/models/RateLimit';
import { connectDB } from '@/lib/db/mongodb-local';

export interface RateLimitOptions {
  maxAttempts?: number;
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  cooldownSeconds: number;
  retriesRemaining: number;
  nextRetryAt?: Date;
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const {
    maxAttempts = 3,
    windowMs = 60 * 1000,
    skipSuccessfulRequests = false,
    keyGenerator = (id) => `${action}:${id}`,
  } = options;

  const key = keyGenerator(identifier);
  const now = new Date();
  
  try {
    await connectDB();
    
    // 既存のレート制限レコードを検索
    let rateLimit = await RateLimit.findOne({ key });
    
    if (!rateLimit) {
      // 新規作成
      rateLimit = await RateLimit.create({
        key,
        attempts: 1,
        lastAttempt: now,
        createdAt: now
      });
      
      return {
        allowed: true,
        cooldownSeconds: 0,
        retriesRemaining: maxAttempts - 1,
      };
    }
    
    // ウィンドウの計算
    const timeSinceLastAttempt = now.getTime() - rateLimit.lastAttempt.getTime();
    const isWithinWindow = timeSinceLastAttempt < windowMs;
    
    if (!isWithinWindow) {
      // ウィンドウ外なのでリセット
      rateLimit.attempts = 1;
      rateLimit.lastAttempt = now;
      await rateLimit.save();
      
      return {
        allowed: true,
        cooldownSeconds: 0,
        retriesRemaining: maxAttempts - 1,
      };
    }
    
    // ウィンドウ内での処理
    if (rateLimit.attempts >= maxAttempts) {
      // レート制限発動
      const remainingTime = windowMs - timeSinceLastAttempt;
      const cooldownSeconds = Math.ceil(remainingTime / 1000);
      
      return {
        allowed: false,
        cooldownSeconds,
        retriesRemaining: 0,
        nextRetryAt: new Date(rateLimit.lastAttempt.getTime() + windowMs),
      };
    }
    
    // 試行回数を増やす
    rateLimit.attempts += 1;
    rateLimit.lastAttempt = now;
    await rateLimit.save();
    
    return {
      allowed: true,
      cooldownSeconds: 0,
      retriesRemaining: maxAttempts - rateLimit.attempts,
    };
    
  } catch (error) {
    console.error('レート制限チェックエラー:', error);
    // フェイルクローズド
    return {
      allowed: false,
      cooldownSeconds: 60,
      retriesRemaining: 0,
    };
  }
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         '127.0.0.1';
}

export function calculateBackoff(
  attemptCount: number,
  baseInterval: number,
  maxInterval: number
): number {
  const interval = baseInterval * Math.pow(2, attemptCount);
  return Math.min(interval, maxInterval);
}

/**
 * レート制限のクリーンアップ（古いレコードを削除）
 */
export async function cleanupRateLimits(): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  try {
    const result = await RateLimit.deleteMany({
      createdAt: { $lt: oneDayAgo }
    });
    
    console.warn(`🧹 レート制限クリーンアップ: ${result.deletedCount}件削除`);
    return result.deletedCount;
  } catch (error) {
    console.error('レート制限クリーンアップエラー:', error);
    return 0;
  }
}

/**
 * 特定のキーのレート制限をリセット
 */
export async function resetRateLimit(identifier: string, action: string): Promise<boolean> {
  const key = `${action}:${identifier}`;
  
  try {
    await RateLimit.deleteMany({ key });
    console.warn(`🔄 レート制限リセット: ${key}`);
    return true;
  } catch (error) {
    console.error('レート制限リセットエラー:', error);
    return false;
  }
}