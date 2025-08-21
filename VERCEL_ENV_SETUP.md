# Vercel環境変数設定ガイド

## 緊急対応: 403エラー解決のための必須設定

### 1. Vercelダッシュボードでの設定手順

1. https://vercel.com/dashboard にアクセス
2. プロジェクト `my-board-app` を選択
3. **Settings** → **Environment Variables** をクリック

### 2. 必須環境変数の設定

以下の環境変数を **Production** 環境に追加してください：

```
Key: AUTH_SECRET
Value: 0HqsvDMb7fN8qiIrHFAtl1oIUTq8QWF3KAvVSsaRBZs=
Environment: Production
```

```
Key: AUTH_TRUST_HOST
Value: true
Environment: Production
```

### 3. 既存環境変数の確認

以下が既に設定されていることを確認：

- `MONGODB_URI` (MongoDB Atlas接続URI)
- `EMAIL_SERVER_HOST` (さくらインターネットSMTP)
- `EMAIL_SERVER_USER`
- `EMAIL_SERVER_PASSWORD`

### 4. 設定後の確認

1. 設定完了後、Vercelが自動的に再デプロイします
2. 以下のURLで診断情報を確認：
   - https://board.blankbrainai.com/api/debug/env
   - https://board.blankbrainai.com/api/debug/mongodb

### 5. 403エラーテスト

設定完了後、以下をテスト：
- https://board.blankbrainai.com/posts/new で新規投稿
- ログイン機能
- CRUD操作全般

---

**注意**: この設定により403 Forbiddenエラーが解決され、正常なCRUD操作が可能になります。