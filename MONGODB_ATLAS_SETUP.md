# MongoDB Atlas設定ガイド
## 14人天才会議 - MongoDB接続問題解決

### 📋 現在の状況
- **現在**: ローカルMongoDB（mongodb://localhost:27017/boardDB）に接続中
- **目標**: MongoDB Atlas（オンライン）への接続に切り替え

### 🚀 MongoDB Atlas セットアップ手順

## 1. MongoDB Atlas アカウント作成

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) にアクセス
2. 無料アカウントを作成（既にある場合はログイン）

## 2. クラスターの作成

1. **New Project** をクリックして新規プロジェクトを作成
   - プロジェクト名: `BoardApp` など

2. **Build a Cluster** をクリック
   - **Free Tier** (M0) を選択（無料）
   - **Cloud Provider**: AWS を推奨
   - **Region**: `Asia Pacific (Tokyo) ap-northeast-1` を選択（日本から近い）
   - **Cluster Name**: `cluster0` など

3. クラスター作成完了まで待機（約3-5分）

## 3. データベースユーザーの作成

1. 左側メニューの **Database Access** をクリック
2. **Add New Database User** をクリック
3. 認証方法: **Password**
4. ユーザー名とパスワードを設定
   ```
   Username: boardapp-user
   Password: [強力なパスワードを生成]
   ```
   ⚠️ **重要**: パスワードに特殊文字（@、$、#など）が含まれる場合は避けるか、URLエンコードが必要

5. **Database User Privileges**: `Atlas Admin` または `Read and write to any database`
6. **Add User** をクリック

## 4. ネットワークアクセスの設定

1. 左側メニューの **Network Access** をクリック
2. **Add IP Address** をクリック
3. 以下のいずれかを選択：
   - **Allow Access from Anywhere** (0.0.0.0/0) - 開発中は推奨
   - **Add Current IP Address** - より安全（ただしIPが変わると再設定が必要）
4. **Confirm** をクリック

## 5. 接続文字列の取得

1. **Database** セクションに移動
2. クラスターの **Connect** ボタンをクリック
3. **Connect your application** を選択
4. **Driver**: Node.js、**Version**: 5.5 or later を選択
5. 接続文字列をコピー：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## 6. 環境変数の設定

### 方法1: .env.localを更新（開発環境）

`.env.local` ファイルを編集：
```env
# Database - MongoDB Atlasに変更
MONGODB_URI=mongodb+srv://boardapp-user:YourPassword@cluster0.xxxxx.mongodb.net/boardDB?retryWrites=true&w=majority

# 以下は既存の設定を維持
NEXTAUTH_URL=http://localhost:3000
# ... 他の設定
```

### 方法2: .env.productionを使用（本番環境）

`.env.production` ファイルを編集：
```env
# Database - MongoDB Atlas
MONGODB_URI_PRODUCTION=mongodb+srv://boardapp-user:YourPassword@cluster0.xxxxx.mongodb.net/boardDB?retryWrites=true&w=majority

# 本番環境のURL
NEXTAUTH_URL=https://your-production-domain.com
# ... 他の設定
```

そして、環境変数を使用するように設定：
```bash
# 本番環境での起動
MONGODB_URI_PRODUCTION="mongodb+srv://..." npm run dev
```

## 7. 接続テスト

```bash
# MongoDB接続テストスクリプトを実行
node scripts/test-mongodb-connection.js
```

成功すると以下のような表示：
```
✅ 接続成功！
接続タイプ: MongoDB Atlas (オンライン)
データベース名: boardDB
```

## 8. データの移行（オプション）

ローカルのMongoDBからMongoDB Atlasへデータを移行する場合：

### 方法1: MongoDB Compass を使用

1. [MongoDB Compass](https://www.mongodb.com/products/compass) をダウンロード
2. ローカルMongoDBに接続してデータをエクスポート
3. MongoDB Atlasに接続してデータをインポート

### 方法2: mongodump/mongorestore を使用

```bash
# ローカルからエクスポート
mongodump --uri="mongodb://localhost:27017/boardDB" --out=./backup

# Atlasへインポート
mongorestore --uri="mongodb+srv://boardapp-user:password@cluster0.xxxxx.mongodb.net/boardDB" ./backup/boardDB
```

### 方法3: スクリプトを使用（簡易版）

```bash
node scripts/migrate-to-atlas.js
```

## 🔍 トラブルシューティング

### エラー: `MongoServerError: bad auth`
- **原因**: ユーザー名またはパスワードが間違っている
- **解決**: Database Accessでユーザー情報を確認

### エラー: `MongoNetworkError: ETIMEDOUT`
- **原因**: ネットワークアクセスが制限されている
- **解決**: Network Accessで現在のIPを追加

### エラー: `querySrv ENOTFOUND`
- **原因**: 接続文字列が間違っている
- **解決**: Connectから正しい接続文字列を再取得

### エラー: `MongoServerError: user is not allowed`
- **原因**: ユーザー権限が不足
- **解決**: Database Accessでユーザー権限を確認

## ✅ 確認項目チェックリスト

- [ ] MongoDB Atlasアカウント作成済み
- [ ] クラスター作成済み
- [ ] データベースユーザー作成済み
- [ ] ネットワークアクセス設定済み
- [ ] 接続文字列取得済み
- [ ] .env.localまたは.env.production更新済み
- [ ] 接続テスト成功
- [ ] アプリケーション起動確認
- [ ] ユーザー登録機能の動作確認
- [ ] MongoDB Atlas上でデータ確認

## 📝 本番環境への適用

### Vercel の場合
1. Vercelダッシュボードにアクセス
2. プロジェクトの Settings → Environment Variables
3. `MONGODB_URI` に MongoDB Atlas の接続文字列を設定
4. デプロイを再実行

### その他のホスティングサービス
各サービスの環境変数設定画面から `MONGODB_URI` を設定

## 🎯 最終確認

```bash
# 開発環境で確認
npm run dev

# ブラウザで確認
open http://localhost:3000

# 新規ユーザー登録を実行
# MongoDB Atlas の Database → Browse Collections でデータを確認
```

---

**問題が解決しない場合**:
1. エラーメッセージを詳細に記録
2. `node scripts/test-mongodb-connection.js` の出力を確認
3. MongoDB Atlas のログを確認（Cluster → Metrics → Logs）