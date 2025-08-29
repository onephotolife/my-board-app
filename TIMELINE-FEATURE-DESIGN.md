# タイムライン機能 設計書

## 1. 概要
会員制掲示板にタイムライン機能を追加し、フォローした人の投稿と自分の投稿を時系列で表示する。

## 2. 現状分析

### 2.1 既存システム構成
- **フレームワーク**: Next.js 15.4.5 (App Router)
- **UI**: Material-UI v7
- **データベース**: MongoDB (Mongoose)
- **認証**: NextAuth v4 (Credentials Provider)
- **リアルタイム通信**: Socket.io

### 2.2 既存データモデル

#### User Model (src/models/User.ts)
```typescript
interface IUser {
  email: string;
  password: string;
  name: string;
  bio?: string;
  avatar?: string;
  emailVerified?: Date;
  // フォロー機能メソッドあり (follow, unfollow, isFollowing)
}
```

#### Post Model (src/models/Post.ts)
```typescript
interface IPost {
  title: string;
  content: string;
  author: Types.ObjectId;
  authorInfo: {
    name: string;
    email: string;
    avatar?: string;
  };
  status: 'published' | 'draft' | 'deleted';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Follow Model (src/lib/models/Follow.ts)
```typescript
interface IFollow {
  follower: Types.ObjectId;   // フォローする人
  following: Types.ObjectId;  // フォローされる人
  isReciprocal: boolean;      // 相互フォロー状態
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 既存API
- **POST API**: `/api/posts` (GET, POST)
- **Follow API**: `/api/users/[userId]/follow` (GET, POST, DELETE)
- **User API**: `/api/users/[userId]/*` (各種ユーザー情報)

## 3. タイムライン機能設計

### 3.1 機能要件
1. フォローした人の投稿を表示
2. 自分の投稿も含める
3. 新しい順に並べる（時系列）
4. 無限スクロール対応
5. いいね数・コメント数を表示
6. リアルタイム更新（Socket.io使用）

### 3.2 アーキテクチャ設計

#### 3.2.1 APIエンドポイント
**新規作成: `/api/timeline`**
```typescript
// GET /api/timeline
// Query Parameters:
// - page: number (default: 1)
// - limit: number (default: 20, max: 50)
// - includeOwn: boolean (default: true)
// Response:
{
  success: boolean;
  data: UnifiedPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata: {
    followingCount: number;
    lastUpdated: Date;
  };
}
```

#### 3.2.2 データ取得戦略
```javascript
// タイムライン取得ロジック
1. 現在のユーザーIDを取得
2. フォロー中のユーザーIDリストを取得
3. 自分のIDを含める（includeOwn=trueの場合）
4. 対象ユーザーの投稿を時系列で取得
5. ページネーション適用
6. 投稿者情報をpopulate
```

### 3.3 コンポーネント設計

#### 3.3.1 新規コンポーネント

**`/src/components/Timeline.tsx`**
- タイムライン表示のメインコンポーネント
- 無限スクロール実装
- リアルタイム更新対応

**`/src/components/TimelinePost.tsx`**
- タイムライン用の投稿カード
- いいね・コメント数表示
- フォロー状態表示

#### 3.3.2 ページ構成

**`/src/app/timeline/page.tsx`**
- タイムラインページ
- 認証必須
- レイアウトは既存のAppLayoutを使用

### 3.4 パフォーマンス最適化

#### 3.4.1 データベースインデックス
```javascript
// 必要なインデックス（既存）
PostSchema.index({ author: 1, createdAt: -1 });
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
FollowSchema.index({ follower: 1, createdAt: -1 });

// 追加推奨インデックス
PostSchema.index({ 
  author: 1, 
  status: 1, 
  createdAt: -1 
});
```

#### 3.4.2 キャッシュ戦略
- フォロー中リストを一時的にメモリキャッシュ（5分）
- React Queryでクライアントサイドキャッシュ
- stale-while-revalidate戦略

### 3.5 リアルタイム機能

#### Socket.ioイベント
```typescript
// 新規投稿通知
socket.on('timeline:new-post', (data: {
  post: UnifiedPost;
  authorId: string;
}) => {
  // フォロー中の人の投稿の場合、タイムラインに追加
});

// 投稿削除通知
socket.on('timeline:post-deleted', (data: {
  postId: string;
  authorId: string;
}) => {
  // タイムラインから削除
});
```

## 4. 実装計画

### Phase 1: バックエンド実装
1. Timeline APIエンドポイント作成
2. データ取得ロジック実装
3. パフォーマンステスト

### Phase 2: フロントエンド実装
1. Timelineコンポーネント作成
2. 無限スクロール実装
3. UIテスト

### Phase 3: リアルタイム機能
1. Socket.ioイベント実装
2. リアルタイム更新テスト

### Phase 4: 最適化
1. キャッシュ実装
2. パフォーマンス測定
3. 負荷テスト

## 5. テスト計画

### 5.1 単体テスト
- Timeline API
- データ取得ロジック
- コンポーネント

### 5.2 統合テスト
- 認証フロー
- フォロー機能との連携
- リアルタイム更新

### 5.3 E2Eテスト
- タイムライン表示
- 無限スクロール
- 投稿の追加・削除

## 6. セキュリティ考慮事項
- 認証必須（未認証ユーザーはアクセス不可）
- フォロー関係の検証
- レート制限適用
- CSRF保護

## 7. 移行計画
- 既存の掲示板機能は維持
- タイムラインは新規ページとして追加
- ヘッダーにナビゲーションリンク追加

## 8. 今後の拡張可能性
- いいね機能の実装
- コメント機能の実装
- リツイート（再投稿）機能
- ハッシュタグ機能
- メンション機能