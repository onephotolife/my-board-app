import crypto from 'crypto';

import { Redis } from 'ioredis';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

/**
 * CSRFトークンのライフサイクル状態
 */
export enum TokenState {
  GENERATED = 'generated',   // 生成済み（未使用）
  ACTIVE = 'active',         // アクティブ（使用中）
  USED = 'used',            // 使用済み
  ROTATING = 'rotating',    // ローテーション中
  EXPIRED = 'expired',      // 期限切れ
  REVOKED = 'revoked'       // 失効済み
}

/**
 * CSRFトークン情報
 */
export interface CSRFTokenInfo {
  token: string;
  sessionId: string;
  userId?: string;
  state: TokenState;
  createdAt: number;
  expiresAt: number;
  lastUsedAt?: number;
  useCount: number;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    requestUrl?: string;
  };
}

/**
 * CSRFSyncManager設定
 */
export interface CSRFSyncConfig {
  tokenLength?: number;          // トークン長（デフォルト: 32バイト）
  tokenTTL?: number;             // トークン有効期限（デフォルト: 24時間）
  maxUseCount?: number;          // 最大使用回数（デフォルト: 100）
  rotationInterval?: number;     // ローテーション間隔（デフォルト: 1時間）
  redisKeyPrefix?: string;       // Redisキープレフィックス
  enableDoubleSubmit?: boolean; // Double Submit Cookie有効化
  enableSynchronizer?: boolean; // Synchronizer Token Pattern有効化
  sessionBinding?: boolean;     // セッションバインディング有効化
}

/**
 * CSRF完全同期マネージャー
 * 
 * Synchronizer Token Patternを実装し、
 * サーバーサイドでトークンの完全なライフサイクル管理を行う
 */
export class CSRFSyncManager {
  private redis: Redis | null = null;
  private memoryStore: Map<string, CSRFTokenInfo> = new Map();
  private config: Required<CSRFSyncConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: CSRFSyncConfig = {}) {
    this.config = {
      tokenLength: config.tokenLength || 32,
      tokenTTL: config.tokenTTL || 24 * 60 * 60 * 1000, // 24時間
      maxUseCount: config.maxUseCount || 100,
      rotationInterval: config.rotationInterval || 60 * 60 * 1000, // 1時間
      redisKeyPrefix: config.redisKeyPrefix || 'csrf:',
      enableDoubleSubmit: config.enableDoubleSubmit !== false,
      enableSynchronizer: config.enableSynchronizer !== false,
      sessionBinding: config.sessionBinding !== false
    };

    // Redis接続の初期化（環境変数から）
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
      this.redis.on('error', (err) => {
        console.error('[CSRF-SYNC] Redis connection error:', err);
        // Redisエラー時はメモリストアにフォールバック
        this.redis = null;
      });
    }

    // 定期クリーンアップの設定
    this.startCleanup();
  }

  /**
   * トークンの生成
   */
  async generateToken(sessionId: string, userId?: string): Promise<CSRFTokenInfo> {
    // 既存のトークンをチェック
    const existingToken = await this.getTokenBySession(sessionId);
    if (existingToken && existingToken.state === TokenState.ACTIVE) {
      // ローテーション判定
      const shouldRotate = Date.now() - existingToken.createdAt > this.config.rotationInterval;
      if (!shouldRotate) {
        return existingToken;
      }
      // ローテーション処理
      await this.rotateToken(existingToken);
    }

    // 新しいトークンを生成
    const token = crypto.randomBytes(this.config.tokenLength).toString('hex');
    const tokenInfo: CSRFTokenInfo = {
      token,
      sessionId,
      userId,
      state: TokenState.GENERATED,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.tokenTTL,
      useCount: 0
    };

    // ストレージに保存
    await this.saveToken(tokenInfo);
    
    // 即座にアクティベート
    await this.activateToken(token);

    return tokenInfo;
  }

  /**
   * トークンの検証
   */
  async verifyToken(
    token: string, 
    sessionId: string,
    metadata?: CSRFTokenInfo['metadata']
  ): Promise<boolean> {
    if (!token || !sessionId) {
      console.warn('[CSRF-SYNC] Missing token or session ID');
      return false;
    }

    // トークン情報を取得
    const tokenInfo = await this.getToken(token);
    if (!tokenInfo) {
      console.warn('[CSRF-SYNC] Token not found:', token.substring(0, 10) + '...');
      return false;
    }

    // セッションバインディングのチェック
    if (this.config.sessionBinding && tokenInfo.sessionId !== sessionId) {
      console.warn('[CSRF-SYNC] Session mismatch:', {
        expected: sessionId,
        actual: tokenInfo.sessionId
      });
      return false;
    }

    // 状態チェック
    if (tokenInfo.state !== TokenState.ACTIVE && tokenInfo.state !== TokenState.GENERATED) {
      console.warn('[CSRF-SYNC] Invalid token state:', tokenInfo.state);
      return false;
    }

    // 有効期限チェック
    if (Date.now() > tokenInfo.expiresAt) {
      console.warn('[CSRF-SYNC] Token expired');
      await this.expireToken(token);
      return false;
    }

    // 使用回数チェック
    if (tokenInfo.useCount >= this.config.maxUseCount) {
      console.warn('[CSRF-SYNC] Token use count exceeded');
      await this.revokeToken(token);
      return false;
    }

    // トークン使用記録を更新
    await this.recordTokenUsage(token, metadata);

    return true;
  }

  /**
   * トークンをアクティベート
   */
  private async activateToken(token: string): Promise<void> {
    const tokenInfo = await this.getToken(token);
    if (tokenInfo && tokenInfo.state === TokenState.GENERATED) {
      tokenInfo.state = TokenState.ACTIVE;
      await this.saveToken(tokenInfo);
    }
  }

  /**
   * トークン使用を記録
   */
  private async recordTokenUsage(
    token: string,
    metadata?: CSRFTokenInfo['metadata']
  ): Promise<void> {
    const tokenInfo = await this.getToken(token);
    if (tokenInfo) {
      tokenInfo.lastUsedAt = Date.now();
      tokenInfo.useCount++;
      if (metadata) {
        tokenInfo.metadata = { ...tokenInfo.metadata, ...metadata };
      }
      await this.saveToken(tokenInfo);
    }
  }

  /**
   * トークンのローテーション
   */
  private async rotateToken(oldTokenInfo: CSRFTokenInfo): Promise<CSRFTokenInfo> {
    // 古いトークンをローテーション状態に
    oldTokenInfo.state = TokenState.ROTATING;
    await this.saveToken(oldTokenInfo);

    // 新しいトークンを生成
    const newToken = await this.generateToken(oldTokenInfo.sessionId, oldTokenInfo.userId);

    // 古いトークンを失効（グレースピリオド後）
    setTimeout(async () => {
      oldTokenInfo.state = TokenState.REVOKED;
      await this.saveToken(oldTokenInfo);
    }, 5 * 60 * 1000); // 5分のグレースピリオド

    return newToken;
  }

  /**
   * トークンを期限切れに設定
   */
  private async expireToken(token: string): Promise<void> {
    const tokenInfo = await this.getToken(token);
    if (tokenInfo) {
      tokenInfo.state = TokenState.EXPIRED;
      await this.saveToken(tokenInfo);
    }
  }

  /**
   * トークンを失効
   */
  async revokeToken(token: string): Promise<void> {
    const tokenInfo = await this.getToken(token);
    if (tokenInfo) {
      tokenInfo.state = TokenState.REVOKED;
      await this.saveToken(tokenInfo);
    }
  }

  /**
   * セッションに関連する全トークンを失効
   */
  async revokeSessionTokens(sessionId: string): Promise<void> {
    const tokens = await this.getSessionTokens(sessionId);
    for (const tokenInfo of tokens) {
      await this.revokeToken(tokenInfo.token);
    }
  }

  /**
   * トークン情報を取得
   */
  private async getToken(token: string): Promise<CSRFTokenInfo | null> {
    const key = `${this.config.redisKeyPrefix}${token}`;
    
    if (this.redis) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('[CSRF-SYNC] Redis get error:', error);
      }
    }
    
    // メモリストアからフォールバック
    return this.memoryStore.get(key) || null;
  }

  /**
   * セッションIDでトークンを取得
   */
  private async getTokenBySession(sessionId: string): Promise<CSRFTokenInfo | null> {
    const sessionKey = `${this.config.redisKeyPrefix}session:${sessionId}`;
    
    if (this.redis) {
      try {
        const token = await this.redis.get(sessionKey);
        if (token) {
          return await this.getToken(token);
        }
      } catch (error) {
        console.error('[CSRF-SYNC] Redis get session error:', error);
      }
    }

    // メモリストアから検索
    for (const [, tokenInfo] of this.memoryStore) {
      if (tokenInfo.sessionId === sessionId && 
          (tokenInfo.state === TokenState.ACTIVE || tokenInfo.state === TokenState.GENERATED)) {
        return tokenInfo;
      }
    }
    
    return null;
  }

  /**
   * セッションの全トークンを取得
   */
  private async getSessionTokens(sessionId: string): Promise<CSRFTokenInfo[]> {
    const tokens: CSRFTokenInfo[] = [];
    
    if (this.redis) {
      try {
        const pattern = `${this.config.redisKeyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const tokenInfo: CSRFTokenInfo = JSON.parse(data);
            if (tokenInfo.sessionId === sessionId) {
              tokens.push(tokenInfo);
            }
          }
        }
      } catch (error) {
        console.error('[CSRF-SYNC] Redis scan error:', error);
      }
    }

    // メモリストアからも取得
    for (const [, tokenInfo] of this.memoryStore) {
      if (tokenInfo.sessionId === sessionId) {
        tokens.push(tokenInfo);
      }
    }

    return tokens;
  }

  /**
   * トークン情報を保存
   */
  private async saveToken(tokenInfo: CSRFTokenInfo): Promise<void> {
    const key = `${this.config.redisKeyPrefix}${tokenInfo.token}`;
    const sessionKey = `${this.config.redisKeyPrefix}session:${tokenInfo.sessionId}`;
    const ttl = Math.floor((tokenInfo.expiresAt - Date.now()) / 1000);
    
    if (this.redis && ttl > 0) {
      try {
        // トークンを保存
        await this.redis.setex(key, ttl, JSON.stringify(tokenInfo));
        
        // セッションマッピングも保存
        if (tokenInfo.state === TokenState.ACTIVE || tokenInfo.state === TokenState.GENERATED) {
          await this.redis.setex(sessionKey, ttl, tokenInfo.token);
        }
        
        return;
      } catch (error) {
        console.error('[CSRF-SYNC] Redis save error:', error);
      }
    }
    
    // メモリストアにフォールバック
    if (ttl > 0) {
      this.memoryStore.set(key, tokenInfo);
    }
  }

  /**
   * 期限切れトークンのクリーンアップ
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // メモリストアのクリーンアップ
    for (const [key, tokenInfo] of this.memoryStore) {
      if (now > tokenInfo.expiresAt || 
          tokenInfo.state === TokenState.EXPIRED ||
          tokenInfo.state === TokenState.REVOKED) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.memoryStore.delete(key);
    }

    console.warn(`[CSRF-SYNC] Cleaned up ${expiredKeys.length} expired tokens`);
  }

  /**
   * 定期クリーンアップの開始
   */
  private startCleanup(): void {
    // 既存のインターバルをクリア
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 10分ごとにクリーンアップ
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(error => {
        console.error('[CSRF-SYNC] Cleanup error:', error);
      });
    }, 10 * 60 * 1000);
  }

  /**
   * マネージャーのシャットダウン
   */
  async shutdown(): Promise<void> {
    // クリーンアップインターバルを停止
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Redis接続をクローズ
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    // メモリストアをクリア
    this.memoryStore.clear();
  }

  /**
   * 統計情報の取得
   */
  async getStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    revokedTokens: number;
    memoryUsage: number;
  }> {
    const stats = {
      totalTokens: 0,
      activeTokens: 0,
      expiredTokens: 0,
      revokedTokens: 0,
      memoryUsage: 0
    };

    // メモリストアの統計
    for (const [, tokenInfo] of this.memoryStore) {
      stats.totalTokens++;
      switch (tokenInfo.state) {
        case TokenState.ACTIVE:
        case TokenState.GENERATED:
          stats.activeTokens++;
          break;
        case TokenState.EXPIRED:
          stats.expiredTokens++;
          break;
        case TokenState.REVOKED:
          stats.revokedTokens++;
          break;
      }
    }

    // メモリ使用量の推定
    stats.memoryUsage = stats.totalTokens * 500; // 各トークン約500バイトと仮定

    return stats;
  }
}

// シングルトンインスタンス
let csrfSyncManager: CSRFSyncManager | null = null;

/**
 * CSRFSyncManagerのシングルトンインスタンスを取得
 */
export function getCSRFSyncManager(config?: CSRFSyncConfig): CSRFSyncManager {
  if (!csrfSyncManager) {
    csrfSyncManager = new CSRFSyncManager(config);
  }
  return csrfSyncManager;
}

/**
 * Next.js APIルート用のヘルパー関数
 */
export async function generateCSRFTokenForRequest(
  sessionId?: string
): Promise<{ token: string; expiresAt: number }> {
  const manager = getCSRFSyncManager();
  
  // セッションIDが提供されていない場合は取得を試みる
  if (!sessionId) {
    const session = await getServerSession(authOptions);
    sessionId = session?.user?.id || crypto.randomBytes(16).toString('hex');
  }

  const tokenInfo = await manager.generateToken(sessionId);
  
  return {
    token: tokenInfo.token,
    expiresAt: tokenInfo.expiresAt
  };
}

/**
 * Next.js APIルート用の検証ヘルパー関数
 */
export async function verifyCSRFTokenForRequest(
  token: string,
  sessionId?: string,
  metadata?: CSRFTokenInfo['metadata']
): Promise<boolean> {
  const manager = getCSRFSyncManager();
  
  // セッションIDが提供されていない場合は取得を試みる
  if (!sessionId) {
    const session = await getServerSession(authOptions);
    sessionId = session?.user?.id || '';
  }

  if (!sessionId) {
    console.warn('[CSRF-SYNC] No session ID available for verification');
    return false;
  }

  return await manager.verifyToken(token, sessionId, metadata);
}