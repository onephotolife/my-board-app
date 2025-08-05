# Git Flow ブランチ戦略

## 概要
このプロジェクトでは、Git Flowモデルを採用し、開発・ステージング・本番環境を明確に分離します。

## ブランチ構造と環境マッピング

```
main (本番環境 - Production)
│
├── hotfix/* (緊急修正)
│
develop (開発環境 - Development)
│
├── release/* (ステージング環境 - Staging)
│
└── feature/* (機能開発)
```

## 環境別デプロイ設定

| ブランチ | 環境 | URL | 自動デプロイ |
|---------|------|-----|-------------|
| main | 本番 (Production) | https://my-board-app.com | ✓ |
| release/* | ステージング (Staging) | https://staging-my-board-app.com | ✓ |
| develop | 開発 (Development) | https://dev-my-board-app.com | ✓ |
| feature/* | プレビュー | https://preview-*.vercel.app | ✓ |

## ブランチの詳細説明

### 1. main (本番ブランチ)
- **目的**: 本番環境にデプロイされる安定版コード
- **保護**: 最高レベル（直接プッシュ禁止、承認必須）
- **マージ元**: releaseブランチ、hotfixブランチのみ
- **タグ**: リリースごとにバージョンタグを付与

### 2. develop (開発ブランチ)
- **目的**: 次期リリースの統合ブランチ
- **保護**: 中レベル（PR必須、CIパス必須）
- **マージ元**: featureブランチ
- **特徴**: 常に最新の開発版

### 3. feature/* (機能ブランチ)
- **目的**: 新機能の開発
- **命名**: `feature/[ticket-id]-[description]`
- **例**: 
  - `feature/MB-123-user-authentication`
  - `feature/MB-124-email-notification`
- **ライフサイクル**: develop → feature → develop

### 4. release/* (リリースブランチ)
- **目的**: リリース準備とステージングテスト
- **命名**: `release/v[major].[minor].[patch]`
- **例**: `release/v1.0.0`, `release/v1.1.0`
- **ライフサイクル**: develop → release → main & develop
- **許可される変更**: バグ修正、ドキュメント更新、バージョン番号更新のみ

### 5. hotfix/* (ホットフィックスブランチ)
- **目的**: 本番環境の緊急修正
- **命名**: `hotfix/[ticket-id]-[description]`
- **例**: `hotfix/URGENT-001-security-patch`
- **ライフサイクル**: main → hotfix → main & develop
- **特徴**: 最優先で処理

## ワークフロー

### 1. 新機能開発フロー

```bash
# 1. developから機能ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/MB-123-new-feature

# 2. 開発作業
# ... コード変更 ...

# 3. コミット
git add .
git commit -m "feat: 新機能の実装"

# 4. developの最新を取り込む
git checkout develop
git pull origin develop
git checkout feature/MB-123-new-feature
git rebase develop

# 5. プッシュとPR作成
git push origin feature/MB-123-new-feature
# GitHub/GitLabでPRを作成: feature → develop
```

### 2. リリースフロー

```bash
# 1. developからリリースブランチを作成
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# 2. バージョン番号更新
# package.json, CHANGELOG.md等を更新

# 3. ステージング環境でテスト
# 自動デプロイされたステージング環境でテスト

# 4. バグ修正（必要な場合）
git commit -m "fix: リリース前のバグ修正"

# 5. mainへマージ
git checkout main
git merge --no-ff release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# 6. developへバックマージ
git checkout develop
git merge --no-ff release/v1.0.0
git push origin develop

# 7. リリースブランチ削除
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

### 3. ホットフィックスフロー

```bash
# 1. mainからホットフィックスブランチを作成
git checkout main
git pull origin main
git checkout -b hotfix/URGENT-001-critical-bug

# 2. 修正実施
# ... バグ修正 ...
git commit -m "hotfix: 重大なバグを修正"

# 3. mainへマージ
git checkout main
git merge --no-ff hotfix/URGENT-001-critical-bug
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

# 4. developへマージ
git checkout develop
git merge --no-ff hotfix/URGENT-001-critical-bug
git push origin develop

# 5. ホットフィックスブランチ削除
git branch -d hotfix/URGENT-001-critical-bug
git push origin --delete hotfix/URGENT-001-critical-bug
```

## コミットメッセージ規約

### フォーマット
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット変更
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト
- `chore`: ビルドプロセスや補助ツール
- `hotfix`: 緊急修正

### 例
```
feat(auth): JWT認証を実装

- ログイン/ログアウト機能
- トークンリフレッシュ機能
- セッション管理

Closes #123
```

## バージョニング

### セマンティックバージョニング (SemVer)
- **MAJOR**: 後方互換性のない変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

### 例
- `1.0.0` → `2.0.0`: 破壊的変更
- `1.0.0` → `1.1.0`: 新機能追加
- `1.0.0` → `1.0.1`: バグ修正

## CI/CD設定

### GitHub Actions / Vercel統合

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches:
      - main
      - develop
      - 'release/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set Environment
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "ENVIRONMENT=production" >> $GITHUB_ENV
          elif [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
            echo "ENVIRONMENT=development" >> $GITHUB_ENV
          elif [[ "${{ github.ref }}" == refs/heads/release/* ]]; then
            echo "ENVIRONMENT=staging" >> $GITHUB_ENV
          fi
      
      - name: Deploy to Vercel
        run: |
          vercel --prod --env=${{ env.ENVIRONMENT }}
```

## ブランチ保護ルール

### main
- ✅ PR必須
- ✅ 承認者: 2名以上
- ✅ ステータスチェック必須
- ✅ 最新化必須
- ✅ 管理者も制限対象
- ✅ force push禁止
- ✅ ブランチ削除禁止

### develop
- ✅ PR必須
- ✅ 承認者: 1名以上
- ✅ ステータスチェック必須
- ✅ 最新化必須

### release/*
- ✅ PR必須
- ✅ 承認者: 1名以上
- ✅ リリースマネージャーのみ作成可能

## トラブルシューティング

### ケース1: developとreleaseのコンフリクト
```bash
# releaseブランチでdevelopの変更を取り込む
git checkout release/v1.0.0
git merge develop
# コンフリクト解決
git add .
git commit -m "merge: developの変更を取り込み"
```

### ケース2: 間違ったブランチからの作成
```bash
# featureをmainから作ってしまった場合
git checkout feature/wrong-branch
git rebase --onto develop main feature/wrong-branch
```

### ケース3: リリース後の緊急修正
```bash
# hotfixの作成と適用
git checkout -b hotfix/urgent-fix main
# 修正
git checkout main
git merge --no-ff hotfix/urgent-fix
git tag -a v1.0.1 -m "Hotfix v1.0.1"
```

## ベストプラクティス

1. **機能は小さく**: featureブランチは1-2週間以内に完了
2. **定期的な同期**: 毎日developの変更を取り込む
3. **早めのレビュー**: WIPでもPRを作成してフィードバックを得る
4. **リリースノート**: 各リリースで変更内容を明確に記載
5. **テスト重視**: 各環境で十分なテストを実施