# MongoDB Atlas クイックセットアップガイド
## 14人天才会議 - 天才8

---

## 🚀 クイックスタート（5分で完了）

### ステップ1: MongoDB Atlasアカウント作成
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)にアクセス
2. 「Try Free」をクリック
3. Googleアカウントまたはメールで登録

### ステップ2: 無料クラスター作成
1. **Create Cluster**をクリック
2. **M0 Free Tier**を選択（無料）
3. **Provider**: AWS推奨
4. **Region**: 最寄りのリージョンを選択
   - 日本の場合: `ap-northeast-1 (Tokyo)`
5. **Cluster Name**: デフォルトの`Cluster0`でOK
6. **Create Cluster**をクリック（1-3分待つ）

### ステップ3: データベースユーザー作成
1. 左メニューの**Database Access**をクリック
2. **Add New Database User**をクリック
3. 以下を入力:
   - **Username**: `boarduser`
   - **Password**: 強力なパスワード（例: `YourStrong#Pass2024`）
   - **Database User Privileges**: `Read and write to any database`
4. **Add User**をクリック

### ステップ4: ネットワークアクセス設定
1. 左メニューの**Network Access**をクリック
2. **Add IP Address**をクリック
3. **Allow Access from Anywhere**をクリック
   - これにより`0.0.0.0/0`が追加されます
   - ⚠️ 本番環境では特定のIPのみ許可推奨
4. **Confirm**をクリック

### ステップ5: 接続文字列の取得
1. **Database**タブに戻る
2. クラスター名の横の**Connect**をクリック
3. **Connect your application**を選択
4. **Driver**: Node.js、**Version**: 5.5 or laterを選択
5. 接続文字列をコピー

接続文字列の例:
```
mongodb+srv://boarduser:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
```

**重要**: 
- `<password>`を実際のパスワードに置き換え
- `cluster0.abcde`の`abcde`部分が実際のクラスターIDです
- `xxxxx`のままにしないでください！

---

## 📝 .env.local設定

### 現在の設定（ローカルMongoDB）
```env
# ローカルMongoDB（開発用）
MONGODB_URI=mongodb://localhost:27017/boardDB
```

### MongoDB Atlas追加設定

以下を`.env.local`に追加:

```env
# MongoDB Atlas（本番用）
MONGODB_URI_PRODUCTION=mongodb+srv://boarduser:YourStrong#Pass2024@cluster0.実際のID.mongodb.net/boardDB?retryWrites=true&w=majority

# MongoDB環境切り替え（atlasまたはlocal）
MONGODB_ENV=atlas
```

**注意事項**:
- `実際のID`を必ず置き換えてください
- パスワードに特殊文字が含まれる場合はURLエンコードが必要:
  - `@` → `%40`
  - `#` → `%23`
  - `!` → `%21`
  - `:` → `%3A`

---

## 🔍 接続確認

### 1. 検証スクリプト実行
```bash
node scripts/validate-mongodb-setup.js
```

### 2. アプリケーション起動（Atlas接続）
```bash
MONGODB_ENV=atlas npm run dev
```

### 3. 接続ログ確認
正常な場合:
```
🌐 MongoDB Atlasに接続を試みています...
📍 接続先: mongodb+srv://***@cluster0.abcde.mongodb.net/boardDB...
✅ MongoDB接続成功
```

---

## ❌ よくあるエラーと解決方法

### エラー1: "Invalid MongoDB URI - contains placeholder values"
**原因**: URIに`xxxxx`が含まれている
**解決**: MongoDB Atlasダッシュボードから実際のクラスターIDを取得

### エラー2: "Authentication failed"
**原因**: ユーザー名またはパスワードが間違っている
**解決**: 
1. Database Accessでユーザー名を確認
2. パスワードをリセット
3. 特殊文字をURLエンコード

### エラー3: "Could not connect to any servers"
**原因**: ネットワークアクセスが制限されている
**解決**: Network Accessで`0.0.0.0/0`を追加

### エラー4: "ECONNREFUSED"
**原因**: ローカルMongoDBが起動していない（MONGODB_ENV未設定時）
**解決**: 
```bash
brew services start mongodb-community
```

---

## 🔄 環境切り替え

### ローカルMongoDB使用
```bash
# .env.localで設定
MONGODB_ENV=local
# または環境変数を削除/コメントアウト

# アプリ起動
npm run dev
```

### MongoDB Atlas使用
```bash
# .env.localで設定
MONGODB_ENV=atlas

# アプリ起動
npm run dev
```

### 一時的な切り替え
```bash
# ローカル
MONGODB_ENV=local npm run dev

# Atlas
MONGODB_ENV=atlas npm run dev
```

---

## 📊 データ移行

既存のローカルデータをAtlasに移行:

```bash
node scripts/migrate-to-atlas.js
```

---

## ✅ チェックリスト

- [ ] MongoDB Atlasアカウント作成
- [ ] 無料クラスター作成（M0）
- [ ] データベースユーザー作成
- [ ] Network Access設定（0.0.0.0/0）
- [ ] 接続文字列取得
- [ ] .env.localに実際のクラスターID設定
- [ ] パスワードを正しく設定
- [ ] MONGODB_ENV=atlas設定
- [ ] 検証スクリプトで接続確認
- [ ] アプリケーションで動作確認

---

## 🆘 サポート

問題が解決しない場合:

1. `node scripts/validate-mongodb-setup.js`を実行
2. エラーメッセージを確認
3. このガイドの「よくあるエラー」を参照
4. MongoDB Atlasダッシュボードで接続状態を確認

---

*最終更新: 2025年1月*
*14人天才会議承認済み*