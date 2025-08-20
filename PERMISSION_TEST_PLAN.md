# 権限管理システム テスト計画書

## 1. テスト環境準備

### 必要なテストユーザー
1. **User A** (テスト主体)
   - Email: `testuser-a@example.com`
   - Role: `user`
   - 自分の投稿を作成・編集・削除

2. **User B** (他ユーザー)
   - Email: `testuser-b@example.com`
   - Role: `user`
   - User Aの投稿へのアクセステスト用

3. **Admin User** (管理者)
   - Email: `admin@example.com`
   - Role: `admin`
   - すべての投稿を管理可能

## 2. テストシナリオ

### 🟢 Phase 1: 基本的な権限チェック

#### Test 1.1: 自分の投稿の編集
```
前提条件: User Aでログイン
1. 新規投稿を作成
2. 作成した投稿の編集ボタンをクリック
3. 内容を変更して保存

期待結果:
✅ 編集ボタンが有効で表示される
✅ 編集ダイアログが開く
✅ 変更が正常に保存される
✅ 成功メッセージが表示される
```

#### Test 1.2: 自分の投稿の削除
```
前提条件: User Aでログイン
1. 自分の投稿の削除ボタンをクリック
2. 確認ダイアログで「削除」をクリック

期待結果:
✅ 削除ボタンが有効で表示される
✅ 確認ダイアログが表示される
✅ 投稿が正常に削除される
✅ リストから投稿が消える
```

### 🔴 Phase 2: 権限違反のテスト

#### Test 2.1: 他人の投稿の編集試行（UI）
```
前提条件: User Bでログイン
1. User Aの投稿を表示
2. 編集ボタンの状態を確認

期待結果:
⛔ 編集ボタンが無効化されている
⛔ ホバー時に「編集権限がありません」表示
⛔ クリックしても反応しない
```

#### Test 2.2: 他人の投稿の削除試行（UI）
```
前提条件: User Bでログイン
1. User Aの投稿を表示
2. 削除ボタンの状態を確認

期待結果:
⛔ 削除ボタンが無効化されている
⛔ ホバー時に「削除権限がありません」表示
⛔ クリックしても反応しない
```

### 🛡️ Phase 3: API直接アクセステスト

#### Test 3.1: 権限なしでのPUT要求
```bash
# User BのセッションでUser Aの投稿を編集試行
curl -X PUT http://localhost:3000/api/posts/{postId} \
  -H "Content-Type: application/json" \
  -H "Cookie: {UserB-Session}" \
  -d '{"content": "Hacked content"}'

期待結果:
⛔ HTTPステータス: 403 Forbidden
⛔ エラーメッセージ: "この操作を実行する権限がありません"
```

#### Test 3.2: 権限なしでのDELETE要求
```bash
# User BのセッションでUser Aの投稿を削除試行
curl -X DELETE http://localhost:3000/api/posts/{postId} \
  -H "Cookie: {UserB-Session}"

期待結果:
⛔ HTTPステータス: 403 Forbidden
⛔ エラーメッセージ: "この操作を実行する権限がありません"
```

#### Test 3.3: 未認証でのアクセス
```bash
# セッションなしでAPIアクセス
curl -X PUT http://localhost:3000/api/posts/{postId} \
  -H "Content-Type: application/json" \
  -d '{"content": "Anonymous update"}'

期待結果:
⛔ HTTPステータス: 401 Unauthorized
⛔ エラーメッセージ: "認証が必要です"
```

### 🎭 Phase 4: ロールベーステスト

#### Test 4.1: 管理者権限での全投稿管理
```
前提条件: Admin Userでログイン
1. User Aの投稿を表示
2. 編集・削除ボタンの確認
3. 実際に編集・削除を実行

期待結果:
✅ すべての投稿で編集・削除ボタンが有効
✅ 他人の投稿も編集可能
✅ 他人の投稿も削除可能
```

## 3. エラーハンドリングテスト

### Test 5.1: 権限エラー表示
```
シナリオ: 権限違反時のUI表示
1. 権限のない操作を試行
2. エラーメッセージを確認

チェックポイント:
✅ Material UIのAlertコンポーネント表示
✅ 適切なエラーメッセージ
✅ エラーアイコンの表示
✅ ユーザーフレンドリーな文言
```

## 4. セキュリティテスト

### Test 6.1: CSRF攻撃の防御
```
悪意のあるサイトからのリクエストを模倣
期待結果: リクエストが拒否される
```

### Test 6.2: SQLインジェクション対策
```
入力フィールドに悪意のあるコードを挿入
期待結果: 適切にサニタイズされる
```

## 5. パフォーマンステスト

### Test 7.1: 権限チェックの応答時間
```
測定項目:
- 権限チェックAPI応答時間: < 100ms
- UI更新時間: < 200ms
- バッチ権限チェック: < 500ms
```

## 6. 自動テストスクリプト

### Jest/Testing Libraryテスト
```javascript
describe('Permission System', () => {
  test('User can edit own post', async () => {
    // テスト実装
  });
  
  test('User cannot edit others post', async () => {
    // テスト実装
  });
});
```

### Playwrightテスト
```javascript
test('Permission UI Test', async ({ page }) => {
  // E2Eテスト実装
});
```

## 7. チェックリスト

### UI表示確認
- [ ] 自分の投稿: 編集ボタン有効
- [ ] 自分の投稿: 削除ボタン有効
- [ ] 他人の投稿: 編集ボタン無効
- [ ] 他人の投稿: 削除ボタン無効
- [ ] ツールチップメッセージ表示

### API権限確認
- [ ] 認証なし: 401エラー
- [ ] 権限なし: 403エラー
- [ ] 所有者: 200成功
- [ ] 管理者: 200成功

### エラー表示確認
- [ ] 権限エラーアラート表示
- [ ] エラーメッセージの正確性
- [ ] エラー後の画面遷移

### セキュリティ確認
- [ ] セッション検証
- [ ] CSRF保護
- [ ] 入力値検証

## 8. テスト実行コマンド

```bash
# 開発サーバー起動
npm run dev

# テストユーザー作成（MongoDBシェル）
mongosh
use boardDB
db.users.insertMany([
  {
    email: "testuser-a@example.com",
    name: "Test User A",
    role: "user",
    password: "$2a$10$..." // bcryptハッシュ
  },
  {
    email: "testuser-b@example.com",
    name: "Test User B",
    role: "user",
    password: "$2a$10$..."
  }
])

# 自動テスト実行
npm test
npx playwright test
```

## 9. 期待される結果

### 成功基準
1. 所有者のみが自分の投稿を編集・削除できる
2. 権限のない操作はUIレベルで防がれる
3. APIレベルでも権限チェックが機能する
4. エラーメッセージが適切に表示される
5. 管理者は全投稿を管理できる

### 失敗時の対応
1. エラーログの確認
2. 権限チェックロジックのデバッグ
3. セッション状態の検証
4. データベースの権限フィールド確認