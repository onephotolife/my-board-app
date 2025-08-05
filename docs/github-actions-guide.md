# GitHub Actions 自動化ガイド

## 概要

このプロジェクトでは、GitHub Actionsを使用してPR作成時の品質チェックを自動化しています。

## ワークフロー一覧

### 1. PR Check (`pr-check.yml`)
**トリガー**: PR作成・更新時
**実行内容**:
- 🔍 **Lint Check**: ESLintによるコード品質チェック
- 📘 **Type Check**: TypeScriptの型チェック
- 🧪 **Unit Tests**: 単体テストの実行（Node.js 18, 20, 22）
- 🏗️ **Build Check**: ビルドの成功確認
- 🔒 **Security Check**: npm auditによる脆弱性チェック
- 📊 **PR Analysis**: PR統計情報の自動コメント

### 2. PR Auto Label (`pr-label.yml`)
**トリガー**: PR作成・編集時
**実行内容**:
- タイトルに基づく自動ラベル付け
- ブランチ名に基づく自動ラベル付け
- PRサイズラベルの付与
- テンプレート使用チェック

### 3. PR Size Labeler (`pr-size.yml`)
**トリガー**: PR作成・更新時
**実行内容**:
- 変更行数に基づくサイズラベル付け
- 大規模PRの警告

## 自動付与されるラベル

### カテゴリラベル
| プレフィックス | ラベル | 説明 |
|--------------|--------|------|
| `[BUG]` | `bug` | バグ修正 |
| `[FEAT]` | `enhancement` | 新機能 |
| `[DOCS]` | `documentation` | ドキュメント |
| `[TEST]` | `testing` | テスト |
| `[REFACTOR]` | `refactoring` | リファクタリング |
| `[HOTFIX]` | `hotfix`, `urgent` | 緊急修正 |
| `[CHORE]` | `chore` | その他の変更 |

### サイズラベル
| ラベル | 変更行数 |
|--------|----------|
| `size/XS` | < 10行 |
| `size/S` | 10-50行 |
| `size/M` | 50-200行 |
| `size/L` | 200-500行 |
| `size/XL` | > 500行 |

## PR自動コメント

### 1. PR統計情報
```
📊 PR統計情報

📁 ファイル変更
- 総ファイル数: 5
- 追加: 2 | 変更: 3 | 削除: 0
- 行数: +120 / -30

📝 ファイルタイプ
- .ts: 3
- .tsx: 2
```

### 2. セキュリティ監査
脆弱性が検出された場合：
```
🔒 Security Audit Report

Found 3 vulnerabilities:
- 🔴 Critical: 0
- 🟠 High: 1
- 🟡 Moderate: 2
- ⚪ Low: 0
```

### 3. チェック完了
すべてのチェックが成功した場合：
```
✅ すべてのチェックが成功しました！

| チェック | 状態 |
|---------|------|
| 🔍 Lint | ✅ |
| 📘 TypeScript | ✅ |
| 🧪 Tests | ✅ |
| 🏗️ Build | ✅ |
| 🔒 Security | ✅ |
```

## Dependabot設定

### 自動更新スケジュール
- **npm packages**: 毎週月曜日 3:00
- **GitHub Actions**: 毎週月曜日 3:00

### 自動PRの特徴
- `dependencies`と`bot`ラベル付き
- コミットプレフィックス付き（`chore:`, `ci:`）
- 自動アサイン設定

## トラブルシューティング

### Q: チェックが失敗する
1. ローカルで同じコマンドを実行
   ```bash
   npm run lint
   npm test
   npm run build
   ```
2. エラーを修正してプッシュ

### Q: ラベルが付与されない
- PR タイトルが適切なプレフィックスを含んでいるか確認
- GitHub Actions の権限設定を確認

### Q: テストがタイムアウトする
- MongoDB サービスが正しく起動しているか確認
- テストの並列度を調整

## ベストプラクティス

### 1. PR作成前のローカルチェック
```bash
# すべてのチェックを実行
npm run lint && npm test && npm run build
```

### 2. コミットメッセージ
```
feat: 新機能の追加
fix: バグの修正
docs: ドキュメントの更新
test: テストの追加・修正
refactor: リファクタリング
chore: その他の変更
```

### 3. PR タイトル
```
[FEAT] ユーザー認証機能の追加
[BUG] ログイン時のエラー修正
[DOCS] READMEの更新
```

## カスタマイズ

### 新しいチェックの追加
1. `.github/workflows/pr-check.yml`に新しいジョブを追加
2. `needs`配列に依存関係を設定
3. `pr-check-status`ジョブに含める

### ラベルのカスタマイズ
1. `.github/workflows/pr-label.yml`のスクリプトを編集
2. 新しいラベルと色を定義
3. 条件を追加

## 今後の拡張予定

- [ ] パフォーマンステストの追加
- [ ] ビジュアルリグレッションテスト
- [ ] 自動デプロイプレビュー
- [ ] コードカバレッジの閾値設定
- [ ] 自動マージ機能