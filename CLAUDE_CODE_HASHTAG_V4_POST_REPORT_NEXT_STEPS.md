# CLAUDE CODE 用: ハッシュタグ機能 v4 レポート分析と次の推奨ステップ（ローカル実行・Actions非推奨）

本書は、`HASHTAG_E2E_V4_IMPLEMENTATION_REPORT_2025-09-05.md` の結果（12/13 通过、1 スキップ）を踏まえ、Claude Code が「確実・安全・段階的」に完遂できるようにするための実行指示書です。費用回避のため GitHub Actions は扱いません（ローカル実行のみ）。

---

## 0. SPEC-LOCK（固定仕様）

- 正式ルート: `/timeline`（`/board`は使用しない）
- 認証要件: `/timeline` ページ/`/api/timeline` は `emailVerified: true` 必須
- サジェストAPI: `/api/tags/search` → `{ success, data: Tag[] }`
- トレンドAPI: `/api/tags/trending` → `{ success, data: Array<{ key, count }> }`
- 文章内リンク化: `linkifyHashtags` をタイムライン表示にも適用

---

## 1. レポート分析の要点（課題とリスク）

- 認証: `storageState.json` を手動編集で `emailVerified: true` を付与しており、将来の破綻リスク（構造のドリフト、漏れ）がある。
- ルーティング: `/timeline` への移行は完了したが、認証前提のため UI 経路テストの一部がスキップ。
- リンク化: タイムラインでの hashtag リンクが実際に描画されているかの確証が弱い（スキップにより未検証）。
- レート制限: 429 が発生。テストは直列・低負荷・バックスオフ必須。開発環境での緩和策が未整備。
- 契約整合: `useHashtagSuggestions` の期待レスポンス形と `search` API のレスポンス形が乖離する恐れ（`data` vs `data.data`）。

---

## 2. P0（即時）: 認証の安定化とUI機能の事実確認

以下を順番に実行。各ステップで OK/NG と対処を明記。

### 2-1) 環境前提の固定化（Node/依存/ポート）

```bash
node -v  # 20.18.1 以上
npm ci
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
```

- OK: Node 20系・依存導入完了・ポート空き
- NG: Node <20 → `nvm use 20.18.1`

### 2-2) 認証ストレージの正規生成（手動編集禁止）

- スクリプト: `tests/e2e/utils/create-storage-state.ts` を使用して `storageState.json` を生成。
- 要件:
  - UIログイン経路で生成（CSRF/リダイレクトを経る）
  - 生成後に `/api/auth/session` をフェッチし、`user.emailVerified === true` を検証

実行例:

```bash
npx ts-node --project tsconfig.json tests/e2e/utils/create-storage-state.ts
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/auth/session');const j=await r.json();console.log(!!j?.user?.emailVerified)})();"
```

- OK: `true` 出力
- NG: `false`/失敗 → もう一度生成。必要に応じてテスト専用ユーザの `emailVerified` をDBで更新（本番不可）。

補足（代替/暫定）:

- `src/middleware.ts` に既存の E2E バイパス（例: 特定クッキー）ロジックがある場合、Playwright の `storageState` に当該クッキーを含めることで `/timeline` を通過可能。
- 本番では無効化すること。PRに「E2E専用フラグ」を明示。

### 2-3) 開発サーバ起動と健全性

```bash
npm run dev &
npx wait-on http://localhost:3000
```

- OK: 応答 200
- NG: ログ収集→依存/環境/NextAuth設定を確認

### 2-4) タイムラインのリンク化が実際に描画されるか確認

- 対象: `src/components/RealtimeBoard.tsx`（またはタイムライン本文描画箇所）
- 期待: `linkifyHashtags(post.content)` を利用して、`a[aria-label^="タグ "]` もしくは `data-testid="tag-link"` を出力

検証（最小シード投入 → 表示確認）:

```bash
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'E2E Seed',author:'e2e-bot',content:'テスト #東京 #React'})});console.log('SEED',r.status)})();"
```

Playwrightで:

```ts
await page.goto('/timeline');
await page.waitForLoadState('domcontentloaded');
await page.waitForResponse((r) => r.url().includes('/api/timeline') && r.status() === 200);
const n = await page.locator('a[aria-label^="タグ "], [data-testid="tag-link"]').count();
console.log('[LINKIFY]', { count: n });
```

- OK: `count >= 1`
- NG: 0 → 本文描画をリンク化ユーティリティで組み立てるよう修正（UIのみの変更）。

### 2-5) サジェスト契約の整合

- 対象: `src/hooks/useHashtagSuggestions.ts`
- 期待: `/api/tags/search` のレスポンス `{ success, data }` と一致
- 確認点:
  - `const json = await res.json(); const suggestions = json.data ?? []` のように `data` を参照
  - `data.data` を参照していないこと

OK/NG:

- OK: 参照先が `json.data`
- NG: `json.data.data` を参照 → 修正

### 2-6) レート制限の衝突回避（テスト側）

- Playwright: `--workers=1`、シナリオ間に `await page.waitForTimeout(500)` を挿入
- 429の扱い: 警告相当として再試行（最大2回・指数バックオフ）

コード例:

```ts
for (let attempt = 1; attempt <= 3; attempt++) {
  const r = await fetch(url);
  if (r.status !== 429) break;
  await new Promise((res) => setTimeout(res, 400 * attempt));
}
```

（任意・開発環境のみ）

- `src/lib/rateLimit.ts` が `process.env.RATE_LIMIT_MAX` 等を読むようなら、`.env.local` にて一時的に閾値を緩める（本番禁止）。

---

## 3. P1（数日）: データ整備とテスト拡充

### 3-1) シード/バックフィルの統一

- `ts-node -P tsconfig.scripts.json` で動くスクリプトを1本に統一（CJS想定）
- 投稿1件以上（日本語/英語/絵文字タグ含む）を自動投入し、`Tag` コレクションの更新も確認

### 3-2) UIテストの完全化

- スキップしていたリンク化テストを、認証を満たした状態で再度実施
- `data-testid` を安定的に付与（`tag-link`, `content-input` など）

### 3-3) トレンド検証の強化

- 時間窓（daysクエリ）を変えた場合の安定性確認
- カウント降順と `lastUsedAt` の優先順位検証

---

## 4. P2（数週間）: 運用と将来の安定化

### 4-1) ルーティング一貫性

- `/board` の残骸やドキュメント表記を排除し、`/timeline` に統一

### 4-2) 認証生成の堅牢化

- storageState 生成で「構造検証（emailVerified:true）」を必須に
- 生成失敗時は即エラー終了し、曖昧な手動編集を禁止

### 4-3) レート制限と並列度の最適化

- 開発・E2E では `workers=1` 固定
- 将来的には Redis 等の中央ストアに移行し、IPベースの安定判定

---

## 5. 実行チェックリスト（Claude が使う最終セルフチェック）

- [ ] Node 20系・依存・ポートOK
- [ ] storageState をスクリプト生成・`/api/auth/session` で `emailVerified:true` 確認
- [ ] `/timeline` で投稿が表示され、本文にタグリンクが1つ以上
- [ ] サジェストはレスポンス `{ success, data }` 準拠でパース
- [ ] 429 は警告扱いで再試行し、全体は失敗させない
- [ ] スキップしていたリンク化テストを有効化して合格
- [ ] エビデンス（HTML断片、スクショ、trace）を保存

---

## 6. デバッグログと期待状態のサンプル

```ts
console.log('[AUTH-SESSION]', { emailVerified: session?.user?.emailVerified });
console.log('[API-SEARCH]', { status: r.status, count: j.data?.length });
console.log('[TIMELINE]', { status: r.status });
console.log('[LINKIFY]', { anchors: await page.locator('a[aria-label^="タグ "]').count() });
await page.waitForResponse((res) => res.url().includes('/api/timeline') && res.status() === 200);
console.log('[HTML]', (await page.content()).slice(0, 1500));
```

- OK: 期待フィールドが `true`/`200`/`>=1` 等
- NG: 異常値 → 直前ステップに戻り原因を切り分け

---

## 7. 注意（費用/本番影響の回避）

- GitHub Actions は本書では扱わない（費用/上限制約の可能性）
- 本番設定（レート制限・認証ゲート）を緩める変更は不可。開発/E2E 専用のフラグ・環境変数で限定

以上。これに沿って、Claude Code は段階的に実行・検証・復旧が可能です。
