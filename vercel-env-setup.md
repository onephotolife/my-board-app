# Vercel本番環境 環境変数設定ガイド

## 必須環境変数

Vercelダッシュボード → Settings → Environment Variables で以下を設定してください：

### 1. NextAuth関連
```
NEXTAUTH_URL = https://board.blankbrainai.com
NEXTAUTH_SECRET = rK8xV3mN9pL2qW7tY6uA4zS1dF5gH8jK0oI3eR7wQ9xC2vB6nM4
```

### 2. データベース（MongoDB Atlas）
```
MONGODB_URI = mongodb+srv://boarduser:thc1234567890THC@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority
```

### 3. メール送信設定（さくらインターネット）
```
EMAIL_ENABLED = true
EMAIL_SERVER_HOST = blankinai.sakura.ne.jp
EMAIL_SERVER_PORT = 587
EMAIL_SERVER_USER = noreply@blankinai.com
EMAIL_SERVER_PASSWORD = thc1234567890THC
SMTP_SECURE = false
EMAIL_FROM = Board App <noreply@blankinai.com>
EMAIL_REPLY_TO = support@blankinai.com
SEND_EMAILS = true
```

### 4. アプリ設定
```
NEXT_PUBLIC_APP_NAME = Board App
NEXT_PUBLIC_APP_URL = https://board.blankbrainai.com
SUPPORT_EMAIL = support@boardapp.com
```

### 5. セキュリティキー
```
JWT_SECRET = blankinai-jwt-secret-key-2024-production
ENCRYPTION_KEY = mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8gH9iJ0kL1
SESSION_SECRET = zY9xW8vU7tS6rQ5pO4nM3lK2jI1hG0fE9dC8bA7
CSRF_SECRET = aB3cD5eF7gH9iJ0kL2mN4oP6qR8sT1uV3wX5yZ7
```

## 設定手順

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables** へ移動
4. 各環境変数を追加（Production環境を選択）
5. **Save** をクリック
6. デプロイを再実行

## 重要な注意点

- **NEXTAUTH_URL** は必ずhttps://board.blankbrainai.com に設定
- **NEXT_PUBLIC_APP_URL** も同じURLに設定
- Gmailのアプリパスワードが正しいことを確認
- 環境変数追加後、必ず再デプロイが必要

## トラブルシューティング

### メールが送信されない場合
1. Gmailアカウントで「安全性の低いアプリのアクセス」が有効か確認
2. 2段階認証が有効な場合、アプリパスワードを使用
3. Vercelのログでエラーを確認

### 確認方法
```bash
# Vercelにログイン
vercel login

# 環境変数の確認
vercel env ls --prod

# ログの確認
vercel logs --prod
```