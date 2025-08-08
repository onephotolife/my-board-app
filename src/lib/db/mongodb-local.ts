import mongoose from 'mongoose';

declare global {
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    try {
      // ローカル開発用の特別な処理
      if (MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1')) {
        console.log('📌 ローカルMongoDBに接続を試みています...');
        // ローカルMongoDBが起動していない場合のエラーハンドリング
        cached.promise = mongoose.connect(MONGODB_URI, opts).catch((error) => {
          console.error('⚠️ ローカルMongoDBに接続できません。');
          console.error('以下のコマンドでMongoDBを起動してください:');
          console.error('brew services start mongodb-community');
          console.error('または');
          console.error('mongod --dbpath /usr/local/var/mongodb');
          throw error;
        });
      } else if (MONGODB_URI.includes('xxxxx')) {
        // プレースホルダーが含まれている場合
        console.error('❌ MongoDB URIが正しく設定されていません');
        console.error('.env.localファイルを確認し、正しいMongoDB接続情報を設定してください');
        throw new Error('Invalid MongoDB URI - contains placeholder values');
      } else {
        // MongoDB Atlas等の外部データベース
        cached.promise = mongoose.connect(MONGODB_URI, opts);
      }
    } catch (e) {
      cached.promise = null;
      throw e;
    }
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ MongoDB接続成功');
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}