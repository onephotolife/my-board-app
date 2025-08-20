# 🔐 会員制掲示板 データ永続化 & インポートエラー修正プロンプト

## 🚨 報告された問題

### 問題1: 投稿データの消失
```
再現手順：
1. ログイン → 投稿作成 → ログアウト
2. 再度ログイン
3. 掲示板ページにアクセス
4. 問題：以前の投稿が表示されない（データが消えている）
```

### 問題2: QuickPostCardインポートエラー
```javascript
page.tsx:225 Uncaught ReferenceError: QuickPostCard is not defined
    at BoardPage (page.tsx:225:9)
```

## 🧠 問題分析

### Phase 1: データ消失の根本原因

#### 1.1 可能性のある原因
```markdown
原因候補：
1. ❌ MongoDBへの保存が失敗している
2. ❌ セッション依存でデータをフィルタリングしている
3. ❌ インメモリでデータを管理している
4. ❌ データベース接続が不安定
5. ❌ 認証チェックでデータ取得をブロックしている
```

#### 1.2 現在の実装の問題点
```typescript
// 現在のGET API（問題のある実装）
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }  // ← ログインしていないと401エラー
    );
  }
  // ...
}
```

**会員制掲示板の正しい仕様**：
```markdown
✅ 投稿の閲覧：会員のみ（ログイン必須）
✅ 投稿の作成：会員のみ（ログイン必須）
✅ 投稿の編集/削除：投稿者本人のみ
✅ データの永続化：MongoDB使用
✅ ログアウト後もデータは保持される
```

### Phase 2: インポートエラーの原因

#### 2.1 不足しているインポート
```typescript
// src/app/board/page.tsx
// ❌ 現在：QuickPostCardのインポートがない
import EnhancedPostCard from '@/components/EnhancedPostCard';

// ✅ 修正：QuickPostCardを追加
import EnhancedPostCard from '@/components/EnhancedPostCard';
import QuickPostCard from '@/components/QuickPostCard';
```

## 📋 実装指示

### Step 1: インポートエラーの即座修正

#### 1.1 board/page.tsxのインポート修正
```typescript
// src/app/board/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  CircularProgress,
  Alert,
  Fab,
  AppBar,
  Toolbar,
  Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import CreateIcon from '@mui/icons-material/Create';

// コンポーネントのインポート（両方必要）
import EnhancedPostCard from '@/components/EnhancedPostCard';
import QuickPostCard from '@/components/QuickPostCard'; // ← 追加
```

### Step 2: MongoDB接続の確認と改善

#### 2.1 接続管理の改善
```typescript
// src/lib/db/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI環境変数が設定されていません');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || {
  conn: null,
  promise: null,
};

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  if (cached.conn) {
    console.log('既存のMongoDB接続を使用');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDBに接続成功');
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB接続エラー:', error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

### Step 3: API認証ロジックの修正

#### 3.1 会員制掲示板用のGET API
```typescript
// src/app/api/posts/route.ts

// GET: 投稿一覧を取得（会員限定）
export async function GET(request: NextRequest) {
  try {
    // セッション確認（会員制なので必須）
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { 
          error: 'ログインが必要です',
          requireAuth: true,
          posts: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          }
        },
        { status: 200 } // 401ではなく200で返す（クライアントで制御）
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // DB接続
    await connectDB();

    // すべての投稿を取得（会員なら全て見れる）
    const [posts, total] = await Promise.all([
      Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(),
    ]);

    // 編集権限の付与
    const postsWithPermissions = posts.map(post => ({
      ...post,
      isOwner: session.user.id === post.author,
      canEdit: session.user.id === post.author,
      canDelete: session.user.id === post.author,
    }));

    return NextResponse.json({
      posts: postsWithPermissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      currentUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error('投稿取得エラー:', error);
    return NextResponse.json(
      { 
        error: 'データベースエラー',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
```

### Step 4: 掲示板ページの改善

#### 4.1 認証状態に応じた表示
```typescript
// src/app/board/page.tsx

export default function BoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 投稿取得（認証必須）
  const fetchPosts = async (page: number = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/posts?page=${page}&limit=10`);
      const data = await response.json();
      
      if (data.requireAuth) {
        // 認証が必要な場合
        setError('この掲示板は会員限定です。ログインしてください。');
        setPosts([]);
        return;
      }
      
      if (data.error && response.status === 500) {
        throw new Error(data.error);
      }
      
      setPosts(data.posts || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError('投稿の読み込みに失敗しました');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // 認証状態が確定してから投稿を取得
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      setError('ログインが必要です');
      setLoading(false);
      return;
    }
    
    if (status === 'authenticated') {
      fetchPosts();
    }
  }, [status]);
  
  // 未認証時のリダイレクト
  if (status === 'unauthenticated') {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            会員限定掲示板
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            この掲示板は会員限定です。ログインしてご利用ください。
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/auth/signin')}
          >
            ログインページへ
          </Button>
        </Paper>
      </Container>
    );
  }
  
  // 認証済みの通常表示
  return (
    <>
      <AppBar position="sticky" elevation={1}>
        {/* ヘッダー内容 */}
      </AppBar>
      
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {/* QuickPostCard - 認証済みのみ表示 */}
        {session && <QuickPostCard onOpen={() => handleOpenDialog()} />}
        
        {/* 投稿一覧 */}
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : posts.length === 0 ? (
          <EmptyState onCreatePost={() => handleOpenDialog()} />
        ) : (
          posts.map(post => (
            <EnhancedPostCard
              key={post._id}
              post={post}
              currentUserId={session?.user?.id}
              onEdit={handleOpenDialog}
              onDelete={handleDelete}
            />
          ))
        )}
      </Container>
    </>
  );
}
```

### Step 5: データ永続化の確認

#### 5.1 デバッグログの追加
```typescript
// src/app/api/posts/route.ts
export async function POST(request: NextRequest) {
  console.log('=== 投稿作成開始 ===');
  
  const session = await auth();
  console.log('セッション:', session?.user?.email);
  
  const { title, content } = await request.json();
  console.log('投稿内容:', { title, content });
  
  const post = new Post({
    title,
    content,
    author: session.user.id,
    authorName: session.user.name || session.user.email,
  });
  
  await post.save();
  console.log('保存完了:', post._id);
  
  // 保存後の確認
  const savedPost = await Post.findById(post._id);
  console.log('保存確認:', savedPost ? '成功' : '失敗');
  
  return NextResponse.json(post);
}
```

## 🔍 検証テスト

### 検証シナリオ
```javascript
// tests/member-board.test.js

describe('会員制掲示板テスト', () => {
  let authToken;
  let postId;
  
  // 1. ログインテスト
  test('ログインできる', async () => {
    const response = await login('test@example.com', 'password');
    expect(response.status).toBe(200);
    authToken = response.token;
  });
  
  // 2. 投稿作成テスト
  test('ログイン後、投稿を作成できる', async () => {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'テスト投稿',
        content: 'これはテスト投稿です',
      }),
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    postId = data._id;
    expect(postId).toBeDefined();
  });
  
  // 3. ログアウト後の確認
  test('ログアウト後、投稿一覧は見れない', async () => {
    await logout();
    
    const response = await fetch('/api/posts');
    const data = await response.json();
    expect(data.requireAuth).toBe(true);
    expect(data.posts).toEqual([]);
  });
  
  // 4. 再ログイン後の確認
  test('再ログイン後、以前の投稿が表示される', async () => {
    await login('test@example.com', 'password');
    
    const response = await fetch('/api/posts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    const data = await response.json();
    expect(data.posts.length).toBeGreaterThan(0);
    
    const myPost = data.posts.find(p => p._id === postId);
    expect(myPost).toBeDefined();
    expect(myPost.title).toBe('テスト投稿');
  });
});
```

### 手動検証チェックリスト
```markdown
## 会員制掲示板の動作確認

### 1. 初回ログインと投稿
□ ログインページからログイン
□ 掲示板ページに遷移
□ QuickPostCardが表示される
□ 新規投稿を作成
□ 投稿が一覧に表示される

### 2. ログアウト
□ ログアウトボタンをクリック
□ ログインページにリダイレクト
□ 掲示板ページにアクセス → ログイン促進画面が表示

### 3. 再ログイン
□ 同じアカウントでログイン
□ 掲示板ページに遷移
□ **以前の投稿が表示される** ← 重要
□ 自分の投稿に編集・削除ボタンがある

### 4. データ永続性
□ ブラウザをリロード → 投稿が残っている
□ ブラウザを閉じて再度開く → 投稿が残っている
□ 別のブラウザでログイン → 投稿が表示される

### 5. エラーケース
□ MongoDB停止時のエラーハンドリング
□ ネットワークエラー時の表示
□ セッションタイムアウト時の動作
```

## 📊 MongoDB確認コマンド

```bash
# MongoDB接続確認
mongosh mongodb://localhost:27017/board-app

# 投稿数の確認
db.posts.countDocuments()

# 投稿一覧の確認
db.posts.find().sort({createdAt: -1}).limit(5)

# 特定ユーザーの投稿確認
db.posts.find({author: "USER_ID"})
```

## ⚠️ トラブルシューティング

### 投稿が消える場合のチェック項目
1. **MongoDB接続**
   ```bash
   # 接続状態確認
   mongosh --eval "db.adminCommand('ping')"
   ```

2. **環境変数**
   ```bash
   # .env.localの確認
   cat .env.local | grep MONGODB_URI
   ```

3. **セッション管理**
   ```typescript
   // セッションの有効期限確認
   console.log('セッション:', session);
   console.log('有効期限:', session?.expires);
   ```

4. **データベース名の確認**
   ```javascript
   // 正しいDBを使用しているか
   mongoose.connection.db.databaseName
   ```

## 🚀 実装優先順位

### 緊急（5分以内）
1. QuickPostCardのインポート追加
2. エラーハンドリングの改善

### 重要（15分以内）
1. MongoDB接続の安定化
2. 認証状態の適切な処理
3. データ取得ロジックの修正

### 推奨（30分以内）
1. ログ機能の追加
2. エラー通知の改善
3. テストケースの作成

---
*このプロンプトを使用して、会員制掲示板のデータ永続化問題とインポートエラーを完全に解決してください。*