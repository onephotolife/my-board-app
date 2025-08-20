# Vercel管理画面 環境変数設定ガイド

## 🔗 設定URL
https://vercel.com/yoshitaka-yamagishis-projects/my-board-app/settings/environment-variables

## 📋 必須環境変数（コピー用）

以下の環境変数を **Production** 環境に設定してください。

### 1. MongoDB接続
```
Key: MONGODB_URI
Value: mongodb://localhost:27017/board-app
```
※ MongoDB Atlasを使用する場合は、Atlas接続文字列に置き換えてください

### 2. NextAuth認証
```
Key: NEXTAUTH_URL
Value: https://my-board-app.vercel.app
```

```
Key: NEXTAUTH_SECRET
Value: [以下のコマンドで生成した値を貼り付け]
```
生成コマンド: `openssl rand -base64 32`

### 3. メール送信（Resend使用時）
```
Key: RESEND_API_KEY
Value: re_[YOUR_API_KEY]
```

```
Key: EMAIL_FROM
Value: noreply@my-board-app.vercel.app
```

### 4. セキュリティキー
以下のコマンドで各キーを生成: `openssl rand -hex 16`

```
Key: CSRF_SECRET
Value: [生成した32文字の16進数]
```

```
Key: SESSION_SECRET
Value: [生成した32文字の16進数]
```

```
Key: ENCRYPTION_KEY
Value: [生成した32文字の16進数]
```

### 5. 機能フラグ
```
Key: ENABLE_REGISTRATION
Value: true
```

```
Key: ENABLE_EMAIL_VERIFICATION
Value: true
```

```
Key: ENABLE_PASSWORD_RESET
Value: true
```

### 6. 環境設定
```
Key: NODE_ENV
Value: production
```

```
Key: IS_PRODUCTION
Value: true
```

## 🔐 セキュリティキー生成コマンド

ターミナルで以下を実行して値を生成：

```bash
# NEXTAUTH_SECRET用（Base64）
openssl rand -base64 32

# その他のセキュリティキー用（16進数）
openssl rand -hex 16
```

## ⚙️ オプション環境変数

### Sentry（エラー監視）
```
Key: SENTRY_DSN
Value: https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
```

```
Key: NEXT_PUBLIC_SENTRY_DSN
Value: https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
```

### Google Analytics
```
Key: NEXT_PUBLIC_GA_MEASUREMENT_ID
Value: G-XXXXXXXXXX
```

## 📝 設定手順

1. **Vercel管理画面を開く**
   - https://vercel.com/yoshitaka-yamagishis-projects/my-board-app/settings/environment-variables

2. **環境変数を追加**
   - 「Add New」をクリック
   - Key と Value を入力
   - Environment: **Production** を選択（重要！）
   - 「Save」をクリック

3. **すべての必須変数を追加**
   - 上記の必須環境変数をすべて追加

4. **デプロイを実行**
   - Settings → Git → Deploy Hooks
   - または Deployments タブから「Redeploy」

## ⚠️ 注意事項

- 環境変数は **Production** に設定してください
- パスワードやAPIキーに特殊文字が含まれる場合、引用符で囲む必要はありません
- 変更後は再デプロイが必要です

## 🧪 テスト用の最小設定

開発/テスト環境で動作確認する場合の最小設定：

```
MONGODB_URI=mongodb://localhost:27017/board-app
NEXTAUTH_URL=https://my-board-app.vercel.app
NEXTAUTH_SECRET=test-secret-change-in-production-1234567890
RESEND_API_KEY=re_test_key
EMAIL_FROM=test@example.com
CSRF_SECRET=test123456789abcdef
SESSION_SECRET=test123456789abcdef
ENCRYPTION_KEY=test123456789abcdef
NODE_ENV=production
```

※ 本番環境では必ず強力なランダム値を使用してください