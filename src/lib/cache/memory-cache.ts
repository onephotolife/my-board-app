/**
 * メモリキャッシュ実装
 * LRUキャッシュを使用した高速なインメモリキャッシュ
 */

import { LRUCache } from 'lru-cache';

interface CacheOptions {
  ttl?: number;      // Time To Live (ミリ秒)
  max?: number;      // 最大エントリ数
  updateAgeOnGet?: boolean;
  updateAgeOnHas?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

class MemoryCache {
  private cache: LRUCache<string, CacheEntry<any>>;
  private defaultTTL: number = 60000; // デフォルト60秒

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.max || 1000,
      ttl: options.ttl || this.defaultTTL,
      updateAgeOnGet: options.updateAgeOnGet ?? false,
      updateAgeOnHas: options.updateAgeOnHas ?? false,
      // サイズ計算（簡単な実装）
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
      maxSize: 50 * 1024 * 1024, // 最大50MB
    });
  }

  /**
   * キャッシュに値を設定
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = ttl ? Date.now() + ttl : undefined;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * キャッシュから値を取得
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // 有効期限チェック
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * キャッシュから値を取得、なければ関数を実行して設定
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * キャッシュから削除
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * パターンに一致するキーを削除
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        if (this.cache.delete(key)) {
          deleted++;
        }
      }
    }
    
    return deleted;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュ統計
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      calculatedSize: this.cache.calculatedSize,
      hitRate: this.cache.size > 0 ? 
        (this.cache as any).hits / ((this.cache as any).hits + (this.cache as any).misses) : 0,
    };
  }

  /**
   * キーの存在確認
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // 有効期限チェック
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// シングルトンインスタンス
const cacheInstances = new Map<string, MemoryCache>();

/**
 * 名前付きキャッシュインスタンスを取得
 */
export function getCache(name: string = 'default', options?: CacheOptions): MemoryCache {
  if (!cacheInstances.has(name)) {
    cacheInstances.set(name, new MemoryCache(options));
  }
  return cacheInstances.get(name)!;
}

// デフォルトキャッシュのエクスポート
export const defaultCache = getCache('default', {
  max: 1000,
  ttl: 60000, // 60秒
});

// 投稿用キャッシュ（頻繁にアクセスされるため長めのTTL）
export const postCache = getCache('posts', {
  max: 500,
  ttl: 300000, // 5分
});

// セッション用キャッシュ
export const sessionCache = getCache('sessions', {
  max: 2000,
  ttl: 900000, // 15分
});

export default MemoryCache;