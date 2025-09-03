# CI/CDパイプライン設定ガイド

## 概要
GitHub ActionsとVercelを使用した自動テスト・デプロイパイプライン

## 必要なGitHub Secrets設定

### 1. テスト用Secrets
```
AUTH_EMAIL          = one.photolife+1@gmail.com
AUTH_PASSWORD       = [実際のパスワード]
NEXTAUTH_SECRET     = [32文字以上のランダム文字列]
```

### 2. デプロイ用Secrets
```
VERCEL_TOKEN        = [Vercelダッシュボードから取得]
VERCEL_ORG_ID       = [Vercelプロジェクト設定から取得]
VERCEL_PROJECT_ID   = [Vercelプロジェクト設定から取得]
PROD_URL            = https://your-app.vercel.app
PROD_MONGODB_URI    = [本番MongoDBのURI]
PROD_NEXTAUTH_URL   = https://your-app.vercel.app
PROD_NEXTAUTH_SECRET = [本番用シークレット]
```

## セットアップ手順

### 1. GitHub Secretsの設定
1. GitHubリポジトリの Settings → Secrets and variables → Actions
2. 「New repository secret」で各シークレットを追加

### 2. Vercel Token取得
1. https://vercel.com/account/tokens
2. 「Create Token」でトークン生成
3. スコープ: Full Account

### 3. Vercel Project ID取得
```bash
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトリンク
vercel link

# 情報確認
cat .vercel/project.json
```

### 4. ワークフロー有効化
```bash
# mainブランチにプッシュ
git add .github/workflows/
git commit -m "ci: CI/CDパイプライン設定"
git push origin main
```

## パイプラインフロー

### プルリクエスト時
1. Lint実行
2. TypeCheckチェック
3. 認証セットアップ
4. E2Eテスト実行
5. 結果レポート生成

### mainブランチマージ時
1. 全テスト実行
2. ビルド検証
3. Vercelデプロイ
4. スモークテスト
5. 失敗時自動ロールバック

## トラブルシューティング

### テスト失敗時
- Artifactsから`playwright-results`をダウンロード
- HTMLレポートとビデオで原因調査
- `test-results/results.json`で詳細確認

### デプロイ失敗時
- Vercelダッシュボードでビルドログ確認
- 環境変数の設定漏れチェック
- ロールバック実行: `vercel rollback`

### 認証エラー時
- AUTH_EMAIL/AUTH_PASSWORDの確認
- NEXTAUTH_SECRETの長さ確認（32文字以上）
- MongoDBの接続確認

## ローカル検証

### CI環境の再現
```bash
# Dockerでテスト
docker run -d -p 27017:27017 mongo:7.0
npm ci
npm run build
npx playwright test
```

### 環境変数チェック
```bash
# 必須環境変数の確認
node -e "
const required = [
  'MONGODB_URI',
  'NEXTAUTH_URL', 
  'NEXTAUTH_SECRET',
  'AUTH_EMAIL',
  'AUTH_PASSWORD'
];
required.forEach(key => {
  if (!process.env[key]) {
    console.error('❌ Missing:', key);
  } else {
    console.log('✅', key);
  }
});
"
```

## メンテナンス

### 定期更新
- Node.jsバージョン（四半期ごと）
- Playwrightバージョン（月次）
- GitHub Actionsバージョン（月次）

### モニタリング
- GitHub Actions実行履歴
- Vercelデプロイメント履歴
- テスト成功率の追跡

## STRICT120準拠チェックリスト
- [ ] 全テストでfailed=0を確認
- [ ] TRIPLE_MATCH_GATE適用
- [ ] 認証必須（AUTH_ENFORCED_TESTING_GUARD）
- [ ] 証拠ブロック出力
- [ ] ロールバック手順明示