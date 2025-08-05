# GitHub mainブランチ保護設定ガイド

## 📋 目次
1. [基本的な保護設定](#基本的な保護設定)
2. [推奨設定（本番環境）](#推奨設定本番環境)
3. [設定手順（スクリーンショット付き）](#設定手順)
4. [トラブルシューティング](#トラブルシューティング)

## 基本的な保護設定

### 1. GitHubリポジトリにアクセス
```
https://github.com/onephotolife/my-board-app
```

### 2. Settings → Branches へ移動
1. リポジトリのメインページで「Settings」タブをクリック
2. 左サイドバーの「Code and automation」セクション
3. 「Branches」をクリック

### 3. Branch protection rule を追加
「Add rule」ボタンをクリック

## 推奨設定（本番環境）

### 🔴 必須設定（最重要）

#### 1. Branch name pattern
```
main
```
- 正確に「main」と入力（ワイルドカード不要）

#### 2. Protect matching branches

##### ✅ Require a pull request before merging
- **必須**: 直接プッシュを防ぐ最も重要な設定

内部オプション:
- ✅ **Require approvals**: `2` (推奨) または `1` (最小)
  - 本番環境は2名以上のレビューを推奨
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
  - 新しいコミット後は再承認が必要
- ✅ **Require review from CODEOWNERS**
  - CODEOWNERSファイルで指定された人のレビュー必須
- ✅ **Restrict who can dismiss pull request reviews**
  - 管理者のみがレビューを却下可能

##### ✅ Require status checks to pass before merging
- **必須**: CIテストの成功を保証

内部オプション:
- ✅ **Require branches to be up to date before merging**
  - mainの最新版とのマージが必要
- 追加するステータスチェック:
  ```
  - build
  - test
  - lint
  - typecheck
  ```

##### ✅ Require conversation resolution before merging
- すべてのPRコメントが解決済みであること

##### ✅ Require signed commits
- GPG署名付きコミットのみ許可（セキュリティ重視の場合）

##### ✅ Require linear history
- マージコミットを禁止し、履歴をクリーンに保つ

##### ✅ Include administrators
- **重要**: 管理者も規則に従う（例外なし）

##### ✅ Restrict who can push to matching branches
- 特定のユーザー/チームのみプッシュ可能
- 通常は空欄（誰も直接プッシュ不可）

### 🟡 推奨設定（追加のセキュリティ）

#### 3. Rules applied to everyone including administrators
✅ すべてチェック:
- Allow force pushes: ❌ （許可しない）
- Allow deletions: ❌ （削除を許可しない）

## 設定手順

### Step 1: Branch protection rules ページ
```
Settings → Branches → Add rule
```

### Step 2: 基本設定
```yaml
Branch name pattern: main
```

### Step 3: 保護設定（推奨構成）

```yaml
# 必須項目
✅ Require a pull request before merging
  ✅ Require approvals: 2
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from CODEOWNERS
  ✅ Restrict who can dismiss pull request reviews

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  検索して追加:
    - build
    - test
    - lint
    - typecheck
    - vercel (Vercelを使用している場合)

✅ Require conversation resolution before merging
✅ Require signed commits (オプション)
✅ Require linear history (オプション)
✅ Include administrators
✅ Restrict who can push to matching branches
  # 空欄のままにして誰も直接プッシュできないようにする
```

### Step 4: 追加の制限
```yaml
Rules applied to everyone including administrators:
❌ Do not allow bypassing the above settings
  ❌ Allow force pushes
  ❌ Allow deletions
```

### Step 5: Create をクリック

## 実際の設定例

### 小規模チーム向け（最小構成）
```yaml
✅ Require a pull request before merging
  ✅ Require approvals: 1
✅ Require status checks to pass before merging
✅ Include administrators
```

### 中規模チーム向け（バランス構成）
```yaml
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed
✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
✅ Require conversation resolution before merging
✅ Include administrators
```

### 大規模・エンタープライズ向け（最大構成）
```yaml
✅ Require a pull request before merging
  ✅ Require approvals: 2
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from CODEOWNERS
  ✅ Restrict who can dismiss pull request reviews
✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  必須チェック: build, test, lint, security-scan
✅ Require conversation resolution before merging
✅ Require signed commits
✅ Require linear history
✅ Include administrators
✅ Restrict who can push to matching branches
  特定のリリースマネージャーのみ
```

## GitHub CLI での設定

```bash
# GitHub CLIを使用した設定
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build","test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

## 設定の確認方法

### 1. ブランチ保護の状態確認
```bash
# 保護されているか確認
git push origin main
# エラー: remote: error: GH006: Protected branch update failed
```

### 2. GitHub UIでの確認
- Settings → Branches
- mainブランチの横に🔒アイコンが表示

### 3. GitHub APIでの確認
```bash
gh api repos/:owner/:repo/branches/main/protection
```

## トラブルシューティング

### よくある問題

#### 1. "Setting not available"
**原因**: 無料プランの制限
**解決**: 
- パブリックリポジトリは無料で全機能利用可
- プライベートリポジトリはPro以上が必要

#### 2. "Required status checks not found"
**原因**: CIがまだ実行されていない
**解決**:
1. 一度PRを作成してCIを実行
2. その後、ステータスチェックが選択可能に

#### 3. 管理者が制限を回避できる
**原因**: "Include administrators"が未チェック
**解決**: 必ずチェックを入れる

#### 4. Force pushができてしまう
**原因**: "Allow force pushes"が有効
**解決**: 
- Rules → Edit → Allow force pushes のチェックを外す

## ベストプラクティス

### 1. 段階的な導入
```
Week 1: PR必須のみ
Week 2: レビュー必須を追加
Week 3: ステータスチェックを追加
Week 4: 完全な保護を適用
```

### 2. 例外ルールの最小化
- 管理者も含めて全員が同じルールに従う
- 緊急時はhotfixブランチを使用

### 3. 定期的な見直し
- 月1回、保護設定をレビュー
- 不要なステータスチェックを削除
- チームの成長に合わせて調整

### 4. ドキュメント化
```markdown
# .github/PROTECTED_BRANCHES.md
## main branch protection
- PR required: Yes (2 approvals)
- Status checks: build, test, lint
- Admins included: Yes
- Last updated: 2024-01-01
```

## 関連設定

### developブランチの保護
mainほど厳格でない設定:
```yaml
✅ Require a pull request before merging
  ✅ Require approvals: 1
✅ Require status checks to pass before merging
```

### releaseブランチの保護
```yaml
Pattern: release/*
✅ Require a pull request before merging
✅ Restrict who can push to matching branches
  - release-managers チームのみ
```

## 緊急時の対応

### 保護を一時的に無効化する場合
1. Settings → Branches
2. mainの「Edit」をクリック
3. 必要な変更を行う
4. **必ず元に戻す**

### 代替案：緊急修正フロー
```bash
# hotfixブランチを使用
git checkout -b hotfix/urgent-fix main
# 修正
git push origin hotfix/urgent-fix
# PRを作成して通常フローでマージ
```

## チェックリスト

mainブランチ保護設定の最終確認:

- [ ] Branch name patternに「main」を正確に入力
- [ ] Require a pull request before merging: ON
- [ ] Require approvals: 1以上
- [ ] Require status checks to pass: ON
- [ ] Include administrators: ON
- [ ] Allow force pushes: OFF
- [ ] Allow deletions: OFF
- [ ] 設定を保存（Create/Save changes）
- [ ] プッシュテストで保護を確認

これでmainブランチは完全に保護されます！🛡️