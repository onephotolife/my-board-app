# ONE-SHOT: タグ一覧/詳細 Master ランブック v3（ローカル専用・Actions非使用・100点版）

目的: 既存実装（/tags 一覧・/tags/[tag] 詳細・API群）を現行仕様に厳密整合し、UI/UXを高水準へ引き上げ、E2Eまで小刻みに完了させる。Claude Codeは本書だけで自走すること。

---

## 0. SPEC-LOCK（非交渉の前提）

- ルート/認証:
  - タイムライン: `/timeline`（`emailVerified:true` 必須）
  - タグ詳細: `/tags/[tag]`（公開で良い設計にする）
  - タグ一覧: `/tags`（公開）
- API契約:
  - `/api/tags/search` → `{ success, data: Tag[] }`（prefix検索）
  - `/api/tags/trending` → `{ success, data: Array<{ key, count }>} `
  - 新規/既存: `/api/tags/index` → `{ success, data, pagination:{ page, limit, hasNext } }`
  - 投稿一覧: `/api/posts` は `?tag=<key>&sort&limit&page` で絞込・ページング（なければ追加）
- ユーティリティ: `normalizeTag`, `linkifyHashtags`（NFKC・VS除去・ZWJ配慮）
- レート制限: devで60req/min程度（429は警告扱いで再試行）

---

## 1. 事前点検（多角的・慎重な現状把握）

1-1) 起動/依存

```bash
node -v  # 20.18.1+
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
npm ci
npm run dev &
npx wait-on http://localhost:3000
```

OK: 到達 200

1-2) ファイル実在確認（読み取りのみ）

- `/api/tags/index/route.ts`（検索/ページング/ソート/limit+1でhasNext）
- `/tags/page.tsx`（検索/ソート/ページングUI）
- `/tags/[tag]/page.tsx`（既存のシンプル版）
- `src/app/utils/hashtag.ts`（normalize/linkify）
- テスト: `tests/e2e/tags.index.spec.ts` が存在すれば把握
  OK: 存在。NG: なければ本書の擬似コードで追加（後述）

---

## 2. 設計の全体像（最適統合）

- /tags 一覧:
  - 検索（`q`は#不要、前方一致）、並び替え `popular|recent`（`countTotal` or `lastUsedAt`）、ページング（20件）
  - 429はUIで警告表示+再試行
  - a11y/テストID付与
- /tags/[tag] 詳細:
  - 見出し（`#display`）、件数/最終更新（任意）
  - 並び替え `newest|popular`（`-createdAt`/`-likes`等）
  - MUIカード化・本文linkify・作者/日付/いいね数
  - ページング（20件）・空表示・新規投稿導線
- API: 既存の契約に揃え、`/api/tags/index` と `/api/posts` の出力を安定化

---

## 3. 実装（小さく段階的に）

3-A) `/api/tags/index` 点検/強化（必要な場合のみ差分）

- パラメータ: `q`, `sort=popular|recent`, `page>=1`, `limit<=50`
- 正規化: `key = normalizeTag(q)`、filterは `^key` のRegex（エスケープ必須）
- ソート: `popular→{countTotal:-1}`, `recent→{lastUsedAt:-1}`
- ページング: `skip=(page-1)*limit`, `limit=limit+1` で `hasNext` 判定→返却は `slice(0,limit)`
- レスポンス: `{ success:true, data, pagination:{ page, limit, hasNext } }`
- Rate limit: `withRateLimit(req, handler, { windowMs:60_000, max:60 })`
- OK: curlで200/JSON整合。NG: 500はログ、429は警告。

3-B) `/tags` UI 改善（必要差分のみ）

- 検索欄: `#`は不要。Enter/検索ボタンでpage=1で再フェッチ
- 並び替え: `popular|recent` トグル
- リスト: `ListItem` or `Card`で `#display / countTotal` 表示、クリックで `/tags/<key>`
- ページング: `さらに読み込む` ボタン（IntersectionObserverは後日）
- a11y/テストID: `tags-index-search`, `tags-index-sort`, `tags-index-item-<key>`
- 429: 警告表示+再試行

3-C) `/api/posts` の `tag` 絞込（未対応なら追加）

- GET: `?tag=<key>&sort=-createdAt&page=1&limit=20`
- 条件: `{ tags: key }`
- ページング/ソート: 既存の枠組みに揃える
- レスポンス: `{ success, data, pagination }`

3-D) `/tags/[tag]` UI/UX 刷新

- ヘッダ: `Typography h4`で `#<display or key>`、サブ情報（結果数など）
- 操作: `ToggleButtonGroup`（`newest|popular`）→ sortクエリ変更
- リスト: `Card` 表示・本文 `linkifyHashtags` 適用
- メタ: 作者/日付/いいね数（存在すれば）
- ページング: `さらに読み込む`（20件）
- 0件: 空UI＋`/posts/new` 導線
- テストID: `tag-page-title`, `tag-post-card-<id>`

3-E) linkifyの徹底

- タイムラインや詳細で本文が素のままなら `linkifyHashtags` を適用
- 429/認証絡みで表示が不安定ならログ収集

---

## 4. デバッグログ・OK/NG・復旧

- ログ例:

```ts
console.log('[TAGS-INDEX]', { status: res.status, q, sort, page, count: data?.data?.length });
console.log('[TAG-PAGE]', { tag, status: res.status, sort, page, count: data?.data?.length });
```

- 429: 300–800ms待機→再試行。連打禁止、直列実行。
- 500: サーバーログ/スタック貼付（正規化・Regex・DB接続エラーを重点）。
- 空結果: 仕様通り。空状態コンポーネントを表示。

---

## 5. Playwright E2E（段階・直列・安定化）

5-1) tags.index（一覧）

- シナリオ:
  1. `/tags` 到達→タイトル確認・リスト0件以上
  2. 検索「東」→Enter→一覧更新（0件でもOK）
  3. ソート popular→recent→popular 切替（200/要素更新）
  4. 任意アイテムクリック→`/tags/<key>` 到達
  5. 429検証→警告ログ→待機→復帰
- 安定化:

```ts
await Promise.all([page.waitForURL(/\/tags\/[^/]+$/, { timeout: 8000 }), firstTag.click()]);
```

5-2) tags.detail（詳細）

- シナリオ:
  1. `/tags/javascript` 到達→ `#javascript` 表示
  2. リスト表示（0件なら空UI）
  3. 並び替え `newest|popular` 切替で200
  4. 本文に `a[href*="/tags/"]` がある（linkify）
  5. タグリンクをクリック→別タグ詳細へ
  6. 最後に429テスト→待機で復帰

実行:

```bash
npx playwright test tests/e2e/tags.index.spec.ts --project=chromium --workers=1 --reporter=html
npx playwright test tests/e2e/tags.detail.spec.ts --project=chromium --workers=1 --reporter=html
```

---

## 6. リスク/分岐（多角的視点）

- 認証: `/tags` と `/tags/[tag]` は公開設計。middlewareで誤って保護していないか確認。
- 正規化: Unicode/絵文字/ZWJ/VS16でインデックスが一致するか。`normalizeTag`を必ず経由。
- 既存コードとの差分: 既に存在する場合は改修だけに留め、契約とUIを整える。
- 依存: 既存lintルールが厳格。consoleログは開発中のみ、不要なら削除可。

---

## 7. 最終ゲート（TRIPLE MATCH）

- [ ] API契約: `/api/tags/index` と `/api/posts` が仕様通り。
- [ ] /tags UI: 検索/並び替え/ページング/遷移が成立。
- [ ] /tags/[tag] UI: 見出し/カード/リンク化/並び替え/ページング/空状態が成立。
- [ ] E2E: 直列・待機・429復帰でPASS。

---

## 8. 実行の順序（Claude Code用まとめ）

1. 起動・点検（1章）→200到達。
2. `/api/tags/index` を契約/安定化（3-A）。
3. `/tags` をUI安定化（3-B）。
4. `/api/posts` のtag絞込を確認/導入（3-C）。
5. `/tags/[tag]` を全面改善（3-D）。
6. linkify徹底（3-E）。
7. E2E（5章）を`--workers=1`で実行→レポート保存。
8. 失敗時は4章の手順通り復旧。成功後は最終ゲート（7章）実施。

以上。
