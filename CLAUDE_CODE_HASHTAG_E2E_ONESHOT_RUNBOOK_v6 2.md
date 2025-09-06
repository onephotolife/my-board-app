# ONE-SHOT: ハッシュタグ機能 E2E 自走ランブック v6（npm統一・Next直起動・ローカル専用）

目的: Claude Code がこの1ファイルだけで、PM混在を排除し、Nextを標準起動し、linkify/認証/429/最終ゲートまで小さく段階的に完走する。GitHub Actionsは使わない。

---

## 0. SPEC-LOCK（非交渉）

- ルート: `/timeline` 固定（`/board`は使用禁止）
- 認証: `/timeline` & `/api/timeline` は `emailVerified:true` 必須
- API契約:
  - `/api/tags/search` → `{ success, data: Tag[] }`
  - `/api/tags/trending` → `{ success, data: Array<{ key, count }> }`
- UI: タイムライン本文は `linkifyHashtags` でアンカー化（`a[aria-label^="タグ "]` or `data-testid="tag-link"`）

---

## 1. PM混在の排除と起動（最短ルート）

1-1) Node/依存/掃除

```bash
node -v  # 20.18.1+
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
rm -rf node_modules package-lock.json pnpm-lock.yaml .next .turbo
npm install --prefer-offline --no-audit --progress=false
node -e "console.log(require.resolve('next'))"  # 解決可否チェック
```

OK: nextの解決パスが出力
NG: 解決不可→再実行/ネットワーク確認

1-2) Next標準で起動（custom serverを一旦回避）

```bash
npx next dev --port 3000 &
npx wait-on http://localhost:3000
```

OK: 200到達
NG: TypeScript自動導入で停止→30〜60秒待機し再試行。ログ貼付

補足: `node server.js` は必要時のみ後段で使用（非推奨）。

---

## 2. 認証の正規生成（手動編集禁止）

```bash
npx ts-node --project tsconfig.json tests/e2e/utils/create-storage-state.ts
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/auth/session');const j=await r.json();console.log('[AUTH-SESSION]', !!j?.user?.emailVerified)})();"
```

OK: `[AUTH-SESSION] true`
NG: false → 生成やり直し。必要時のみE2E限定バイパスクッキー活用（本番不可）

---

## 3. API健診 → シード → 本文リンク化の順で小さく進める

3-1) API健診

```bash
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/tags/search?q=%E6%9D%B1');const j=await r.json();console.log('[SEARCH]', r.status, Array.isArray(j.data));})();"
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/tags/trending');const j=await r.json();console.log('[TRENDING]', r.status, Array.isArray(j.data));})();"
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/timeline');console.log('[TIMELINE]', r.status);})();"
```

OK: 200/200/200
NG: timelineが401/403→認証をやり直す

3-2) 最小シード1件

```bash
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'E2E Seed',author:'e2e-bot',content:'seed #東京 #React #🚀'})});console.log('[SEED]', r.status)})();"
```

OK: 200/201
NG: 429→60秒待機後に再試行

3-3) 本文リンク化の可視確認

- `/timeline` へ移動 → `domcontentloaded` と `/api/timeline` 200を待つ
- `a[aria-label^="タグ "], [data-testid="tag-link"]` の count を取得
  OK: `>= 1`
  NG: 0 → `RealtimeBoard.tsx` の本文を `linkifyHashtags` で組み立て、ARIA/テストIDを付与

---

## 4. サジェスト/UI/Unicode/429 を段階的に検証

4-1) サジェスト

- `/posts/new` で `#東` 入力→ listbox可視/Enter確定
  OK: 候補0件でもフリーズなし
  NG: `useHashtagSuggestions` が `json.data` を参照しているか確認（`data.data`はNG）

4-2) トレンド→タグページ

- トレンドUIから任意タグ→ `/tags/<key>` 到達
  OK: 200

4-3) Unicode/Emoji

- `/tags/東京`, `/tags/%F0%9F%9A%80`, `/tags/%F0%9F%87%AF%F0%9F%87%B5` → 200（429は警告）

4-4) レート制限（最後に）

- `--workers=1` 直列、chromiumのみ
- 429は指数バックオフ（400→800→1600ms）で再試行

---

## 5. Playwright 実行（ローカル）

```bash
npx playwright test --project=chromium --workers=1 --reporter=html
```

成果物: `playwright-report/`, `test-results/`

---

## 6. デバッグ/復旧/証跡

6-1) ログ断片

```ts
console.log('[API-SEARCH]', { status: r.status, count: j.data?.length });
console.log('[TIMELINE]', { status: r.status });
console.log('[LINKIFY]', { anchors: await page.locator('a[aria-label^="タグ "]').count() });
await page.waitForResponse((u) => u.url().includes('/api/timeline') && u.status() === 200);
console.log('[HTML]', (await page.content()).slice(0, 1500));
```

6-2) 代表NG→復旧

- 起動不可: PM混在排除→`npx next dev` 優先→ログ貼付
- 401/403: storageState 正規再生成
- 429: 直列+指数バックオフ
- リンク0: UI本文に `linkifyHashtags` を適用（ARIA/テストID）

6-3) 証跡（REPO-EVIDENCE-MATRIX）

- スクショ: タイムラインリンク化、タグページ到達
- HTML断片: タグアンカー
- APIログ: search/trending/timeline のステータス
- レポート: Playwright HTML/trace

---

## 7. FINAL SELF-REVIEW（絶対失敗防止）

- [ ] npmに統一し、`require.resolve('next')` が通る
- [ ] `npx next dev` で到達（custom serverは必要時のみ）
- [ ] `/timeline` 固定・認証は `emailVerified:true` で通過
- [ ] 本文リンク化によりアンカーが1つ以上可視
- [ ] サジェストは `json.data` の契約準拠
- [ ] 429は警告扱いで復帰確認
- [ ] 証跡（スクショ/HTML/レポート）を保存

以上。これに従えば、Claude Code は安全・段階的・多角的に完走できます。
