import mongoose from 'mongoose';

interface MongoConfig {
  maxPoolSize: number;
  minPoolSize: number;
  maxIdleTimeMS: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
  retryAttempts: number;
  connectionTimeout: number;
  healthCheckInterval: number;
}

interface ConnectionState {
  isConnected: boolean;
  connectionAttempts: number;
  lastError: Error | null;
  lastSuccessfulConnection: Date | null;
}

class MongoManager {
  private config: MongoConfig;
  private connectionState: ConnectionState;
  private healthCheckTimer?: NodeJS.Timeout;
  private uri: string;
  private alerts: Array<{ level: string; message: string; timestamp: Date }> = [];

  constructor() {
    this.config = {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2'),
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryAttempts: parseInt(process.env.MONGODB_RETRY_ATTEMPTS || '3'),
      connectionTimeout: parseInt(process.env.MONGODB_CONNECTION_TIMEOUT || '30000'),
      healthCheckInterval: parseInt(process.env.MONGODB_HEALTH_CHECK_INTERVAL || '30000'),
    };

    this.connectionState = {
      isConnected: false,
      connectionAttempts: 0,
      lastError: null,
      lastSuccessfulConnection: null,
    };

    // 環境に応じてURI設定
    this.uri = this.getMongoURI();
    this.setupEventHandlers();
  }

  private getMongoURI(): string {
    const env = process.env.MONGODB_ENV || 'local';

    if (env === 'atlas' && process.env.MONGODB_URI_PRODUCTION) {
      return process.env.MONGODB_URI_PRODUCTION;
    }

    return process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
  }

  private setupEventHandlers() {
    mongoose.connection.on('connected', () => {
      console.warn('✅ MongoDB接続成功');
      this.connectionState.isConnected = true;
      this.connectionState.connectionAttempts = 0;
      this.connectionState.lastSuccessfulConnection = new Date();
      this.connectionState.lastError = null;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDBエラー:', error);
      this.connectionState.lastError = error;
      this.addAlert('ERROR', `MongoDBエラー: ${error.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB接続切断');
      this.connectionState.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.warn('🔄 MongoDB再接続成功');
      this.connectionState.isConnected = true;
      this.connectionState.connectionAttempts = 0;
    });
  }

  async connect(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      console.warn('✅ MongoDB既に接続済み');
      return;
    }

    try {
      this.connectionState.connectionAttempts++;
      console.warn(
        `🔗 MongoDB接続試行中... (${this.connectionState.connectionAttempts}/${this.config.retryAttempts})`
      );

      const options: mongoose.ConnectOptions = {
        maxPoolSize: this.config.maxPoolSize,
        minPoolSize: this.config.minPoolSize,
        maxIdleTimeMS: this.config.maxIdleTimeMS,
        serverSelectionTimeoutMS: this.config.serverSelectionTimeoutMS,
        socketTimeoutMS: this.config.socketTimeoutMS,
        bufferCommands: false,
      };

      await mongoose.connect(this.uri, options);

      // ヘルスチェック開始
      this.startHealthCheck();
    } catch (error) {
      console.error('❌ MongoDB接続失敗:', error);
      this.connectionState.lastError = error as Error;

      if (this.connectionState.connectionAttempts < this.config.retryAttempts) {
        console.warn(
          `🔄 再接続試行中... (${this.connectionState.connectionAttempts}/${this.config.retryAttempts})`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.connect();
      }

      throw new Error(`MongoDB接続失敗: ${(error as Error).message}`);
    }
  }

  private startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck() {
    try {
      if (mongoose.connection.readyState !== 1) {
        this.addAlert('WARNING', 'MongoDB接続状態が不安定です');
        return;
      }

      // 簡単なpingテスト
      await mongoose.connection.db?.admin().ping();

      const state = this.getConnectionState();
      if (state.connectionAttempts > 5) {
        this.addAlert('WARNING', `再接続試行回数: ${state.connectionAttempts}`);
      }
    } catch (error) {
      console.error('❌ ヘルスチェック失敗:', error);
      this.addAlert('CRITICAL', `監視チェック失敗: ${(error as Error).message}`);
    }
  }

  private addAlert(level: string, message: string) {
    const alert = {
      level,
      message,
      timestamp: new Date(),
    };

    this.alerts.push(alert);
    console.warn(`🚨 [${level}] ${message}`);

    // アラート履歴を1000件に制限
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  getAlerts(since?: Date): Array<{ level: string; message: string; timestamp: Date }> {
    if (since) {
      return this.alerts.filter((alert) => alert.timestamp >= since);
    }
    return [...this.alerts];
  }

  async disconnect(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.warn('✅ MongoDB切断完了');
    }
  }

  // 統計情報の取得
  getStats() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAlerts = this.getAlerts(oneHourAgo);

    return {
      connectionState: this.getConnectionState(),
      config: this.config,
      alerts: {
        total: this.alerts.length,
        lastHour: recentAlerts.length,
        byLevel: recentAlerts.reduce((acc: Record<string, number>, alert) => {
          acc[alert.level] = (acc[alert.level] || 0) + 1;
          return acc;
        }, {}),
      },
    };
  }
}

// シングルトンインスタンス
let mongoManager: MongoManager | null = null;

export function getMongoManager(): MongoManager {
  if (!mongoManager) {
    mongoManager = new MongoManager();
  }
  return mongoManager;
}

export async function connectToMongoDB(): Promise<void> {
  const manager = getMongoManager();
  await manager.connect();
}

export function getMongoConnectionState() {
  const manager = getMongoManager();
  return manager.getConnectionState();
}

export default connectToMongoDB;
