# 本番環境セットアップガイド
## 14人天才会議 - 天才12

---

## 📋 前提条件

- Node.js 18.x以上
- MongoDB Atlas アカウント
- Vercel/Netlify/AWS等のホスティングサービス

---

## 🚀 デプロイ手順

### 1. MongoDB Atlas設定（必須）

#### 1.1 クラスター作成
```bash
# MongoDB Atlasダッシュボード
1. https://cloud.mongodb.com にログイン
2. "Build a Cluster" → M0 Free Tier選択
3. Region: 最寄りのリージョン選択
4. Cluster Name: production-cluster
```

#### 1.2 データベースユーザー作成
```bash
Username: boardapp-prod
Password: [強力なパスワード生成]
Role: readWriteAnyDatabase
```

#### 1.3 ネットワークアクセス設定
```bash
# 本番環境のIPアドレスのみ許可
- Vercelの場合: 0.0.0.0/0 (制限不可)
- AWSの場合: Elastic IPを追加
- 自社サーバー: 固定IPを追加
```

#### 1.4 接続文字列取得
```
mongodb+srv://boardapp-prod:<password>@production-cluster.xxxxx.mongodb.net/boardDB?retryWrites=true&w=majority
```

---

### 2. 環境変数設定

#### 2.1 必須環境変数

```env
# MongoDB (本番用)
MONGODB_URI_PRODUCTION=mongodb+srv://boardapp-prod:StrongPass2024@production-cluster.abcde.mongodb.net/boardDB?retryWrites=true&w=majority
MONGODB_ENV=production

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=[32文字以上のランダム文字列]

# Email設定
EMAIL_ENABLED=true
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=[Gmailアプリパスワード]
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM="Board App <noreply@your-domain.com>"

# アプリ設定
NEXT_PUBLIC_APP_NAME=Board App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

#### 2.2 シークレット生成

```bash
# NEXTAUTH_SECRET生成
openssl rand -base64 32

# JWT_SECRET生成（必要な場合）
openssl rand -hex 32
```

---

### 3. Vercelデプロイ

#### 3.1 プロジェクト設定
```bash
# Vercel CLIインストール
npm i -g vercel

# プロジェクト初期化
vercel

# 環境変数設定
vercel env add MONGODB_URI_PRODUCTION
vercel env add NEXTAUTH_SECRET
# ... 他の環境変数も同様に追加
```

#### 3.2 デプロイコマンド
```bash
# 本番デプロイ
vercel --prod

# プレビューデプロイ
vercel
```

#### 3.3 Vercelダッシュボード設定
1. Settings → Environment Variables
2. すべての環境変数を追加
3. Production/Preview/Development別に設定

---

### 4. データ移行

#### 4.1 ローカルからAtlasへ
```bash
# データエクスポート
mongodump --uri="mongodb://localhost:27017/boardDB" --out=./backup

# データインポート
mongorestore --uri="mongodb+srv://boardapp-prod:password@production-cluster.xxxxx.mongodb.net/boardDB" ./backup/boardDB
```

#### 4.2 移行スクリプト使用
```bash
# 自動移行
MONGODB_ENV=production node scripts/migrate-to-atlas.js
```

---

### 5. セキュリティ設定

#### 5.1 MongoDB Atlas
- ✅ IP許可リストを最小限に
- ✅ ユーザー権限を最小限に
- ✅ 監査ログを有効化
- ✅ 暗号化を有効化（デフォルト）

#### 5.2 アプリケーション
- ✅ HTTPS強制
- ✅ CSRFトークン使用
- ✅ レート制限実装
- ✅ 環境変数の暗号化

#### 5.3 推奨セキュリティヘッダー
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}
```

---

### 6. モニタリング設定

#### 6.1 MongoDB Atlas監視
```bash
# アラート設定
1. Alerts → Add Alert
2. 条件設定:
   - Connection数 > 80
   - Disk使用率 > 75%
   - Operation数 > 1000/分
3. 通知先: Email/Slack/Webhook
```

#### 6.2 アプリケーション監視
```bash
# Vercel Analytics（自動）
# またはカスタム監視
- Sentry (エラー監視)
- LogRocket (セッション記録)
- DataDog (APM)
```

---

### 7. バックアップ設定

#### 7.1 MongoDB Atlas自動バックアップ
```bash
# M10以上のクラスターで利用可能
1. Backup → Enable Backup
2. スケジュール: 毎日
3. 保持期間: 7日間
```

#### 7.2 手動バックアップ
```bash
# cronジョブ設定
0 2 * * * mongodump --uri=$MONGODB_URI_PRODUCTION --out=/backup/$(date +\%Y\%m\%d)
```

---

### 8. パフォーマンス最適化

#### 8.1 MongoDB設定
```javascript
// 接続プール最適化
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 5000,
}
```

#### 8.2 インデックス最適化
```javascript
// 必須インデックス
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ emailVerificationToken: 1 })
db.users.createIndex({ resetPasswordToken: 1 })
db.posts.createIndex({ createdAt: -1 })
```

#### 8.3 Next.js最適化
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
  poweredByHeader: false,
}
```

---

## ✅ デプロイチェックリスト

### 事前準備
- [ ] MongoDB Atlasクラスター作成
- [ ] 本番用ユーザー作成
- [ ] Network Access設定
- [ ] 接続文字列確認

### 環境変数
- [ ] MONGODB_URI_PRODUCTION設定
- [ ] MONGODB_ENV=production設定
- [ ] NEXTAUTH_SECRET生成・設定
- [ ] NEXTAUTH_URL設定
- [ ] Email設定確認

### セキュリティ
- [ ] HTTPS有効化
- [ ] セキュリティヘッダー設定
- [ ] レート制限実装
- [ ] CSP設定

### デプロイ
- [ ] ビルドテスト実行
- [ ] 環境変数設定確認
- [ ] デプロイ実行
- [ ] 動作確認

### デプロイ後
- [ ] 監視設定
- [ ] アラート設定
- [ ] バックアップ確認
- [ ] ログ確認

---

## 🧪 本番環境テスト

### 1. 接続テスト
```bash
# 本番環境変数でテスト
MONGODB_ENV=production node scripts/validate-mongodb-setup.js
```

### 2. 負荷テスト
```bash
# Apache Bench
ab -n 1000 -c 10 https://your-domain.com/api/health

# k6
k6 run load-test.js
```

### 3. セキュリティテスト
```bash
# SSL Labs
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Security Headers
https://securityheaders.com/?q=your-domain.com
```

---

## 🚨 トラブルシューティング

### 問題: MongoDB接続タイムアウト
```bash
# 解決策
1. Network Access確認
2. クラスター状態確認
3. 接続文字列確認
4. ファイアウォール確認
```

### 問題: メモリ不足エラー
```bash
# 解決策
1. 接続プールサイズ削減
2. インデックス最適化
3. クエリ最適化
4. クラスターアップグレード検討
```

### 問題: 認証エラー
```bash
# 解決策
1. ユーザー名/パスワード確認
2. データベース名確認
3. URLエンコーディング確認
4. ユーザー権限確認
```

---

## 📞 サポート

### MongoDB Atlas
- ドキュメント: https://docs.atlas.mongodb.com
- サポート: チャット/チケット（M10以上）

### Vercel
- ドキュメント: https://vercel.com/docs
- サポート: https://vercel.com/support

### コミュニティ
- Stack Overflow: #mongodb #nextjs
- GitHub Issues: プロジェクトリポジトリ

---

## 📊 コスト最適化

### MongoDB Atlas
- M0 Free: 512MB（無料）
- M10: $57/月〜
- M20: $140/月〜

### 最適化のヒント
1. 適切なインデックス設計
2. 効率的なクエリ
3. データアーカイブ
4. 接続プール管理

---

*最終更新: 2025年1月*
*14人天才会議承認済み*