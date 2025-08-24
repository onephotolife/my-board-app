/**
 * レート制限実装 v2
 * LRU風のキャッシュ機構を使用した統一実装
 */

export interface RateLimitOptions {
  max: number;        // 最大リクエスト数
  window: number;     // 時間窓（ミリ秒）
  maxItems?: number;  // キャッシュ最大アイテム数
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export class RateLimiterV2 {
  private cache: Map<string, number[]>;
  private max: number;
  private window: number;
  private maxItems: number;
  
  constructor(options: RateLimitOptions) {
    this.max = options.max;
    this.window = options.window;
    this.maxItems = options.maxItems || 10000;
    this.cache = new Map();
    
    // 定期的なクリーンアップ
    setInterval(() => this.cleanup(), this.window);
  }
  
  /**
   * レート制限チェック
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = identifier;
    const timestamps = this.cache.get(key) || [];
    
    // 時間窓内のリクエストをフィルタ
    const recentRequests = timestamps.filter(
      t => t > now - this.window
    );
    
    // 制限チェック
    if (recentRequests.length >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: recentRequests[0] + this.window,
      };
    }
    
    // リクエスト記録
    recentRequests.push(now);
    this.cache.set(key, recentRequests);
    
    // キャッシュサイズ管理
    if (this.cache.size > this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    return {
      allowed: true,
      remaining: this.max - recentRequests.length,
      resetTime: now + this.window,
    };
  }
  
  /**
   * 特定のIDをリセット
   */
  reset(identifier: string): void {
    this.cache.delete(identifier);
  }
  
  /**
   * 古いエントリのクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.cache.entries()) {
      const recentRequests = timestamps.filter(
        t => t > now - this.window
      );
      
      if (recentRequests.length === 0) {
        this.cache.delete(key);
      } else {
        this.cache.set(key, recentRequests);
      }
    }
  }
  
  /**
   * 統計情報取得
   */
  getStats(): {
    cacheSize: number;
    totalRequests: number;
  } {
    let totalRequests = 0;
    for (const timestamps of this.cache.values()) {
      totalRequests += timestamps.length;
    }
    
    return {
      cacheSize: this.cache.size,
      totalRequests,
    };
  }
}

// デフォルトインスタンス（1分間に5リクエスト）
export const defaultRateLimiter = new RateLimiterV2({
  max: 5,
  window: 60000, // 1分
  maxItems: 10000,
});

// API用レート制限（1分間に30リクエスト - フロントエンドの頻繁なリクエストに対応）
export const apiRateLimiter = new RateLimiterV2({
  max: 30,
  window: 60000,
  maxItems: 10000,
});

// 認証用レート制限（1分間に20リクエスト - ログインプロセスで複数リクエスト発生するため）
export const authRateLimiter = new RateLimiterV2({
  max: 20,
  window: 60000,
  maxItems: 5000,
});