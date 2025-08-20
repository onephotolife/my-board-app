# 🚨 掲示板認証問題 & インポートエラー解決プロンプト

## 🔴 報告された問題

### 問題1: ログアウト後の投稿消失
```
症状：
1. ログイン → 投稿作成 → ログアウト
2. 掲示板ページにアクセス
3. 投稿内容が表示されない（消えている）
```

### 問題2: QuickPostCardインポートエラー
```javascript
page.tsx:225 Uncaught ReferenceError: QuickPostCard is not defined
    at BoardPage (page.tsx:225:9)
```

## 🧠 問題分析フェーズ

### Phase 1: 認証問題の根本原因

#### 1.1 現在の実装の問題点
```typescript
// src/app/api/posts/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }
  // ... 投稿を取得
}
```

**問題**: 
- 認証が必須になっている
- ログアウト後は401エラーで投稿が取得できない
- 公開掲示板として機能していない

#### 1.2 期待される動作
```markdown
正しい仕様：
1. 投稿の閲覧：認証不要（誰でも見れる）
2. 投稿の作成：認証必要（ログインユーザーのみ）
3. 投稿の編集/削除：投稿者のみ可能
```

### Phase 2: インポートエラーの原因

#### 2.1 エラー発生箇所
```typescript
// src/app/board/page.tsx
// インポート文が欠落している
import QuickPostCard from '@/components/QuickPostCard'; // <- これが不足
```

#### 2.2 なぜエラーが発生したか
```markdown
原因：
1. コンポーネントを使用しているがインポートしていない
2. TypeScriptのコンパイル時にはエラーが出ない（JSX内で使用）
3. ランタイムエラーとして発生
```

## 📋 解決策実装

### Solution 1: 認証ロジックの修正

#### 1.1 API Route の改修
```typescript
// src/app/api/posts/route.ts

// GET: 投稿一覧を取得（認証不要）
export async function GET(request: NextRequest) {
  try {
    // セッションは取得するが、必須にしない
    const session = await auth();
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    await connectDB();

    const [posts, total] = await Promise.all([
      Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(),
    ]);

    // 各投稿に編集可能フラグを追加
    const postsWithPermissions = posts.map(post => ({
      ...post,
      canEdit: session?.user?.id === post.author,
      canDelete: session?.user?.id === post.author,
    }));

    return NextResponse.json({
      posts: postsWithPermissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      isAuthenticated: !!session,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: 新規投稿を作成（認証必要）
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // POSTは認証必須
    if (!session) {
      return NextResponse.json(
        { error: '投稿するにはログインが必要です' },
        { status: 401 }
      );
    }
    
    // ... 投稿作成処理
  }
}
```

#### 1.2 掲示板ページの改修
```typescript
// src/app/board/page.tsx

export default function BoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 認証状態に関わらず投稿を取得
  const fetchPosts = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts?page=${page}&limit=10`);
      
      if (response.status === 401) {
        // 認証エラーの場合でも、公開投稿を表示
        setPosts([]);
        setError('ログインすると投稿を作成できます');
      } else if (!response.ok) {
        throw new Error('投稿の取得に失敗しました');
      } else {
        const data = await response.json();
        setPosts(data.posts);
        setPagination(data.pagination);
        setIsAuthenticated(data.isAuthenticated);
      }
    } catch (error) {
      setError('投稿の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // 条件付きUI表示
  return (
    <>
      {/* ヘッダー：常に表示 */}
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            掲示板
          </Typography>
          
          {status === 'authenticated' ? (
            // ログイン時：新規投稿ボタンとログアウト
            <Box display="flex" gap={2}>
              <Button onClick={() => handleOpenDialog()}>
                新規投稿
              </Button>
              <Button onClick={handleLogout}>
                ログアウト
              </Button>
            </Box>
          ) : (
            // 未ログイン時：ログインボタン
            <Button onClick={() => router.push('/auth/signin')}>
              ログインして投稿
            </Button>
          )}
        </Toolbar>
      </AppBar>
      
      <Container>
        {/* QuickPostCard：認証時のみ表示 */}
        {status === 'authenticated' && (
          <QuickPostCard onOpen={() => handleOpenDialog()} />
        )}
        
        {/* 投稿一覧：常に表示 */}
        {posts.map(post => (
          <EnhancedPostCard
            key={post._id}
            post={post}
            currentUserId={session?.user?.id}
            onEdit={post.canEdit ? handleOpenDialog : undefined}
            onDelete={post.canDelete ? handleDelete : undefined}
          />
        ))}
        
        {/* 未ログイン時のメッセージ */}
        {status !== 'authenticated' && posts.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6">
              投稿を見るにはログインが必要かもしれません
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/auth/signin')}
              sx={{ mt: 2 }}
            >
              ログインする
            </Button>
          </Paper>
        )}
      </Container>
    </>
  );
}
```

### Solution 2: インポートエラーの修正

#### 2.1 不足しているインポートを追加
```typescript
// src/app/board/page.tsx の冒頭

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

// コンポーネントのインポート
import EnhancedPostCard from '@/components/EnhancedPostCard';
import QuickPostCard from '@/components/QuickPostCard'; // ← これを追加
```

### Solution 3: 認証の柔軟な設計

#### 3.1 権限レベルの定義
```typescript
// src/types/auth.ts
export enum AccessLevel {
  PUBLIC = 'public',        // 誰でもアクセス可能
  AUTHENTICATED = 'auth',   // ログインユーザーのみ
  OWNER = 'owner',         // 所有者のみ
  ADMIN = 'admin',         // 管理者のみ
}

// src/lib/auth/permissions.ts
export const permissions = {
  posts: {
    read: AccessLevel.PUBLIC,
    create: AccessLevel.AUTHENTICATED,
    update: AccessLevel.OWNER,
    delete: AccessLevel.OWNER,
  },
};
```

#### 3.2 ミドルウェアの改善
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 公開ページのリスト
  const publicPages = [
    '/',
    '/board',  // 掲示板は閲覧のみ公開
    '/api/posts', // GET メソッドのみ公開
  ];
  
  // 認証が必要なページ
  const protectedPages = [
    '/profile',
    '/settings',
  ];
  
  // APIルートの認証チェック
  if (pathname.startsWith('/api/')) {
    const session = await auth();
    
    // GETリクエストは公開
    if (request.method === 'GET' && pathname === '/api/posts') {
      return NextResponse.next();
    }
    
    // POST/PUT/DELETEは認証必要
    if (!session && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}
```

## 🔍 検証テスト

### テストシナリオ
```javascript
// tests/board-auth.test.js

describe('掲示板認証テスト', () => {
  test('未ログインでも投稿が閲覧できる', async () => {
    const response = await fetch('/api/posts');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.posts).toBeDefined();
  });
  
  test('未ログインでは投稿作成できない', async () => {
    const response = await fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', content: 'Test' }),
    });
    expect(response.status).toBe(401);
  });
  
  test('ログイン後は投稿作成可能', async () => {
    // ログイン処理
    await login('test@example.com', 'password');
    
    const response = await fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', content: 'Test' }),
    });
    expect(response.status).toBe(201);
  });
  
  test('他人の投稿は編集できない', async () => {
    const postId = 'other-user-post-id';
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Hack', content: 'Hack' }),
    });
    expect(response.status).toBe(403);
  });
});
```

### 手動検証チェックリスト
```markdown
□ 未ログイン状態で掲示板ページにアクセス
  □ 投稿一覧が表示される
  □ 新規投稿ボタンが表示されない
  □ ログインボタンが表示される

□ ログイン状態で掲示板ページにアクセス
  □ 投稿一覧が表示される
  □ 新規投稿ボタンが表示される
  □ QuickPostCardが表示される
  □ 自分の投稿に編集・削除ボタンが表示される

□ ログアウト後の動作
  □ 投稿一覧が引き続き表示される
  □ 編集・削除ボタンが非表示になる
  □ 新規投稿ボタンが非表示になる

□ リロード時の動作
  □ エラーが発生しない
  □ 投稿が正しく表示される
```

## 📊 成功指標

### 必須要件
- [ ] 未ログインでも投稿閲覧可能
- [ ] インポートエラーの解消
- [ ] 適切な権限管理
- [ ] エラーハンドリング

### パフォーマンス
- [ ] ページロード時間 < 2秒
- [ ] エラー発生率 < 0.1%
- [ ] 認証チェック時間 < 100ms

## ⚠️ 注意事項

### セキュリティ考慮
1. **読み取り専用の公開**
   - GETリクエストのみ認証不要
   - POST/PUT/DELETEは必ず認証

2. **所有者チェック**
   - 編集・削除は投稿者のみ
   - サーバーサイドで必ず検証

3. **エラー情報の制限**
   - 詳細なエラーは露出しない
   - 一般的なメッセージを返す

## 🚀 実装優先順位

### 緊急（15分以内）
1. QuickPostCardのインポート追加
2. GET APIの認証を任意に変更

### 重要（30分以内）
1. 掲示板ページの条件付きUI実装
2. 権限チェックの実装

### 推奨（1時間以内）
1. テストケースの追加
2. エラーハンドリングの改善

---
*このプロンプトを使用して、掲示板の認証問題とインポートエラーを完全に解決してください。*