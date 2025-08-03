# API仕様書

## 1. API概要

### 1.1 基本情報
- **ベースURL**: `http://localhost:3000/api` (開発環境)
- **通信プロトコル**: HTTP/HTTPS
- **データ形式**: JSON
- **文字コード**: UTF-8
- **認証**: なし（オープンアクセス）

### 1.2 共通レスポンス形式

#### 成功時
```json
{
  "success": true,
  "data": {対象データ}
}
```

#### エラー時
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### 1.3 HTTPステータスコード

| コード | 説明 | 使用場面 |
|--------|------|---------|
| 200 | OK | 取得成功 |
| 201 | Created | 作成成功 |
| 400 | Bad Request | バリデーションエラー |
| 404 | Not Found | リソースが存在しない |
| 500 | Internal Server Error | サーバーエラー |

## 2. エンドポイント仕様

### 2.1 投稿一覧取得

#### GET /api/posts

投稿一覧を取得します。

**リクエスト**
```http
GET /api/posts HTTP/1.1
Host: localhost:3000
```

**レスポンス例（200 OK）**
```json
{
  "success": true,
  "data": [
    {
      "_id": "688f68713378f797910f6a9f",
      "title": "特殊文字のテスト！？",
      "content": "「こんにちは」と言いました！",
      "author": "佐藤@テスター",
      "createdAt": "2025-08-03T13:47:29.628Z",
      "updatedAt": "2025-08-03T13:47:29.628Z",
      "__v": 0
    },
    {
      "_id": "688f68633378f797910f6a9c",
      "title": "今日の日記",
      "content": "今日は素晴らしい一日でした。",
      "author": "田中花子",
      "createdAt": "2025-08-03T13:47:15.132Z",
      "updatedAt": "2025-08-03T13:47:15.132Z",
      "__v": 0
    }
  ]
}
```

**エラーレスポンス例（500）**
```json
{
  "success": false,
  "error": "Failed to fetch posts"
}
```

### 2.2 投稿作成

#### POST /api/posts

新規投稿を作成します。

**リクエスト**
```http
POST /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "title": "投稿タイトル",
  "content": "投稿内容",
  "author": "投稿者名"
}
```

**リクエストボディ**

| フィールド | 型 | 必須 | 最大文字数 | 説明 |
|------------|-----|------|------------|------|
| title | string | ○ | 100 | 投稿タイトル |
| content | string | ○ | 200 | 投稿内容 |
| author | string | ○ | 50 | 投稿者名 |

**レスポンス例（201 Created）**
```json
{
  "success": true,
  "data": {
    "title": "投稿タイトル",
    "content": "投稿内容",
    "author": "投稿者名",
    "_id": "688f684e3378f797910f6a9a",
    "createdAt": "2025-08-03T13:46:54.226Z",
    "updatedAt": "2025-08-03T13:46:54.226Z",
    "__v": 0
  }
}
```

**バリデーションエラー例（400）**
```json
{
  "success": false,
  "error": "タイトルは必須です, 投稿内容は必須です"
}
```

```json
{
  "success": false,
  "error": "投稿は200文字以内にしてください"
}
```

### 2.3 投稿取得

#### GET /api/posts/[id]

指定されたIDの投稿を取得します。

**リクエスト**
```http
GET /api/posts/688f684e3378f797910f6a9a HTTP/1.1
Host: localhost:3000
```

**パスパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| id | string | ○ | 投稿ID（MongoDB ObjectID） |

**レスポンス例（200 OK）**
```json
{
  "success": true,
  "data": {
    "_id": "688f684e3378f797910f6a9a",
    "title": "短い投稿",
    "content": "こんにちは！",
    "author": "山田太郎",
    "createdAt": "2025-08-03T13:46:54.226Z",
    "updatedAt": "2025-08-03T13:46:54.226Z",
    "__v": 0
  }
}
```

**エラーレスポンス例（404）**
```json
{
  "success": false,
  "error": "Post not found"
}
```

### 2.4 投稿更新

#### PUT /api/posts/[id]

指定されたIDの投稿を更新します。

**リクエスト**
```http
PUT /api/posts/688f684e3378f797910f6a9a HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "content": "更新された投稿内容"
}
```

**パスパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| id | string | ○ | 投稿ID（MongoDB ObjectID） |

**リクエストボディ**

| フィールド | 型 | 必須 | 最大文字数 | 説明 |
|------------|-----|------|------------|------|
| content | string | ○ | 200 | 更新する投稿内容 |

**レスポンス例（200 OK）**
```json
{
  "success": true,
  "data": {
    "_id": "688f684e3378f797910f6a9a",
    "title": "短い投稿",
    "content": "更新された投稿内容",
    "author": "山田太郎",
    "createdAt": "2025-08-03T13:46:54.226Z",
    "updatedAt": "2025-08-03T14:00:00.000Z",
    "__v": 0
  }
}
```

**エラーレスポンス例（404）**
```json
{
  "success": false,
  "error": "Post not found"
}
```

**バリデーションエラー例（400）**
```json
{
  "success": false,
  "error": "投稿は200文字以内にしてください"
}
```

### 2.5 投稿削除

#### DELETE /api/posts/[id]

指定されたIDの投稿を削除します。

**リクエスト**
```http
DELETE /api/posts/688f684e3378f797910f6a9a HTTP/1.1
Host: localhost:3000
```

**パスパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| id | string | ○ | 投稿ID（MongoDB ObjectID） |

**レスポンス例（200 OK）**
```json
{
  "success": true,
  "data": {}
}
```

**エラーレスポンス例（404）**
```json
{
  "success": false,
  "error": "Post not found"
}
```

## 3. エラーハンドリング

### 3.1 バリデーションエラー

Mongooseのバリデーションエラーは、各フィールドのエラーメッセージを結合して返します。

```javascript
// 処理例
if (error.name === 'ValidationError') {
  const messages = Object.values(error.errors).map(err => err.message);
  return { success: false, error: messages.join(', ') };
}
```

### 3.2 データベース接続エラー

MongoDB接続エラーは500エラーとして処理されます。

### 3.3 不正なObjectID

不正な形式のIDが指定された場合、404エラーとして処理されます。

## 4. 制限事項

### 4.1 リクエスト制限
- ボディサイズ制限: 4MB（Next.js標準）
- 同時接続数: 制限なし（MongoDB Atlas依存）

### 4.2 レスポンス制限
- 一覧取得の最大件数: 制限なし（将来的にページネーション実装予定）

## 5. 注意事項

### 5.1 文字エンコーディング
- 日本語、絵文字、特殊文字をサポート
- UTF-8でエンコード

### 5.2 改行文字
- 投稿内容の改行は`\n`で保存
- 表示時は`white-space: pre-wrap`で改行を保持

### 5.3 CORS設定
- 開発環境: 制限なし
- 本番環境: 必要に応じて設定

## 6. 実装ファイル

| ファイルパス | 説明 |
|-------------|------|
| `/src/app/api/posts/route.ts` | 一覧取得・作成 |
| `/src/app/api/posts/[id]/route.ts` | 個別取得・更新・削除 |
| `/src/lib/mongodb.ts` | MongoDB接続管理 |
| `/src/models/Post.ts` | Postモデル定義 |