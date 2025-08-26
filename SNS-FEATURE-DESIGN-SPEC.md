# SNS機能設計書 v1.0

## 1. システム概要

### 1.1 目的
既存の会員制掲示板システムにSNS機能を追加し、ユーザー間の交流を促進する。

### 1.2 スコープ
- ✅ ユーザーフォロー/フォロワー機能
- ✅ パーソナライズドタイムライン
- ✅ いいね機能
- ✅ コメント機能
- ✅ リアルタイム通知システム

### 1.3 非機能要件
- **パフォーマンス**: タイムライン取得 < 500ms (P95)
- **スケーラビリティ**: 10万ユーザー、100万投稿対応
- **可用性**: 99.9% uptime
- **セキュリティ**: プライバシー設定、ブロック機能

## 2. データベース設計

### 2.1 コレクション構造

#### 2.1.1 Users Collection (拡張)
```javascript
{
  _id: ObjectId,
  // 既存フィールド
  name: String,
  email: String,
  password: String,
  
  // SNS機能追加フィールド
  profile: {
    bio: String,            // 自己紹介（最大200文字）
    avatar: String,         // アバターURL
    coverImage: String,     // カバー画像URL
    location: String,       // 場所
    website: String,        // ウェブサイト
    joinedAt: Date,        // 参加日
    isPrivate: Boolean,    // 非公開アカウント
    isVerified: Boolean    // 認証済みアカウント
  },
  
  stats: {
    postsCount: Number,     // 投稿数
    followersCount: Number, // フォロワー数
    followingCount: Number, // フォロー数
    likesCount: Number      // いいね総数
  },
  
  settings: {
    notifications: {
      email: Boolean,       // メール通知
      push: Boolean,        // プッシュ通知
      follows: Boolean,     // フォロー通知
      likes: Boolean,       // いいね通知
      comments: Boolean,    // コメント通知
      mentions: Boolean     // メンション通知
    },
    privacy: {
      showEmail: Boolean,
      showFollowers: Boolean,
      showFollowing: Boolean
    }
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.1.2 Follows Collection
```javascript
{
  _id: ObjectId,
  follower: {
    _id: ObjectId,          // フォローする人
    name: String,
    avatar: String
  },
  following: {
    _id: ObjectId,          // フォローされる人
    name: String,
    avatar: String
  },
  status: String,           // 'active', 'pending', 'blocked'
  createdAt: Date,
  
  // インデックス
  indexes: [
    { follower._id: 1, following._id: 1 }, // 複合ユニーク
    { follower._id: 1, createdAt: -1 },
    { following._id: 1, createdAt: -1 },
    { status: 1 }
  ]
}
```

#### 2.1.3 Posts Collection (拡張)
```javascript
{
  _id: ObjectId,
  // 既存フィールド
  title: String,
  content: String,
  author: ObjectId,
  authorInfo: Object,
  
  // SNS機能追加フィールド
  mentions: [String],       // @メンション
  hashtags: [String],       // #ハッシュタグ
  
  engagement: {
    likes: Number,          // いいね数
    comments: Number,       // コメント数
    shares: Number,         // シェア数
    views: Number          // 閲覧数
  },
  
  visibility: String,       // 'public', 'followers', 'private'
  isRepost: Boolean,        // リポストフラグ
  originalPost: ObjectId,   // オリジナル投稿ID
  
  media: [{
    type: String,          // 'image', 'video'
    url: String,
    thumbnail: String,
    alt: String
  }],
  
  createdAt: Date,
  updatedAt: Date,
  
  // インデックス
  indexes: [
    { author: 1, createdAt: -1 },
    { hashtags: 1 },
    { mentions: 1 },
    { visibility: 1, createdAt: -1 }
  ]
}
```

#### 2.1.4 Likes Collection
```javascript
{
  _id: ObjectId,
  user: {
    _id: ObjectId,
    name: String,
    avatar: String
  },
  targetType: String,       // 'post', 'comment'
  targetId: ObjectId,       // 対象のID
  createdAt: Date,
  
  // インデックス
  indexes: [
    { user._id: 1, targetId: 1 }, // 複合ユニーク
    { targetId: 1, createdAt: -1 },
    { user._id: 1, createdAt: -1 }
  ]
}
```

#### 2.1.5 Comments Collection
```javascript
{
  _id: ObjectId,
  postId: ObjectId,         // 投稿ID
  parentId: ObjectId,       // 親コメントID（返信の場合）
  
  author: {
    _id: ObjectId,
    name: String,
    avatar: String,
    isVerified: Boolean
  },
  
  content: String,          // コメント内容（最大500文字）
  mentions: [String],       // @メンション
  
  engagement: {
    likes: Number,          // いいね数
    replies: Number         // 返信数
  },
  
  status: String,           // 'active', 'deleted', 'hidden'
  editedAt: Date,          // 編集日時
  
  createdAt: Date,
  updatedAt: Date,
  
  // インデックス
  indexes: [
    { postId: 1, createdAt: -1 },
    { parentId: 1 },
    { author._id: 1 },
    { status: 1 }
  ]
}
```

#### 2.1.6 Notifications Collection
```javascript
{
  _id: ObjectId,
  recipient: ObjectId,      // 通知受信者
  
  type: String,            // 'follow', 'like', 'comment', 'mention', 'repost'
  
  actor: {
    _id: ObjectId,
    name: String,
    avatar: String
  },
  
  target: {
    type: String,          // 'post', 'comment', 'user'
    id: ObjectId,
    preview: String        // プレビューテキスト
  },
  
  message: String,         // 通知メッセージ
  
  isRead: Boolean,         // 既読フラグ
  readAt: Date,           // 既読日時
  
  createdAt: Date,
  expiresAt: Date,        // 有効期限（30日後）
  
  // インデックス
  indexes: [
    { recipient: 1, isRead: 1, createdAt: -1 },
    { recipient: 1, type: 1 },
    { expiresAt: 1 } // TTLインデックス
  ]
}
```

#### 2.1.7 Timeline Collection (キャッシュ)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // ユーザーID
  
  posts: [{
    postId: ObjectId,
    authorId: ObjectId,
    score: Number,         // 関連性スコア
    reason: String,        // 'following', 'popular', 'recommended'
    addedAt: Date
  }],
  
  cursor: String,          // ページネーション用カーソル
  
  generatedAt: Date,       // 生成日時
  expiresAt: Date,        // 有効期限（1時間）
  
  // インデックス
  indexes: [
    { userId: 1 },
    { expiresAt: 1 } // TTLインデックス
  ]
}
```

## 3. API設計

### 3.1 フォロー機能

#### POST /api/users/{userId}/follow
```typescript
// Request
{
  targetUserId: string
}

// Response (201)
{
  success: true,
  data: {
    followId: string,
    status: 'active' | 'pending',
    followedAt: string
  }
}
```

#### DELETE /api/users/{userId}/unfollow
```typescript
// Request
{
  targetUserId: string
}

// Response (200)
{
  success: true,
  message: 'Unfollowed successfully'
}
```

#### GET /api/users/{userId}/followers
```typescript
// Query params
{
  page?: number,
  limit?: number,
  search?: string
}

// Response (200)
{
  success: true,
  data: {
    followers: [{
      _id: string,
      name: string,
      avatar: string,
      bio: string,
      isFollowing: boolean,
      followedAt: string
    }],
    pagination: {
      total: number,
      page: number,
      totalPages: number
    }
  }
}
```

#### GET /api/users/{userId}/following
```typescript
// 同上のレスポンス構造
```

### 3.2 タイムライン

#### GET /api/timeline
```typescript
// Query params
{
  type?: 'home' | 'explore' | 'mentions',
  cursor?: string,
  limit?: number
}

// Response (200)
{
  success: true,
  data: {
    posts: [{
      _id: string,
      title: string,
      content: string,
      author: {
        _id: string,
        name: string,
        avatar: string,
        isVerified: boolean
      },
      engagement: {
        likes: number,
        comments: number,
        shares: number
      },
      isLiked: boolean,
      createdAt: string
    }],
    nextCursor: string,
    hasMore: boolean
  }
}
```

### 3.3 いいね機能

#### POST /api/posts/{postId}/like
```typescript
// Response (201)
{
  success: true,
  data: {
    likeId: string,
    likesCount: number
  }
}
```

#### DELETE /api/posts/{postId}/unlike
```typescript
// Response (200)
{
  success: true,
  data: {
    likesCount: number
  }
}
```

#### GET /api/posts/{postId}/likes
```typescript
// Query params
{
  page?: number,
  limit?: number
}

// Response (200)
{
  success: true,
  data: {
    users: [{
      _id: string,
      name: string,
      avatar: string,
      likedAt: string
    }],
    total: number
  }
}
```

### 3.4 コメント機能

#### POST /api/posts/{postId}/comments
```typescript
// Request
{
  content: string,
  parentId?: string,
  mentions?: string[]
}

// Response (201)
{
  success: true,
  data: {
    commentId: string,
    content: string,
    author: object,
    createdAt: string
  }
}
```

#### GET /api/posts/{postId}/comments
```typescript
// Query params
{
  sort?: 'newest' | 'oldest' | 'popular',
  page?: number,
  limit?: number
}

// Response (200)
{
  success: true,
  data: {
    comments: [{
      _id: string,
      content: string,
      author: object,
      engagement: object,
      replies: Comment[],
      createdAt: string
    }],
    pagination: object
  }
}
```

#### PUT /api/comments/{commentId}
```typescript
// Request
{
  content: string
}

// Response (200)
{
  success: true,
  data: Comment
}
```

#### DELETE /api/comments/{commentId}
```typescript
// Response (200)
{
  success: true,
  message: 'Comment deleted'
}
```

### 3.5 通知システム

#### GET /api/notifications
```typescript
// Query params
{
  type?: string,
  isRead?: boolean,
  page?: number,
  limit?: number
}

// Response (200)
{
  success: true,
  data: {
    notifications: [{
      _id: string,
      type: string,
      actor: object,
      target: object,
      message: string,
      isRead: boolean,
      createdAt: string
    }],
    unreadCount: number,
    pagination: object
  }
}
```

#### PUT /api/notifications/read
```typescript
// Request
{
  notificationIds?: string[], // 空の場合は全て既読
}

// Response (200)
{
  success: true,
  data: {
    updatedCount: number,
    unreadCount: number
  }
}
```

#### DELETE /api/notifications/{notificationId}
```typescript
// Response (200)
{
  success: true
}
```

### 3.6 WebSocket イベント

```typescript
// Socket.io Events
interface SocketEvents {
  // Client → Server
  'subscribe:timeline': { userId: string }
  'subscribe:notifications': { userId: string }
  
  // Server → Client
  'timeline:new-post': { post: Post }
  'notification:new': { notification: Notification }
  'notification:update-count': { unreadCount: number }
  'post:engagement-update': { 
    postId: string, 
    engagement: Engagement 
  }
}
```

## 4. システムアーキテクチャ

### 4.1 レイヤー構成

```
┌─────────────────────────────────────────┐
│          クライアント (Next.js)          │
│  ┌──────────────────────────────────┐  │
│  │     UI Components (MUI)          │  │
│  ├──────────────────────────────────┤  │
│  │     State Management (Zustand)   │  │
│  ├──────────────────────────────────┤  │
│  │     API Client / Socket.io       │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          APIレイヤー (Next.js)           │
│  ┌──────────────────────────────────┐  │
│  │     Route Handlers               │  │
│  ├──────────────────────────────────┤  │
│  │     Middleware (Auth/Rate Limit) │  │
│  ├──────────────────────────────────┤  │
│  │     Business Logic               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         データレイヤー                    │
│  ┌──────────────────────────────────┐  │
│  │     MongoDB (Primary)            │  │
│  ├──────────────────────────────────┤  │
│  │     Redis (Cache/Session)        │  │
│  ├──────────────────────────────────┤  │
│  │     S3 (Media Storage)           │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 4.2 キャッシュ戦略

#### レイヤー別キャッシュ
1. **ブラウザキャッシュ**: 静的アセット（1年）
2. **CDNキャッシュ**: 画像/動画（30日）
3. **Redisキャッシュ**: 
   - セッション（24時間）
   - タイムライン（1時間）
   - ユーザープロファイル（10分）
4. **MongoDBキャッシュ**: インデックス最適化

#### キャッシュ無効化
- フォロー/アンフォロー時：タイムラインキャッシュクリア
- 投稿作成/削除時：関連タイムラインを更新
- プロファイル更新時：ユーザーキャッシュクリア

### 4.3 スケーリング設計

#### 水平スケーリング
```yaml
# データベース
- MongoDB: レプリカセット（Primary + 2 Secondary）
- Redis: Master-Slave構成
- アプリケーション: Auto Scaling (2-10インスタンス)

# 負荷分散
- ロードバランサー: AWS ALB
- WebSocket: Sticky Session
```

#### パフォーマンス最適化
1. **データベース最適化**
   - 適切なインデックス設計
   - 集約パイプラインの最適化
   - Sharding準備（userId hash）

2. **API最適化**
   - GraphQL/DataLoader検討
   - バッチ処理
   - 非同期処理（Queue）

3. **フロントエンド最適化**
   - 仮想スクロール
   - 画像遅延読み込み
   - Optimistic Updates

## 5. セキュリティ設計

### 5.1 認証・認可
```typescript
// JWTペイロード拡張
{
  userId: string,
  email: string,
  roles: string[],
  permissions: {
    canPost: boolean,
    canComment: boolean,
    canFollow: boolean
  },
  exp: number
}
```

### 5.2 プライバシー制御
- プライベートアカウント設定
- ブロック機能
- ミュート機能
- 投稿の公開範囲設定

### 5.3 レート制限
```typescript
const rateLimits = {
  follow: '100/hour',
  unfollow: '100/hour',
  post: '30/hour',
  comment: '60/hour',
  like: '300/hour',
  notification: '1000/hour'
}
```

### 5.4 入力検証
```typescript
// Zodスキーマ例
const commentSchema = z.object({
  content: z.string()
    .min(1, 'コメントを入力してください')
    .max(500, 'コメントは500文字以内'),
  mentions: z.array(z.string()).max(10).optional()
});
```

## 6. 実装優先順位

### Phase 1（MVP - 2週間）
1. ✅ フォロー/フォロワー基本機能
2. ✅ シンプルなタイムライン
3. ✅ いいね機能
4. ✅ 基本的な通知

### Phase 2（拡張 - 2週間）
1. ⬜ コメント機能
2. ⬜ リアルタイム通知
3. ⬜ プロファイルページ
4. ⬜ 検索機能

### Phase 3（最適化 - 1週間）
1. ⬜ パフォーマンス最適化
2. ⬜ プライバシー設定
3. ⬜ レコメンデーション
4. ⬜ アナリティクス

## 7. テスト戦略

### 7.1 単体テスト
- Models: 100%カバレッジ
- API Handlers: 90%カバレッジ
- Utilities: 100%カバレッジ

### 7.2 統合テスト
```typescript
// Playwright E2Eテストシナリオ
- ユーザーフォローフロー
- タイムライン表示
- いいね/アンいいね
- コメント投稿/削除
- 通知受信/既読
```

### 7.3 負荷テスト
```yaml
# K6シナリオ
- 同時接続: 1000ユーザー
- タイムライン取得: 100req/s
- いいね操作: 500req/s
- 通知配信: 1000req/s
```

## 8. 監視・運用

### 8.1 メトリクス
- **ビジネスメトリクス**
  - DAU/MAU
  - エンゲージメント率
  - フォロー/フォロワー比率

- **技術メトリクス**
  - API応答時間
  - エラー率
  - DB接続数
  - キャッシュヒット率

### 8.2 アラート設定
```yaml
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 1%"
    severity: "critical"
  
  - name: "Slow API Response"
    condition: "p95_latency > 1000ms"
    severity: "warning"
  
  - name: "DB Connection Pool Exhausted"
    condition: "available_connections < 10"
    severity: "critical"
```

## 9. 移行計画

### 9.1 データ移行
1. 既存Usersコレクションの拡張
2. 既存Postsコレクションの拡張
3. インデックスの追加
4. 初期データのシード

### 9.2 段階的ロールアウト
```typescript
// Feature Flags
{
  'sns.follow': { enabled: true, percentage: 10 },
  'sns.timeline': { enabled: false },
  'sns.comments': { enabled: false },
  'sns.notifications': { enabled: false }
}
```

## 10. リスク評価

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| スケーラビリティ問題 | 高 | 中 | 早期の負荷テスト、段階的リリース |
| プライバシー侵害 | 高 | 低 | 厳格な権限管理、監査ログ |
| スパム/abuse | 中 | 高 | レート制限、コンテンツフィルター |
| データ整合性 | 高 | 低 | トランザクション、定期的な整合性チェック |

---

**作成日**: 2025-08-25  
**バージョン**: 1.0  
**ステータス**: 設計完了 - 実装待ち  
**作成者**: チーフシステムアーキテクト

## 承認履歴

| 日付 | 承認者 | 役割 | コメント |
|------|--------|------|----------|
| 2025-08-25 | - | ARCH | 初版作成 |
| - | - | EM | 承認待ち |
| - | - | SEC | セキュリティレビュー待ち |
| - | - | DB | DBスキーマレビュー待ち |