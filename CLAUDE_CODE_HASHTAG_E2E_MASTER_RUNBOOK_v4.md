# CLAUDE CODE 実行用: ハッシュタグ機能 E2E 完全自走ランブック v4（ローカル最適化・Actions非推奨）

目的: Claude Code が単独で、失敗なくローカル環境でE2Eを完遂できるようにする最終版。既存視点に縛られず、多角的な回復手順・小ステップ実行・詳細なログ出力・OK/NG判定・代替手順・最終セルフチェックを完備。CI（GitHub Actions）は費用回避のため本書では扱わない。

---

## 0. SPEC-LOCK

- 正規タイムライン: `/timeline`（`/board`は互換なし。使わない）
- 認証: `/api/timeline` は `emailVerified: true` 必須
- API: `/api/tags/search` → `{ success, data }`、`/api/tags/trending` → `{ success, data: [{ key, count }] }`
- 入力候補: `/posts/new` の `data-testid="content-input"` で `#` 入力、0件でもOK

---

## 1. プレフライト（全手順の前に）

1-1) Node/Port/依存関係

```bash
node -v  # v20.18.1 以上必須
lsof -ti:3000 || true  # 使用中なら kill -9 <PID>
npm ci
npx playwright install --with-deps
```

OK: Node 20系、ポート空き、依存導入完了
NG: Nodeが18系→ `nvm use 20.18.1`

1-2) 環境変数（.env.local）

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<secure-random-string>
MONGODB_URI=<your-mongodb-uri>
```

OK: dev起動でエラーなし

1-3) 認証ストレージ（emailVerified:true）

```bash
# 既存確認
[ -f tests/e2e/storageState.json ] && echo OK || echo NG

# NGなら生成（プロジェクトの生成スクリプトに合わせる）
npx ts-node --project tsconfig.json tests/e2e/utils/create-storage-state.ts
node -e "const s=require('./tests/e2e/storageState.json'); console.log(!!s.cookies && !!s.origins)"
```

OK: true が出力
NG: 401/403が出る→再生成、emailVerified:true を担保

1-4) 開発サーバ起動

```bash
npm run dev &
npx wait-on http://localhost:3000
```

OK: wait-on完了
NG: ログ保存→依存/型/ポート確認

---

## 2. 小ステップ実行（段階的に上げる）

2-1) API健康診断

```bash
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/tags/search?q=%E6%9D%B1');const j=await r.json();console.log('[SEARCH]',r.status,Array.isArray(j.data));})();"
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/tags/trending?days=30&limit=20');const j=await r.json();console.log('[TRENDING]',r.status,Array.isArray(j.data));})();"
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/timeline');console.log('[TIMELINE]',r.status);})();"
```

OK: 200/200/200
NG: timelineが401/403→storageState再生成

2-2) 最小シード投入（1件）

```bash
node -e "(async()=>{const r=await fetch('http://localhost:3000/api/posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'E2E Seed 東京',author:'e2e-bot',content:'シード投稿 #東京 #React'})});console.log('[SEED]',r.status);})();"
```

OK: 200/201
NG: 429→60秒待機後に再試行

2-3) サジェスト（0件OK）

- `/posts/new` → `content-input` に `#東`
- 候補が出たら矢印+Enter。出なくてもフリーズしなければOK（a11y文言で可）

2-4) 投稿→リンク化→タグページ

- `/posts/new` で作成→ `/timeline` へ移動
- 両待機: `domcontentloaded` と `/api/timeline` 200
- 本文内にタグリンク（`a[aria-label^="タグ "]` or `data-testid="tag-link"`）
  OK: 1つ以上見える/クリックで `/tags/<key>`
  NG: ローディング固定→401/403確認、リンク0→代替手順3-1

2-5) トレンド→タグページ

- トレンドUI→タグクリック→ `/tags/<key>`
  OK: 投稿表示

2-6) Unicode/Emoji

- `/tags/東京`, `/tags/%F0%9F%9A%80`, `/tags/%F0%9F%87%AF%F0%9F%87%B5` をGET
  OK: 200（429は警告扱いで継続）

2-7) レート制限（最後に）

- 直列・1秒スリープ・chromiumのみ
  OK: 429観測→クールダウン後200復帰

---

## 3. 代替手順（差異や失敗時に）

3-1) タイムライン本文にリンクが出ない

- 本文描画箇所を `linkifyHashtags(post.content)` に差し替え
- `aria-label="タグ #表示"` と `data-testid="tag-link"` を付与
- ビルド→再検証

3-2) 認証エラー

- storageStateをemailVerified:trueで再生成
- 回避策（短期）: E2E時のみUI/APIゲートを一時緩和（本番で無効）

3-3) レート制限

- 単ブラウザ/直列/遅延、429はwarning扱い

---

## 4. Playwright実行（ローカル）

```bash
npx playwright test --project=chromium --workers=1 --reporter=html
```

- 成果物: `playwright-report/`, `test-results/`

---

## 5. ログ・デバッグ（貼付テンプレ）

```ts
console.log('[API-SEARCH]', { status: r.status, count: j.data?.length });
console.log('[TIMELINE]', { status: r.status });
console.log('[LINKIFY]', { anchors: await page.locator('a[aria-label^="タグ "]').count() });
await page.waitForLoadState('domcontentloaded');
await page.waitForResponse((r) => r.url().includes('/api/timeline') && r.status() === 200);
console.log('[HTML]', (await page.content()).slice(0, 1500));
```

---

## 6. 代表的エラーと対処

- 401/403: storageState再生成
- 429: 直列+遅延+warning運用
- タイムアウト: 待機条件追加/タイムアウト延長（~15s）
- 500: devログ提出

---

## 7. フリーズ復旧

- Reload Window、AIパネル再表示
- 一時GPT切替→ログ採取→Claude復帰
- Anthropic再認証
- `.cursor` 一時リネーム→再起動
- 60秒待機して再送（連投禁止）

---

## 8. 最終セルフチェック

- [ ] Node 20系/ポート空き/依存OK
- [ ] storageState有効で `/api/timeline` が200
- [ ] `/posts/new` の `#` 入力でUI反応（0件でもOK）
- [ ] 投稿→ `/timeline` → タグリンク表示/遷移OK
- [ ] トレンド→タグページOK
- [ ] Unicode/Emojiタグで200（429は警告）
- [ ] 429テストを最後に実施し復帰確認
- [ ] 失敗時のログ/スクショ/trace を保存

以上。
