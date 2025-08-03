# データベース仕様書

## 1. データベース概要

### 1.1 基本情報
- **データベース種類**: MongoDB (NoSQL)
- **バージョン**: MongoDB Atlas (7.0以上)
- **接続方式**: MongoDB+SRV
- **ORM/ODM**: Mongoose 8.9.3
- **データベース名**: `board-app`

### 1.2 接続設定

#### 開発環境（ローカル）
```
mongodb://localhost:27017/board-app
```

#### 本番環境（MongoDB Atlas）
```
mongodb+srv://boarduser:****@cluster0.ej6jq5c.mongodb.net/board-app?retryWrites=true&w=majority
```

### 1.3 環境変数
```env
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]
```

## 2. コレクション仕様

### 2.1 posts コレクション

投稿データを管理するコレクション。

#### スキーマ定義

```javascript
{
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 200
  },
  author: {
    type: String,
    required: true,
    maxlength: 50
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

#### フィールド仕様

| フィールド名 | 型 | 必須 | デフォルト値 | 制約 | 説明 |
|-------------|-----|------|-------------|------|------|
| _id | ObjectId | ○ | 自動生成 | - | ドキュメントID |
| title | String | ○ | - | 最大100文字 | 投稿タイトル |
| content | String | ○ | - | 最大200文字 | 投稿内容 |
| author | String | ○ | - | 最大50文字 | 投稿者名 |
| createdAt | Date | ○ | 現在時刻 | - | 作成日時 |
| updatedAt | Date | ○ | 現在時刻 | - | 更新日時 |
| __v | Number | ○ | 0 | - | バージョン管理用 |

#### インデックス

| インデックス名 | フィールド | 種類 | 用途 |
|---------------|-----------|------|------|
| _id_ | _id | Primary | 主キー |
| createdAt_-1 | createdAt | Single（降順） | 新着順ソート用（推奨） |

※現在はデフォルトの_idインデックスのみ。パフォーマンス改善時に追加予定。

#### サンプルドキュメント

```json
{
  "_id": "688f68713378f797910f6a9f",
  "title": "特殊文字のテスト！？",
  "content": "「こんにちは」と言いました！\nそれは本当ですか？\n『はい、本当です』と答えました。",
  "author": "佐藤@テスター",
  "createdAt": "2025-08-03T13:47:29.628Z",
  "updatedAt": "2025-08-03T13:47:29.628Z",
  "__v": 0
}
```

## 3. バリデーション仕様

### 3.1 Mongooseバリデーション

#### title フィールド
- **必須チェック**: 「タイトルは必須です」
- **最大文字数**: 100文字「タイトルは100文字以内にしてください」

#### content フィールド
- **必須チェック**: 「投稿内容は必須です」
- **最大文字数**: 200文字「投稿は200文字以内にしてください」

#### author フィールド
- **必須チェック**: 「投稿者名は必須です」
- **最大文字数**: 50文字「投稿者名は50文字以内にしてください」

### 3.2 文字数カウント
- 日本語、英数字、絵文字、特殊文字すべて1文字としてカウント
- 改行文字（\n）も1文字としてカウント

## 4. トランザクション

### 4.1 現在の実装
- トランザクション未使用（単一ドキュメント操作のみ）

### 4.2 将来の拡張
- 複数コレクション操作時にトランザクション実装予定

## 5. バックアップとリカバリ

### 5.1 MongoDB Atlas自動バックアップ
- **バックアップ頻度**: 毎日（Atlas標準機能）
- **保持期間**: 7日間（無料プラン）
- **ポイントインタイムリカバリ**: 利用不可（無料プラン）

### 5.2 手動バックアップ
```bash
# エクスポート
mongodump --uri="mongodb+srv://..." --out=./backup

# インポート
mongorestore --uri="mongodb+srv://..." ./backup
```

## 6. パフォーマンス考慮事項

### 6.1 現在の課題
- 全件取得のため、投稿数増加時にパフォーマンス低下の可能性
- インデックス未設定のため、ソート処理が遅い可能性

### 6.2 改善案
- ページネーション実装（limit/skip）
- createdAtフィールドにインデックス追加
- キャッシュ層の導入（Redis等）

## 7. セキュリティ

### 7.1 接続セキュリティ
- TLS/SSL暗号化接続（MongoDB Atlas）
- 接続文字列の環境変数管理
- IPホワイトリスト設定（Atlas管理画面）

### 7.2 データセキュリティ
- NoSQLインジェクション対策（Mongoose使用）
- 入力値のサニタイゼーション（React自動エスケープ）

## 8. 監視とログ

### 8.1 MongoDB Atlas監視
- **メトリクス**: CPU、メモリ、ディスク使用率
- **アラート**: 閾値超過時にメール通知
- **ログ**: クエリログ、エラーログ

### 8.2 アプリケーションログ
```javascript
// 接続成功
console.log('MongoDB connected successfully');

// エラーログ
console.error('MongoDB connection error:', error);
```

## 9. マイグレーション

### 9.1 スキーマ変更手順
1. 新フィールドは`required: false`で追加
2. データ移行スクリプト実行
3. 必要に応じて`required: true`に変更

### 9.2 バージョン管理
- Mongooseの`__v`フィールドで管理
- スキーマバージョンは別途管理推奨

## 10. 制限事項

### 10.1 MongoDB Atlas無料プラン制限
- **ストレージ**: 512MB
- **接続数**: 500接続まで
- **クラスター**: M0（共有）
- **バックアップ**: 基本バックアップのみ

### 10.2 データサイズ制限
- **単一ドキュメント**: 16MB（MongoDB標準）
- **コレクションサイズ**: 512MB（Atlas無料プラン）

## 11. 実装ファイル

| ファイルパス | 説明 |
|-------------|------|
| `/src/lib/mongodb.ts` | MongoDB接続管理 |
| `/src/models/Post.ts` | Postモデル定義 |
| `/.env.local` | 環境変数（接続文字列） |

## 12. 将来の拡張予定

### 12.1 新規コレクション候補
- `users`: ユーザー管理
- `comments`: コメント機能
- `categories`: カテゴリー分類
- `likes`: いいね機能

### 12.2 スキーマ拡張候補
- `tags`: タグ付け機能
- `images`: 画像URL保存
- `status`: 公開/非公開ステータス
- `editHistory`: 編集履歴