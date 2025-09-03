/**
 * MongoDB スマート接続マネージャー
 * 14人天才会議 - 天才9
 * 
 * 自動フォールバック機能付きMongoDB接続管理
 * Atlas接続失敗時は自動的にローカルMongoDBにフォールバック
 */

import mongoose from 'mongoose';

declare global {
  var mongooseConnection: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
    type: 'atlas' | 'local' | null;
    lastAttempt: Date | null;
    failureCount: number;
  };
}

// 接続設定
const CONNECTION_CONFIG = {
  LOCAL_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB',
  ATLAS_URI: process.env.MONGODB_URI_PRODUCTION,
  RETRY_INTERVAL: 60000, // 1分
  MAX_FAILURES: 3,
  CONNECTION_TIMEOUT: 10000, // 10秒
};

// 接続オプション
const CONNECTION_OPTIONS = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
};

// グローバルキャッシュ初期化
if (!global.mongooseConnection) {
  global.mongooseConnection = {
    conn: null,
    promise: null,
    type: null,
    lastAttempt: null,
    failureCount: 0,
  };
}

const cached = global.mongooseConnection;

/**
 * URI検証
 */
function validateUri(uri: string): { valid: boolean; reason?: string } {
  if (!uri) {
    return { valid: false, reason: 'URIが未定義' };
  }
  
  if (uri.includes('xxxxx')) {
    return { valid: false, reason: 'プレースホルダーが含まれています' };
  }
  
  if (uri.includes('username:password')) {
    return { valid: false, reason: 'デフォルト認証情報が含まれています' };
  }
  
  return { valid: true };
}

/**
 * MongoDB Atlas接続試行
 */
async function tryAtlasConnection(): Promise<mongoose.Connection | null> {
  const atlasUri = CONNECTION_CONFIG.ATLAS_URI;
  
  if (!atlasUri) {
    console.warn('📌 MongoDB Atlas URIが設定されていません');
    return null;
  }
  
  const validation = validateUri(atlasUri);
  if (!validation.valid) {
    console.warn(`⚠️ MongoDB Atlas URI検証失敗: ${validation.reason}`);
    return null;
  }
  
  try {
    console.warn('🌐 MongoDB Atlasへの接続を試みています...');
    const maskedUri = atlasUri.replace(/\/\/[^@]+@/, '//***@').substring(0, 60);
    console.warn(`📍 接続先: ${maskedUri}...`);
    
    const conn = await mongoose.connect(atlasUri, {
      ...CONNECTION_OPTIONS,
      serverSelectionTimeoutMS: CONNECTION_CONFIG.CONNECTION_TIMEOUT,
    });
    
    console.warn('✅ MongoDB Atlas接続成功！');
    cached.type = 'atlas';
    cached.failureCount = 0;
    return conn.connection;
    
  } catch (error: any) {
    console.error('❌ MongoDB Atlas接続失敗:', error.message);
    cached.failureCount++;
    
    // エラー詳細の提供
    if (error.message.includes('authentication')) {
      console.warn('💡 ヒント: Database Accessでユーザー認証情報を確認してください');
    } else if (error.message.includes('network')) {
      console.warn('💡 ヒント: Network Accessで0.0.0.0/0が許可されているか確認してください');
    } else if (error.message.includes('ENOTFOUND')) {
      console.warn('💡 ヒント: クラスターURLが正しいか確認してください');
    }
    
    return null;
  }
}

/**
 * ローカルMongoDB接続試行
 */
async function tryLocalConnection(): Promise<mongoose.Connection | null> {
  const localUri = CONNECTION_CONFIG.LOCAL_URI;
  
  try {
    console.warn('📌 ローカルMongoDBへの接続を試みています...');
    console.warn(`📍 接続先: ${localUri}`);
    
    const conn = await mongoose.connect(localUri, CONNECTION_OPTIONS);
    
    console.warn('✅ ローカルMongoDB接続成功！');
    cached.type = 'local';
    return conn.connection;
    
  } catch (error: any) {
    console.error('❌ ローカルMongoDB接続失敗:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.warn('💡 ヒント: MongoDBが起動していることを確認してください');
      console.warn('   実行: brew services start mongodb-community');
    }
    
    return null;
  }
}

/**
 * スマート接続関数
 * 環境変数に基づいて適切な接続先を選択し、失敗時はフォールバック
 */
export async function connectSmartDB(): Promise<mongoose.Connection> {
  // 既存の接続がある場合は再利用
  if (cached.conn) {
    if (cached.conn.readyState === 1) {
      return cached.conn;
    }
    // 接続が切れている場合はリセット
    cached.conn = null;
    cached.promise = null;
  }
  
  // 接続試行中の場合は待機
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (error) {
      cached.promise = null;
      throw error;
    }
  }
  
  // 新規接続の確立
  cached.promise = (async () => {
    const mongoEnv = process.env.MONGODB_ENV || 'local';
    let connection: mongoose.Connection | null = null;
    
    console.warn('');
    console.warn('╔══════════════════════════════════════════════════════════╗');
    console.warn('║          MongoDB スマート接続マネージャー v2.0           ║');
    console.warn('╚══════════════════════════════════════════════════════════╝');
    console.warn(`📋 環境設定: MONGODB_ENV=${mongoEnv}`);
    
    // Atlas優先モード
    if (mongoEnv === 'atlas' || mongoEnv === 'production') {
      // Atlas接続を試行
      connection = await tryAtlasConnection();
      
      // Atlas失敗時はローカルにフォールバック
      if (!connection) {
        console.warn('');
        console.warn('🔄 フォールバック: ローカルMongoDBに切り替えます...');
        connection = await tryLocalConnection();
      }
    } 
    // ローカル優先モード
    else {
      connection = await tryLocalConnection();
      
      // ローカル失敗時、Atlasが設定されていれば試行
      if (!connection && CONNECTION_CONFIG.ATLAS_URI) {
        console.warn('');
        console.warn('🔄 フォールバック: MongoDB Atlasを試行します...');
        connection = await tryAtlasConnection();
      }
    }
    
    // 接続失敗
    if (!connection) {
      const errorMessage = `
========================================
❌ MongoDB接続エラー
========================================
すべての接続方法が失敗しました。

対処方法:
1. ローカルMongoDBを起動:
   brew services start mongodb-community

2. MongoDB Atlas設定を確認:
   - .env.localのMONGODB_URI_PRODUCTION
   - Network Accessで0.0.0.0/0を許可
   - Database Accessでユーザー確認

3. 詳細ガイドを参照:
   MONGODB-ATLAS-QUICK-GUIDE.md
========================================
      `;
      console.error(errorMessage);
      throw new Error('MongoDB接続に失敗しました');
    }
    
    // 接続成功サマリー
    console.warn('');
    console.warn('╔══════════════════════════════════════════════════════════╗');
    console.warn(`║ ✅ 接続成功: ${cached.type === 'atlas' ? 'MongoDB Atlas (クラウド)' : 'ローカルMongoDB'}     ║`);
    console.warn('╚══════════════════════════════════════════════════════════╝');
    console.warn('');
    
    cached.lastAttempt = new Date();
    return connection;
  })();
  
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

/**
 * 接続状態の取得
 */
export function getConnectionStatus() {
  return {
    connected: cached.conn?.readyState === 1,
    type: cached.type,
    lastAttempt: cached.lastAttempt,
    failureCount: cached.failureCount,
    readyState: cached.conn?.readyState || 0,
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    readyStateText: ['切断', '接続中', '接続処理中', '切断処理中'][cached.conn?.readyState || 0],
  };
}

/**
 * 接続のリセット（テスト用）
 */
export async function resetConnection() {
  if (cached.conn) {
    await cached.conn.close();
  }
  cached.conn = null;
  cached.promise = null;
  cached.type = null;
  cached.failureCount = 0;
  console.warn('🔄 MongoDB接続をリセットしました');
}

// エクスポート
export default connectSmartDB;