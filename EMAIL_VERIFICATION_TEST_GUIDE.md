# 📧 メール認証機能テストガイド

## 🚀 クイックスタート

最も簡単な方法は、完全自動テストスクリプトを実行することです：

```bash
# 1. 開発サーバーを起動（別ターミナル）
npm run dev

# 2. MongoDBが起動していることを確認
mongod

# 3. 自動テストを実行
./scripts/run-complete-verification-test.sh
```

## 📋 テスト項目と確認ポイント

### 1. ✅ 正常な認証フロー
**確認内容:**
- 有効なトークンでアクセスすると認証が完了
- `emailVerified`がtrueに更新される
- トークンがデータベースから削除される
- 成功メッセージが表示される
- 3秒後に自動的にログインページへリダイレクト

### 2. ❌ 無効なトークンの処理
**確認内容:**
- 存在しないトークンで適切なエラーが表示
- エラーコード: `INVALID_TOKEN`
- 日本語エラーメッセージ:「無効なトークンです」
- 新規登録ページへのリンクが表示

### 3. ⏰ 期限切れトークンの処理
**確認内容:**
- 24時間経過後のトークンが無効になる
- エラーコード: `TOKEN_EXPIRED`
- 再送信ボタンが表示される（`canResend: true`）
- 期限切れの説明メッセージ

### 4. ✔️ 既に認証済みの場合
**確認内容:**
- 認証済みユーザーへの適切な対応
- 「既に確認済み」メッセージ
- ログインページへの誘導

### 5. 🚫 レート制限の確認
**確認内容:**
- 60秒のクールダウン期間
- 1時間に3回までの制限
- 制限超過時の適切なエラーメッセージ
- 残り試行回数の表示

### 6. 💾 データベースの状態確認
**確認内容:**
- Userコレクションの適切な更新
- RateLimitコレクションの作成と管理
- トークンの削除確認

## 🛠️ 手動テスト手順

### ステップ1: テストユーザーの作成

```bash
node scripts/create-test-user-for-verification.js
```

作成されるテストユーザー：
- `test-valid@example.com` - 正常な認証フロー用
- `test-expired@example.com` - 期限切れトークン用
- `test-verified@example.com` - 既に認証済み用
- `test-resend@example.com` - 再送信テスト用

### ステップ2: APIテスト

```bash
# 基本的なAPIテスト
node test-email-verification-flow.js

# 包括的なテスト
node scripts/test-email-verification-complete.js
```

### ステップ3: UIテスト

ブラウザで以下のURLにアクセス：

1. **無効なトークン:**
   ```
   http://localhost:3000/auth/verify?token=invalid-token
   ```

2. **トークンなし:**
   ```
   http://localhost:3000/auth/verify
   ```

3. **正常なトークン:**
   スクリプト実行後に表示されるURLを使用

## 📊 テスト結果の確認

### 成功時の出力例：
```
✅ PASS: 正常な認証フロー (すべてのチェック成功)
✅ PASS: 無効なトークン処理 (エラー処理正常)
✅ PASS: 期限切れトークン処理 (期限切れ処理正常)
✅ PASS: 既に認証済みの処理 (既認証処理正常)
✅ PASS: トークンなしエラー (トークンなしエラー正常)
✅ PASS: メール再送信機能 (再送信処理正常)
✅ PASS: レート制限機能 (レート制限動作確認)
✅ PASS: 無効なメール形式 (バリデーション正常)

🎉 すべてのテストが成功しました！
メール認証機能は完璧に動作しています ✨
```

### データベース状態の確認：
```
総ユーザー数: 4
認証済み: 2
未認証: 2
レート制限レコード: 1
```

## 🔧 トラブルシューティング

### サーバーが起動していない
```bash
npm run dev
```

### MongoDBが起動していない
```bash
mongod
```

### node-fetchがインストールされていない
```bash
npm install node-fetch
```

### テストユーザーのクリーンアップ
```javascript
// MongoDBシェルで実行
use board-app
db.users.deleteMany({
  email: {
    $in: [
      'test-valid@example.com',
      'test-expired@example.com',
      'test-verified@example.com',
      'test-resend@example.com'
    ]
  }
})
```

## 📁 関連ファイル

### テストスクリプト
- `scripts/run-complete-verification-test.sh` - 完全自動テスト
- `scripts/create-test-user-for-verification.js` - テストユーザー作成
- `scripts/test-email-verification-complete.js` - 包括的テスト
- `test-email-verification-flow.js` - 基本的なAPIテスト

### 実装ファイル
- `src/app/api/auth/verify/route.ts` - トークン検証API
- `src/app/api/auth/resend/route.ts` - メール再送信API
- `src/app/auth/verify/page.tsx` - 認証結果表示ページ
- `src/lib/errors/auth-errors.ts` - エラー定義
- `src/lib/auth/tokens.ts` - トークン管理
- `src/lib/auth/rate-limit.ts` - レート制限

## ✅ チェックリスト

テスト実行前の確認：
- [ ] 開発サーバーが起動している
- [ ] MongoDBが起動している
- [ ] node-fetchがインストールされている

テスト完了の確認：
- [ ] すべてのAPIテストが成功
- [ ] UIページが正しく表示される
- [ ] エラーメッセージが日本語で表示される
- [ ] レート制限が機能している
- [ ] データベースが正しく更新される

## 🎯 期待される結果

完璧な実装では、以下の結果が得られます：
1. 8つのテストケースすべてが成功
2. 成功率100%
3. データベースの整合性が保たれる
4. UIが適切にフィードバックを提供する
5. セキュリティ機能が正常に動作する