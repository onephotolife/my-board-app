# MongoDB Atlas 本番環境設定ガイド

## 1. クラスター作成と設定

### クラスタースペック（推奨）
- **プロバイダー**: AWS
- **リージョン**: ap-northeast-1 (東京)
- **クラスタータイプ**: M10 Dedicated (最小本番環境)
- **MongoDB バージョン**: 7.0以上
- **ストレージ**: 10GB SSD (自動スケーリング有効)

### パフォーマンス設定
```javascript
// 推奨設定
{
  "replicaSet": {
    "nodes": 3,  // 3ノードレプリカセット
    "priority": {
      "primary": 1,
      "secondary": [0.5, 0.5]
    }
  },
  "readPreference": "primaryPreferred",
  "writeConcern": {
    "w": "majority",
    "j": true,
    "wtimeout": 5000
  }
}
```

## 2. セキュリティ設定

### ネットワークアクセス
```yaml
IP Whitelist:
  - 0.0.0.0/0  # Vercel動的IPのため（注意: VPC Peeringが推奨）
  
将来的な改善:
  - Vercel Secure Compute使用
  - Private Endpointの設定
```

### データベースユーザー
```javascript
// ユーザー権限設定
{
  "username": "board_app_prod",
  "roles": [
    {
      "role": "readWrite",
      "db": "board-app-prod"
    }
  ],
  "authenticationRestrictions": [
    {
      "clientSource": ["0.0.0.0/0"],
      "serverAddress": []
    }
  ]
}
```

## 3. インデックス設定

### 必須インデックス作成スクリプト
```javascript
// scripts/setup-prod-indexes.js
const indexes = [
  // Posts collection
  {
    collection: 'posts',
    indexes: [
      { key: { createdAt: -1 }, name: 'createdAt_desc' },
      { key: { author: 1, createdAt: -1 }, name: 'author_createdAt' },
      { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
      { 
        key: { title: 'text', content: 'text' }, 
        name: 'text_search',
        weights: { title: 10, content: 5 }
      }
    ]
  },
  
  // Users collection
  {
    collection: 'users',
    indexes: [
      { key: { email: 1 }, name: 'email_unique', unique: true },
      { key: { username: 1 }, name: 'username_unique', unique: true },
      { key: { createdAt: -1 }, name: 'createdAt_desc' },
      { key: { 'emailVerified': 1 }, name: 'email_verified_status' }
    ]
  },
  
  // Sessions collection
  {
    collection: 'sessions',
    indexes: [
      { key: { sessionToken: 1 }, name: 'sessionToken_unique', unique: true },
      { key: { userId: 1 }, name: 'userId_index' },
      { 
        key: { expires: 1 }, 
        name: 'expires_ttl',
        expireAfterSeconds: 0  // TTLインデックス
      }
    ]
  }
];
```

## 4. バックアップ戦略

### 自動バックアップ設定
- **頻度**: 毎日 03:00 JST
- **保持期間**: 30日間
- **ポイントインタイムリカバリ**: 有効（過去24時間）

### 手動バックアップスクリプト
```bash
#!/bin/bash
# backup-mongodb.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb/${TIMESTAMP}"

mongodump \
  --uri="${MONGODB_URI}" \
  --out="${BACKUP_DIR}" \
  --gzip \
  --archive="${BACKUP_DIR}.gz"

# S3へアップロード
aws s3 cp "${BACKUP_DIR}.gz" "s3://your-backup-bucket/mongodb/${TIMESTAMP}.gz"
```

## 5. モニタリング設定

### Atlas監視メトリクス
```yaml
アラート設定:
  - CPU使用率 > 80%
  - メモリ使用率 > 85%
  - ディスク使用率 > 90%
  - 接続数 > 500
  - レプリケーション遅延 > 60秒
  - オペレーション実行時間 > 100ms

通知先:
  - Email: ops@your-domain.com
  - Slack: #alerts-production
  - PagerDuty: 緊急時のみ
```

### パフォーマンス最適化
```javascript
// Connection Pool設定
const mongoOptions = {
  maxPoolSize: 10,          // 最大接続数
  minPoolSize: 2,           // 最小接続数  
  maxIdleTimeMS: 10000,     // アイドルタイムアウト
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,                // IPv4を強制
  retryWrites: true,
  w: 'majority'
};
```

## 6. スケーリング計画

### 垂直スケーリング
```yaml
トラフィック増加時の段階的スケールアップ:
  Stage 1: M10 → M20 (2x CPU/RAM)
  Stage 2: M20 → M30 (4x CPU/RAM)  
  Stage 3: M30 → M40 (8x CPU/RAM)
  
トリガー条件:
  - 平均CPU使用率 > 70% (1週間)
  - 平均メモリ使用率 > 80% (1週間)
  - 接続数 > クラスター上限の80%
```

### 水平スケーリング
```yaml
シャーディング戦略:
  シャードキー: { userId: "hashed" }
  初期シャード数: 2
  
レプリカセット拡張:
  - 読み取り負荷分散用セカンダリ追加
  - 地理的分散（DR対策）
```

## 7. 災害復旧計画

### RPO/RTO目標
- **RPO (Recovery Point Objective)**: 1時間
- **RTO (Recovery Time Objective)**: 4時間

### 復旧手順
1. Atlas自動フェイルオーバー（自動）
2. 手動フェイルオーバー（必要時）
3. ポイントインタイムリカバリ
4. バックアップからの復元

## 8. コスト最適化

### 月額コスト見積もり
```yaml
M10クラスター:
  基本料金: $57/月
  ストレージ: $0.10/GB/月
  データ転送: $0.10/GB（アウトバウンド）
  バックアップ: $2.50/GB/月
  
推定月額: $80-120（通常トラフィック）
```

### コスト削減Tips
- 不要なインデックスの削除
- TTLインデックスによる古いデータ自動削除
- 適切なデータ圧縮設定
- リザーブドインスタンス検討（年間契約）

## 9. 接続文字列サンプル

```javascript
// 本番環境接続文字列
const MONGODB_URI = `mongodb+srv://${username}:${password}@cluster0.xxxxx.mongodb.net/board-app-prod?retryWrites=true&w=majority&maxPoolSize=10&minPoolSize=2&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000`;

// Mongoose接続設定
mongoose.connect(MONGODB_URI, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
});
```

## 10. チェックリスト

### デプロイ前確認
- [ ] クラスターが正常稼働
- [ ] バックアップ設定完了
- [ ] モニタリングアラート設定
- [ ] インデックス作成完了
- [ ] 接続テスト成功
- [ ] パフォーマンステスト完了
- [ ] セキュリティ監査パス
- [ ] 災害復旧テスト実施