import mongoose from 'mongoose';

interface ConnectionState {
  isConnected: boolean;
  lastHealthCheck: number;
  connectionTime: number;
  warmupCompleted: boolean;
}

class DatabaseConnectionManager {
  private state: ConnectionState = {
    isConnected: false,
    lastHealthCheck: 0,
    connectionTime: 0,
    warmupCompleted: false
  };

  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30秒
  private readonly CONNECTION_TIMEOUT = 10000; // 10秒

  /**
   * データベース接続の初期化とWarm-up
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (mongoose.connection.readyState === 1) {
        console.log('✅ MongoDB: 既存の接続を使用');
        this.state.isConnected = true;
        this.state.warmupCompleted = true;
        return;
      }

      console.log('🔄 MongoDB: 接続を初期化中...');
      
      // 接続オプションの最適化
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app', {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: this.CONNECTION_TIMEOUT,
        socketTimeoutMS: 45000,
        family: 4,
        bufferCommands: false,
      });

      this.state.isConnected = true;
      this.state.connectionTime = Date.now() - startTime;
      
      console.log(`✅ MongoDB: 接続完了 (${this.state.connectionTime}ms)`);
      
      // Warm-up実行
      await this.performWarmup();
      
      // 定期ヘルスチェック開始
      this.startHealthCheck();
      
    } catch (error) {
      console.error('❌ MongoDB: 接続失敗', error);
      this.state.isConnected = false;
      throw error;
    }
  }

  /**
   * Warm-up処理: 接続プールの事前初期化
   */
  private async performWarmup(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // 軽量なpingコマンドでWarm-up
      await mongoose.connection.db.admin().ping();
      
      // ダミークエリで接続プールを活性化
      await mongoose.connection.db.collection('healthcheck').findOne({}, { limit: 1 });
      
      const warmupTime = Date.now() - startTime;
      this.state.warmupCompleted = true;
      
      console.log(`🔥 MongoDB: Warm-up完了 (${warmupTime}ms)`);
    } catch (error) {
      console.warn('⚠️ MongoDB: Warm-up警告', error);
      // Warm-upの失敗は致命的ではない
    }
  }

  /**
   * 定期的なヘルスチェック
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const startTime = Date.now();
        await mongoose.connection.db.admin().ping();
        this.state.lastHealthCheck = Date.now();
        
        const pingTime = Date.now() - startTime;
        if (pingTime > 1000) {
          console.warn(`⚠️ MongoDB: Ping時間が長い (${pingTime}ms)`);
        }
      } catch (error) {
        console.error('❌ MongoDB: ヘルスチェック失敗', error);
        this.state.isConnected = false;
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * 高速ヘルスチェック（キャッシュ活用）
   */
  async quickHealthCheck(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    lastCheck: number;
    warmupCompleted: boolean;
  }> {
    const now = Date.now();
    
    // 最近のヘルスチェック結果をキャッシュ活用
    if (now - this.state.lastHealthCheck < 5000 && this.state.isConnected) {
      return {
        isHealthy: true,
        responseTime: 0, // キャッシュから取得
        lastCheck: this.state.lastHealthCheck,
        warmupCompleted: this.state.warmupCompleted
      };
    }

    // 実際のDBチェック
    const startTime = Date.now();
    try {
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;
      
      this.state.isConnected = true;
      this.state.lastHealthCheck = now;
      
      return {
        isHealthy: true,
        responseTime,
        lastCheck: now,
        warmupCompleted: this.state.warmupCompleted
      };
    } catch (error) {
      console.error('❌ MongoDB: クイックヘルスチェック失敗', error);
      this.state.isConnected = false;
      
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastCheck: now,
        warmupCompleted: this.state.warmupCompleted
      };
    }
  }

  /**
   * 接続状態の取得
   */
  getConnectionState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * 接続の終了
   */
  async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB: 接続を終了');
    }

    this.state.isConnected = false;
    this.state.warmupCompleted = false;
  }
}

// シングルトンインスタンス
export const dbConnectionManager = new DatabaseConnectionManager();

// アプリケーション起動時の自動初期化
if (process.env.NODE_ENV === 'production' || process.env.AUTO_DB_WARMUP === 'true') {
  dbConnectionManager.initialize().catch(error => {
    console.error('🚨 DB初期化失敗:', error);
  });
}