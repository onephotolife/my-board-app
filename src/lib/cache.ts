import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

/**
 * キャッシュ管理システム
 * Redis または メモリキャッシュを使用
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

interface CacheEntry {
  value: any;
  expiry: number;
  tags: string[];
}

class CacheManager {
  private redisClient: RedisClientType | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private tagMap: Map<string, Set<string>> = new Map();
  private isRedisAvailable = false;

  constructor() {
    this.initializeRedis();
    this.startCleanupTimer();
  }

  private async initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = createClient({
          url: process.env.REDIS_URL,
        });
        
        this.redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
          this.isRedisAvailable = false;
        });

        await this.redisClient.connect();
        this.isRedisAvailable = true;
        console.log('Redis cache initialized');
      } catch (error) {
        console.warn('Redis unavailable, falling back to memory cache');
        this.isRedisAvailable = false;
      }
    }
  }

  /**
   * キャッシュから値を取得
   */
  async get<T>(key: string): Promise<T | null> {
    // Redisが利用可能な場合
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          return JSON.parse(value);
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    // メモリキャッシュから取得
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiry) {
        return entry.value;
      } else {
        // 期限切れのエントリを削除
        this.memoryCache.delete(key);
        this.removeFromTagMap(key, entry.tags);
      }
    }

    return null;
  }

  /**
   * キャッシュに値を設定
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 300; // デフォルト5分
    const tags = options.tags || [];

    // Redisが利用可能な場合
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        
        // タグの管理
        if (tags.length > 0) {
          for (const tag of tags) {
            await this.redisClient.sAdd(`tag:${tag}`, key);
            await this.redisClient.expire(`tag:${tag}`, ttl);
          }
        }
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }

    // メモリキャッシュに保存
    const expiry = Date.now() + ttl * 1000;
    this.memoryCache.set(key, { value, expiry, tags });
    
    // タグマップを更新
    this.addToTagMap(key, tags);
  }

  /**
   * キャッシュから削除
   */
  async delete(key: string): Promise<void> {
    // Redisから削除
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }

    // メモリキャッシュから削除
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.memoryCache.delete(key);
      this.removeFromTagMap(key, entry.tags);
    }
  }

  /**
   * タグに基づいてキャッシュを無効化
   */
  async invalidateByTag(tag: string): Promise<void> {
    // Redisでタグベースの削除
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const keys = await this.redisClient.sMembers(`tag:${tag}`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          await this.redisClient.del(`tag:${tag}`);
        }
      } catch (error) {
        console.error('Redis invalidate by tag error:', error);
      }
    }

    // メモリキャッシュでタグベースの削除
    const keys = this.tagMap.get(tag);
    if (keys) {
      for (const key of keys) {
        this.memoryCache.delete(key);
      }
      this.tagMap.delete(tag);
    }
  }

  /**
   * パターンに基づいてキャッシュを削除
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));

    // Redisでパターンベースの削除
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.error('Redis invalidate pattern error:', error);
      }
    }

    // メモリキャッシュでパターンベースの削除
    for (const [key, entry] of this.memoryCache.entries()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        this.removeFromTagMap(key, entry.tags);
      }
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  async flush(): Promise<void> {
    // Redisをフラッシュ
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.flushDb();
      } catch (error) {
        console.error('Redis flush error:', error);
      }
    }

    // メモリキャッシュをクリア
    this.memoryCache.clear();
    this.tagMap.clear();
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      tags: this.tagMap.size,
      isRedisAvailable: this.isRedisAvailable,
    };
  }

  // ヘルパーメソッド
  private addToTagMap(key: string, tags: string[]) {
    for (const tag of tags) {
      if (!this.tagMap.has(tag)) {
        this.tagMap.set(tag, new Set());
      }
      this.tagMap.get(tag)!.add(key);
    }
  }

  private removeFromTagMap(key: string, tags: string[]) {
    for (const tag of tags) {
      const keys = this.tagMap.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagMap.delete(tag);
        }
      }
    }
  }

  /**
   * 期限切れエントリのクリーンアップ
   */
  private startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now >= entry.expiry) {
          this.memoryCache.delete(key);
          this.removeFromTagMap(key, entry.tags);
        }
      }
    }, 60000); // 1分ごとにクリーンアップ
  }
}

// シングルトンインスタンス
const cacheManager = new CacheManager();

/**
 * キャッシュデコレーター
 * 関数の結果を自動的にキャッシュ
 */
export function cacheable(keyPrefix: string, options: CacheOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${keyPrefix}:${propertyKey}:${JSON.stringify(args)}`;
      
      // キャッシュから取得を試みる
      const cached = await cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // オリジナルメソッドを実行
      const result = await originalMethod.apply(this, args);
      
      // 結果をキャッシュ
      await cacheManager.set(cacheKey, result, options);
      
      return result;
    };

    return descriptor;
  };
}

export default cacheManager;