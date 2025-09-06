### タグページ非表示・恒久対策 実装指示書（最終版）

目的

- PC/スマホともに `http://localhost:3000/tags/東京` のメインカラムで「#東京」付き投稿が確実に表示されること
- 原因特定→最小差分対策→ログ/テストで「直った」を証明できること

合致性レビュー（現行仕様と一致）

- 画面構造
  - `src/app/tags/[tag]/page.tsx`（Next.js App Router, paramsはNext.js 15で非同期）
  - `src/app/tags/[tag]/TagDetailClient.tsx`（MUIベース、`/api/posts?tag=<key>` をfetch）
- API
  - `src/app/api/posts/route.ts`（GET, 認証必須）
  - タグ検索は「`tags IN [tag]` OR 本文 `#<tag>`」を実装可能
- ハッシュタグ正規化
  - `src/app/utils/hashtag.ts`（NFKC/VS除去/ASCII小文字化）
- レイアウト
  - サイドバーはデスクトップでpermanent（約280px）。グローバルCSSの広域上書きは撤廃し、タグページ配下へ限定
- E2E
  - `tests/e2e/tags.show-posts.spec.ts`, `tests/e2e/tags.desktop-layout.spec.ts` あり
  - `playwright.config.ts` で `tests` 配下を実行

---

## フェーズ0. 事前準備

- `.env.local`（開発のみ）に `DEBUG_TAGS=true` を追記
- コマンド
  - `npm run dev`
  - `npm run test:e2e -- tests/e2e/tags.show-posts.spec.ts`
  - `npx playwright show-report`（必要時）
- NG対処: ポート占有時 `npm run kill-port`

## フェーズ1. 観測（多角的チェック）

- `http://localhost:3000/tags/東京` を開き、DevTools Network で `GET /api/posts?tag=東京` を確認
- OK: 200 + `{ success:true, data:[...] }` + `data.length>=1`
- NG例と仮説
  - 401/403 → 認証/Cookie未送信（C1）
  - 200だが `data:[]` → DBの `tags` 未設定 or Unicode差異（S1）
  - APIはOKだが画面空 → UI/CSS（U1）

## フェーズ2. 実装（小さく段階的に）

### C1. クライアント取得の堅牢化（Cookie/キャッシュ）

- 対象: `src/app/tags/[tag]/TagDetailClient.tsx`
- `fetch('/api/posts?...')` に以下を付与
  - `credentials: 'include'`
  - `cache: 'no-store'`
- 期待: NetworkにCookieが載る、200/success:true/data.length>=1
- デバッグ（開発のみ）: `console.warn('[TAG-CLIENT]', { url, status, items })`
- 検証: 強制リロード（Cmd+Shift+R）→ E2E `tags.show-posts.spec.ts`

### S1. API検索の後方互換化（OR: tags配列 or 本文 `#<tag>`）

- 対象: `src/app/api/posts/route.ts`（GET）
- 指示（最小差分）
  - 検索を `finalQuery` に集約
  - `tag` 指定時は
    - `tags: { $in:[tag] }` を条件に含める
    - さらに `content` が `#<tag>` にマッチ（Unicode `u`、終端: 空白/行末/句読点）するOR条件を追加
  - `search` 等は `$and` に積む
- 期待: 本文のみ `#東京` でもヒット
- デバッグ（開発のみ）: `console.warn('[TAG-API]', { tag, finalQuery, total, sampleId })`
- 検証: 統合テスト＋E2E

### P1. Next.js 15 非同期 `params` 対応

- 対象: `src/app/tags/[tag]/page.tsx`
- `({ params }: { params: Promise<{ tag:string }> })` とし、関数内で `const { tag } = await params`
- 期待: 初回遷移/直リンクでも `tagKey` を確実に取得

### U1. UI/CSS 安全確認（回帰防止）

- グローバルCSSの変形リセットは `#tag-page-root` 配下のみに限定済み
- メイン `Container/Box` は `position:relative; overflow:visible; z-index:auto` を維持
- メイン `z-index` はサイドバーより低くならないこと
- 期待: デスクトップ=サイドバー 260–300px/Backdropなし/メイン操作可、モバイル=Drawer 280px/Backdropあり

### O1. SSR 初期描画（任意・体感改善）

- 対象: `src/app/tags/[tag]/page.tsx`
- サーバ側で `/api/posts?tag=<key>&sort=-createdAt&page=1&limit=20` を `cache:'no-store'` で取得
- `TagDetailClient` に `initial:{ posts, hasNext }` を渡す

---

## フェーズ3. ログ・計測（開発のみ）

- クライアント: `console.warn('[TAG-CLIENT]', { url, status, items })`
- サーバ: `console.warn('[TAG-API]', { tag, finalQuery, total, sampleId })`
- 期待: `/tags/東京` 表示時に `total>0`

## フェーズ4. テスト（証明セット）

### 単体（Jest）

- `__tests__/utils/hashtag.test.ts`
  - `normalizeTag('東京') === '東京'`
  - `normalizeTag('東\uFE0F京') === '東京'`
  - `linkifyHashtags('#東京')` → `/tags/東京`

### 統合（Jest + mongodb-memory-server）

- API GET タグ検索（OR検証/401検証）
  - A: `{ tags:['東京'] }` → `?tag=東京` でヒット
  - B: `{ content:'... #東京 ...', tags:[] }` → ヒット
  - 未認証 → 401

### E2E（Playwright）

- 既存
  - `tests/e2e/tags.show-posts.spec.ts`（APIで #東京 作成→タグページ可視→詳細遷移）
  - `tests/e2e/tags.desktop-layout.spec.ts`（幅/Backdrop/操作性の回帰）
- 追加推奨
  - `tests/e2e/tags.mobile-layout.spec.ts`（Drawer 280px/Backdropあり/可視）
  - `tests/e2e/tags.unicode-variant.spec.ts`（`#東\uFE0F京` → `/tags/東京` で可視）

実行例

```
npm run test:unit
npm run test:e2e -- tests/e2e/tags.show-posts.spec.ts tests/e2e/tags.desktop-layout.spec.ts
```

---

## フェーズ5. エラー時の分岐と即応

- 401/403 → C1再点検、ログイン/モックCookie確認
- 200 + `data:[]` → S1未適用/正規表現境界（半角/全角/異体字）を点検
- API OK/画面空 → U1（CSS/幅/重なり）。E2Eで `boundingBox.width/height>0` をアサート
- 429/CSRF → 開発は緩和、商用は指数バックオフ＋ユーザ通知

## フェーズ6. データ後追い整備（任意）

- `scripts/backfill-tags.ts`（本文 `#...` から `tags` 補完、上限5、正規化）

## フェーズ7. 完了判定

- 手動: `/tags/東京` でカード可視（PC/モバイル）、ソート切替でも表示継続
- 自動: ユニット/統合/E2E 全て `passed`
- ログ: `total>0`
- 回帰: レイアウトE2Eも `passed`

## フェーズ8. ロールバック

- `git revert <last-commit-sha>`

## 最終見直し（ベストプラクティス）

### 実装結果

- TagPortal 撤去、通常DOMでカード描画
- デバッグUIは `NEXT_PUBLIC_TAG_DEBUG` フラグでON時のみ表示（既定OFF）
- `globals.css` の強制上書きをタグページ配下に限定し副作用を縮小
- E2E `tags.show-posts.spec.ts` が `passed`（カード可視・詳細遷移）

### 回帰対応（2025-09-06 追記）

- MUIの更新と最適化設定の影響で、`@popperjs/core` の vendor-chunks 参照エラーが発生
  - 対処: `next.config.js` の `experimental.optimizePackageImports` を無効化
  - `.next` を完全削除→再起動で解消
- CSS縮小後、一部環境でカードが非表示に見える回帰
  - 対処: `#tag-inline-cards` と `.MuiCard-root` に限定して `display/visibility/opacity/overflow` を明示（タグページ限定）
  - E2Eを再実行し `passed` を確認
- 検索仕様: 「tags or 本文 `#<tag>`」で既存データ混在を救済。将来は backfill を運用し、APIのORは保険として維持
- セキュリティ: 認証APIは `credentials:'include'`、デバッグログは開発限定・PII非出力
- パフォーマンス: `cache:'no-store'` は当該取得に限定。必要に応じSSR初期描画で体感改善
- UI回帰: Drawer/Sidebar 回りはE2Eで担保。グローバルCSSの過剰上書きは禁止
- 保守性: ハッシュタグ処理は `utils/hashtag.ts` に集約、ユニットで保証。`data-testid` によりE2Eの堅牢性を維持
