import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

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
    console.log('🔄 MongoDB: 新規接続開始...');
    
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    cached.conn = await cached.promise;
    
    console.log('✅ MongoDB: 接続成功');
    
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
    console.error('❌ MongoDB接続失敗:', error);
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
