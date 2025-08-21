# メール認証機能テストガイド
## 20人天才エンジニア会議による包括的テスト手順

### 🎯 テスト目的
実装したメール認証機能の動作確認と品質保証

### 📊 テスト項目一覧

| No | テスト項目 | 優先度 | 種別 |
|----|-----------|--------|------|
| 1 | 正常な認証フロー | HIGH | 機能 |
| 2 | 無効なトークン処理 | HIGH | エラー処理 |
| 3 | 期限切れトークン処理 | HIGH | エラー処理 |
| 4 | 既に認証済みの場合 | MEDIUM | 状態管理 |
| 5 | エラー表示の確認 | HIGH | UI/UX |
| 6 | データベース状態確認 | HIGH | データ整合性 |
| 7 | レート制限機能 | HIGH | セキュリティ |
| 8 | 再送信機能 | MEDIUM | 機能 |

---

## 🚀 テスト実行手順

### Step 1: 環境準備

```bash
# 1. 開発サーバー起動
npm run dev

# 2. 別ターミナルでMongoDBを確認
mongosh

# 3. データベースを選択
use board-app

# 4. 既存のテストデータをクリア（必要に応じて）
db.users.deleteMany({ email: /^test-/ })
```

### Step 2: テストケース実行

#### 🧪 TEST 1: 正常な認証フロー

**目的**: ユーザー登録から認証完了までの一連の流れを確認

**手順**:
1. ブラウザで `http://localhost:3000/auth/signup` を開く
2. 以下のテストデータで登録:
   - Email: `test-verify-[timestamp]@example.com`
   - Password: `TestPass123!`
   - Name: `Test User`
3. 登録成功後、MongoDBでトークンを確認

```javascript
// MongoDB確認コマンド
db.users.findOne({ email: "test-verify-xxx@example.com" })
```

**期待値**:
- ✅ emailVerificationToken: 64文字の16進数文字列
- ✅ emailVerificationTokenExpiry: 24時間後の日時
- ✅ emailVerified: false

4. 取得したトークンで認証ページにアクセス:
   `http://localhost:3000/auth/verify-email?token=[取得したトークン]`

**チェックポイント**:
- [ ] 成功メッセージが表示される
- [ ] 3秒後にサインインページへリダイレクト
- [ ] データベースで emailVerified が true に変更
- [ ] トークンフィールドがクリアされている

---

#### 🧪 TEST 2: 無効なトークンの処理

**手順**:
1. 以下のURLにアクセス:
   - `http://localhost:3000/auth/verify-email?token=invalid-token-12345`
   - `http://localhost:3000/auth/verify-email?token=` （空）
   - `http://localhost:3000/auth/verify-email` （パラメータなし）

**期待値**:
- ✅ エラーメッセージ: "トークンの形式が無効です"
- ✅ HTTPステータス: 400 Bad Request
- ✅ UIにエラーアイコンが表示される

---

#### 🧪 TEST 3: 期限切れトークンの処理

**手順**:
1. MongoDBで期限切れトークンを持つユーザーを作成:

```javascript
db.users.insertOne({
  email: "test-expired@example.com",
  password: "$2a$10$...", // ハッシュ化済み
  name: "Expired User",
  emailVerified: false,
  emailVerificationToken: "a".repeat(64),
  emailVerificationTokenExpiry: new Date(Date.now() - 25 * 60 * 60 * 1000)
})
```

2. URLにアクセス:
   `http://localhost:3000/auth/verify-email?token=aaaa...（64文字）`

**期待値**:
- ✅ エラー: "確認リンクの有効期限が切れています"
- ✅ 提案: "再送信ボタンをクリックして..."
- ✅ 再送信ボタンが表示される

---

#### 🧪 TEST 4: 既に認証済みユーザー

**手順**:
1. 既に認証済みのユーザーでトークンを生成:

```javascript
// MongoDB操作
db.users.updateOne(
  { email: "test-verified@example.com" },
  { 
    $set: { 
      emailVerified: true,
      emailVerificationToken: "b".repeat(64),
      emailVerificationTokenExpiry: new Date(Date.now() + 86400000)
    }
  }
)
```

2. URLにアクセス

**期待値**:
- ✅ メッセージ: "メールアドレスは既に確認済みです"
- ✅ HTTPステータス: 200 OK
- ✅ サインインページへのリンク表示

---

#### 🧪 TEST 5: エラー表示UI確認

**確認項目**:
- [ ] エラーメッセージが適切なアイコンと共に表示
- [ ] エラーの種類に応じた色分け（赤、黄、青）
- [ ] メッセージが読みやすく、次のアクションが明確
- [ ] レスポンシブデザインが正しく動作

---

#### 🧪 TEST 6: データベース状態の検証

**手順**:
```javascript
// MongoDB検証スクリプト
// 1. 統計情報
db.users.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      verified: { 
        $sum: { $cond: ["$emailVerified", 1, 0] }
      },
      withToken: {
        $sum: { $cond: [{ $ne: ["$emailVerificationToken", null] }, 1, 0] }
      }
    }
  }
])

// 2. 不整合データのチェック
db.users.find({
  emailVerified: true,
  emailVerificationToken: { $exists: true, $ne: null }
})
```

**期待値**:
- ✅ 認証済みユーザーにトークンが残っていない
- ✅ 期限切れトークンが適切に処理されている
- ✅ データの整合性が保たれている

---

#### 🧪 TEST 7: レート制限機能

**手順**:
1. 短時間に連続してAPIを呼び出す:

```bash
# ターミナルで実行
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/resend-verification \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
  echo ""
done
```

**期待値**:
- ✅ 5回目まで: 正常レスポンス
- ✅ 6回目: 429 Too Many Requests
- ✅ Retry-Afterヘッダーが設定されている
- ✅ エラーメッセージに待機時間が表示

---

#### 🧪 TEST 8: 再送信機能とUI

**手順**:
1. 未認証ユーザーでサインインを試みる
2. "メール未確認" ページで再送信ボタンをクリック
3. 連続クリックを試みる

**チェックポイント**:
- [ ] クールダウンタイマーが動作（60秒）
- [ ] プログレスバーが表示
- [ ] 残り再送信回数が表示（最大3回）
- [ ] 成功/エラートーストが適切に表示

---

## 🔧 トラブルシューティング

### よくある問題と対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| トークンが見つからない | DBとの不整合 | MongoDBを確認、モデルの同期 |
| 429エラーが出ない | レート制限未実装 | RateLimitモデルの確認 |
| メールが届かない | SMTP設定 | mailer-fixed.tsの設定確認 |
| UIが表示されない | コンポーネント未登録 | import文の確認 |

---

## 📊 テスト結果記録表

| テスト項目 | 実行日時 | 結果 | 備考 |
|-----------|---------|------|------|
| 正常な認証フロー | | ⬜ | |
| 無効なトークン | | ⬜ | |
| 期限切れトークン | | ⬜ | |
| 既に認証済み | | ⬜ | |
| エラー表示UI | | ⬜ | |
| DB状態検証 | | ⬜ | |
| レート制限 | | ⬜ | |
| 再送信機能 | | ⬜ | |

---

## 🚨 重要な確認事項

### セキュリティチェックリスト
- [ ] トークンが256ビット（64文字）の16進数
- [ ] タイミング攻撃対策が実装されている
- [ ] レート制限が正しく動作
- [ ] エラーメッセージが詳細すぎない
- [ ] HTTPSでの運用を前提としている

### パフォーマンスチェックリスト
- [ ] DB接続プールが適切に管理
- [ ] 不要なトークンが自動削除される
- [ ] インデックスが適切に設定されている
- [ ] レスポンスタイムが1秒以内

---

## 📈 メトリクス収集

### 測定すべき指標
1. **成功率**: 認証成功 / 総試行回数
2. **エラー率**: エラー発生 / 総リクエスト
3. **レスポンスタイム**: 平均応答時間
4. **再送信率**: 再送信回数 / 登録ユーザー数

### 監視コマンド
```javascript
// リアルタイムログ監視
db.users.watch([
  { $match: { operationType: { $in: ["insert", "update"] } } }
])

// レート制限状況
db.ratelimits.find().sort({ resetAt: -1 }).limit(10)
```

---

## ✅ テスト完了条件

以下の条件を全て満たした場合、テスト完了とする：

1. 全テストケースが PASS
2. エラー率が 1% 未満
3. レスポンスタイムが全て 1秒以内
4. セキュリティチェックリスト全項目がクリア
5. データ不整合が 0件

---

## 📞 サポート

問題が発生した場合：
1. エラーログを確認: `npm run logs`
2. MongoDB接続を確認: `npm run db:check`
3. 環境変数を確認: `.env`ファイル

作成者: 20人天才エンジニア会議
更新日: 2024-01-XX