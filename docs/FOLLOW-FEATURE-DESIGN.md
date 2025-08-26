# フォロー機能データベース設計書

## 概要
このドキュメントは、会員制掲示板アプリケーションのフォロー機能におけるデータベース設計を記述します。

## 設計方針

### アーキテクチャ選定
**ハイブリッドアプローチ**を採用：
- **Userモデル**: カウンターフィールドをキャッシュ（高速アクセス）
- **Followモデル**: 関係性の詳細を管理（スケーラビリティ）

### 選定理由
1. **パフォーマンス**: カウンターキャッシュにより、頻繁なCOUNTクエリを回避
2. **スケーラビリティ**: 別コレクション管理で、ユーザー数増加に対応
3. **一貫性**: トランザクション不要な設計で、MongoDBの特性を活用
4. **柔軟性**: 将来的な機能拡張（ブロック、ミュート等）が容易

## データモデル

### 1. Followコレクション

```typescript
{
  _id: ObjectId,
  follower: ObjectId,     // フォローする人（User._id）
  following: ObjectId,    // フォローされる人（User._id）
  isReciprocal: boolean,  // 相互フォロー状態
  createdAt: Date,        // フォロー日時
  updatedAt: Date         // 更新日時
}
```

### 2. User拡張フィールド

```typescript
{
  // 既存フィールド...
  
  // フォロー関連フィールド
  followingCount: number,     // フォロー中の数
  followersCount: number,     // フォロワー数
  mutualFollowsCount: number, // 相互フォロー数
  isPrivate: boolean,         // プライベートアカウント設定
}
```

## インデックス戦略

### Followコレクションのインデックス

| インデックス | フィールド | タイプ | 用途 |
|------------|-----------|--------|------|
| follower_following_unique | {follower: 1, following: 1} | 複合ユニーク | 重複フォロー防止 |
| follower_1 | {follower: 1} | 単一 | フォロー中リスト取得 |
| following_1 | {following: 1} | 単一 | フォロワーリスト取得 |
| isReciprocal_1 | {isReciprocal: 1} | 単一 | 相互フォロー抽出 |
| following_follower_1 | {following: 1, follower: 1} | 複合 | 相互フォローチェック |
| follower_createdAt | {follower: 1, createdAt: -1} | 複合 | タイムライン用 |
| following_createdAt | {following: 1, createdAt: -1} | 複合 | フォロワー新着順 |

## API エンドポイント

### 基本操作

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/users/{userId}/follow | フォロー状態確認 |
| POST | /api/users/{userId}/follow | フォロー |
| DELETE | /api/users/{userId}/follow | アンフォロー |

### リスト取得

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | /api/users/{userId}/followers | フォロワー一覧 |
| GET | /api/users/{userId}/following | フォロー中一覧 |

### クエリパラメータ

- `page`: ページ番号（デフォルト: 1）
- `limit`: 取得件数（デフォルト: 20、最大: 100）
- `includeReciprocal`: 相互フォローを含む（デフォルト: true）

## 実装された機能

### 1. 重複フォロー防止
- 複合ユニークインデックスによりデータベースレベルで保証
- アプリケーションレベルでも事前チェック実施

### 2. 相互フォロー判定
- `isReciprocal`フラグで高速判定
- フォロー/アンフォロー時に自動更新

### 3. カウンターキャッシュ
- `followingCount`, `followersCount`, `mutualFollowsCount`を自動更新
- `updateFollowCounts()`メソッドで再計算可能

### 4. プライバシー制御
- `isPrivate`フラグでプライベートアカウント設定
- フォロワー/フォロー中リストのアクセス制御

## パフォーマンス最適化

### 1. クエリ最適化
```javascript
// 効率的なフォロワー取得
await Follow.find({ following: userId })
  .populate('follower', 'name avatar')  // 必要なフィールドのみ
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();  // プレーンオブジェクトで返す
```

### 2. N+1問題の回避
- `populate()`で関連データを一括取得
- 必要最小限のフィールドのみselect

### 3. キャッシュ戦略
- カウンターはUserドキュメントにキャッシュ
- 頻繁に参照されるデータは事前計算

## マイグレーション

### 実行方法
```bash
# インデックス作成とデータマイグレーション
npm run migrate:follows

# または直接実行
npx ts-node src/lib/db/migrations/add-follow-indexes.ts
```

### マイグレーション内容
1. Followコレクションのインデックス作成
2. 既存Userドキュメントへのフィールド追加
3. カウンターの初期化

## セキュリティ考慮事項

### 1. 認証・認可
- すべてのフォロー操作に認証を要求
- プライベートアカウントへのアクセス制御

### 2. レート制限（推奨）
```javascript
// 環境変数で設定
RATE_LIMIT_FOLLOW=100  // 1時間あたりのフォロー上限
```

### 3. バリデーション
- 自分自身のフォロー防止
- 存在しないユーザーへの操作防止

## 今後の拡張可能性

### Phase 1（実装済み）
- [x] フォロー/アンフォロー
- [x] フォロワー/フォロー中リスト
- [x] 相互フォロー判定
- [x] カウンターキャッシュ

### Phase 2（計画中）
- [ ] フォローリクエスト（承認制）
- [ ] ブロック機能
- [ ] ミュート機能
- [ ] フォロー通知

### Phase 3（将来）
- [ ] フォロー推薦
- [ ] フォローグループ
- [ ] フォロー分析

## トラブルシューティング

### カウンター不整合
```javascript
// カウンター再計算
const user = await User.findById(userId);
await user.updateFollowCounts();
```

### インデックス再構築
```bash
# MongoDBシェルで実行
db.follows.reIndex()
```

### パフォーマンス分析
```javascript
// クエリ実行計画の確認
db.follows.find({ follower: ObjectId("...") }).explain("executionStats")
```

## 監視項目

### メトリクス
- フォロー/アンフォローのレイテンシー
- カウンター更新の遅延
- インデックスヒット率

### アラート閾値
- API応答時間 > 500ms
- カウンター不整合 > 10件
- インデックススキャン > 1000ドキュメント

## 参考資料

- [MongoDB Schema Design Best Practices](https://www.mongodb.com/blog/post/6-rules-of-thumb-for-mongodb-schema-design)
- [Social Network Data Modeling](https://docs.mongodb.com/manual/tutorial/model-referenced-one-to-many-relationships-between-documents/)
- [Mongoose Population](https://mongoosejs.com/docs/populate.html)