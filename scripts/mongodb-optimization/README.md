# MongoDB Atlas設定最適化ガイド

## 📋 概要

このガイドでは、MongoDB Atlasの接続設定を最適化し、運用安定性を向上させるための包括的な手順を説明します。

## 🎯 最適化の目的

- **接続安定性の向上**: 自動再接続とエラーハンドリング
- **パフォーマンス最適化**: 接続プールとタイムアウト設定
- **運用監視の強化**: ヘルスチェックとアラート機能
- **環境分離の明確化**: 開発/本番環境の適切な設定

## 🚀 実行手順

### Phase 1: 準備と実行

#### 1. バックアップの作成

```bash
# 現在の設定をバックアップ
cp .env.local .env.local.backup
cp -r src/lib/db src/lib/db.backup
```

#### 2. 最適化スクリプトの実行

```bash
# 最適化スクリプトを実行
node scripts/mongodb-optimization/mongodb-atlas-optimization.js
```

#### 3. 環境設定の確認

```bash
# 作成された設定ファイルを確認
cat .env.local | grep MONGODB
cat .env.production | grep MONGODB
```

### Phase 2: 環境設定のカスタマイズ

#### MongoDB Atlas接続文字列の設定

```bash
# .env.local または .env.production を編集
MONGODB_URI_PRODUCTION=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/boardDB?retryWrites=true&w=majority
MONGODB_ENV=atlas
```

#### 接続プールの最適化

```bash
# .env.local に追加
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_RETRY_ATTEMPTS=3
MONGODB_CONNECTION_TIMEOUT=30000
```

### Phase 3: テストと検証

#### 1. 接続テスト

```bash
# 接続テストを実行
node scripts/mongodb-optimization/test-connection.js
```

#### 2. パフォーマンステスト

```bash
# パフォーマンステストを実行
node scripts/mongodb-optimization/test-performance.js
```

#### 3. 監視テスト

```bash
# 監視スクリプトを起動
node scripts/mongodb-optimization/monitor.js
```

### Phase 4: 既存コードの移行

#### 移行前の確認

```bash
# 移行分析を実行
node scripts/mongodb-optimization/migrate-to-optimized.js
```

#### インポート文の更新

```typescript
// 変更前
import dbConnect from '../lib/mongodb';
import connectToMongoDB from '../lib/db/mongodb-local';

// 変更後
import { connectToMongoDB, getMongoManager } from '../lib/db/mongodb-optimized';
```

#### 接続呼び出しの更新

```typescript
// 変更前
await dbConnect();
await connectToMongoDB();

// 変更後
await connectToMongoDB();
const manager = getMongoManager();
```

## 🔧 高度な設定オプション

### 接続プールの詳細設定

```typescript
// src/lib/db/mongodb-optimized.ts の設定をカスタマイズ
const atlasOptions: mongoose.ConnectOptions = {
  maxPoolSize: 15, // 本番環境では増加
  minPoolSize: 3, // 最小接続数を確保
  maxIdleTimeMS: 30000, // アイドル接続のタイムアウト
  serverSelectionTimeoutMS: 5000, // サーバー選択タイムアウト
  socketTimeoutMS: 45000, // ソケットタイムアウト
  bufferCommands: false, // バッファリング無効
  bufferMaxEntries: 0, // バッファエントリ制限
};
```

### 監視設定のカスタマイズ

```typescript
// 監視間隔の調整
setInterval(() => {
  this.performHealthCheck();
}, process.env.MONGODB_HEALTH_CHECK_INTERVAL || 30000);
```

### エラーハンドリングのカスタマイズ

```typescript
// カスタムエラーハンドリング
mongoose.connection.on('error', (error) => {
  console.error('MongoDB Error:', error);

  // Slack通知などのカスタム処理を追加
  if (process.env.NODE_ENV === 'production') {
    notifySlack(error);
  }
});
```

## 📊 監視と運用

### 定期的なヘルスチェック

```bash
# 監視スクリプトをバックグラウンドで実行
nohup node scripts/mongodb-optimization/monitor.js &
```

### パフォーマンス監視

```bash
# パフォーマンスレポート生成
node scripts/mongodb-optimization/test-performance.js > performance-report-$(date +%Y%m%d).json
```

### アラート設定

```typescript
// カスタムアラート条件
if (connectionAttempts > 5) {
  sendAlert('MongoDB接続不安定');
}

if (responseTime > 1000) {
  sendAlert('MongoDB応答遅延');
}
```

## 🛠️ トラブルシューティング

### 接続エラーの場合

```bash
# 接続状態の詳細確認
node -e "
const { getMongoConnectionState } = require('./src/lib/db/mongodb-optimized.ts');
console.log(getMongoConnectionState());
"
```

### パフォーマンス問題の場合

```bash
# 接続プールの状態確認
node -e "
const mongoose = require('mongoose');
console.log('接続プール状態:', mongoose.connection.db.serverConfig);
"
```

### Atlas固有の問題の場合

```bash
# Atlas接続文字列の検証
node -e "
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI_PRODUCTION;
const client = new MongoClient(uri);
client.connect().then(() => console.log('Atlas接続成功')).catch(console.error);
"
```

## 📈 パフォーマンス指標

### 目標値

- **接続時間**: < 2秒
- **クエリ応答時間**: < 100ms
- **接続成功率**: > 99.9%
- **再接続試行回数**: < 3回/日

### 監視項目

- 接続プールの使用率
- クエリの平均応答時間
- エラー発生率
- 再接続発生回数

## 🔒 セキュリティ考慮事項

### Atlas接続のセキュリティ

```bash
# IPホワイトリスト設定
# MongoDB Atlasダッシュボードで以下を設定:
# - 開発環境: 開発マシンのIP
# - 本番環境: サーバーのIPのみ
```

### 認証情報の管理

```bash
# 環境変数の適切な設定
MONGODB_URI_PRODUCTION=mongodb+srv://app-user:secure-password@cluster0.xxxxx.mongodb.net/boardDB
```

### TLS/SSL設定

```typescript
// TLS設定の確認
const options = {
  ssl: true,
  tls: true,
  tlsInsecure: false, // 本番では必ずfalse
  tlsCAFile: process.env.MONGODB_CA_FILE, // カスタムCAが必要な場合
};
```

## 📝 移行チェックリスト

### 準備段階

- [ ] 現在のMongoDB接続実装のバックアップ
- [ ] 環境変数のバックアップ
- [ ] テスト環境での動作確認

### 実行段階

- [ ] 最適化スクリプトの実行
- [ ] 環境設定の更新
- [ ] 接続テストの実行
- [ ] パフォーマンステストの実行

### 検証段階

- [ ] 既存APIの動作確認
- [ ] エラーハンドリングの確認
- [ ] 監視機能の動作確認
- [ ] 負荷テストの実行

### 本番移行段階

- [ ] 本番環境の設定更新
- [ ] 段階的なトラフィック移行
- [ ] 監視強化
- [ ] ロールバック計画の準備

## 🎯 成功基準

### 機能要件

- [ ] MongoDB Atlasへの安定した接続
- [ ] 自動再接続機能の動作
- [ ] エラーハンドリングの適切な動作
- [ ] パフォーマンスの向上

### 非機能要件

- [ ] 運用監視体制の確立
- [ ] トラブルシューティング手順の整備
- [ ] ドキュメントの更新
- [ ] チームへの周知

## 📞 サポート

### 問題発生時の対応

1. **接続エラー**: 接続テストスクリプトを実行
2. **パフォーマンス問題**: パフォーマンステストを実行
3. **監視アラート**: 監視ログを確認
4. **重大障害**: バックアップからのロールバック

### ログの確認方法

```bash
# アプリケーションのログ
tail -f logs/application.log

# MongoDB接続ログ
tail -f logs/mongodb-connection.log

# 監視ログ
tail -f logs/mongodb-monitor.log
```

---

## 🚀 クイックスタート

```bash
# 1. バックアップ
cp .env.local .env.local.backup

# 2. 最適化実行
node scripts/mongodb-optimization/mongodb-atlas-optimization.js

# 3. 設定編集
nano .env.local  # MONGODB_URI_PRODUCTIONを設定

# 4. テスト
node scripts/mongodb-optimization/test-connection.js

# 5. 監視開始
node scripts/mongodb-optimization/monitor.js
```

**これでMongoDB Atlasの運用安定性が大幅に向上します！ 🎉**
