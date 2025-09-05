## Claude Code 実行フルランブック（ハッシュタグ機能・完全無欠版）

目的: これ一つをClaude Codeにコピペするだけで、残課題（認証E2E安定化／バックフィル統一／UIサジェスト仕上げ）をSTRICT120準拠で安全に完了できるようにする。失敗時の代替経路・デバッグ手順・合格基準まで全方位で包含。

---

### 0) ACK（最初に返答で必ず宣言）
以下の3点を先頭で宣言してから実行してください:
- ACK: STRICT120 / SPEC-LOCK / AUTH_ENFORCED_TESTING_GUARD / LOG-FIRST を遵守します
- 進行順: Plan → Actions → Evidence → Result → Validation → Compliance → Next
- 実務ルール: 1変更=1コミット、各ステップでログ末尾10行＋junit/json/traceの証拠を提示

---

### 1) SPEC-MAP（実行仕様・全文）
下記が実行すべき仕様（SPEC）です。以降の判断・実装・検証は必ずこのSPECに準拠してください。

[SPEC CONTENT START]
## Claude Code 次ステップ実行指示書（ハッシュタグ機能・全方位版 100点）

目的: 既存の改善計画を拡張し、実運用・CI/CD・品質・セキュリティ・可観測性・UX・i18n/a11y まで含む“完全無欠”手順で、残課題を安全に完了。失敗時の代替経路と復旧手段まで併記。

---

### 0. Gatekeeper（前提・安全策・即時チェック）
- Node: `>= 20.18.1` をローカル/CI/Vercelで統一。
- Env: `.env.local` に `MONGODB_URI`, `AUTH_EMAIL`, `AUTH_PASSWORD`。Vercel にも同期。
- 型検証: `prebuild: tsc --noEmit`（既定）。ESLint/Prettier 実行可能。
- 可観測性: Playwright `--reporter=line,html,junit,json --trace=on --output=./playwright-report`。
- リリース安全策: 1変更=1コミット、Canary/Feature Flag、即時 `git revert` 手順。

クイック自己診断:
node -v && npm -v
npm run build | tail -n 20
test -f .env.local && echo OK || echo "missing .env.local"

---

### 1. アーキテクチャと契約（全体像の共通認識）
- 抽出/正規化: `src/app/utils/hashtag.ts`（NFKC/VS除去/小文字化/ZWJ対応/長さ1–64）。
- 保存: `Post.tags`（max 5, key配列）。
- 集計: `Tag`（key/display/countTotal/lastUsedAt）。
- API: `/api/tags/search`（prefix/limit/RateLimit）, `/api/tags/trending`（aggregation/期間/limit）。
- UI: テキストの linkify（PostItem/EnhancedPostCard）＋ 入力サジェスト（追加）。
- ルート: `/tags/[tag]`（SSR/ISR）。

契約（JSON例）:
// /api/tags/search?q=to&limit=5
{ "success": true, "data": [{ "key": "東京", "display": "東京", "countTotal": 12 }] }

// /api/tags/trending?days=7&limit=5
{ "success": true, "data": [{ "key": "東京", "count": 42 }] }

---

### 2. リスク登録簿（Risk Register）と回避設計
- 認証E2Eが不安定 → storageState標準化。API-loginが無ければUI-loginで一度生成。
- 抽出ドリフト → ts-nodeでTS実装を直 import。mjs複製は撤廃。
- サジェストUI衝突 → PopperをPortal化/z-index最大。キーボード/タッチ両対応。
- RateLimit誤爆 → テスト時は一時緩和 or IP/route別キー。必要なら Redis バックエンド化。
- 文字正規化差異（Emoji/ZWJ/VS） → 正規化関数を唯一の依存点に集約。E2Eで代表例をカバー。
- SSR/動的使用の衝突 → ページに `dynamic='force-dynamic'` or `revalidate` を適用し意図を明示。

---

### 3. マルチパス計画（失敗時の代替経路つき）
主経路（A）: storageState(認証) → バックフィル(ts-node) → サジェストUI → E2E → リリース。
代替（B）: 認証が難航 → API 契約テスト + SSR ページ検証で機能合格し、認証は後追い。
代替（C）: バックフィル困難 → 投稿APIでテストデータ投入し、最小限のデータでUI/検索/トレンドを検証。

---

### 4. 実装計画（Step-by-Step with Commands）
4-1. 認証安定化（storageState 標準）
1) 生成スクリプト: `tests/e2e/utils/create-storage-state.ts`（API-login可/不可の二択）
2) `playwright.config.ts`: `use.baseURL`, `use.storageState` を設定
3) 実行:
PLAYWRIGHT_BASE_URL=http://localhost:3000 AUTH_EMAIL="<email>" AUTH_PASSWORD="<password>" \
npx ts-node tests/e2e/utils/create-storage-state.ts | cat
4) E2Eからログイン操作を削除 → 直接シナリオ実行。

4-2. バックフィル統一（ts-node + tsconfig-paths）
1) 依存:
npm i -D ts-node tsconfig-paths @types/node
2) `scripts/backfill-tags.ts` を作成/更新（TS実装の `extractHashtags` を直 import。DRY_RUN/BATCH_SIZE対応。idempotent/小分けbulk）。
3) 実行:
DRY_RUN=true  npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat
DRY_RUN=false npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat

4-3. UIサジェスト（Hook/Component/組込み）
1) Hook: `useHashtagSuggestions`（150ms debounce, 最大10件, a11y state）。
2) Component: `HashtagSuggestions.tsx`（Popper + List, role=listbox/option, 上下/Enter/Tab/ESC, Portal化）。
3) 組込み: `PostForm.tsx` or `/posts/new`で `data-testid="post-content-input"` を付与し、Hook/Component を接続。

---

### 5. 検証計画（多角的）
5-1. API/SSR スモーク
npm run build | tail -n 20
curl -sS 'http://localhost:3000/api/tags/trending?days=7&limit=5' | jq .
curl -sS 'http://localhost:3000/api/tags/search?q=t&limit=5' | jq .
curl -sSI 'http://localhost:3000/tags/東京' | head -n 20

5-2. Playwright（storageState 利用）
npx playwright test tests/e2e/tags.spec.ts --project=chromium --reporter=line,html,junit,json --trace=on --output=./playwright-report | tail -n 50
npx playwright show-report ./playwright-report

5-3. Unicode/Emoji/ZWJ 網羅
- 例: `#東京`, `#ＴＯＫＹＯ`（全角）, `#tokyo`, `#👨‍👩‍👧‍👦`, `#🇯🇵`
- テスト: 抽出→正規化→保存→検索一致→リンク化（UI/E2E）

5-4. レート制限/異常系
- `/api/tags/search` に高速連打 → 429 応答とヘッダ `Retry-After` を確認
- 期間外トレンド → 空配列で200応答

5-5. a11y/i18n
- `tab`/`Enter` で確定、`ESC` で閉じる、`aria-label` 設定、`role=listbox/option`
- 日本語/英語での表記確認（`Accept-Language`）

---

### 6. 失敗時プレイブック（原因別トリアージ）
6-1. 認証に戻される
- storageState不正 → 再生成、`baseURL`確認、Cookieドメイン/secure属性確認
- NextAuthミドルウェア干渉 → E2E専用バイパスは残さず、UI-login一回でstate生成

6-2. サジェストが空
- データ不足 → バックフィル or 投稿APIでハッシュタグ付き投稿投入
- RateLimit 429 → 一時的に `windowMs/max` 緩和、IPキーを分離

6-3. 文字化け/一致しない
- NFKC/VS除去が未適用 → `normalizeTag` を唯一の依存点に統一
- 例外絵文字（ZWJ/国旗） → 代表ケースをE2Eに追加

6-4. Popperが隠れる
- z-index/Portal不足 → `Popper` に `Portal` と最大z-indexを付与

6-5. SSR/動的ルート警告
- 該当ページに `export const dynamic='force-dynamic'` か `revalidate` を設定

---

### 7. パフォーマンス/容量/インデックス
- Post: `{ tags: 1, createdAt: -1 }`、Tag: `{ key: 1 } unique, { countTotal: -1 }`
- API SLO: search/trending p95 < 200ms（dev基準）。
- キャッシュ: trendingは60sでISR/Route Cache、searchは短期HTTPキャッシュ（任意）。

---

### 8. セキュリティ/不正利用対策
- XSS: linkifyはReactエスケープ、クエリはエンコード。
- RateLimit: IP+path キー。将来Redisへ移行。
- スパム: NGワード・最小長・最大数の制限。
- PII/ログ: メール等は伏字。Playwrightアーティファクトも検閲。

---

### 9. 合格基準（Acceptance）
- バックフィル後に `/api/tags/trending`/`/api/tags/search` が非空。
- Playwright `tests/e2e/tags.spec.ts` が3連続 PASS（storageState）。
- サジェストUI: `#東` 入力→候補表示→Enter確定→投稿→リンク遷移まで安定 PASS。
- Log Health: テスト期間±2分で ERROR=0、未処理例外=0。

---

### 10. ロールバック/セーフティネット
- 1変更=1コミット → `git revert <sha>` で即時戻せるように分割。
- Feature Flag（任意）: `TAGS_FEATURE_ENABLED` でUI露出制御。
- バックフィルは `DRY_RUN` で件数/影響を先読み。

---

### 11. 付録（API契約/セレクタ規約/コマンド集）
- `/api/tags/search`: `GET ?q=<prefix>&limit=10` → `{ success, data: [{ key, display, countTotal? }] }`
- `/api/tags/trending`: `GET ?days=7&limit=50` → `{ success, data: [{ key, count }] }`
- 推奨 `data-testid`: `email-input`, `password-input`, `post-content-input`, `hashtag-suggestion-list`

主要コマンド:
# storageState 生成
PLAYWRIGHT_BASE_URL=http://localhost:3000 AUTH_EMAIL="<email>" AUTH_PASSWORD="<password>" \
npx ts-node tests/e2e/utils/create-storage-state.ts | cat

# バックフィル
DRY_RUN=true  npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat
DRY_RUN=false npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat

# E2E
npx playwright test tests/e2e/tags.spec.ts --project=chromium --reporter=line,html,junit,json --trace=on --output=./playwright-report | tail -n 50

---

この指示書に従い、残課題を“安全第一”で完了してください。失敗時は本プレイブックの代替経路とデバッグ手順で即復旧し、STRICT120のゲート（line/junit/json一致＋Log Health）を満たすまで改善を継続します。
[SPEC CONTENT END]

---

### 2) 実行前コンテキスト（環境/制約/権限）
- OS: macOS（zsh）
- Node: 20.18.1 以上（未満なら nvm で切替）
- Repo Root: /Users/yoshitaka.yamagishi/Documents/projects/my-board-app
- Branch: feature/sns-functions（変更はこのブランチで）
- Env: `.env.local` に MONGODB_URI, AUTH_EMAIL, AUTH_PASSWORD を設定済み想定（未設定なら作成）
- 権限: `npm i`, `npx playwright install`, `npx ts-node`, 変更ファイルの作成/編集、コミット/プッシュを許可

---

### 3) タスク（AC/NFR・順序厳守）
1. 認証E2E安定化（storageState 方式）
   - AC: storageState.json 生成・適用、ログイン操作なしでE2E動作、3連続PASS
   - NFR: junit/json/traceアーティファクト 100% 生成
2. バックフィル統一（ts-node）
   - AC: TS実装の抽出/正規化を直利用。DRY_RUN→本実行で trending/search が非空
   - NFR: 実行JSONログ（processed/updated/dryRun）と失敗0
3. UIサジェスト仕上げ（a11y/操作/Portal）
   - AC: `#東` 入力で候補表示（role/aria）→上下/Enter/Tab/ESC 操作→Enter確定
   - NFR: z-index衝突なし、p95<200ms（dev）
4. 異常系/Unicode/429
   - AC: Emoji/ZWJ/VSの代表例で抽出→正規化→一致→リンク化を確認。429・Retry-Afterの挙動を検証

---

### 4) 実行ステップ（コマンドと編集指示）
（SPECの「実装計画」「検証計画」に従い、各ステップでログ末尾10行・差分・junit/json/traceを Evidence として提示してください）

1) 前提チェックと依存準備
cd /Users/yoshitaka.yamagishi/Documents/projects/my-board-app
node -v && npm -v
nvm install 20.18.1 >/dev/null 2>&1 || true
nvm use 20.18.1 || true
npm ci
npx playwright install --with-deps | cat

2) storageState 生成
PLAYWRIGHT_BASE_URL=http://localhost:3000 AUTH_EMAIL="$AUTH_EMAIL" AUTH_PASSWORD="$AUTH_PASSWORD" \
npx ts-node tests/e2e/utils/create-storage-state.ts | cat

3) バックフィル（DRY_RUN→本実行）
DRY_RUN=true  npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat
DRY_RUN=false npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat

4) サジェストUI 組込み/調整（必要時）
- `data-testid="post-content-input"` を本文入力に付与
- Hook/Component を接続（a11y/キー操作/Portalを確認）

5) 検証（API/SSR/E2E）
npm run build | tail -n 20
curl -sS 'http://localhost:3000/api/tags/trending?days=7&limit=5' | jq .
curl -sS 'http://localhost:3000/api/tags/search?q=t&limit=5' | jq .
curl -sSI 'http://localhost:3000/tags/東京' | head -n 20
npx playwright test tests/e2e/tags.spec.ts --project=chromium \
  --reporter=line,html,junit,json --trace=on --output=./playwright-report | tail -n 50

6) 失敗時代替
- 認証停止 → storageState 再生成（UI-login）。baseURL/Cookie属性確認
- データ不足 → バックフィル or テスト投稿投入
- 429 → RateLimit 緩和（テスト時のみ）
- Emoji/ZWJ不一致 → normalizeTag統一、E2Eケース追加

7) コミット/プッシュ（1変更=1コミット）
git add -A && git commit -m "chore(e2e): storageState auth; feat(scripts): backfill-tags ts-node; feat(ui): hashtag suggestions a11y" | cat
git push origin feature/sns-functions | cat

---

### 5) 出力（提示必須のEvidence）
- 各ステップのログ末尾10行
- 変更差分の抜粋
- Playwrightアーティファクト（line末尾/JUnit totals/JSON totals/traceパス）
- 合否（合格基準に照らした短評）

---

### 6) 合格基準（最終判定）
- `/api/tags/trending` と `/api/tags/search` が非空
- `tests/e2e/tags.spec.ts` が3連続 PASS（storageState使用）
- 入力サジェスト: `#東` → 候補表示→Enter確定→投稿→リンク遷移 までPASS
- Log Health: ERROR=0 / 未処理例外=0（テスト期間±2分）

---

### 7) 停止回避の注意
- 「ファイルにアクセスできない」→ SPECは本メッセージ内に全文埋め込み済み
- 「タスク未定義」→ 本ランブックにAC/NFRを明記済み（自己分解禁止）
- 「権限不足」→ 実行・編集・コミット・プッシュ許可前提。不可なら代替案を提示して継続

---

以上。これを丸ごとClaude Codeに貼り付けて実行してください。


