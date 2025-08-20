# 本番環境デプロイ完全ガイド

## 📋 事前準備チェックリスト

### 必須アカウント
- [ ] GitHub（リポジトリホスティング）
- [ ] Vercel（ホスティング）
- [ ] MongoDB Atlas（データベース）
- [ ] SendGrid/Resend（メール送信）
- [ ] Sentry（エラー監視）※推奨
- [ ] Cloudflare（CDN/セキュリティ）※推奨

## 🚀 ステップバイステップ デプロイ手順

### Step 1: MongoDB Atlas セットアップ（所要時間: 30分）

1. **アカウント作成とクラスター作成**
```bash
# MongoDB Atlas にアクセス
https://cloud.mongodb.com

# 新規クラスター作成
- Provider: AWS
- Region: ap-northeast-1 (Tokyo)
- Cluster Tier: M10 Dedicated
- Cluster Name: board-app-prod
```

2. **データベースユーザー作成**
```bash
# Database Access → Add New Database User
Username: board_app_prod
Password: [強力なパスワード生成]
Authentication Method: SCRAM
Database User Privileges: Atlas Admin
```

3. **ネットワークアクセス設定**
```bash
# Network Access → Add IP Address
IP Address: 0.0.0.0/0
Comment: Allow access from Vercel
```

4. **接続文字列取得**
```bash
# Clusters → Connect → Drivers
接続文字列をコピーして保存
mongodb+srv://board_app_prod:[password]@cluster0.xxxxx.mongodb.net/board-app-prod?retryWrites=true&w=majority
```

### Step 2: Vercel プロジェクトセットアップ（所要時間: 20分）

1. **GitHubリポジトリの準備**
```bash
# ローカルリポジトリの最新化
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

2. **Vercelにインポート**
```bash
# Vercel CLIを使用する場合
npm i -g vercel
vercel

# またはWebUIから
https://vercel.com/new
→ Import Git Repository
→ GitHubリポジトリを選択
```

3. **プロジェクト設定**
```yaml
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Step 3: 環境変数設定（所要時間: 30分）

1. **Vercelダッシュボードで環境変数設定**
```bash
# Settings → Environment Variables

# 必須環境変数
MONGODB_URI=[MongoDB接続文字列]
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=[openssl rand -base64 32で生成]

# メール設定（SendGrid例）
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=[SendGrid APIキー]
EMAIL_FROM=noreply@your-domain.com

# セキュリティキー
CSRF_SECRET=[32文字ランダム文字列]
SESSION_SECRET=[32文字ランダム文字列]
ENCRYPTION_KEY=[32文字ランダム文字列]

# 機能フラグ
ENABLE_REGISTRATION=true
ENABLE_EMAIL_VERIFICATION=true
NODE_ENV=production
```

2. **環境変数生成スクリプト**
```bash
#!/bin/bash
# scripts/generate-secrets.sh

echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "CSRF_SECRET=$(openssl rand -hex 16)"
echo "SESSION_SECRET=$(openssl rand -hex 16)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

### Step 4: 初回デプロイ（所要時間: 10分）

1. **デプロイ実行**
```bash
# Vercel CLIから
vercel --prod

# またはGit push（自動デプロイ設定済みの場合）
git push origin main
```

2. **デプロイ確認**
```bash
# ビルドログ確認
https://vercel.com/[your-account]/[project]/deployments

# 成功確認項目
✅ Build Successful
✅ All checks passed
✅ Preview URL accessible
```

### Step 5: データベース初期設定（所要時間: 15分）

1. **インデックス作成**
```bash
# scripts/setup-prod-indexes.js を実行
MONGODB_URI="your-prod-uri" node scripts/setup-prod-indexes.js
```

2. **初期データ投入（必要に応じて）**
```javascript
// scripts/seed-production.js
const mongoose = require('mongoose');

async function seedProduction() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // 管理者ユーザー作成
  const admin = await User.create({
    email: 'admin@your-domain.com',
    username: 'admin',
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
    role: 'admin',
    emailVerified: new Date(),
  });
  
  console.log('Production seed completed');
  process.exit(0);
}

seedProduction();
```

### Step 6: カスタムドメイン設定（所要時間: 30分）

1. **ドメイン追加**
```bash
# Vercel Dashboard → Settings → Domains
Add Domain: your-domain.com
Add Domain: www.your-domain.com
```

2. **DNS設定**
```bash
# ドメインレジストラで設定
A Record: @ → 76.76.21.21
CNAME Record: www → cname.vercel-dns.com
```

3. **SSL証明書（自動）**
```bash
# Vercelが自動的にLet's Encrypt証明書を発行
# 確認: Settings → Domains → SSL Certificate
```

### Step 7: 監視設定（所要時間: 20分）

1. **Sentry設定**
```bash
# Sentryプロジェクト作成
https://sentry.io → New Project → Next.js

# DSN取得してVercel環境変数に追加
SENTRY_DSN=[Your DSN]
NEXT_PUBLIC_SENTRY_DSN=[Your DSN]
```

2. **Vercel Analytics有効化**
```bash
# Vercel Dashboard → Analytics → Enable
npm install @vercel/analytics
```

3. **ヘルスチェック監視**
```bash
# UptimeRobot設定
URL: https://your-domain.com/api/health
Alert Contacts: your-email@domain.com
```

### Step 8: セキュリティ最終確認（所要時間: 15分）

1. **セキュリティヘッダー確認**
```bash
# SecurityHeaders.com でスキャン
https://securityheaders.com/?q=your-domain.com

# 目標スコア: A以上
```

2. **SSL Labs テスト**
```bash
# SSL設定確認
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# 目標グレード: A以上
```

3. **依存関係の脆弱性チェック**
```bash
npm audit
npm audit fix
```

### Step 9: パフォーマンステスト（所要時間: 15分）

1. **Lighthouse テスト**
```bash
# Chrome DevTools → Lighthouse
Performance: 90以上
Accessibility: 100
Best Practices: 100
SEO: 100
```

2. **負荷テスト**
```bash
# Artillery でロードテスト
npm install -g artillery
artillery quick -d 60 -r 10 https://your-domain.com
```

### Step 10: 本番稼働開始（所要時間: 10分）

1. **最終チェックリスト**
```bash
✅ すべてのページが正常に表示される
✅ ユーザー登録・ログインが機能する
✅ 投稿の作成・編集・削除が機能する
✅ メール送信が機能する
✅ エラー監視が動作している
✅ バックアップが設定されている
```

2. **公開アナウンス**
```bash
# ステータスページ更新
Status: Operational

# ユーザーへの通知
メールまたはソーシャルメディアで公開を通知
```

## 🔧 トラブルシューティング

### ビルドエラー
```bash
# パッケージのクリーンインストール
rm -rf node_modules package-lock.json
npm install

# キャッシュクリア
vercel env pull
rm -rf .vercel
vercel --prod
```

### MongoDB接続エラー
```bash
# IPホワイトリスト確認
MongoDB Atlas → Network Access → 0.0.0.0/0

# 接続文字列確認
特殊文字は必ずURLエンコード
```

### 環境変数が反映されない
```bash
# Vercelで再デプロイ
Deployments → Redeploy → Use existing Build Cache: OFF
```

## 📊 デプロイ後の運用

### 日次タスク
- [ ] エラーログ確認（Sentry）
- [ ] パフォーマンスメトリクス確認
- [ ] セキュリティアラート確認

### 週次タスク
- [ ] バックアップ確認
- [ ] 依存関係更新チェック
- [ ] パフォーマンス分析

### 月次タスク
- [ ] セキュリティ監査
- [ ] コスト分析
- [ ] スケーリング計画見直し

## 🆘 緊急時対応

### ロールバック手順
```bash
# Vercel Dashboard
Deployments → 前のデプロイメント → Promote to Production
```

### データベース復元
```bash
# MongoDB Atlas
Clusters → Backup → Restore → Point in Time Recovery
```

### サポート連絡先
- Vercel Support: https://vercel.com/support
- MongoDB Support: https://support.mongodb.com
- 開発チーム緊急連絡先: [Your Contact]

## 📚 参考資料

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com)
- [Production Checklist](https://nextjs.org/docs/going-to-production)