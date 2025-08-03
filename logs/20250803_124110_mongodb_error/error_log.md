# MongoDB接続エラーの修正ログ

## 発生日時
2025-08-03 12:41

## エラー内容
```
GET http://localhost:3000/api/posts 500 (Internal Server Error)
```

## 原因
MongoDB接続に失敗。MongoDBサーバーが起動していない、またはMONGODB_URI環境変数が正しく設定されていない可能性がある。

## 関連ファイル
- `/src/app/api/posts/route.ts` - APIエンドポイント
- `/src/lib/mongodb.ts` - MongoDB接続設定
- `/src/models/Post.ts` - Postモデル定義

## 修正内容

### 1. MongoDB接続設定の改善
`/src/lib/mongodb.ts`を修正:
- エラーハンドリングの改善
- 接続エラー時の詳細なログ出力
- global型定義の追加

### 2. APIルートのエラーハンドリング改善
`/src/app/api/posts/route.ts`を修正:
- エラーの詳細をコンソールに出力
- より具体的なエラーメッセージを返す

## 修正後のコード

### mongodb.ts
```typescript
import mongoose from 'mongoose';

declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully');
      return mongoose;
    }).catch((error) => {
      console.error('MongoDB connection error:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to connect to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
```

### route.ts (GET関数部分)
```typescript
export async function GET() {
  try {
    await dbConnect();
    const posts = await Post.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('Error in GET /api/posts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch posts'
      },
      { status: 500 }
    );
  }
}
```

## 必要な対応
1. MongoDBサーバーが起動していることを確認
   ```bash
   # MongoDBの起動確認
   brew services list | grep mongodb
   
   # 起動していない場合
   brew services start mongodb-community
   ```

2. 環境変数の設定（.env.localファイル）
   ```
   MONGODB_URI=mongodb://localhost:27017/board-app
   ```

3. サーバーの再起動
   ```bash
   npm run dev
   ```

## テスト結果
修正後、以下を確認:
- MongoDB接続の成功
- APIエンドポイントの正常動作
- 投稿の取得・作成機能の動作確認