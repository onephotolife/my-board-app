# フォロー機能テストガイド

## 概要
フォロー機能の包括的なテストを提供します。2種類のテスト方法を用意しています。

## テストファイル

### 1. 統合テスト（Jest）
**ファイル**: `src/__tests__/models/follow.test.ts`

包括的なテストスイート：
- 基本的なフォロー操作
- カウンターの更新確認
- 重複フォローの防止
- アンフォロー機能
- フォロワー/フォロー中リストの取得
- パフォーマンステスト

### 2. 簡易テストスクリプト
**ファイル**: `scripts/test-follow-feature.js`

クイックテスト用スクリプト：
- セットアップ不要
- カラフルな出力
- 主要機能の動作確認

## 実行方法

### 方法1: 簡易テスト（推奨）
```bash
# 簡単なテストスクリプトを実行
npm run test:follow
```

**出力例**：
```
🚀 フォロー機能テスト開始

📊 MongoDB接続成功

==================================================
📝 テスト実行
==================================================

1️⃣ 基本的なフォロー操作
  ✅ PASS: ユーザーAがBをフォローできる

2️⃣ カウンターの更新確認
  ✅ PASS: Aのフォロー数が1になる
  ✅ PASS: Bのフォロワー数が1になる
  ✅ PASS: Aのフォロー数が2になる
  ✅ PASS: Aのフォロワー数が1になる

3️⃣ 重複フォローの防止
  ✅ PASS: 重複フォローでエラー
  ✅ PASS: 重複試行後もカウントは変わらない

4️⃣ アンフォロー機能
  ✅ PASS: Bのフォローを解除できる
  ✅ PASS: Aのフォロー数が1減る
  ✅ PASS: Bのフォロワー数が0になる

5️⃣ 相互フォロー
  ✅ PASS: 相互フォロー数が更新される
  ✅ PASS: 相互フォローフラグが設定される

6️⃣ 自己フォロー防止
  ✅ PASS: 自分自身をフォローできない

==================================================
📊 テスト結果サマリー
==================================================

  合計: 13 テスト
  成功: 13 テスト
  失敗: 0 テスト
  成功率: 100%

✅ すべてのテストが成功しました！
```

### 方法2: Jestテスト
```bash
# Jestでテストを実行
npm run test:follow:jest

# または
jest src/__tests__/models/follow.test.ts --verbose
```

### 方法3: 全テストスイート
```bash
# すべてのユニットテストを実行
npm run test:unit

# カバレッジ付きで実行
npm run test:coverage
```

## テスト内容

### 1. 基本的なフォロー操作 ✅
- ユーザーAがユーザーBをフォロー
- 自分自身をフォローできない
- 存在しないユーザーをフォローできない
- 無効なIDでフォローできない

### 2. カウンターの更新 ✅
- フォロー時のカウンター更新
- 複数フォロー時のカウンター
- 相互フォロー時のカウンター
- mutualFollowsCountの正確性

### 3. 重複フォロー防止 ✅
- 同じユーザーを重複フォロー不可
- MongoDBユニーク制約の動作確認

### 4. アンフォロー機能 ✅
- フォロー解除の動作
- カウンターの減算
- 相互フォロー解除時の処理
- フォローしていないユーザーのアンフォロー防止

### 5. リスト取得 ✅
- フォロワーリスト取得
- フォロー中リスト取得
- ページネーション

### 6. パフォーマンス ✅
- updateFollowCountsの実行時間
- 大量フォロー時の処理速度

## トラブルシューティング

### MongoDBが起動していない
```bash
# MongoDB起動（macOS）
brew services start mongodb-community

# Docker使用の場合
docker run -d -p 27017:27017 mongo:latest
```

### mongodb-memory-serverエラー
```bash
# 依存関係の再インストール
npm install --save-dev mongodb-memory-server
```

### テストが遅い
- 初回実行時はmongodb-memory-serverのバイナリダウンロードで時間がかかります
- 2回目以降は高速化されます

### テストデータが残る
```bash
# MongoDBシェルでクリーンアップ
mongosh
> use board-app-test
> db.users.deleteMany({ email: /^test.*@test\.com$/ })
> db.follows.deleteMany({})
```

## CI/CD統合

### GitHub Actions例
```yaml
name: Test Follow Feature

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run follow tests
      run: npm run test:follow
      env:
        MONGODB_URI: mongodb://localhost:27017/test
```

## 開発時のテストワークフロー

1. **機能開発前**：テストを実行して現状確認
2. **開発中**：watchモードでテスト実行
   ```bash
   npm run test:watch -- follow.test
   ```
3. **開発後**：全テストスイート実行
4. **コミット前**：簡易テスト実行
5. **PR前**：カバレッジ確認

## テスト成功基準

- ✅ 全13項目がPASS
- ✅ カウンターが正確
- ✅ エラーハンドリングが適切
- ✅ パフォーマンス基準を満たす（< 1秒）
- ✅ データベースの整合性維持

## 次のステップ

1. **E2Eテスト追加**: PlaywrightでUIテスト
2. **負荷テスト**: 大量フォロー時の性能測定
3. **APIテスト**: RESTエンドポイントのテスト
4. **通知テスト**: フォロー通知の動作確認