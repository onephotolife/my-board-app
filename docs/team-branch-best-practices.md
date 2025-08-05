# チーム開発でのブランチ管理ベストプラクティス

## 1. ブランチ命名規則

### 基本フォーマット
```
<type>/<ticket-number>-<short-description>
```

### タイプ別命名規則

#### 機能開発
```bash
feature/MB-123-user-authentication
feature/MB-124-password-reset
feature/MB-125-profile-settings
```

#### バグ修正
```bash
bugfix/MB-201-login-error
bugfix/MB-202-session-timeout
```

#### 緊急修正
```bash
hotfix/MB-301-critical-security-fix
hotfix/MB-302-payment-error
```

#### リリース準備
```bash
release/v1.2.0
release/v1.2.1-hotfix
```

#### 実験的機能
```bash
experiment/MB-401-new-ui-design
experiment/MB-402-performance-optimization
```

### 命名のルール
- **小文字のみ使用** (kebab-case)
- **スラッシュ(/)でカテゴリ分け**
- **ハイフン(-)で単語区切り**
- **チケット番号を含める**
- **30文字以内で簡潔に**

### 悪い例と良い例
```bash
# ❌ 悪い例
feature/新機能追加
FeatureUserAuth
user_authentication
feature/this-is-a-very-long-branch-name-that-describes-everything

# ✅ 良い例
feature/MB-123-user-auth
bugfix/MB-201-fix-login
hotfix/MB-301-security-patch
```

## 2. マージのタイミング

### デイリーマージ戦略

#### 朝のルーティン（推奨）
```bash
# 1. 最新のdevelopを取得
git checkout develop
git pull origin develop

# 2. 作業ブランチに最新を反映
git checkout feature/MB-123-user-auth
git merge develop

# 3. コンフリクトがあれば解決
git add .
git commit -m "merge: develop into feature/MB-123-user-auth"
```

### マージすべきタイミング

#### ✅ 即座にマージ
- **小さな機能完成時** (1-2日の作業)
- **バグ修正完了時**
- **ドキュメント更新**
- **設定ファイルの更新**

#### 🕐 レビュー後にマージ
- **新機能の実装** (3日以上の作業)
- **アーキテクチャ変更**
- **破壊的変更**
- **パフォーマンス改善**

#### ⏸️ マージを待つ
- **実験的機能**
- **未完成の機能**
- **依存関係がある変更**

### マージチェックリスト
```markdown
- [ ] すべてのテストがパス
- [ ] レビュー承認済み
- [ ] ドキュメント更新済み
- [ ] CHANGELOG更新済み
- [ ] developとの差分を確認
- [ ] デプロイ手順を確認
```

## 3. コンフリクトの予防方法

### 予防の基本原則

#### 1. 小さく頻繁にコミット
```bash
# ❌ 悪い例: 1週間分の変更を1つのコミット
git commit -m "ユーザー機能を実装"

# ✅ 良い例: 機能ごとに小さくコミット
git commit -m "feat: ユーザーモデルを追加"
git commit -m "feat: ユーザー登録APIを実装"
git commit -m "test: ユーザー登録のテストを追加"
```

#### 2. 定期的な同期
```bash
# 毎朝実行するスクリプト
#!/bin/bash
echo "🔄 Syncing with develop branch..."
git checkout develop
git pull origin develop
git checkout -
git merge develop
```

#### 3. ファイル分割の工夫
```
# ❌ 悪い例: 1つの巨大なファイル
src/
  └── api.ts (5000行)

# ✅ 良い例: 機能ごとに分割
src/
  ├── api/
  │   ├── auth.ts
  │   ├── users.ts
  │   ├── posts.ts
  │   └── index.ts
```

### コンフリクト予防テクニック

#### 1. 作業領域の明確化
```yaml
# .github/CODEOWNERS
# 各チームメンバーの担当領域を定義
/src/api/auth/ @developer1
/src/api/users/ @developer2
/src/components/ @developer3
/src/styles/ @designer1
```

#### 2. 機能フラグの活用
```typescript
// feature-flags.ts
export const FEATURES = {
  NEW_AUTH_SYSTEM: process.env.ENABLE_NEW_AUTH === 'true',
  BETA_UI: process.env.ENABLE_BETA_UI === 'true',
};

// 使用例
if (FEATURES.NEW_AUTH_SYSTEM) {
  // 新しい認証システム
} else {
  // 既存の認証システム
}
```

#### 3. インターフェース駆動開発
```typescript
// 先にインターフェースを定義
interface UserService {
  createUser(data: UserInput): Promise<User>;
  updateUser(id: string, data: UserUpdate): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// 各自が実装
class UserServiceImpl implements UserService {
  // 実装...
}
```

## 4. レビューフロー

### 効率的なレビュープロセス

#### Pull Requestテンプレート
```markdown
<!-- .github/pull_request_template.md -->
## 概要
<!-- 変更の概要を簡潔に -->

## 変更の種類
- [ ] 🐛 バグ修正
- [ ] ✨ 新機能
- [ ] 🔨 リファクタリング
- [ ] 📚 ドキュメント
- [ ] 🧪 テスト
- [ ] 🔧 設定変更

## 関連Issue
Closes #

## 変更内容
<!-- 主な変更点をリスト化 -->
- 
- 
- 

## テスト方法
<!-- レビュアーが確認する手順 -->
1. 
2. 
3. 

## スクリーンショット
<!-- UIの変更がある場合 -->

## チェックリスト
- [ ] セルフレビュー完了
- [ ] テスト追加/更新
- [ ] ドキュメント更新
- [ ] 破壊的変更なし

## レビュアーへの注意点
<!-- 特に確認してほしい点 -->
```

### レビューの段階

#### 1. 自動レビュー (CI/CD)
```yaml
# .github/workflows/pr-check.yml
name: PR Check
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: ESLint
        run: npm run lint
      
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
      
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: npm run build
```

#### 2. ピアレビュー

**レビュアーの心得**
```markdown
✅ 良いレビューコメント
- "このロジックをユーティリティ関数に切り出すと再利用できそうです"
- "ここでnullチェックを追加した方が安全だと思います: `if (!user) return`"
- "パフォーマンスを考慮して、useMemoを使用することを検討してください"

❌ 悪いレビューコメント
- "これは間違っている"
- "なぜこうしたの？"
- "私ならこう書く"
```

#### 3. レビュー対応フロー
```bash
# 1. レビューコメントごとにコミット
git commit -m "review: nullチェックを追加"
git commit -m "review: ユーティリティ関数に分離"

# 2. レビュアーに再確認依頼
# PRにコメント: "@reviewer 修正完了しました。再度ご確認お願いします"

# 3. 承認後、Squash and Merge
```

### レビューのSLA（Service Level Agreement）

| PRのサイズ | 初回レビュー | 再レビュー |
|-----------|------------|-----------|
| 小 (< 100行) | 4時間以内 | 2時間以内 |
| 中 (< 500行) | 8時間以内 | 4時間以内 |
| 大 (> 500行) | 24時間以内 | 8時間以内 |

### コードレビューチェックリスト

#### セキュリティ
- [ ] 機密情報のハードコーディングなし
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] 適切な認証・認可

#### パフォーマンス
- [ ] N+1問題なし
- [ ] 適切なインデックス
- [ ] 不要な再レンダリングなし
- [ ] メモリリークなし

#### 保守性
- [ ] 適切な命名
- [ ] 複雑度が高すぎない
- [ ] テストが書きやすい設計
- [ ] ドキュメント更新

## 実践的なワークフロー例

### 新機能開発の流れ
```bash
# 1. Issue作成とブランチ作成
git checkout develop
git pull origin develop
git checkout -b feature/MB-123-user-auth

# 2. 開発開始（毎朝）
git checkout develop
git pull origin develop
git checkout feature/MB-123-user-auth
git merge develop

# 3. 作業とコミット
git add src/auth/
git commit -m "feat(auth): JWTトークン生成を実装"

# 4. プッシュとPR作成
git push origin feature/MB-123-user-auth
gh pr create --title "feat: ユーザー認証機能 #MB-123" \
  --body "$(cat .github/pull_request_template.md)"

# 5. レビュー対応
git commit -m "review: エラーハンドリングを追加"
git push origin feature/MB-123-user-auth

# 6. マージ（Squash and Merge推奨）
# GitHub UIまたは
gh pr merge --squash --delete-branch
```

## トラブルシューティング

### よくある問題と解決法

#### 1. マージコンフリクト
```bash
# Visual Studio Codeを使用
git mergetool --tool=vscode

# または手動で解決
# 1. コンフリクトマーカーを探す
# 2. 適切な変更を選択
# 3. マーカーを削除
# 4. テストを実行
git add .
git commit -m "resolve: developとのコンフリクトを解決"
```

#### 2. 誤ったコミット
```bash
# 直前のコミットを修正
git commit --amend

# 特定のコミットを取り消し
git revert <commit-hash>

# ブランチをリセット（注意！）
git reset --hard origin/develop
```

#### 3. 大きすぎるPR
```bash
# 機能ごとに分割
git checkout -b feature/MB-123-auth-api
git cherry-pick <commit1> <commit2>

git checkout -b feature/MB-123-auth-ui  
git cherry-pick <commit3> <commit4>
```

## まとめ

効率的なチーム開発のための重要ポイント：

1. **一貫性のある命名規則**を守る
2. **小さく頻繁に**マージする
3. **予防的な対策**でコンフリクトを減らす
4. **建設的なレビュー**で品質向上

これらのベストプラクティスを実践することで、チーム全体の生産性と コード品質が向上します。