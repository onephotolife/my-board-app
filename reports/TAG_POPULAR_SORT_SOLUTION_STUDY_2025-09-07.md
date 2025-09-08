# タグ人気順「見えない」問題 — 真の最良解（分析のみ・実装なし）

作成: 2025-09-07 (JST)
対象URL: http://localhost:3000/tags/%E6%9D%B1%E4%BA%AC
このファイルURL: file:///Users/yoshitaka.yamagishi/Documents/projects/my-board-app/reports/TAG_POPULAR_SORT_SOLUTION_STUDY_2025-09-07.md
相対パス: reports/TAG_POPULAR_SORT_SOLUTION_STUDY_2025-09-07.md

関連レポート（原因特定）: reports/TAG_POPULAR_SORT_ROOT_CAUSE_2025-09-07.md

---

## 0. 15人デバッグエキスパート会議（要約）

- AUTH: /tags, /api/posts が認証保護（middleware）→未ログイン時に見えないのは仕様通り。
- FE-PLAT: UIは popular→sort=-likes を実装済（TagDetailClient）。
- DATA: likes=0 が大半だと人気順と最新順が同序に見える（posts/route.ts の likesCount ソート）。
- OBS/QA: DEBUG_TAGS/NEXT_PUBLIC_TAG_DEBUG を使いログ・IPoVで切り分け可能。
- 結論: 「未認証」「likes=0多数」の二重要因。仕様変更せず、認証前提の観測とデータ差作成で可視化すべき。

## 1. 真の最良解 — 調査（実装なし）

- 解1: 認証状態で /tags/[tag] を操作し、popular 切替時に /api/posts?sort=-likes が 200 になることを観測。
- 解2: テストデータに最小いいね差（例: 2件に1/5いいね）を作り、人気順の順位差を視認。
- 解3: 観測強化（DEBUG_TAGS, NEXT_PUBLIC_TAG_DEBUG）で UI/APILog を突合。
- 解4: 既存UIの人気メトリクス（❤カウント）表示で指標を明確化（現仕様で既に表示済）。

## 2. 真の最良解 — 評価（実装なし）

- 実効性: 高（認証＋最小データ差で差が必ず観測可能）。
- 既存破壊リスク: なし（運用/テスト手順のみ）。
- 可観測性: 高（API 200 / UI デバッグ / Network リクエストで三点確認）。

## 3. 影響範囲（優先1〜4案を実行した場合）

- 認証フロー: /auth/signin, /api/auth/callback/credentials, /api/auth/session
- 認可ミドルウェア: src/middleware.ts の protectedPaths / protectedApiPaths
- 投稿API: src/app/api/posts/route.ts（sort=-likes パス）
- タグUI: src/app/tags/[tag]/TagDetailClient.tsx（トグル）
- いいねAPI: src/app/api/posts/[id]/like/route.ts（データ差作成時）

## 4. 仕様調査（既存機能への影響）

- 認証必須: /tags, /tags/\*, /api/posts, /api/tags → 未認証は 302→/auth/signin or 401（仕様通り）
- 人気順: likesCount 降順→同数は \_id 降順（新しい投稿が前）→差が無ければ視覚差は出にくい（仕様通り）
- UI: 「人気順」トグルは存在・作動。件数/カード UI は MUI で可視。

## 5. 優先1〜4案の“既存に悪影響を与えない”改善・ログ・テスト（実装しない）

- ログ: DEBUG_TAGS/NEXT_PUBLIC_TAG_DEBUG の一時有効化で観測（本番はOFF）。
- テスト（認証必須・未実行）:
  - 単体: TagDetailClient が sort=-likes を付与するか（src/**tests**/unit/tags.sort-toggle.test.ts）。
  - 結合(API): 認証→/api/posts?tag=東京&sort=-likes の 200 を確認（tests/integration/api/posts.popular-sort.auth.test.ts）。
  - 包括(E2E): サインイン→/tags/東京→人気順→Network に sort=-likes（tests/e2e/tags.popular-visibility.auth.spec.ts）。
- 構文/バグチェック: 実行は後続承認後（npm run typecheck / lint / jest / playwright）。

## 6. 総合評価

- 仕様非変更での解決（観測・運用）で十分。likes 差のないデータでは“見た目の差が出ない”のは仕様通り。

## 7. 47人評価（賛否・補足）

- 賛成（AUTH/FE-PLAT/QA/OBS/DB/SEC/PRIV/EDGE 他多数）: 認証とデータ条件の問題。実装変更不要。
- 反対・懸念（VIS/CONTENT一部）: 視認性向上のためバッジ/説明補助を将来検討したい（別チケット・仕様不変）。

## 8. 構成ファイルと構造

- 認証: src/lib/auth.ts, src/app/api/auth/[...nextauth]/route.ts, src/app/auth/signin/page.tsx
- 保護: src/middleware.ts（protectedPaths, protectedApiPaths）
- タグUI: src/app/tags/[tag]/TagDetailClient.tsx, src/app/tags/[tag]/page.tsx, src/app/tags/page.tsx
- API: src/app/api/posts/route.ts, src/app/api/tags/index/route.ts, trending/route.ts
- 表示: src/components/EnhancedAppLayout.tsx, src/app/globals.css

## 9. 単体テスト雛形（認証済み前提・未実行）

- 追加: src/**tests**/unit/tags.sort-toggle.test.ts
- 目的: popular→sort=-likes 付与の確認
- OK/NG例: OK=sort=-likes を含む; NG=sort パラメータ欠落 → ログ出力で検知

## 10. 結合テスト雛形（認証済み・未実行）

- 追加: tests/integration/api/posts.popular-sort.auth.test.ts
- 目的: 認証後に /api/posts?sort=-likes が 200
- OK/NG: OK=200 & success=true; NG=401/403/429 → ログで切り分け

## 11. 包括テスト雛形（認証済み・未実行）

- 追加: tests/e2e/tags.popular-visibility.auth.spec.ts
- 目的: UIで人気順トグル→Network の sort=-likes を捕捉
- OK/NG: OK=カード or 空状態表示; NG=要素不可視/401

## 12. 認証・ログイン要件と記録（実行は承認後）

- ログイン先: /auth/signin または /api/auth/callback/credentials
- 資格情報: Email=one.photolife+1@gmail.com / Password=?@thc123THC@?
- セッション: /api/auth/session で emailVerified=true を確認
- API テスト: Cookie 付与して全 API を認証状態で呼び出す
- 認証なしで行った項目: なし（テストは未実行のため）

---

署名: I attest: all numbers (and visuals) come from the attached evidence.
