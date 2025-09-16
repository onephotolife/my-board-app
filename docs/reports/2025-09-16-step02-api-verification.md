# Step02 API Verification Log (STRICT120)

- 実行日時: 2025-09-16T06:57:21-07:00
- スクリプト: `node scripts/verify-step02-run.js`
- 主要環境変数: `SEARCH_ENGINE=local` → Atlas 切替テスト含む

## 結果サマリ

| 項目                    | レスポンス                               | 備考                                                        |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| suggest (認証あり)      | 200, items=2                             | audit log に `USER_SUGGEST` 出力、qHash/ipHash/latency 確認 |
| search (認証あり)       | 200, items=2                             | P95 2.7ms (10回計測)                                        |
| recommendations         | 200, items=0                             | 空配列でも安定レスポンス                                    |
| history GET/POST/DELETE | 200, 履歴登録→取得→削除成功              | `/api/user/search-history` 連携確認                         |
| 未認証リクエスト        | 401 + errorId                            | `/api/users/suggest` にて確認                               |
| レート制限              | 1回目200 → 2回目429                      | `RATE_LIMIT_SUGGEST_PER_MIN=1` 条件                         |
| RateLimitヘッダ         | `x-ratelimit-limit` / `remaining` を確認 | `verify-step02.log` `[2]` セクション                        |
| Atlas モード            | fallback ON=200, fallback OFF=500        | `SEARCH_ATLAS_FALLBACK_TO_LOCAL` で制御                     |

## レイテンシ測定

- `suggest` 計測値 (ms): `[1.6, 2.4, 2.9, 1.6, 1.1, 1.1, 1.1, 1.7, 1.2, 2.2]` → **P95 = 2.9ms**
- `search` 計測値 (ms): `[1.6, 1.9, 2.7, 1.5, 1.7, 2.6, 2.1, 2.1, 1.6, 1.3]` → **P95 = 2.7ms**

## 監査ログ例

```
{"ts":"2025-09-16T05:57:57.601Z","event":"USER_SUGGEST","userId":"6897f7a5f33ba094259a5280","qHash":"47c5e1a8b9f3dd16a183a508ce564689490ae3a1d9cdfd5cf57cb113e630a7b8","resultCount":2,"ua":"Step02-Verification/1.0","ipHash":"12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0","latencyMs":6,"errorId":null}
```

## 生成ファイル

- スクリプト: `scripts/verify-step02.ts`
- ランナー: `scripts/verify-step02-run.js`
- 設定: `tsconfig.verify.json`
- ログ: `verify-step02.log`

すべての検証項目が ✅ であることを確認しました。
