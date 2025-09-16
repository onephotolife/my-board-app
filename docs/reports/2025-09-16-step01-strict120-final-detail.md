# Step01 Strict120 最終完了レポート（詳細）

## 1. 概要

- 対象ブランチ: `feat/search-phase2-ui`
- 対象指示書: 「01 — DATA MODEL & MIGRATION 最終完了指示書（STRICT120 版・v2）」
- 作業目的: Step01 全項目の確実な完了と、指示書に基づくデータモデル移行・検証の完全実施。
- 実施期間: 2025-09-16 (UTC-07:00) 作業開始〜完了まで。
- MongoDB 接続先: `mongodb://127.0.0.1:27017/boardDB`

## 2. 実施内容の時系列

| 時刻 (PDT) | 操作                         | コマンド/ファイル                            | 結果                                                                | メモ                                                                       |
| ---------- | ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 05:15      | 正規化ユーティリティ差し替え | `src/lib/search/ja-normalize.ts`             | offline対応版へ全量書き換え                                         | wanakana 未導入環境対応、NFKC/長音/ひらがな統一を実装                      |
| 05:22      | User モデル更新              | `src/lib/models/User.ts`                     | `search`/`stats` サブスキーマ、pre-save/pre-findOneAndUpdate を追加 | レガシー `searchName*` 補完ロジックを実装、インデックスを try-catch で保護 |
| 05:35      | バックフィルスクリプト整備   | `scripts/backfill-user-search-fields.ts/.js` | TS/JS 両対応スクリプト新規作成                                      | `.gitignore` 例外追加・ `package.json` に npm スクリプト登録               |
| 05:41      | 部分型チェック               | `npx tsc -p tsconfig.step01.json`            | **失敗**                                                            | `delete mongoose.connection.models.User` が Readonly 扱いで TS2542 発生    |
| 05:43      | TS エラー解消                | `src/lib/models/User.ts`                     | キャストを挟んで `delete` 実行                                      | その後 `npx tsc -p tsconfig.step01.json` 正常終了                          |
| 05:55      | DRY-RUN バックフィル         | `npm run backfill:users:dry`                 | `[BF-JS][DRY] bulk ops: 20`                                         | 対象 20 件で更新ゼロ、DryRun 成功                                          |
| 05:56      | 本番バックフィル             | `npm run backfill:users`                     | `processed: 20 updated: 20`                                         | 20 件分の `search.*` / `searchName*` 補完完了                              |
| 05:57      | インデックス作成             | `mongosh createIndex` ×4                     | `search.namePrefixes_1` 等を作成                                    | 4 本のインデックスを再作成し存在確認                                       |
| 05:58      | Mongo 検証                   | `mongosh findOne/find`                       | `search` サブドキュメントと prefix マッチを確認                     | `やま` クエリで 2 件ヒット                                                 |
| 05:59      | ユーティリティ手動検証       | `node` スニペット                            | `toYomi('アイウ') => 'あいう'` 等を確認                             | Offline 変換が期待どおり動作                                               |

## 3. 詳細ログ & 出力

### 3.1 バックフィル実行

```
$ MONGODB_URI=mongodb://127.0.0.1:27017/boardDB npm run backfill:users:dry
[BF-JS] connecting: mongodb://127.0.0.1:27017/boardDB
[BF-JS] target docs: 20
[BF-JS][DRY] bulk ops: 20
[BF-JS] processed: 20 updated: 0 DRY_RUN: true
```

```
$ MONGODB_URI=mongodb://127.0.0.1:27017/boardDB npm run backfill:users
[BF-JS] connecting: mongodb://127.0.0.1:27017/boardDB
[BF-JS] target docs: 20
[BF-JS] processed: 20 updated: 20 DRY_RUN: false
```

### 3.2 インデックス作成

```
$ mongosh --quiet --eval 'db.getSiblingDB("boardDB").users.createIndex({ "search.namePrefixes": 1 })'
search.namePrefixes_1
...
$ mongosh --quiet --eval 'db.getSiblingDB("boardDB").users.getIndexes()'
[
  { name: 'search.namePrefixes_1', key: { 'search.namePrefixes': 1 } },
  { name: 'search.nameYomiPrefixes_1', key: { 'search.nameYomiPrefixes': 1 } },
  { name: 'search.bioNgrams_1', key: { 'search.bioNgrams': 1 } },
  { name: 'stats.followerCount_-1_updatedAt_-1', key: { 'stats.followerCount': -1, updatedAt: -1 } },
  ...
]
```

### 3.3 Mongo 検証クエリ

```
$ mongosh --quiet --eval 'db.getSiblingDB("boardDB").users.findOne({}, { name:1, bio:1, search:1, searchNameNormalized:1, searchNameYomi:1 })'
{
  name: 'Test User',
  search: {
    nameNormalized: 'test user',
    namePrefixes: ['t','te','tes','test','test ', 'test u','test us','test use','test user'],
    ...
  },
  searchNameNormalized: 'test user',
  searchNameYomi: 'test user'
}
```

```
$ mongosh --quiet --eval 'const q="やま"; db.getSiblingDB("boardDB").users.find({$or:[{"search.namePrefixes": q},{"search.nameYomiPrefixes": q},{"search.bioNgrams": {$in: ["フロ","ロント","ントエ","エンド"]}}]}).limit(10).toArray()'
[
  {
    name: 'ヤマギシヨシタカ',
    search: {
      nameNormalized: 'ヤマギシヨシタカ',
      nameYomiPrefixes: ['や','やま','やまぎ','やまぎし','やまぎしよ','やまぎしよし','やまぎしよした','やまぎしよしたか']
    },
    searchNameNormalized: 'ヤマギシヨシタカ',
    searchNameYomi: 'やまぎしよしたか'
  },
  ...
]
```

### 3.4 TypeScript 部分型チェック

```
$ npx tsc -p tsconfig.step01.json
# 初回: src/lib/models/User.ts(576,10): error TS2542 ...
# 対処後: 成功 (出力なし)
```

## 4. 発生したエラーと解決策

| エラー                                             | 発生箇所                               | 原因                                                                | 解決策                                                                                                                | 結果                                                         |
| -------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `TS2542: Index signature ... only permits reading` | `npx tsc -p tsconfig.step01.json` 初回 | `mongoose.models` / `mongoose.connection.models` が readonly と認識 | `mongoose.models` を `Record<string, unknown>` へキャストし `delete`、接続側も `conn.models` をオプショナル経由で削除 | 部分型チェックが成功し、フック実行時のキャッシュクリアも維持 |

## 5. 指示書とリポジトリ構造の差異

- **レガシー検索フィールド名の相違**: 指示書は `searchNameNormalized/searchNameYomi` を前提としていたが、リポジトリ初期状態には `searchNameBasic/searchNameHira/...` が存在していた。今回の実装で指示書仕様に合わせてフィールド名を統一し、レガシーフィールドは補完のみを行う形へ更新。
- **バックフィルスクリプト形式**: 既存リポジトリは TypeScript バックフィル（`ts-node` 前提）を持っていたが、strict 指示書はオフライン JS 版を要求。JS 版を新規追加し、`.gitignore` 例外を設けてリポジトリに保持。

## 6. 疑問・学び・リスク

- **学び**: `mongoose.models` の削除は TypeScript から readonly と扱われるため、キャストまたは `mongoose.deleteModel` を利用する必要がある。今回キャストで解決したが、将来的には `mongoose.models.User` の扱いを共通ユーティリティ化する検討余地あり。
- **リスク**: レガシー `searchName*` が残置されているため、API/フロントが新旧どちらを参照しているかを Step02 以降で統一する必要がある。移行期間中は両方が同期されるが、冗長なデータが残る点には留意。
- **疑問点**: `User` モデルに大量の Search/Follow ロジックが集約されており、Strict120 ステップの関心事を超えて肥大化している。将来的にドメイン分割（検索専用サービス）を検討する価値あり。

## 7. 今後の展望 / 推奨次ステップ

1. Step02（API統合）で `/api/users/*` の新 search サブドキュメント対応を進め、`searchName*` の利用箇所を段階的に削減。
2. インデックス作成を CI / setup スクリプトへ組み込み、環境差異を吸収。
3. バックフィル完了データを活用し、検索 UI のパフォーマンス測定（prefix/n-gram 効果検証）を実施。

## 8. 受け入れチェックリスト結果

| #   | 項目                                    | 判定 | 根拠                                                                   |
| --- | --------------------------------------- | ---- | ---------------------------------------------------------------------- |
| 1   | `ja-normalize.ts` が offline 対応       | ✅   | `node` スニペットで `toYomi('アイウ') => あいう` を確認                |
| 2   | User モデルに `search/stats` + 自動生成 | ✅   | pre-save / pre-findOneAndUpdate 実装、`computeSearchFields` 内で補完   |
| 3   | レガシー `searchName*` 補完             | ✅   | バックフィル/フックで `searchNameNormalized/searchNameYomi` を同時更新 |
| 4   | JS バックフィル完走                     | ✅   | `processed: 20 updated: 20` のログ                                     |
| 5   | インデックス 4 種存在                   | ✅   | `users.getIndexes()` 出力で名称確認                                    |
| 6   | 検証クエリが期待どおり                  | ✅   | `やま` クエリでターゲットユーザーがヒット                              |

---

以上、Step01 Strict120 版の詳細レポートです。
