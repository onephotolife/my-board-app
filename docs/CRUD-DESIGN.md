# 会員制掲示板 CRUD機能設計書

## 1. データベース設計

### Postスキーマ
```typescript
interface IPost {
  _id: ObjectId;
  title: string;          // 最大100文字
  content: string;        // 最大1000文字
  author: {
    _id: ObjectId;       // User._idへの参照
    name: string;        // 投稿時の名前（キャッシュ）
    email: string;       // 投稿時のメール（キャッシュ）
  };
  status: 'published' | 'draft' | 'deleted';  // ソフトデリート対応
  views: number;          // 閲覧数
  likes: string[];        // いいねしたユーザーIDの配列
  tags: string[];         // タグ
  category: string;       // カテゴリー
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;       // ソフトデリート時刻
}
```

### インデックス設計
```javascript
// パフォーマンス最適化のためのインデックス
{
  createdAt: -1,         // 新着順ソート用
  'author._id': 1,       // ユーザーの投稿検索用
  status: 1,             // ステータスフィルター用
  tags: 1,               // タグ検索用
  'author._id,createdAt': -1  // 複合インデックス
}
```

## 2. API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 | 認証 | 権限 |
|---------|--------------|------|------|------|
| GET | /api/posts | 投稿一覧取得 | 必須 | 会員 |
| GET | /api/posts/[id] | 投稿詳細取得 | 必須 | 会員 |
| POST | /api/posts | 新規投稿作成 | 必須 | 会員 |
| PUT | /api/posts/[id] | 投稿更新 | 必須 | 投稿者 |
| DELETE | /api/posts/[id] | 投稿削除 | 必須 | 投稿者 |
| GET | /api/posts/user/[userId] | ユーザーの投稿一覧 | 必須 | 会員 |

### リクエスト/レスポンス仕様

#### POST /api/posts
```typescript
// Request Body
{
  title: string;    // 必須、1-100文字
  content: string;  // 必須、1-1000文字
  tags?: string[];  // オプション、最大5個
  category?: string;// オプション
}

// Response (201 Created)
{
  success: true,
  data: IPost,
  message: "投稿が作成されました"
}

// Error Response (400)
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "タイトルは100文字以内で入力してください",
    field: "title"
  }
}
```

## 3. バリデーション設計

### バリデーションルール

```typescript
const postValidationRules = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[^<>]*$/,  // XSS対策
  },
  content: {
    required: true,
    minLength: 1,
    maxLength: 1000,
    sanitize: true,       // HTMLサニタイズ
  },
  tags: {
    maxItems: 5,
    itemMaxLength: 20,
    unique: true,
  },
  category: {
    enum: ['general', 'tech', 'question', 'discussion', 'announcement'],
  }
};
```

### フロントエンドバリデーション
```typescript
// Zodスキーマ
import { z } from 'zod';

export const postSchema = z.object({
  title: z.string()
    .min(1, 'タイトルを入力してください')
    .max(100, 'タイトルは100文字以内で入力してください')
    .regex(/^[^<>]*$/, '使用できない文字が含まれています'),
  content: z.string()
    .min(1, '本文を入力してください')
    .max(1000, '本文は1000文字以内で入力してください'),
  tags: z.array(z.string().max(20)).max(5).optional(),
  category: z.enum(['general', 'tech', 'question', 'discussion', 'announcement']).optional(),
});
```

## 4. 認証・認可設計

### ミドルウェア構成

```typescript
// 認証ミドルウェア
export async function authMiddleware(req: NextRequest) {
  const token = await getToken({ req });
  
  if (!token) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }
  
  // リクエストにユーザー情報を追加
  req.user = {
    id: token.id,
    email: token.email,
    name: token.name
  };
  
  return NextResponse.next();
}

// 権限チェックミドルウェア
export async function authorizePost(req: NextRequest, postId: string) {
  const post = await Post.findById(postId);
  
  if (!post) {
    return NextResponse.json(
      { error: '投稿が見つかりません' },
      { status: 404 }
    );
  }
  
  if (post.author._id.toString() !== req.user.id) {
    return NextResponse.json(
      { error: 'この操作を実行する権限がありません' },
      { status: 403 }
    );
  }
  
  return NextResponse.next();
}
```

## 5. エラーハンドリング設計

### エラーコード体系

| コード | HTTPステータス | 説明 |
|-------|---------------|------|
| VALIDATION_ERROR | 400 | バリデーションエラー |
| UNAUTHORIZED | 401 | 認証エラー |
| FORBIDDEN | 403 | 権限エラー |
| NOT_FOUND | 404 | リソースが見つからない |
| DUPLICATE_ENTRY | 409 | 重複エラー |
| RATE_LIMIT | 429 | レート制限 |
| SERVER_ERROR | 500 | サーバーエラー |

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
```

## 6. パフォーマンス最適化

### キャッシュ戦略

```typescript
// Redisキャッシュ（将来実装）
const cacheStrategy = {
  postList: {
    key: 'posts:list:{page}:{limit}',
    ttl: 60,  // 60秒
  },
  postDetail: {
    key: 'posts:detail:{id}',
    ttl: 300, // 5分
  },
  userPosts: {
    key: 'posts:user:{userId}',
    ttl: 120, // 2分
  }
};
```

### ページネーション

```typescript
interface PaginationParams {
  page: number;      // デフォルト: 1
  limit: number;     // デフォルト: 10、最大: 50
  sort: string;      // デフォルト: '-createdAt'
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## 7. セキュリティ設計

### セキュリティ対策

1. **XSS対策**
   - 入力値のサニタイズ
   - Content Security Policy (CSP)
   - HTMLエスケープ

2. **CSRF対策**
   - CSRFトークン
   - SameSite Cookieの使用

3. **SQLインジェクション対策**
   - Mongooseのパラメータバインディング
   - 入力値の型チェック

4. **レート制限**
   - IP単位: 100リクエスト/分
   - ユーザー単位: 10投稿/時間

5. **認証トークン**
   - JWT有効期限: 24時間
   - リフレッシュトークン: 7日間

## 8. フロントエンド設計

### コンポーネント構成

```
components/
├── posts/
│   ├── PostList.tsx       # 投稿一覧
│   ├── PostCard.tsx       # 投稿カード
│   ├── PostForm.tsx       # 投稿フォーム
│   ├── PostDetail.tsx     # 投稿詳細
│   ├── PostActions.tsx    # アクションボタン
│   └── PostSkeleton.tsx   # スケルトンローダー
├── common/
│   ├── ErrorBoundary.tsx  # エラーバウンダリ
│   ├── LoadingSpinner.tsx # ローディング
│   └── Pagination.tsx     # ページネーション
└── hooks/
    ├── usePosts.ts        # 投稿データフック
    ├── useAuth.ts         # 認証フック
    └── useForm.ts         # フォームフック
```

### 状態管理

```typescript
// React Query/SWRを使用したデータフェッチング
const { data, error, isLoading, mutate } = useSWR(
  '/api/posts',
  fetcher,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 30000, // 30秒ごとに更新
  }
);
```

## 9. テスト設計

### テストカバレッジ目標

- ユニットテスト: 80%以上
- 統合テスト: 主要フロー100%
- E2Eテスト: クリティカルパス100%

### テストケース例

```typescript
describe('Post CRUD Operations', () => {
  describe('POST /api/posts', () => {
    it('認証済みユーザーが投稿を作成できる', async () => {
      // テスト実装
    });
    
    it('タイトルが100文字を超える場合はエラー', async () => {
      // テスト実装
    });
    
    it('未認証ユーザーは401エラー', async () => {
      // テスト実装
    });
  });
});
```

## 10. 実装優先順位

1. **Phase 1: 基本CRUD** (必須)
   - データモデル定義
   - 基本的なCRUD API
   - 認証チェック

2. **Phase 2: バリデーション** (必須)
   - フロントエンドバリデーション
   - バックエンドバリデーション
   - エラーハンドリング

3. **Phase 3: 権限管理** (必須)
   - 投稿者のみ編集・削除
   - ロールベースアクセス制御

4. **Phase 4: UI/UX改善** (推奨)
   - ローディング状態
   - エラー表示
   - 成功通知

5. **Phase 5: パフォーマンス** (オプション)
   - ページネーション
   - キャッシング
   - 無限スクロール

## まとめ

この設計により、以下が実現されます：

- ✅ セキュアな認証・認可
- ✅ 堅牢なバリデーション
- ✅ 一貫性のあるエラーハンドリング
- ✅ スケーラブルなアーキテクチャ
- ✅ 保守性の高いコード構造
- ✅ テスタブルな実装