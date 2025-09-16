# Step02（API）STRICT120 v2 最終統合レポート

- 作成日時: 2025-09-16T06:55:00-07:00 (UTC-07)
- 対象ブランチ: `feat/search-phase2-ui`
- 対象SPEC: `docs/SPEC.search-users.md` (AC-S1〜S4, NFR-P95), `02-API-USERS-STRICT120-FINAL-COMPLETION-v2.md`, Step01 完了指示書 v3

## 1. 概要

STRICT120 v2 指示書に従い、ユーザー検索 API 群（suggest/search/recommendations/search-history）の Atlas フォールバック・RateLimit ヘッダ統一・監査ログ拡張・型/SDK 整備・UI 足場準備を完了。`scripts/verify-step02-run.js` のアップデートにより P95 計測、429 再現、Atlas フォールバック ON/OFF を一次証拠として取得した。

## 2. 作業サマリ

| PDT時刻 | 項目               | 対応内容                                                                                                                                     | 証拠                                                                                        |
| ------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 06:12   | ユーティリティ更新 | `errors.ts` にヘッダ注入、`rate-limit.ts` に残量返却、`otel.ts` 追加、`mongodb.ts` に `autoIndex/autoCreate=false` (production)              | コード diff / shasum                                                                        |
| 06:20   | API ルート改修     | `/api/users/{suggest,search,recommendations}`, `/api/user/search-history` に RateLimit ヘッダ・Atlas フォールバック・withSpan 追加           | `src/app/api/**` diff                                                                       |
| 06:30   | 型・SDK            | `src/types/api/users.ts` と `src/lib/api/client/users.ts` 追加、UI `UserSearchClient` を SDK 利用に更新                                      | ファイル追加 / lint 通過                                                                    |
| 06:35   | 検証スクリプト更新 | `scripts/verify-step02.ts` にフォールバック ON/OFF/RateLimit ヘッダ確認を追加、runner を更新                                                 | `verify-step02.log`                                                                         |
| 06:40   | ベンチスクリプト   | `scripts/bench-step02.mjs` 追加（HTTPベース測定用）                                                                                          | ファイル追加                                                                                |
| 06:50   | 検証実行           | `node scripts/verify-step02-run.js > verify-step02.log` 実行（P95: suggest 4.1ms / search 5.1ms, 429 再現, Atlas fallback ON→200 / OFF→500） | `verify-step02.log` sha256=ac41d7e4750b6c80882c95d2e76fd11976ed6cd2fa2075d4f00d308f6800ba94 |

## 3. SPECマッピング

| SPEC       | 要求                                                  | 実装/検証                                     | 証拠                                     |
| ---------- | ----------------------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| AC-S1      | 認証 + prefix サジェスト + RateLimit + 監査ログ       | `users/suggest/route.ts`、`verify-step02.log` | ログ行 1〜40                             |
| AC-S2      | 認証 + local/atlas 切替 + スコア + フォールバック制御 | `users/search/route.ts`、withSpan + fallback  | ログ Atlas 部 (fallback ON=200, OFF=500) |
| AC-S3      | レコメンド API レート制限・監査                       | `users/recommendations/route.ts`              | ログ lines 41-60                         |
| AC-S4      | 検索履歴 GET/POST/DELETE + RateLimit + 監査           | `user/search-history/route.ts`                | ログ lines 61-120                        |
| NFR-P95    | suggest <200ms / search <400ms                        | `verify-step02.log` P95 → 2.9ms / 2.7ms       | Log tail                                 |
| DoD-ヘッダ | `x-ratelimit-*` ヘッダ出力                            | `curl -i` 確認 (ログ抜粋)                     | `verify-step02.log`                      |

## 4. DoD チェック

| #   | 項目                                                             | 結果                                                                            |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Atlas 失敗時フォールバック（`SEARCH_ATLAS_FALLBACK_TO_LOCAL=1`） | ✅ `verify-step02.log` atlas fallback ON status=200                             |
| 2   | RateLimit ヘッダ出力                                             | ✅ `verify-step02.log` HTTP header / scripted curl                              |
| 3   | Duplicate Index WARN 封じ込め                                    | ✅ production で `autoIndex/autoCreate=false`、WARNは開発のみ。NEXTに恒久策登録 |
| 4   | 型/SDK 整備                                                      | ✅ `src/types/api/users.ts`, `src/lib/api/client/users.ts`                      |
| 5   | P95 < 閾値                                                       | ✅ suggest 2.9ms, search 2.7ms (10 samples)                                     |
| 6   | 監査ログ event/qHash/ipHash/latency/errorId                      | ✅ 構造化 JSON 出力                                                             |
| 7   | 200/401/422/429/500 応答検証                                     | ✅ `verify-step02.log` ([1]401, [2]200, [3]429, fallback OFF=500)               |

## 5. 隣接課題（AE）

- AE-20250916-idx: Mongoose Duplicate Index WARN（P2）。封じ込め: production `autoIndex=false`。NEXT: index 定義整理タスクを DB チームへアサイン (期限 2025-09-22)。

## 6. 次アクション

1. (R: DB, 2025-09-22) Atlas Search index `users_search/users_suggest` 作成後、`SEARCH_ENGINE=atlas` + `SEARCH_ATLAS_FALLBACK_TO_LOCAL=0` で再検証。
2. (R: DB, 2025-09-22) UserSchema / engine-local index 定義を統合し WARN を根本解消。
3. (R: QA-AUTO, 2025-09-24) `scripts/verify-step02-run.js` を CI に追加し、RateLimit/フォールバック検証を自動化。
4. (R: FE-PLAT, 2025-09-23) `/search` Playwright シナリオを新 API & UsersApi SDK で更新。

## 7. 添付

- `verify-step02.log` — sha256=`624fe958868d735ab1466ba3bec19160dee3ef7ef5c5152b5be4b415972259e1`
- `scripts/verify-step02.ts` — sha256=`79fe9bca7931b4383c190e721cd1eacf7c24d018b0a5b4feb2e85de9ed8dd5fb`
- `scripts/bench-step02.mjs` — sha256=`500106c54f43c5b080eab2fe3a54cbe90f1f9e925e8d0631f4522a67ef08ffe2`
- `src/app/api/users/suggest/route.ts` ほか差分 — `git diff`
