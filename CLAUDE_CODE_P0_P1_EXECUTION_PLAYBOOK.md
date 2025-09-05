## Claude Code 実行プレイブック（P0/P1 100点版）

目的: バックフィル統一・Playwright安定化・UIサジェスト実装を、調査→設計→実装→検証→デバッグ→合格判定まで一気通貫で完遂。STRICT120/Log Health/Triple Match Gateを満たす。
対象ブランチ: `feature/sns-functions`

---

### 0. Gatekeeper（必須前提と安全策）
- Node: `>= 20.18.1`（ローカル/CI/Vercel 一致）
- Env: `.env.local` に最低限 `MONGODB_URI`, `AUTH_EMAIL`, `AUTH_PASSWORD`
- Prebuild型検証: `package.json` に `prebuild: tsc --noEmit` 設定済み
- アーティファクト出力: Playwright `--reporter=line,html,junit,json --trace=on --output=./playwright-report`
- 1変更=1コミット/即Push/失敗時Revert（ロールバック手順を明記）

クイック自己診断（コマンド）:
```bash
node -v && npm -v
npm run build --silent | tail -n 10
test -f .env.local && echo OK || echo "missing .env.local"
```

---

### 1. 調査（Research Matrix）
目的: 実装注入点・セレクタ・API契約・依存関係を完全特定。

チェックリスト（rgで高速確認）:
```bash
rg -n "PostForm" src/components
rg -n "textarea|TextField|data-testid|content" src/components/PostForm.tsx || true
rg -n "HASHTAG_REGEX|normalizeTag|extractHashtags" src/app/utils/hashtag.ts
rg -n "app/api/tags/(search|trending)" src
rg -n "storageState|baseURL" playwright.config.ts || true
rg -n "TAGS_FEATURE_ENABLED" src || true
```
所見（期待）:
- `PostForm.tsx` に本文入力（TextField/Textarea）。`data-testid` が無ければ後で付与可能。
- `hashtag.ts` は NFKC/VS除去/小文字化/長さ1–64/ZWJ対応。
- `/api/tags/search` は prefix一致 + limit、`/api/tags/trending` は直近days集計。

---

### 2. 設計（Design Spec）
2-1. バックフィル統一（ソース・オブ・トゥルース方式）
- ts-node + tsconfig-pathsで `src/app/utils/hashtag.ts` を import。
- DRY-RUN→本実行（二段階）。BATCH_SIZEで `Tag.bulkWrite` を小分け。
- 例外時は継続収集→最後に要約出力（件数/失敗件）

2-2. Playwright安定化（storageStateファースト）
- 一度だけstorageState生成（API loginがあればAPI、無ければUI）。
- `playwright.config.ts` に baseURL + storageState。
- 以降のテストはログイン操作を排除。

2-3. UIサジェスト（軽量・高UX）
- Hook: `useHashtagAutocomplete` が `#` 直後の語を抽出し 150ms debounce で `/api/tags/search` 呼出。
- Component: `HashtagSuggestions`（MUI Popper + List）。上下/Enter/Tab/ESC。`role=listbox/option`。
- 組込み: `PostForm.tsx` に最小差分で統合（ref/onChange/onKeyDown）。FeatureFlagで露出制御可。

---

### 3. 実装（Implement）
3-1. バックフィル（TS統一版）
```bash
npm i -D ts-node tsconfig-paths @types/node
```
`scripts/backfill-tags.ts`（完全版サンプル）:
```ts
import 'ts-node/register';
import 'tsconfig-paths/register';
import mongoose from 'mongoose';
import Post from '@/lib/models/Post';
import Tag from '@/lib/models/Tag';
import { extractHashtags } from '@/app/utils/hashtag';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/my-board-app';
const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);

async function main() {
  await mongoose.connect(uri);
  const cursor = Post.find({}).lean().cursor();
  const now = new Date();
  let ops: any[] = [];
  let processed = 0, updated = 0;
  for await (const doc of cursor) {
    const text = `${doc.title || ''}\n${doc.content || ''}`;
    const extracted = extractHashtags(text);
    const keys = Array.from(new Set(extracted.map(t => t.key))).slice(0, 5);
    if (!keys.length) { processed++; continue; }
    if (!DRY_RUN) {
      await Post.updateOne({ _id: doc._id }, { $set: { tags: keys } });
      updated++;
      const bulk = keys.map(key => ({
        updateOne: {
          filter: { key },
          update: {
            $setOnInsert: { display: extracted.find(t => t.key === key)?.display || key },
            $set: { lastUsedAt: now },
            $inc: { countTotal: 1 }
          },
          upsert: true
        }
      }));
      ops.push(...bulk);
      if (ops.length >= BATCH_SIZE) { await Tag.bulkWrite(ops); ops = []; }
    }
    processed++;
  }
  if (!DRY_RUN && ops.length) await Tag.bulkWrite(ops);
  await mongoose.disconnect();
  console.log(JSON.stringify({ processed, updated, dryRun: DRY_RUN }));
}

main().catch(e => { console.error(e); process.exit(1); });
```
実行:
```bash
DRY_RUN=true  npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat
DRY_RUN=false npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat
```

3-2. Playwright 認証（storageState）
`tests/e2e/utils/create-storage-state.ts`（API-login か UI-login の二択骨子）:
```ts
import { chromium, request } from '@playwright/test';

async function viaApi(baseURL: string, email: string, password: string) {
  const ctx = await request.newContext({ baseURL });
  // 例: 認証APIがある場合（無ければスキップ）
  // await ctx.post('/api/auth/test-login', { data: { email, password } });
  await ctx.storageState({ path: 'tests/e2e/storageState.json' });
  await ctx.dispose();
}

async function viaUi(baseURL: string, email: string, password: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto('/auth/signin');
  // data-testid を使う（無ければ getByRole/Label を併用）
  await page.getByTestId('email-input').fill(email).catch(async () => {
    await page.getByLabel(/email|メール|E-?mail/i).fill(email);
  });
  await page.getByTestId('password-input').fill(password).catch(async () => {
    await page.getByLabel(/password|パスワード/i).fill(password);
  });
  await Promise.all([
    page.waitForURL(/\/dashboard|\//, { timeout: 15000 }),
    page.getByRole('button', { name: /sign in|ログイン/i }).click()
  ]);
  await context.storageState({ path: 'tests/e2e/storageState.json' });
  await browser.close();
}

async function main() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  const email = process.env.AUTH_EMAIL || '';
  const password = process.env.AUTH_PASSWORD || '';
  if (!email || !password) throw new Error('AUTH_EMAIL/PASSWORD required');
  try { await viaApi(baseURL, email, password); }
  catch { await viaUi(baseURL, email, password); }
}

main();
```
`playwright.config.ts` 例:
```ts
use: {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  storageState: 'tests/e2e/storageState.json',
}
```
生成/実行:
```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 AUTH_EMAIL="<email>" AUTH_PASSWORD="<password>" \
npx ts-node tests/e2e/utils/create-storage-state.ts | cat

npx playwright test tests/e2e/tags.spec.ts --project=chromium --reporter=line,html,junit,json --trace=on --output=./playwright-report | cat
```

3-3. UIサジェスト（Hook + Component + 組込み）
Hook（`src/hooks/useHashtagAutocomplete.ts`）とComponent（`src/components/HashtagSuggestions.tsx`）を作成し、`PostForm.tsx` に最小差分で組込み。必須要件:
- debounce 150ms、prefix検索、候補最大10件
- a11y: `role=listbox/option`, `aria-activedescendant`
- キー操作: 上/下/Enter/Tab/ESC
- z-index/Portalで被り回避

---

### 4. 検証（Verify & Evidence）
4-1. API/SSRスモーク
```bash
npm run build | tail -n 20
curl -sS 'http://localhost:3000/api/tags/trending?days=7&limit=5' | jq .
curl -sS 'http://localhost:3000/api/tags/search?q=t&limit=5' | jq .
curl -sSI 'http://localhost:3000/tags/東京' | head -n 20
```
4-2. Playwright（storageState 利用）
```bash
npx playwright test tests/e2e/tags.spec.ts --project=chromium --reporter=line,html,junit,json --trace=on --output=./playwright-report | tail -n 50
npx playwright show-report ./playwright-report
```
4-3. サジェストUI（E2E強化）
- 追加アサーション: 候補リスト可視化→キー操作で選択→本文置換→投稿→タイムラインにリンク→クリックで `/tags/...`

---

### 5. デバッグ（Debug Playbook）
- Node 18 警告: `nvm use 20.18.1 && npm ci`
- ts-node パス解決不可: `-r tsconfig-paths/register` を付与
- RateLimit 429: `/api/tags/search` の `windowMs/max` を一時緩和（テスト時のみ）
- セレクタタイムアウト: `data-testid` を付与 or `getByRole/Label` フォールバック
- サジェストが空: バックフィル実施 or テストデータ投稿 → 再実行
- Mongo接続失敗: `.env.local` 確認、Atlas IP許可、URI誤り検査

---

### 6. 合格基準（Acceptance Criteria）
- バックフィル後、`/api/tags/trending` と `/api/tags/search` が非空、タグページ200
- Playwright `tests/e2e/tags.spec.ts` が 3連続 PASS（storageState使用）
- 入力サジェスト：`#東` 入力で候補表示→Enter置換→投稿→リンク遷移まで一貫合格
- Log Health Gate: ERROR=0、未処理例外=0（テスト期間±2分）

---

### 7. ロールバック/セーフティネット
- 1変更=1コミット → 失敗時 `git revert <sha>`
- バックフィルは `DRY_RUN=true` で影響試算→本実行
- Feature Flag（任意）: `TAGS_FEATURE_ENABLED` でUI露出制御

---

### 8. 付録（API契約/セレクタ規約）
- `/api/tags/search`: `GET ?q=<prefix>&limit=10` → `{ success, data: [{ key, display, countTotal? }] }`
- `/api/tags/trending`: `GET ?days=7&limit=50` → `{ success, data: [{ key, count }] }`
- セレクタ推奨: `data-testid="email-input" | "password-input" | "post-content-input"` をフォーム要素に付与

---

本プレイブックに沿って作業すれば、P0/P1は合格基準で完了し、STRICT120のゲートを通過できます。失敗時はアーティファクト（line/junit/json/trace/video）とログを根拠に改善ループを回してください。


