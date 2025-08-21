import { LRUCache } from 'lru-cache';
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;       // 時間窓（ミリ秒）
  maxRequests: number;    // 最大リクエスト数
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// エンドポイント毎の設定
const isDevelopment = process.env.NODE_ENV === 'development';
const devMultiplier = isDevelopment ? 20 : 1; // 開発環境では20倍緩和

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'GET:/api/posts': { windowMs: 60000, maxRequests: 100 * devMultiplier },          // 開発: 2000回/分, 本番: 100回/分
  'POST:/api/posts': { windowMs: 60000, maxRequests: 30 * devMultiplier },         // 開発: 600回/分, 本番: 30回/分
  'POST:/api/auth/signin': { windowMs: 900000, maxRequests: 5 * devMultiplier },   // 15分間
  'POST:/api/auth/signup': { windowMs: 3600000, maxRequests: 3 * devMultiplier },  // 1時間
  'PUT:/api/posts/*': { windowMs: 60000, maxRequests: 30 * devMultiplier },        // 1分間
  'DELETE:/api/posts/*': { windowMs: 60000, maxRequests: 20 * devMultiplier },     // 1分間
  'POST:/api/auth/test-login': { windowMs: 60000, maxRequests: 50 * devMultiplier }, // テスト用
  'GET:/api/health': { windowMs: 60000, maxRequests: 200 * devMultiplier },        // ヘルスチェック用
  'default': { windowMs: 60000, maxRequests: 200 * devMultiplier }                // デフォルト
};

export class RateLimiter {
  private static cache: LRUCache<string, RateLimitEntry> = new LRUCache({
    max: 10000,                    // 最大10000エントリ
    ttl: 1000 * 60 * 15,          // 15分でエントリ削除
    updateAgeOnGet: false,
    updateAgeOnHas: false,
  });

  /**
   * レート制限チェック
   */
  static async check(req: NextRequest): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const identifier = this.getIdentifier(req);
    const config = this.getConfig(req);
    const key = `${identifier}:${req.method}:${req.nextUrl.pathname}`;

    const now = Date.now();
    const entry = this.cache.get(key) || { count: 0, resetTime: now + config.windowMs };

    // 時間窓のリセット確認
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
    } else {
      entry.count++;
    }

    this.cache.set(key, entry);

    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    };
  }

  /**
   * 識別子の生成（IP + ユーザーID）
   */
  private static getIdentifier(req: NextRequest): string {
    // IPアドレスの取得
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               req.ip || 
               'unknown';

    // セッションからユーザーIDを取得（可能な場合）
    const userId = req.cookies.get('session')?.value?.substring(0, 16) || 'anonymous';

    return `${ip}:${userId}`;
  }

  /**
   * エンドポイントに応じた設定を取得
   */
  private static getConfig(req: NextRequest): RateLimitConfig {
    const path = req.nextUrl.pathname;
    const method = req.method;
    const key = `${method}:${path}`;

    // 完全一致を優先
    if (RATE_LIMITS[key]) {
      return RATE_LIMITS[key];
    }

    // ワイルドカードマッチング
    for (const pattern in RATE_LIMITS) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        if (regex.test(key)) {
          return RATE_LIMITS[pattern];
        }
      }
    }

    // デフォルト設定
    return RATE_LIMITS['default'];
  }

  /**
   * キャッシュのクリア（テスト用）
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * 統計情報の取得
   */
  static getStats(): { size: number; calculatedSize: number } {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize || 0
    };
  }

  /**
   * 特定のキーをリセット
   */
  static reset(identifier: string): void {
    const keys = Array.from(this.cache.keys()).filter(k => k.startsWith(identifier));
    keys.forEach(key => this.cache.delete(key));
  }
}