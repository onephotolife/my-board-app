## Claude Code 実行指示書（レポート後 次アクション／現行仕様準拠・改訂100）

目的: 現在の実装（Next.js 15 App Router、MongoDB、Material UI、NextAuth v4、独自withRateLimit、Unicodeハッシュタグ実装）に完全準拠し、差分を埋めつつ安全に仕上げる。`HASHTAG_IMPLEMENTATION_DETAILED_REPORT_JP.md` の結果を前提に、仕様乖離を是正し、運用に耐える形へ仕上げる。

---

### 0) ACK（Claude Codeは返答先頭で宣言）
- ACK: STRICT120 / SPEC-LOCK / AUTH_ENFORCED_TESTING_GUARD / LOG-FIRST を厳守します。
- 手順: Plan → Actions → Evidence → Result → Validation → Compliance → Next。
- 運用規律: 1変更=1コミット。各手順で末尾ログ10行＋アーティファクト（html/junit/json/trace）を提示。

---

### 1) 現行仕様の確定（差分の真実）
- ハッシュタグ中核: `src/app/utils/hashtag.ts` の `HASHTAG_REGEX` と `normalizeTag(NFKC/VS除去/ASCII小文字化/1..64)` を唯一ソースに採用。抽出・リンク化はこれに一元化済み。
- Post/Tagモデル: `Post.tags` は最大5件、`Tag` は `key/display/countTotal/lastUsedAt`。`countTotal` はPOST作成/更新時に `$inc:1`（差分計算は未実装）。
- 検索API: `GET /api/tags/search` は `withRateLimit`（`src/lib/rateLimit.ts`）を利用し、レスポンスは `{ success, data: Tag[] }`（dataキー）。
- トレンドAPI: `GET /api/tags/trending` は `Post.aggregate` のみで `{ key, count }` を返す（`display`の $lookup は未実装）。現状は非レート制限。
- タグページ: `src/app/tags/[tag]/page.tsx` は `revalidate=60` で `normalizeTag(params.tag)` を用い、`Post.find({ tags:key })` 表示。
- サジェストUI: `src/components/HashtagSuggestions.tsx`（Portal/a11y/キー操作・位置調整あり）。
- サジェストHook: `src/hooks/useHashtagSuggestions.ts` は APIの返却形に一部乖離あり（期待: `data.tags`、実際: `data`）。`count` は `countTotal` へマップ済み。
- 認証/E2E: Playwrightは `tests/e2e/storageState.json` を使用（`tests/e2e/utils/create-storage-state.ts`で生成）。`middleware.ts`/`/api/posts` にDEV限定のモック検出（cookie）あり。
- レート制限: 実運用は `src/lib/rateLimit.ts`（メモリベース、IPv6正規化あり）。`src/lib/middleware/rate-limit.ts` も存在するが、`/api/tags/search` は前者を利用。
- バックフィル: `scripts/backfill-tags.ts`（ts-node, `tsconfig.scripts.json`）が正。`*.mjs` と `scripts/scripts/backfill-tags.js` が併存。
- Node/CI: `package.json` の engines は Node >=20.18.1、`prebuild: tsc --noEmit`。PlaywrightはデフォルトChromiumのみ。

---

### 2) ゴール（AC / NFR：現行仕様準拠）
- AC-1: サジェストHookと `/api/tags/search` の契約を一致させ、検索候補が安定表示（`data`配列を前提）。429時の自動再試行は現状維持。
- AC-2: バックフィルは `scripts/backfill-tags.ts` の単一起点。併存スクリプトはアーカイブへ移動し、実行手順は `npm run backfill:tags` に統一。
- AC-3: トレンドAPIは現行の `{ key, count }` 契約を維持。表示は `key` フォールバック（`display` 連携はP1で検討）。
- AC-4: Playwrightは storageState 方式で安定動作（DEVのモック検出は現状維持・テスト用に依存しない）。主要E2EがGREEN。
- NFR: Node 20.18.1+、ERRORログ=0、search/trending p95<200ms(dev)、3連続PASS＋Log Health Gate。

---

### 3) 実行計画（P0→P1→P2）
#### P0（契約整合・一意化・安全運用）
1) API契約整合（Search）
   - 事実: `/api/tags/search` は `{ success, data }` を返す。
   - 対応: `src/hooks/useHashtagSuggestions.ts` を `data.tags` → `data` 参照に揃える（countは `countTotal` マップ維持）。
   - 確認: `#東` 入力で候補が即時表示し、選択→本文に `#<display>` が確定。

2) バックフィル単一起点化
   - 採用: `scripts/backfill-tags.ts`（`npm run backfill:tags`）。
   - 整理: `scripts/backfill-tags*.mjs` と `scripts/scripts/backfill-tags.js` は `archive/scripts/` へ退避（ドリフト防止）。
   - 実行: DRY_RUN→本実行の二段階。ログに `{ processed, updated, dryRun }` を残す。

3) テストDB分離
   - `.env.test.local` に `MONGODB_URI`（テスト用）を追加し、E2EはテストDBに向ける。
   - 誤接続防止: 実行ログに利用URIを出力し、Atlas本番への誤接続を検知。

4) レート制限の現状維持確認
   - `/api/tags/search` は `src/lib/rateLimit.ts` の `withRateLimit` を継続使用（IPv6正規化あり）。
   - 監視: 429発生時のレスポンスヘッダー（Retry-After, X-RateLimit-*）をテストで検証。

#### P1（UX/観測性/CIの拡充）
1) サジェストUI仕上げ
   - a11y/Portal/キー操作/位置計算は現状を維持し、視覚回帰（z-index/viewport境界）を確認。
   - ネットワーク/429: 指数バックオフ＋AbortControllerの動作をE2Eで検証。

2) トレンドAPI強化（任意）
   - 追加: `withRateLimit` を `/api/tags/trending` に適用。
   - 表示向上: `$lookup: tags` で `display` を付加（後方互換のためフロントは `display ?? key`）。

3) Playwright安定化/拡張
   - `projects`: chromium 固定から webkit/firefox を段階導入。
   - `retries/timeout/expect.timeout` の統一とtrace/junit/json/htmlの保存をCIで確認。

#### P2（運用とパフォーマンス）
1) レート制限のRedis化、p95/p99/429率のダッシュボード化。
2) `/api/tags/search` のs-maxage/ISR最適化（安全な範囲で）。
3) i18n/RTL/axe自動監査のCI組み込み。

---

### 4) 作業手順（編集/コマンド/期待結果）
各手順で Evidence（末尾ログ10行＋junit/json/traceパス）を提示。

4-1. API契約整合（Search）
- 編集: `src/hooks/useHashtagSuggestions.ts`
  - 条件: API応答は `{ success, data }`。`data.tags` 参照を `data` に変更。
  - 例: `const results = data.data.map(...)` に揃える（countは `countTotal` を使用）。
- 期待: `#`入力→候補が並び、Enter/Space/Clickで本文確定。429時は指数バックオフで復帰。

4-2. バックフィル単一起点化
- 整理: `scripts/backfill-tags*.mjs` と `scripts/scripts/backfill-tags.js` を `archive/scripts/` へ移動。
- 実行:
```bash
npm run backfill:tags | tail -n 50
```
- 期待: 終了ログに `processed/updated` 両方が表示。終了コード0。

4-3. テスト環境分離
- 追加: `.env.test.local` に `MONGODB_URI=<test-uri>`
- 実行:
```bash
MONGODB_URI="$TEST_MONGODB_URI" npx playwright test tests/e2e/tags.spec.ts --project=chromium \
  --reporter=line,html,junit,json --trace=on --output=./playwright-report | tail -n 50
```
- 期待: 本番データ不変。E2EがGREENでストレージステート方式が有効。

4-4. トレンドAPIの簡易強化（任意/P1）
- 編集: `src/app/api/tags/trending/route.ts` に `withRateLimit` を適用。
- 期待: 高頻度アクセス時も安定（429検証含む）。

4-5. Playwright拡張（任意/P1）
- 編集: `playwright.config.ts` に webkit/firefox を追加し、`retries`/`timeout` を共通化。
- 期待: Chromium以外でも主要E2EがPASS、trace/htmlを保存。

---

### 5) 検証・合否基準
- スモーク: `/api/tags/search?q=to` が200で `{ success:true, data:[...] }`。`/tags/東京` が200で一覧表示。`/api/tags/trending` が200で `{ key,count }[]`。
- E2E: `tests/e2e/tags.spec.ts` を3連続PASS。サジェスト→確定→投稿→リンク遷移が成功。
- Health Gate: テスト時間±2分のERROR=0、未処理例外=0。
- パフォーマンス: search/trending p95<200ms（dev）を計測（最低10リクエスト）。

---

### 6) ロールバック/安全装置
- 1変更=1コミット → `git revert <sha>` で即時復旧。
- バックフィルはDRY_RUN→本実行の順で、安全サンドボックス内で試験。
- （任意）Feature Flag: `TAGS_FEATURE_ENABLED` でUI露出制御（導入はP1以降）。

---

### 7) 返答フォーマット（Claude Code）
- Plan: 実行順序の要約。
- Actions: 具体的編集とコマンド（抜粋差分OK）。
- Evidence: ログ末尾10行、junit/json totals、traceパス。
- Result: AC/NFRに対する合否。
- Validation: 手動再現手順、期待値と実測。
- Compliance: STRICT120/Log Health Gate/Triple Match Gateの適合状況。
- Next: 残り最小タスク（最大3件）。

---

注記（現行仕様との整合ポイント）
- Search APIは `{ success, data }`。Hook側の整合が必要（`data.tags` ではない）。
- Trending APIは `{ key, count }` のまま維持。`display` はP1でLookup導入可。
- レート制限は `src/lib/rateLimit.ts` の `withRateLimit` を使用（IPv6正規化込み）。現状Searchのみ適用、Trendingは未適用。
- バックフィルは `npm run backfill:tags` を標準手順に。複数スクリプトはアーカイブしドリフト防止。

