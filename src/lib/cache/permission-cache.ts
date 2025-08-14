/**
 * 権限チェック結果のキャッシュ機構
 * インメモリキャッシュで高速化を実現
 */

interface CacheEntry {
  value: any;
  expiry: number;
}

class PermissionCache {
  private cache: Map<string, CacheEntry>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分
  private readonly MAX_ENTRIES = 1000; // 最大エントリ数

  constructor() {
    this.cache = new Map();
    // 定期的な期限切れエントリのクリーンアップ
    setInterval(() => this.cleanup(), 60 * 1000); // 1分ごと
  }

  /**
   * キャッシュキーの生成
   */
  private generateKey(userId: string, action: string, resourceId?: string): string {
    return `${userId}:${action}:${resourceId || 'global'}`;
  }

  /**
   * キャッシュから値を取得
   */
  get(userId: string, action: string, resourceId?: string): any | null {
    const key = this.generateKey(userId, action, resourceId);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 期限切れチェック
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * キャッシュに値を設定
   */
  set(userId: string, action: string, value: any, resourceId?: string, ttl?: number): void {
    // キャッシュサイズ制限
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evictOldest();
    }

    const key = this.generateKey(userId, action, resourceId);
    const expiry = Date.now() + (ttl || this.DEFAULT_TTL);

    this.cache.set(key, { value, expiry });
  }

  /**
   * 特定ユーザーのキャッシュをクリア
   */
  clearUser(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 特定リソースのキャッシュをクリア
   */
  clearResource(resourceId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${resourceId}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 全キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 期限切れエントリのクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 最も古いエントリを削除（LRU風）
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < oldestExpiry) {
        oldestExpiry = entry.expiry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      hitRate: 0 // 実装する場合はヒット/ミスをトラッキング
    };
  }
}

// シングルトンインスタンス
const permissionCache = new PermissionCache();

/**
 * キャッシュ付き権限チェック
 */
export async function checkPermissionWithCache(
  userId: string,
  action: string,
  checker: () => Promise<boolean>,
  resourceId?: string
): Promise<boolean> {
  // キャッシュチェック
  const cached = permissionCache.get(userId, action, resourceId);
  if (cached !== null) {
    return cached;
  }

  // 実際の権限チェック
  const result = await checker();

  // 結果をキャッシュ
  permissionCache.set(userId, action, result, resourceId);

  return result;
}

export { permissionCache };
export default permissionCache;