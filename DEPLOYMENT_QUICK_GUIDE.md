# 🚀 Vercelデプロイ クイックガイド

## プロジェクトURL
https://vercel.com/yoshitaka-yamagishis-projects/my-board-app

## 必要な手順

### 1. Vercelにログイン
```bash
vercel login
# GitHubでログインを選択
```

### 2. プロジェクトをリンク
```bash
vercel link
# 既存プロジェクト「my-board-app」を選択
```

### 3. 環境変数を設定

#### 方法A: Vercelダッシュボードから設定（推奨）
1. https://vercel.com/yoshitaka-yamagishis-projects/my-board-app/settings/environment-variables
2. 以下の環境変数を追加：

```env
# 必須環境変数
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/board-app-prod
NEXTAUTH_URL=https://my-board-app.vercel.app
NEXTAUTH_SECRET=[32文字以上のランダム文字列]
RESEND_API_KEY=re_[YOUR_API_KEY]
EMAIL_FROM=noreply@your-domain.com
CSRF_SECRET=[openssl rand -hex 16で生成]
SESSION_SECRET=[openssl rand -hex 16で生成]
ENCRYPTION_KEY=[openssl rand -hex 16で生成]
```

#### 方法B: CLIから設定
```bash
# 各環境変数を追加
vercel env add MONGODB_URI production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
# ... 他の環境変数も同様に
```

### 4. デプロイ実行

#### プレビューデプロイ（テスト用）
```bash
vercel
```

#### 本番デプロイ
```bash
vercel --prod
```

## トラブルシューティング

### ビルドエラーが発生した場合
1. `.next`フォルダを削除: `rm -rf .next`
2. 依存関係を再インストール: `npm install`
3. 再デプロイ: `vercel --prod`

### MongoDB接続エラー
- MongoDB AtlasのIPホワイトリストに`0.0.0.0/0`を追加
- 接続文字列のユーザー名とパスワードを確認

### 環境変数が反映されない
- Vercelダッシュボードで環境変数が「Production」に設定されているか確認
- デプロイを再実行: `vercel --prod --force`

## デプロイ後の確認

1. **アプリケーションURL**: https://my-board-app.vercel.app
2. **ヘルスチェック**: https://my-board-app.vercel.app/api/health
3. **ログ確認**: `vercel logs`
4. **環境変数確認**: `vercel env ls production`

## 緊急時のロールバック

```bash
# 前のデプロイメントに戻す
vercel rollback
```

## サポート

- Vercel Dashboard: https://vercel.com/yoshitaka-yamagishis-projects/my-board-app
- Vercel Docs: https://vercel.com/docs
- プロジェクトドキュメント: `/docs`フォルダ参照