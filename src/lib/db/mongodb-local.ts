import mongoose from 'mongoose';

// 本番環境用MongoDB URI取得（フォールバック付き）
const getMongodbUri = () => {
  // 本番環境ではMONGODB_URI_PRODUCTIONまたはMONGODB_URIを使用
  if (process.env.NODE_ENV === 'production') {
    const productionUri = process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI;
    if (productionUri && productionUri !== 'mongodb://localhost:27017/board-app') {
      console.log('🌐 [MongoDB] 本番データベース使用');
      return productionUri;
    }
    console.warn('⚠️ [MongoDB] 本番環境でローカルDBにフォールバック');
  }
  
  return process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
};

const MONGODB_URI = getMongodbUri();

interface ConnectionCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: ConnectionCache | undefined;
}

const cached: ConnectionCache = global.mongoose || {
  conn: null,
  promise: null,
};

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  // 既に接続済みの場合
  if (cached.conn) {
    console.log('✅ MongoDB: 既存の接続を使用');
    return cached.conn;
  }

  // 接続中の場合
  if (cached.promise) {
    console.log('⏳ MongoDB: 接続待機中...');
    cached.conn = await cached.promise;
    return cached.conn;
  }

  try {
    console.log('🔄 MongoDB: 接続を初期化中...');
    console.log('🔍 [MongoDB Debug]:', {
      uri: MONGODB_URI.replace(/\/\/.*@/, '//***@'),
      environment: process.env.NODE_ENV,
      hasMongodbUri: !!process.env.MONGODB_URI,
      hasProductionUri: !!process.env.MONGODB_URI_PRODUCTION
    });
    
    // MongoDB接続オプション
    const connectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,  // 30秒に延長
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,  // 接続タイムアウトを追加
      heartbeatFrequencyMS: 10000,  // ハートビート頻度
    };
    
    cached.promise = mongoose.connect(MONGODB_URI, connectOptions);

    cached.conn = await cached.promise;
    
    console.log('✅ MongoDB: 接続成功');
    console.log('📊 [MongoDB Info]:', {
      database: cached.conn.connection.db?.databaseName,
      host: cached.conn.connection.host,
      readyState: cached.conn.connection.readyState
    });
    
    // 接続イベントリスナー
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB接続エラー:', err);
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB: 接続が切断されました');
      cached.conn = null;
      cached.promise = null;
    });

    return cached.conn;
  } catch (error) {
    console.error('❌ MongoDB: 接続失敗', error);
    console.error('🔍 [接続診断]:', {
      uri: MONGODB_URI.substring(0, 50) + '...',
      environment: process.env.NODE_ENV,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    cached.promise = null;
    throw error;
  }
}

// ヘルスチェック関数
export async function checkDBHealth(): Promise<boolean> {
  try {
    const conn = await connectDB();
    await conn.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
