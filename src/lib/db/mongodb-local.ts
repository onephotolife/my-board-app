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
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
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
      } else if (MONGODB_URI.includes('xxxxx') || MONGODB_URI.includes('cluster0.xxxxx')) {
        // プレースホルダーが含まれている場合
        console.error('\n❌ MongoDB Atlas URIにプレースホルダーが含まれています');
        console.error('--------------------------------------------------');
        console.error('🔧 修正方法:');
        console.error('1. MongoDB Atlasダッシュボードにログイン');
        console.error('2. Database > Connect をクリック');
        console.error('3. "Connect your application"を選択');
        console.error('4. 接続文字列をコピー（例: cluster0.abcde.mongodb.net）');
        console.error('5. .env.localのMONGODB_URI_PRODUCTIONを更新:');
        console.error('   mongodb+srv://username:password@cluster0.[実際の値].mongodb.net/boardDB');
        console.error('\n📝 現在の設定:');
        console.error(`   ${MONGODB_URI.substring(0, 60)}...`);
        console.error('\n💡 一時的な解決策:');
        console.error('   ローカルMongoDBを使用するには、.env.localから');
        console.error('   MONGODB_URI_PRODUCTIONの行をコメントアウトしてください');
        console.error('--------------------------------------------------\n');
        throw new Error('MongoDB Atlas URI contains placeholder values - please replace "xxxxx" with your actual cluster identifier');
      } else {
        // MongoDB Atlas等の外部データベース
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║ 🌐 MongoDB Atlas接続開始                              ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        const maskedUri = MONGODB_URI.replace(/\/\/[^@]+@/, '//***@');
        console.log(`📍 クラスター: ${maskedUri.match(/cluster0\.[a-z0-9]+\.mongodb\.net/)?.[0] || 'unknown'}`);
        console.log(`📁 データベース: boardDB`);
        console.log(`⏱️  タイムアウト: 10秒`);
        console.log('\n🔄 接続中...');
        
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((connection) => {
          console.log('\n✅ MongoDB Atlas接続成功！');
          console.log('╔════════════════════════════════════════════════════════════╗');
          console.log('║ ✅ MongoDB Atlas (cluster0.ej6jq5c) 接続確立            ║');
          console.log('╚════════════════════════════════════════════════════════════╝\n');
          return connection;
        }).catch((error) => {
          console.error('\n❌ MongoDB Atlasへの接続に失敗しました');
          console.error('--------------------------------------------------');
          console.error('🔍 エラー詳細:', error.message);
          console.error('\n📝 確認事項:');
          console.error('1. MongoDB Atlasダッシュボードでクラスター状態確認');
          console.error('2. Network Access → 0.0.0.0/0 が許可されているか');
          console.error('3. Database Access → boarduser ユーザーが存在するか');
          console.error('4. パスワード: thc1234567890THC が正しいか');
          console.error('5. クラスターID: ej6jq5c が正しいか');
          console.error('--------------------------------------------------\n');
          throw error;
        });
      }
    } catch (e) {
      cached.promise = null;
      throw e;
    }
  }

  try {
    cached.conn = await cached.promise;
    // 接続成功ログはmongoose.connect内で出力済み
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}