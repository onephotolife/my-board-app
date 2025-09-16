import mongoose from 'mongoose';

// MongoDB URIを環境に応じて取得
// MONGODB_ENV環境変数で明示的に制御可能
const getMongoUri = () => {
  const mongoEnv = process.env.MONGODB_ENV || 'local';

  // MONGODB_ENVがatlasの場合、MongoDB Atlasを使用
  if (mongoEnv === 'atlas' || mongoEnv === 'production') {
    if (
      process.env.MONGODB_URI_PRODUCTION &&
      !process.env.MONGODB_URI_PRODUCTION.includes('username:password')
    ) {
      console.warn('[MongoDB] 🌐 Using MongoDB Atlas (Online)');
      return process.env.MONGODB_URI_PRODUCTION;
    } else {
      console.error('[MongoDB] ❌ MONGODB_ENV=atlas but MONGODB_URI_PRODUCTION is not configured');
      console.error(
        '[MongoDB] 💡 Please set MONGODB_URI_PRODUCTION in .env.local or .env.production'
      );
      console.error('[MongoDB] 📖 See MONGODB_ATLAS_SETUP.md for instructions');
      // フォールバックとしてローカルを使用
      console.warn('[MongoDB] ⚠️ Falling back to local MongoDB');
    }
  }

  // NODE_ENVがproductionの場合
  if (process.env.NODE_ENV === 'production') {
    if (
      process.env.MONGODB_URI_PRODUCTION &&
      !process.env.MONGODB_URI_PRODUCTION.includes('username:password')
    ) {
      console.warn('[MongoDB] 🌐 Using MongoDB Atlas (Production)');
      return process.env.MONGODB_URI_PRODUCTION;
    }
    // 本番環境でもMONGODB_URIが設定されていれば使用
    if (process.env.MONGODB_URI) {
      console.warn('[MongoDB] ⚠️ Using MONGODB_URI in production mode');
      return process.env.MONGODB_URI;
    }
  }

  // デフォルトはローカルMongoDB
  if (process.env.MONGODB_URI) {
    const isLocal =
      process.env.MONGODB_URI.includes('localhost') ||
      process.env.MONGODB_URI.includes('127.0.0.1');
    console.warn(
      `[MongoDB] 💾 Using ${isLocal ? 'local' : 'remote'} MongoDB: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***@')}`
    );
    return process.env.MONGODB_URI;
  }

  console.warn('[MongoDB] 💾 Using default local MongoDB');
  return 'mongodb://localhost:27017/boardDB';
};

const MONGODB_URI = getMongoUri();

if (process.env.NODE_ENV === 'production') {
  mongoose.set('autoIndex', false);
  mongoose.set('autoCreate', false);
} else {
  mongoose.set('autoIndex', true);
  mongoose.set('autoCreate', true);
}

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

// MongoDB接続オプション（Atlas対応）
const mongooseOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000,
  family: 4, // IPv4を使用
};

// 接続ステータスをログ出力
function isErrorLike(value: unknown): value is { message?: unknown; stack?: unknown } {
  return (
    typeof value === 'object' && value !== null && 'message' in (value as Record<string, unknown>)
  );
}

function logConnectionStatus(status: string, details?: unknown) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] MongoDB Connection: ${status}`;

  console.warn(message);
  if (details === undefined || details === null) {
    return;
  }

  if (isErrorLike(details)) {
    const { message: detailMessage, stack } = details as { message?: unknown; stack?: unknown };
    if (typeof detailMessage === 'string') {
      console.warn('Error:', detailMessage);
    }
    if (typeof stack === 'string' && process.env.NODE_ENV !== 'production') {
      console.warn('Stack:', stack);
    }
    return;
  }

  try {
    console.warn('Details:', JSON.stringify(details, null, 2));
  } catch (jsonError) {
    console.warn('Details serialization failed:', jsonError);
  }
}

// 接続イベントリスナーの設定
let listenersSetup = false;
function setupConnectionListeners() {
  if (listenersSetup) return;
  listenersSetup = true;

  mongoose.connection.on('connected', () => {
    logConnectionStatus('✅ CONNECTED', {
      database: mongoose.connection.db?.databaseName,
      host: mongoose.connection.host,
    });
  });

  mongoose.connection.on('error', (err) => {
    logConnectionStatus('❌ ERROR', err);
  });

  mongoose.connection.on('disconnected', () => {
    logConnectionStatus('⚠️ DISCONNECTED');
  });

  mongoose.connection.on('reconnected', () => {
    logConnectionStatus('🔄 RECONNECTED');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logConnectionStatus('🛑 CONNECTION CLOSED (SIGINT)');
    process.exit(0);
  });
}

export async function connectDB() {
  // 既に接続済みの場合は既存の接続を返す
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // 接続プロミスが存在しない場合は新規作成
  if (!cached.promise) {
    const isAtlas = MONGODB_URI.includes('mongodb+srv') || MONGODB_URI.includes('mongodb.net');

    logConnectionStatus('🔄 CONNECTING', {
      isAtlas,
      environment: process.env.NODE_ENV,
      uri: MONGODB_URI.replace(/\/\/.*@/, '//***@').substring(0, 50) + '...',
    });

    try {
      // MongoDB URIの検証
      if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
        throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
      }

      // イベントリスナーの設定
      setupConnectionListeners();

      // 接続オプションの調整（Atlas用）
      const options = isAtlas
        ? {
            ...mongooseOptions,
            retryWrites: true,
            w: 'majority' as const,
          }
        : mongooseOptions;

      cached.promise = mongoose.connect(MONGODB_URI, options);

      // 接続タイムアウトの処理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MongoDB connection timeout after 30 seconds')), 30000);
      });

      // 接続またはタイムアウトのいずれか早い方を待つ
      await Promise.race([cached.promise, timeoutPromise]);
    } catch (error) {
      cached.promise = null;
      logConnectionStatus('❌ CONNECTION FAILED', error);

      // エラーの詳細情報を提供
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          console.error('💡 Hint: MongoDB server is not running or not accessible');
        } else if (error.message.includes('authentication failed')) {
          console.error('💡 Hint: Check your MongoDB username and password');
        } else if (error.message.includes('ETIMEDOUT')) {
          console.error(
            '💡 Hint: Network timeout - check your internet connection and MongoDB Atlas whitelist'
          );
        } else if (error.message.includes('querySrv')) {
          console.error(
            '💡 Hint: DNS resolution failed - check your MongoDB Atlas connection string'
          );
        }
      }

      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;

    // 接続の健全性チェック
    if (!cached.conn || cached.conn.connection.readyState !== 1) {
      throw new Error(
        `MongoDB connection not ready. State: ${cached.conn?.connection.readyState || 'undefined'}`
      );
    }

    logConnectionStatus('✅ CONNECTION ESTABLISHED', {
      database: cached.conn.connection.db?.databaseName,
      collections: await cached.conn.connection.db
        ?.collections()
        .then((cols) => cols.map((c) => c.collectionName)),
      models: Object.keys(cached.conn.models),
    });
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    logConnectionStatus('❌ CONNECTION ERROR', e);
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
    logConnectionStatus('🛑 MANUALLY DISCONNECTED');
  }
}

// 接続情報を取得する関数（デバッグ用）
export function getConnectionInfo() {
  return {
    isConnected: isConnected(),
    readyState: mongoose.connection.readyState,
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][
      mongoose.connection.readyState
    ],
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.connection.models),
    uri: MONGODB_URI.replace(/\/\/.*@/, '//***@').substring(0, 50) + '...',
  };
}

// エクスポート
const mongoHelpers = { connectDB, isConnected, disconnectDB, getConnectionInfo };

export default mongoHelpers;
