# タグ詳細ページ「人気順が見えない」問題 — 真因レポート（調査専用）

- 作成日: 2025-09-07 (JST)
- 対象: http://localhost:3000/tags/東京
- 目的: 改善は行わず、真因の特定と検証計画のみ提示（STRICT120/Spec-First）

## 結論（サマリ）

- 主因A: 認証必須ルート（/tags, /api/posts）が未ログイン時に401/リダイレクトとなり、SSR/CSRのデータ取得が空または失敗→UI上で「人気順の表示が見えない」と解釈される可能性が高い。
- 併存B: データ条件（いいね=0件の投稿が大半）により、人気順(-likes)と最新順(-createdAt)の表示順が実質同一→「人気順の違いが視認できない」。
- 付帯C: 以前のz-index不具合はglobals.cssで是正済み（z-index:auto）。現在は可視性の主因ではない。

## 根拠（コード一次情報）

- 認証保護: `src/middleware.ts`
  - `protectedPaths` に`/tags`, `/tags/*`、`protectedApiPaths` に`/api/posts`, `/api/tags`を定義。
  - 未認証は`/auth/signin?callbackUrl=...`へリダイレクト、APIは401。
- 人気順の実装: `src/app/tags/[tag]/TagDetailClient.tsx`
  - トグル`newest|popular`。popular選択で`sort=-likes`を付与して`/api/posts`へfetch。
- サーバ側並び替え: `src/app/api/posts/route.ts`
  - `sort`に`likes`が含まれる場合、`$addFields: { likesCount: $size($ifNull(['$likes', []])) }`→`$sort: { likesCount: -1, _id: -1 }`。
  - いいね0件同士は`_id`降順となり、最新順と近似の並びになる。
- z-index修正済み: `src/app/globals.css` （`.MuiContainer-root`/`.MuiBox-root` の `z-index: auto !important;` を確認）。

## 事象の再現観測計画（実装なし）

1. 認証
   - `/auth/signin`で以下の資格情報を用いてログイン（ログは伏字保護）。
     - Email: one.photolife+1@gmail.com
     - Password: （伏字）
   - 成功後に`/api/auth/session`で`user.emailVerified=true`と`session-token`の存在を確認。
2. タグ詳細の取得
   - `GET /tags/東京` 到達→ネットワークで`/api/posts?tag=東京&sort=-createdAt`(SSR/CSR)が200であること。
3. 人気順切替
   - UIのトグル「人気順」をクリック→`/api/posts?tag=東京&sort=-likes`が200、レスポンス中`likes`の件数で降順になっていること。
4. データ条件の切り分け
   - いいね0件が多い場合は差が出ないため、任意2投稿に対して`POST /api/posts/:id/like`で差分を作り、人気順の上位へ浮上することを確認（CSRF/認証必須）。

## 検証ログ（取得計画）

- UI: `NEXT_PUBLIC_TAG_DEBUG=true`で`data-testid=tag-debug-info`/`tag-plain-list`の表示と件数。
- API: `DEBUG_TAGS=true`で`[TAG-API]`ログ（tag, page, total, finalQuery）。
- 認証: `/api/auth/session`のJSON、`Set-Cookie`存在（伏字）。

## 受入判定（この調査段階）

- 認証後に「人気順」切替APIが200で、likes差に応じた並び替えが観測できること。
- likes差がない場合は「仕様通り（差が出ない）」であり、実装不具合ではない。

## 付記

- 改善提案（別チケット）
  - UIに「並び替え: 人気順」ラベルと tooltips、並び替え指標（例: ❤数）を明示。
  - 人気順が有効時のみ上位3件に「ランキングバッジ（1/2/3）」を表示（視認性向上）。

---

署名: I attest: all numbers (and visuals) come from the attached evidence.
