import mongoose from 'mongoose';

// MongoDB URIを取得（環境に応じて切り替え）
const MONGODB_URI = process.env.NODE_ENV === 'production' 
  ? process.env.MONGODB_URI_PRODUCTION 
  : process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';

// 開発環境では詳細なログを出力
const isDevelopment = process.env.NODE_ENV !== 'production';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// MongoDB Atlas推奨の接続オプション
const mongooseOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000,
  family: 4, // IPv4を使用
};

// 接続ステータスをログ出力
function logConnectionStatus(status: string, details?: any) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] MongoDB Connection: ${status}`;
  
  if (isDevelopment || status === 'ERROR') {
    console.warn(message);
    if (details) {
      console.warn('Details:', details);
    }
  }
}

// 接続イベントリスナーの設定
function setupConnectionListeners() {
  mongoose.connection.on('connected', () => {
    logConnectionStatus('CONNECTED', { uri: MONGODB_URI?.replace(/\/\/.*@/, '//***@') });
  });

  mongoose.connection.on('error', (err) => {
    logConnectionStatus('ERROR', err);
  });

  mongoose.connection.on('disconnected', () => {
    logConnectionStatus('DISCONNECTED');
  });

  mongoose.connection.on('reconnected', () => {
    logConnectionStatus('RECONNECTED');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logConnectionStatus('CONNECTION CLOSED (SIGINT)');
    process.exit(0);
  });
}

export async function connectDB() {
  // 既に接続済みの場合は既存の接続を返す
  if (cached.conn) {
    return cached.conn;
  }

  // 接続プロミスが存在しない場合は新規作成
  if (!cached.promise) {
    logConnectionStatus('CONNECTING', { 
      isAtlas: MONGODB_URI.includes('mongodb+srv'),
      environment: process.env.NODE_ENV 
    });

    try {
      // MongoDB URIの検証
      if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
        throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
      }

      // イベントリスナーの設定（初回のみ）
      if (!mongoose.connection.listeners('connected').length) {
        setupConnectionListeners();
      }

      cached.promise = mongoose.connect(MONGODB_URI, mongooseOptions);
      
      // 接続タイムアウトの処理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MongoDB connection timeout after 30 seconds')), 30000);
      });

      // 接続またはタイムアウトのいずれか早い方を待つ
      await Promise.race([cached.promise, timeoutPromise]);
      
    } catch (error) {
      cached.promise = null;
      logConnectionStatus('CONNECTION FAILED', error);
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
    
    // 接続の健全性チェック
    if (cached.conn.connection.readyState !== 1) {
      throw new Error(`MongoDB connection not ready. State: ${cached.conn.connection.readyState}`);
    }
    
    logConnectionStatus('CONNECTION ESTABLISHED', {
      database: cached.conn.connection.db?.databaseName,
      host: cached.conn.connection.host,
      readyState: cached.conn.connection.readyState
    });
    
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    logConnectionStatus('CONNECTION ERROR', e);
    throw e;
  }

  return cached.conn;
}

// 接続状態を確認するヘルパー関数
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// 接続を手動でクローズする関数（テスト用）
export async function disconnectDB() {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    logConnectionStatus('MANUALLY DISCONNECTED');
  }
}

// 接続情報を取得する関数（デバッグ用）
export function getConnectionInfo() {
  return {
    isConnected: isConnected(),
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.connection.models)
  };
}