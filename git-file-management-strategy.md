# Git ファイル管理戦略提案

## 📊 現在の状況分析

### Git ステータス
- **ブランチ**: main（origin/mainと同期済み）
- **変更済みファイル**: 2個（posts/route.ts、削除されたpublic/sw.js.backup）
- **未追跡ファイル**: 約30個のファイル・ディレクトリ + **144個のMDファイル**

### 深い思考による分類

## 🎯 ファイル分類と管理戦略

### 【優先度1: 即座にコミット推奨】
**本番運用に必要なインフラファイル**

```bash
# 重要なインフラ設定
.nvmrc                    # Node.jsバージョン固定
Dockerfile               # コンテナ設定
docker-compose.yml       # オーケストレーション
ecosystem.config.js      # PM2プロセス管理
nginx/                   # Webサーバー設定
production-deployment-success-report.md  # 最新のデプロイ記録
```

**理由**: これらは本番環境の安定性に直結し、チーム共有が必須

### 【優先度2: 選択的コミット推奨】
**開発・テスト効率向上ツール**

```bash
scripts/                 # 自動化スクリプト
  ├── deploy.sh         # デプロイスクリプト
  ├── lighthouse-test.js # パフォーマンステスト
  └── production-test.sh # 本番テスト

test-scripts/            # テスト自動化
  ├── accessibility/    # アクセシビリティテスト
  ├── e2e/             # E2Eテスト
  └── performance/      # パフォーマンステスト
```

**理由**: 開発効率向上に寄与し、継続的改善に有効

### 【優先度3: アーカイブ推奨】
**一時的なレポート・ドキュメント（144個のMDファイル）**

```bash
# 大量のレポートファイル例
comprehensive-test-execution-report.md
user-experience-test-plan.md
production-test-report.md
security-fixes-report.md
... (140個以上)
```

**理由**: 一時的な作業記録であり、リポジトリを肥大化させる

## 🚀 推奨実行プラン

### ステップ1: 重要ファイルの即座コミット

```bash
# 本番運用に必要なファイル
git add .nvmrc Dockerfile docker-compose.yml ecosystem.config.js nginx/
git add production-deployment-success-report.md
git add src/app/api/posts/route.ts  # 変更済みファイル
git rm public/sw.js.backup  # 削除されたファイル

git commit -m "chore: 本番運用インフラ設定を追加

- Docker環境設定（Dockerfile, docker-compose.yml）
- Node.js環境固定（.nvmrc）
- プロセス管理設定（ecosystem.config.js）
- Nginx設定（nginx/）
- 最新デプロイ記録（production-deployment-success-report.md）
- API改善（posts/route.ts）

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### ステップ2: 開発ツールの選択的追加

```bash
# 有用な開発ツール
git add scripts/deploy.sh scripts/lighthouse-test.js scripts/production-test.sh
git add test-scripts/

git commit -m "feat: 開発・テスト自動化ツールを追加

- デプロイ自動化スクリプト
- パフォーマンステストツール
- 包括的テストスクリプト集

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### ステップ3: レポートアーカイブの作成

```bash
# アーカイブディレクトリ作成
mkdir -p archive/reports/2025-08
mv *.md archive/reports/2025-08/ 2>/dev/null || true
mv *report* archive/reports/2025-08/ 2>/dev/null || true
mv test-reports/ archive/reports/2025-08/ 2>/dev/null || true

# .gitignore更新
echo "archive/" >> .gitignore
echo "*.md.backup" >> .gitignore
echo "response.json" >> .gitignore
echo "xss_test.json" >> .gitignore
```

### ステップ4: .gitignore最適化

```bash
# 一時ファイル・ログを除外
echo "
# 作業ログ・一時レポート
*-report-*.md
*-test-*.md
*.backup
*.log.tmp
response.json
xss_test.json

# アーカイブディレクトリ
archive/
docs/archive/

# テスト結果（必要に応じて）
test-results/
coverage/
.nyc_output/
" >> .gitignore
```

## 📋 具体的コマンド実行手順

### 即座実行推奨

```bash
# 1. 重要インフラファイルコミット
git add .nvmrc Dockerfile docker-compose.yml ecosystem.config.js nginx/ production-deployment-success-report.md src/app/api/posts/route.ts
git rm public/sw.js.backup
git commit -m "chore: 本番運用インフラ設定を追加"

# 2. 開発ツールコミット（選択的）
git add scripts/deploy.sh scripts/lighthouse-test.js scripts/production-test.sh test-scripts/
git commit -m "feat: 開発・テスト自動化ツールを追加"

# 3. アーカイブ作成
mkdir -p archive/reports/2025-08
find . -maxdepth 1 -name "*.md" -not -name "README.md" -not -name "CLAUDE.md" -not -name "production-deployment-success-report.md" -exec mv {} archive/reports/2025-08/ \;

# 4. .gitignore更新
echo "archive/" >> .gitignore
```

## 🎯 期待効果

### リポジトリ品質向上
- **サイズ削減**: 144個の一時ファイル整理
- **可読性向上**: 重要ファイルに集中
- **保守性向上**: 明確な構造化

### 開発効率改善
- **インフラ設定共有**: チーム全体で統一環境
- **自動化ツール活用**: CI/CD効率化
- **テスト環境統一**: 品質保証強化

### 運用安定性確保
- **設定ファイル管理**: 本番環境の再現性
- **デプロイ記録保持**: トレーサビリティ確保
- **バックアップ戦略**: アーカイブによる履歴保存

## ⚠️ 注意事項

### 実行前確認
1. **重要ファイル確認**: `production-deployment-success-report.md`等の最新情報
2. **設定ファイル検証**: Docker、nginx設定の妥当性
3. **バックアップ作成**: 大量削除前のローカルバックアップ

### 段階的実行推奨
1. **ステップ1のみ先行**: 重要ファイルのみ先にコミット
2. **動作確認**: デプロイ・ビルド確認
3. **段階的クリーンアップ**: アーカイブは慎重に

## 📞 緊急時対応

### ロールバック手順
```bash
# 直前コミットのアンドゥ
git reset --soft HEAD~1

# アーカイブからの復元
cp -r archive/reports/2025-08/* .

# 特定ファイルの復元
git checkout HEAD~1 -- <filepath>
```

---
**提案作成日**: 2025年8月21日  
**対象**: Git管理効率化・リポジトリ品質向上