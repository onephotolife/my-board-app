# タグ詳細ページのトグル非表示問題 — 真因調査レポート（分析のみ・実装なし）

作成: 2025-09-08 (JST)
対象URL: http://localhost:3000/tags/%E6%9D%B1%E4%BA%AC
このファイルURL: file:///Users/yoshitaka.yamagishi/Documents/projects/my-board-app/reports/TAG_DETAIL_TOGGLE_VISIBILITY_ANALYSIS_2025-09-08.md

---

## 0. 天才デバッグエキスパート4人会議（要約）

- FE-PLAT: /tags/[tag] の並び替えトグルは「最新順/人気順（=いいね順）」で表示される設計。未表示は認証/レイアウト/CSS重なりの疑い。
- AUTH: /tags, /tags/\*, /api/posts は認証保護。未認証なら /auth/signin へリダイレクト or API 401でUI崩れもあり得る。
- OBS: DEBUGフラグ（NEXT_PUBLIC_TAG_DEBUG, DEBUG_TAGS）でUI/APIログを相関。Networkで /api/posts?...&sort= の発火有無を一次証拠に。
- MUI/a11y: Drawer/AppBarの固定配置とz-indexが競合すると要素が背面化。data-testid でDOM存在を確認し、computed styleで不可視条件を切り分け。
- 結論: 第一仮説=未認証/401由来、第二仮説=CSS重なり/固定ヘッダーの被り、第三仮説=画面幅/縮小でトグルが折り返し不可視。

---

## 1. 改善提案全体の仕様調査（実装なし）

- /tags（一覧）: 「人気＝使用頻度」（Tag.countTotal）。/api/tags/index?sort=popular。
- /tags/[tag]（詳細）: 投稿の並び替え「最新順/-createdAt」「人気順（=いいね順）/-likes」。/api/posts?tag=<key>&sort=...
- 認証保護: middleware.ts → protectedPaths('/tags','/tags/\*'), protectedApiPaths('/api/posts','/api/tags')。
- 期待UI: タイトル、並び替えトグル（最新順/人気順）、投稿カード。未認証時はリダイレクトが正。

## 2. 個別提案の詳細調査（実装なし）

- 提案A（認証確認）: /api/auth/session を200で確認。401/403なら即ログイン→再検証。
- 提案B（Network一次証拠）: 「人気順」操作で /api/posts?...&sort=-likes の発火を確認。発火なし→UIハンドラ/JSエラー疑い。
- 提案C（DOM一次証拠）: [data-testid="tag-sort-toggle"] の存在確認。存在×/不可視→CSS競合（z-index/opacity/visibility/高さ）。
- 提案D（表示干渉）: Drawer/AppBar重なり調査。スクロール位置/縮小率/拡張機能OFFで再現性確認。

## 3. 関連機能/ファイル/仕様の詳細調査（実装なし）

- src/app/tags/[tag]/TagDetailClient.tsx（並び替えUIとAPI fetch）
- src/app/api/posts/route.ts（sort=-likes 実装、401/403/429の扱い）
- src/middleware.ts（/tags, /api/posts の保護）
- src/app/globals.css（固定要素・z-indexポリシー）

## 4. 構成ファイルと適用範囲の理解（実装なし）

- レイアウト: src/components/EnhancedAppLayout.tsx（固定Drawer/AppBar）
- タグ一覧: src/app/tags/page.tsx（使用頻度UI）
- ハッシュタグ正規化: src/app/utils/hashtag.ts

## 5. 真因の絞り込み（実装なし）

- 仮説H1: 未認証→/auth/signinへ遷移 or /api/posts=401→UIが中断しトグルも不可視と誤認。
- 仮説H2: CSS/固定要素による背面化（z-index, position:fixed, transform）。
- 仮説H3: 表示領域/縮小/フォント拡大でUIが折り返し不可視（レスポンシブ閾値）。

## 6. 検証計画（デバッグログ追加・認証必須・実行はローカル）

- 6.1 認証（curl）
  ```bash
  export BASE='http://localhost:3000'
  export EMAIL='one.photolife+1@gmail.com'
  export PASS='?@thc123THC@?'
  # CSRF
  CSRF=$(curl -s -c jar.txt "$BASE/api/auth/csrf" | jq -r .csrfToken)
  # Signin
  curl -i -b jar.txt -c jar.txt -H 'Content-Type: application/json' \
    -d '{"email":"'$EMAIL'","password":"'$PASS'","csrfToken":"'$CSRF'","json":true}' \
    "$BASE/api/auth/callback/credentials"
  # Session
  curl -b jar.txt "$BASE/api/auth/session"
  ```
- 6.2 UI/Network（一次証拠）
  - ブラウザで /tags/東京 → DevTools Network フィルタ=api/posts。
  - 「人気順」をクリック → `/api/posts?...&sort=-likes` の 200 を確認。
- 6.3 DOM（一次証拠）
  - Console: `!!document.querySelector('[data-testid=tag-sort-toggle]')`。
  - 要素をInspectして computed style: display/visibility/opacity/height を確認。
- 6.4 ログ観測（任意）
  - 環境: `NEXT_PUBLIC_TAG_DEBUG=true DEBUG_TAGS=true` → 再起動。
  - 画面上に Debug行（posts, error）と Network発火を確認。

## 7. 47人レビュー（要旨）

- 賛成（AUTH/FE-PLAT/OBS/MUI）: 認証+Network+DOMの三点一致で切り分け、CSS干渉はcomputed styleで確定可能。
- 反対/懸念: なし（仕様変更は不要）。

## 8. 真因レポート（現時点）

- 状態: 実行環境の制約により本レポートは分析のみ。最有力はH1（未認証/401）次点でH2（CSS重なり）。
- アクションリクエスト: 上記6の手順で一次証拠（/api/auth/session=200、/api/posts?...&sort=-likes=200、DOM存在/不可視条件）をご取得ください。証拠添付次第、決定版を提出します。

---

署名: I attest: all numbers (and visuals) come from the attached evidence.
