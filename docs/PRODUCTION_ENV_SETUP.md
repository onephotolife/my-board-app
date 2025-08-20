# 本番環境変数設定ガイド

## 必須環境変数リスト

### 1. MongoDB Atlas接続
```bash
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/board-app-prod?retryWrites=true&w=majority&maxPoolSize=10
```

**設定手順:**
1. MongoDB Atlasダッシュボードにログイン
2. Database Access → Add New Database User
3. Network Access → Add IP Address (0.0.0.0/0 for Vercel)
4. Clusters → Connect → Connect your application
5. 接続文字列をコピーして、ユーザー名とパスワードを置換

### 2. NextAuth認証設定
```bash
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=[32文字以上のランダム文字列]
```

**シークレット生成方法:**
```bash
openssl rand -base64 32
```

### 3. メール送信設定（SendGrid推奨）
```bash
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=[SendGrid APIキー]
EMAIL_FROM=noreply@your-domain.com
```

### 4. セキュリティキー
```bash
CSRF_SECRET=[32文字のランダム文字列]
SESSION_SECRET=[32文字のランダム文字列]
ENCRYPTION_KEY=[32文字のランダム文字列]
```

### 5. レート制限設定
```bash
RATE_LIMIT_WINDOW_MS=900000      # 15分
RATE_LIMIT_MAX_REQUESTS=100      # 通常APIリクエスト
RATE_LIMIT_AUTH_MAX=5            # 認証試行回数
```

### 6. Sentry監視（推奨）
```bash
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
SENTRY_ORG=[your-org]
SENTRY_PROJECT=board-app
SENTRY_AUTH_TOKEN=[auth-token]
```

### 7. Google Analytics（オプション）
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Vercelでの環境変数設定手順

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard

2. **プロジェクト設定画面へ**
   - プロジェクト選択 → Settings → Environment Variables

3. **環境変数の追加**
   - Key: 環境変数名
   - Value: 環境変数値
   - Environment: Production を選択
   - "Add" をクリック

4. **機密情報の取り扱い**
   - Sensitive にチェックを入れる（パスワード、APIキーなど）
   - 値は暗号化されて保存される

## 環境変数の優先順位

1. `.env.production.local` (ローカルのみ、gitignore対象)
2. `.env.local` (ローカルのみ、gitignore対象)  
3. `.env.production` (本番環境用)
4. `.env` (全環境共通)

## セキュリティベストプラクティス

### してはいけないこと
- ❌ 環境変数値をコードにハードコーディング
- ❌ `.env.production.local` をGitにコミット
- ❌ 本番環境の認証情報をSlackやメールで共有
- ❌ デフォルトパスワードの使用

### すべきこと
- ✅ 強力なランダム文字列を使用
- ✅ 定期的なキーローテーション（3ヶ月ごと）
- ✅ 最小権限の原則に従う
- ✅ 環境変数はVercelのUIから設定
- ✅ バックアップとして1Passwordなどに保存

## トラブルシューティング

### 環境変数が反映されない場合
1. Vercelで再デプロイを実行
2. キャッシュをクリア
3. 環境変数名のタイポをチェック
4. Build & Development Settingsを確認

### MongoDB接続エラー
1. IPホワイトリストを確認（0.0.0.0/0）
2. ユーザー名とパスワードを再確認
3. クラスターのステータスを確認
4. 接続文字列のフォーマットを確認

### メール送信エラー
1. SendGrid APIキーの権限を確認
2. 送信元メールアドレスの検証
3. SPF/DKIM設定を確認
4. 送信制限を確認