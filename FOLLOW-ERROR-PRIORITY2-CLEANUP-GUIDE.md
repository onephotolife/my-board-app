# データクリーンアップスクリプト実行ガイド

## 概要

**目的**: 孤立した投稿（存在しないユーザーを参照）の処理
**スクリプト**: `/scripts/cleanup-orphaned-posts.js`
**推奨戦略**: 匿名化（データ保持優先）
**実装優先度**: 2（週内実装）

---

## 前提条件

### 必要な権限
- MongoDBへの読み取り/書き込み権限
- バックアップ作成権限
- スクリプト実行権限

### 必要なパッケージ
```bash
# パッケージがインストールされていることを確認
npm list mongoose
```

インストールされていない場合:
```bash
npm install mongoose
```

---

## 実行手順

### Step 1: 事前準備

#### 1.1 バックアップの作成（重要！）
```bash
# MongoDBの完全バックアップ
mongodump --uri="mongodb://localhost:27017/board-app" --out="./backup/$(date +%Y%m%d_%H%M%S)"
```

#### 1.2 現在の状態確認
```bash
# MongoDBコンソールで確認
mongosh board-app

# 投稿の総数を確認
db.posts.count()

# ユーザーの総数を確認
db.users.count()

# サンプルデータ確認
db.posts.findOne()
```

### Step 2: ドライラン実行（必須）

#### 2.1 ドライランで影響範囲を確認
```bash
# 環境変数を設定してドライラン実行
DRY_RUN=true node scripts/cleanup-orphaned-posts.js
```

期待される出力例:
```
====================================================
🧹 孤立した投稿のクリーンアップスクリプト
====================================================

📡 MongoDBに接続中...
✅ MongoDB接続成功

=== 孤立した投稿の特定 ===
📊 総投稿数: 150
進捗: 100% (150/150)

⚠️  孤立した投稿が 5 件見つかりました:
  - 投稿ID: 60abc123...
    タイトル: テスト投稿
    元の作成者ID: 68a8176840abde7f4273e6e9
    元の作成者名: 掲示板テストユーザー1
    作成日: 2025-08-15T10:30:00.000Z

=== 投稿の匿名化処理 ===
🔍 ドライランモード: 実際の変更は行いません
📋 5 件の投稿が匿名化対象です（ドライラン）
```

#### 2.2 結果の確認ポイント
- [ ] 孤立投稿数が妥当か確認（通常は総投稿数の5%以下）
- [ ] 重要な投稿が含まれていないか確認
- [ ] エラーメッセージがないか確認

### Step 3: 実行戦略の選択

#### Option A: 匿名化戦略（推奨）
```bash
# 匿名化で実行（デフォルト）
node scripts/cleanup-orphaned-posts.js
```

**メリット**:
- 投稿データを保持
- 統計情報への影響が最小
- ロールバック不要

**処理内容**:
```javascript
author: {
  _id: null,
  name: "削除されたユーザー",
  email: "deleted@example.com"
}
```

#### Option B: 削除戦略（慎重に検討）
```bash
# 削除戦略で実行（バックアップ必須）
STRATEGY=delete node scripts/cleanup-orphaned-posts.js
```

**メリット**:
- データベースサイズ削減
- 完全なクリーンアップ

**デメリット**:
- データの永久削除
- ロールバック困難

### Step 4: 本番実行

#### 4.1 実行コマンド
```bash
# 推奨: 匿名化戦略で実行
node scripts/cleanup-orphaned-posts.js

# プロンプトが表示される
⚠️  5 件の投稿を匿名化します。続行しますか？ (yes/no): 
# "yes" と入力して続行
```

#### 4.2 実行中の監視
```bash
# 別ターミナルでログ監視
tail -f logs/cleanup.log  # ログファイルがある場合

# MongoDB接続数を監視
mongosh board-app --eval "db.serverStatus().connections"
```

### Step 5: 実行後の確認

#### 5.1 処理結果の確認
```bash
# MongoDBコンソールで確認
mongosh board-app

# 匿名化された投稿を確認
db.posts.find({ "author.name": "削除されたユーザー" }).count()

# サンプル確認
db.posts.findOne({ "author.name": "削除されたユーザー" })
```

#### 5.2 アプリケーション動作確認
```bash
# 開発サーバーを起動
npm run dev

# ブラウザで確認
# http://localhost:3000/board
```

確認項目:
- [ ] ページが正常に表示される
- [ ] 匿名化された投稿が表示される
- [ ] フォローボタンが適切に無効化されている
- [ ] エラーメッセージが表示されない

---

## トラブルシューティング

### エラー: MongoDB接続失敗
```bash
# 接続URIを明示的に指定
MONGODB_URI="mongodb://username:password@localhost:27017/board-app" node scripts/cleanup-orphaned-posts.js
```

### エラー: メモリ不足
```bash
# バッチサイズを小さくする
BATCH_SIZE=50 node scripts/cleanup-orphaned-posts.js
```

### エラー: タイムアウト
```bash
# MongoDBの接続タイムアウトを延長
MONGODB_URI="mongodb://localhost:27017/board-app?connectTimeoutMS=30000" node scripts/cleanup-orphaned-posts.js
```

---

## ロールバック手順

### 匿名化からのロールバック
```javascript
// MongoDBコンソールで実行
db.posts.updateMany(
  { "author.name": "削除されたユーザー" },
  { 
    $set: { 
      "author": {
        "_id": "original_id",  // バックアップから復元
        "name": "original_name",
        "email": "original_email"
      }
    }
  }
)
```

### 削除からのロールバック
```bash
# バックアップから復元
mongorestore --uri="mongodb://localhost:27017/board-app" ./backup/20250828_120000/board-app
```

---

## パフォーマンス考慮事項

### 大規模データベースの場合

#### 1. オフピーク時間での実行
```bash
# cronで夜間実行をスケジュール
0 2 * * * /usr/bin/node /path/to/cleanup-orphaned-posts.js >> /var/log/cleanup.log 2>&1
```

#### 2. 段階的実行
```bash
# 100件ずつ処理
BATCH_SIZE=100 node scripts/cleanup-orphaned-posts.js
```

#### 3. インデックスの最適化
```javascript
// 実行前にインデックスを作成
db.posts.createIndex({ "author._id": 1 })
db.users.createIndex({ "_id": 1 })
```

---

## 実行ログの例

### 成功時のログ
```
====================================================
📊 実行結果レポート
====================================================

実行モード: 本番実行
処理戦略: 匿名化
バッチサイズ: 100

統計情報:
  総投稿数: 150
  孤立投稿数: 5
  処理成功: 5
  処理失敗: 0

====================================================
実行完了時刻: 2025年8月28日 15:30:45
====================================================
```

### 失敗時のログ
```
⚠️  エラー詳細:
  1. バッチ 2 の匿名化に失敗: MongoError: Write conflict
  
処理成功: 3
処理失敗: 2
```

---

## チェックリスト

### 実行前
- [ ] バックアップ作成完了
- [ ] ドライラン実行完了
- [ ] 影響範囲の確認完了
- [ ] ステークホルダーへの通知完了

### 実行中
- [ ] エラー監視実施
- [ ] パフォーマンス監視実施

### 実行後
- [ ] 処理結果の確認完了
- [ ] アプリケーション動作確認完了
- [ ] エラーログの確認完了
- [ ] レポート作成完了

---

## 注意事項

1. **本番環境での実行は必ずドライランを先に実施**
2. **バックアップは必須（特に削除戦略の場合）**
3. **実行時間は投稿数に比例（1万件で約5分）**
4. **同時実行は避ける（データ整合性のため）**
5. **実行後は必ずアプリケーション動作を確認**

---

## サポート情報

問題が発生した場合:
1. エラーログを確認
2. バックアップから復元を検討
3. 開発チームにエスカレーション

作成日: 2025年8月28日
作成者: システムアーキテクト #2
バージョン: 1.0.0