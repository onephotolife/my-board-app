# プロフィール自己紹介欄の包括的テスト手順

## 問題の概要
プロフィールページで自己紹介を保存しても、画面に表示されない問題

## 調査結果
ログから判明した事実：
- APIに送信される`bio`が`undefined`になっている
- サーバーログ: `bio: undefined`
- データベースには保存されていない可能性が高い

## テスト手順

### 1. 開発者ツールでのデバッグ（ブラウザ）

1. **Chrome DevToolsを開く**
   - F12キーまたは右クリック → 検証

2. **コンソールタブを確認**
   - http://localhost:3000/profile にアクセス
   - 以下のログを確認：
     - `Initializing form with user data:` - 初期データ
     - `handleSave called with formData:` - 保存時のデータ
     - `updateProfile called with data:` - API送信データ
     - `Sending to API:` - 実際のリクエストボディ
     - `API response:` - サーバーからのレスポンス

3. **ネットワークタブを確認**
   - PUT /api/profile リクエストを探す
   - Request Payloadを確認
   - Response を確認

### 2. サーバーログの確認（ターミナル）

```bash
# 開発サーバーのログを確認
npm run dev
```

保存時に以下を確認：
- `Received request body:` - 受信したデータ
- `Profile updated:` - 更新後のデータ

### 3. 手動テストチェックリスト

#### 初期表示の確認
- [ ] プロフィールページが表示される
- [ ] 既存の名前が表示される
- [ ] 自己紹介欄が表示される（空でも可）

#### 編集モードの確認
- [ ] 編集ボタンをクリック
- [ ] 自己紹介欄が編集可能になる
- [ ] 文字数カウンターが表示される

#### データ入力の確認
- [ ] 自己紹介に「テスト自己紹介文です」と入力
- [ ] 文字数が正しくカウントされる
- [ ] 200文字制限が機能する

#### 保存処理の確認
- [ ] 保存ボタンをクリック
- [ ] 成功メッセージが表示される
- [ ] 編集モードが終了する

#### 保存後の表示確認
- [ ] 入力した自己紹介が表示される
- [ ] ページをリロードしても表示される
- [ ] 再度編集モードにすると、保存した内容が表示される

### 4. APIテスト（curl）

```bash
# セッションクッキーを取得してテスト
# ブラウザのDevToolsでCookieを確認し、next-auth.session-tokenの値を使用

# プロフィール取得
curl -X GET http://localhost:3000/api/profile \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# プロフィール更新
curl -X PUT http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"name":"テストユーザー","bio":"APIテストの自己紹介"}'
```

### 5. MongoDBの確認

```bash
# MongoDBに接続
mongosh

# データベースを選択
use boardDB

# ユーザーデータを確認
db.users.findOne({email: "your-email@example.com"})
```

bioフィールドが正しく保存されているか確認

## 想定される問題と対処法

### 問題1: bioがundefinedで送信される
**症状**: コンソールログで`bio: undefined`
**原因**: フォームデータの管理に問題
**対処**: 
- formDataのbioプロパティが正しく設定されているか確認
- handleInputChangeが正しく動作しているか確認

### 問題2: APIがbioを保存しない
**症状**: APIは200を返すが、bioが保存されない
**原因**: MongoDBの更新処理に問題
**対処**:
- MongoDBのスキーマを確認
- findOneAndUpdateのオプションを確認

### 問題3: 保存後に画面が更新されない
**症状**: 保存は成功するが、画面に反映されない
**原因**: UserContextの状態更新に問題
**対処**:
- fetchUserProfileが正しく呼ばれているか確認
- setUserが正しいデータで呼ばれているか確認

## デバッグ用コンソールコマンド

ブラウザのコンソールで以下を実行：

```javascript
// 現在のformDataを確認
console.log(document.querySelector('textarea').value)

// Reactの内部状態を確認（React DevToolsが必要）
$r.props
$r.state
```

## 期待される正常な動作フロー

1. ユーザーが自己紹介を入力
2. formData.bioに値が設定される
3. handleSaveでupdateProfileが呼ばれる
4. UserContextがAPIにPUTリクエスト送信（bioを含む）
5. APIがMongoDBを更新
6. APIが更新されたユーザー情報を返す
7. UserContextがローカル状態を更新
8. 画面に反映される

## 次のステップ

1. 上記のテスト手順を実行
2. コンソールログとネットワークタブで問題箇所を特定
3. 特定された問題に応じて修正を適用