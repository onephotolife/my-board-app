# CLAUDE CODE 用: v5 詳細レポート分析に基づく 次の推奨ステップ（ローカル限定/Actions非使用）

目的: v5レポート（サーバ起動不可: MODULE_NOT_FOUND 'next'）を起点に、パッケージマネージャ混在とカスタムサーバ依存に起因する不具合を段階的に解消し、ハッシュタグ機能のE2Eまで安定完走させる。多角的にOK/NG基準・デバッグログ・代替案を明示。

---

## 0. SPEC-LOCK（非交渉仕様の再確認）

- 正式ルート: `/timeline`（`/board`は使用しない）
- 認証要件: `/timeline` および `/api/timeline` は `emailVerified: true` 必須
- API契約:
  - `/api/tags/search` → `{ success, data: Tag[] }`
  - `/api/tags/trending` → `{ success, data: Array<{ key, count }> }`
- UI要件: タイムライン本文に `linkifyHashtags` を適用し、`a[aria-label^="タグ "]` または `data-testid="tag-link"` を出力

---

## 1. 証拠に基づく課題整理（v5レポート×現行コード）

- package.json の `dev` は `node server.js`。`server.js` は `require('next')` を前提。
- v5レポートでは、npm と pnpm を混在させた結果、`MODULE_NOT_FOUND: 'next'` が多発。
- `src/components/RealtimeBoard.tsx` は `post.content` をプレーン表示。本文のリンク化未適用（タグChipはあるが本文中の `#タグ` クリック導線が不足）。
- `src/hooks/useHashtagSuggestions.ts` は `{ success, data }` 形を参照。`/api/tags/search` の実装とも整合。

---

## 2. P0（即時）: サーバ起動失敗の回復（PM統一→Next起動）

2-1) PM混在を解消（npmへ統一）

```bash
# ルートで実行
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
rm -rf node_modules package-lock.json pnpm-lock.yaml .next .turbo
npm install --prefer-offline --no-audit --progress=false
```

OK: `node_modules/next` が解決可

```bash
node -e "console.log(require.resolve('next'))"
```

NG: 解決不可 → ネットワーク/レジストリ/プロキシを確認し再実行

2-2) Nextを直接起動（カスタムサーバを一旦バイパス）

```bash
npx next dev --port 3000 &
npx wait-on http://localhost:3000
```

OK: ローカル到達、トップページ200
NG: TypeScript自動インストールで停止→ログを貼付（30〜60秒待機して再確認）

2-3) 代替案（どうしても `server.js` が必要な場合）

- `server.js` の `require('next')` が解決できない環境での暫定策
  - PM混在を必ず解消（npm統一）
  - それでも失敗する場合は `require.resolve('next', { paths: [process.cwd()] })` フォールバックを導入（変更はPRで可視化）
- ただし、App Router ではカスタムサーバは非推奨。Next標準 `next dev` を優先。

---

## 3. P0（即時）: タイムライン本文のリンク化を適用

3-1) 対象

- `src/components/RealtimeBoard.tsx`

3-2) 方針

- `post.content` の描画を `linkifyHashtags` の返却値に基づき組み立てる
- アンカーに `aria-label="タグ #<表示>"` と `data-testid="tag-link"` を付与

3-3) 最小確認

```bash
# 最小シードを投入（API契約は既存のPOSTに合わせる）
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'E2E Seed',author:'e2e-bot',content:'seed #東京 #React #🚀'})});console.log('[SEED]', r.status)})();"
```

Playwright/ブラウザで:

- `/timeline` へ移動 → `domcontentloaded` と `/api/timeline` の200を待機
- `a[aria-label^="タグ "], [data-testid="tag-link"]` のカウントが 1 以上

NG時の対処:

- 本文描画箇所の実装漏れを修正（`whiteSpace: 'pre-wrap'` を維持しつつリンクノードを差し込む）

---

## 4. P0（即時）: 認証の安定化（手動編集禁止）

4-1) `storageState.json` は必ずスクリプトで生成

```bash
npx ts-node --project tsconfig.json tests/e2e/utils/create-storage-state.ts
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/auth/session');const j=await r.json();console.log('[AUTH-SESSION]', !!j?.user?.emailVerified)})();"
```

OK: `[AUTH-SESSION] true`
NG: false → 生成をやり直し。必要に応じてテスト専用バイパス（ミドルウェアで特定クッキー）をE2E限定で活用（本番不可）。

---

## 5. P1（数日）: レート制限/並列度/待機の運用設計

5-1) Playwright 実行方針

```bash
npx playwright test --project=chromium --workers=1 --reporter=html
```

- 429が出たら指数バックオフ（400→800→1600ms）
- シナリオ間で `await page.waitForTimeout(300-500ms)` を挿入

5-2) 任意（開発のみ）

- `withRateLimit` 側に dev用の閾値上書え（環境変数）を導入し、E2E時は緩める（本番禁止）

---

## 6. P1: サジェスト契約の再検証

6-1) フック側

- `src/hooks/useHashtagSuggestions.ts` が `json.data` を参照していることを再確認（`data.data` はNG）

6-2) API側

- `src/app/api/tags/search/route.ts` は `{ success, data }` を返していることを確認

OK: 双方が一致
NG: 乖離があればフック側を `json.data` に統一

---

## 7. P1: E2Eテスト再開（段階）

7-1) APIレイヤ

- `search/trending/timeline` の200/契約整合を確認

7-2) UIレイヤ

- `/posts/new` の `#` 入力で候補がゼロでもフリーズなく確定できる
- `/timeline` の本文リンク化が可視・クリックで `/tags/<key>` 到達

7-3) Unicode/Emoji

- `/tags/東京`, `/tags/%F0%9F%9A%80`, `/tags/%F0%9F%87%AF%F0%9F%87%B5` が200（429は一時警告）

---

## 8. デバッグログ/OK-NG/代替

8-1) 代表ログ

```ts
console.log('[API-SEARCH]', { status: r.status, count: j.data?.length });
console.log('[TIMELINE]', { status: r.status });
console.log('[LINKIFY]', { anchors: await page.locator('a[aria-label^="タグ "]').count() });
await page.waitForResponse((u) => u.url().includes('/api/timeline') && u.status() === 200);
console.log('[HTML]', (await page.content()).slice(0, 1500));
```

8-2) 代表NGと復旧

- 401/403: storageState再生成 or E2Eバイパス（本番不可）
- 429: 直列化・待機・指数バックオフ。テストの分割走行
- リンク0: 本文のリンク化未適用→UI実装
- 起動不能: PM混在排除→`npx next dev` 優先→必要時のみ `server.js` を使う

---

## 9. TRIPLE MATCH GATE（最終ゲート）

- [ ] ルート/契約/認証が仕様ロックと一致（`/timeline`・`{ success,data }`・emailVerified:true）
- [ ] タイムライン本文にリンクが表示され、`/tags/<key>` へ到達可能（スクショ/HTML断片の証跡）
- [ ] 429は警告として扱い、全体は失敗させず復帰を確認（ログ証跡）

## 10. REPO-EVIDENCE-MATRIX（保存する証跡）

- スクショ: `/timeline` でのリンク化、タグページ到達
- HTML断片: アンカーノード（`a[aria-label^="タグ "]`）
- APIログ: search/trending/timeline のステータスと件数
- Playwrightレポート: PASS一覧・trace

## 11. FINAL SELF-REVIEW（絶対失敗しない最終見直し）

- [ ] PM混在を解消（npm統一）。`require.resolve('next')` が通る
- [ ] `npx next dev` で到達→必要時のみ `server.js` を使う（改善含む）
- [ ] 本文リンク化の実装済（`data-testid="tag-link"`）
- [ ] `json.data` に統一（`data.data` の参照はない）
- [ ] 429でテスト全体が失敗しない（指数バックオフ/直列）

注: GitHub Actions は本書では使用しません（費用回避）。ローカルで段階的に完走してください。
