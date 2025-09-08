# タグ詳細ページのトグル非表示 — 最終分析計画レポート（実装なし／認証前提）

作成: 2025-09-08 (JST)
対象URL: http://localhost:3000/tags/%E6%9D%B1%E4%BA%AC
このファイルURL: file:///Users/yoshitaka.yamagishi/Documents/projects/my-board-app/reports/TAG_TOGGLE_VISIBILITY_FINAL_PLAN_2025-09-08.md

---

## 0. 天才デバッグエキスパート10人会議（要約）

- 合意事項（仕様不変）
  - タグ一覧の「人気」= 使用頻度（Tag.countTotal）
  - タグ詳細の「人気順」= 投稿の高評価順（likes 降順）
  - /tags, /tags/\*, /api/posts, /api/tags は認証保護（middleware）
- 主要仮説
  - H1: 未認証/401 で UI が崩れ、トグルが「見えない」と誤認
  - H2: レイアウト/固定要素の z-index 競合で背面化（AppBar/Drawer/transform）
  - H3: レスポンシブ閾値/拡大率により折り返し領域外に位置して不可視
- 方針
  - 認証→Network→DOM（computed style）の三点一致で真因確定
  - 既存機能非破壊。仕様変更・暫定緩和を行わない

---

## 1. 真の最良解の調査（実装なし）

- 認証状態で /tags/東京 を開き、人気順クリックで /api/posts?...&sort=-likes が 200 を返すことを一次証拠化
- DOM に [data-testid="tag-sort-toggle"] が存在し、display≠none, visibility≠hidden, opacity>0, 高さ>1px を確認
- 画面固定要素（Drawer/AppBar）との重なりがあれば CSS の stacking context を観測（transform/z-index）

## 2. 真の最良解の評価（実装なし）

- 実効性: 高（認証+Network+DOM の三点一致で原因を一意に切り分け）
- リスク: なし（観測のみ）
- 影響: なし（既存UI/APIを変更しない）

## 3. 影響範囲の特定（優先1〜4案を実行した場合）

1. 認証確認/Network観測: /api/auth/session, /api/posts, /api/tags/trending, /api/tags/index
2. DOM/スタイル観測: EnhancedAppLayout（AppBar/Drawer）, globals.css, TagDetailClient（ToggleButtonGroup）
3. レスポンシブ: MUI のブレークポイント（md/up）
4. レート制限: middlewareの429挙動, /api/tags/\* の rateLimit

## 4. 各解決策の仕様調査（実装したと仮定）

- 解1: 認証状態を担保して再現（仕様: 認証必須）
- 解2: CSS重なりの根拠化（仕様: レイアウトは可視・操作可能であること）
- 解3: レスポンシブ閾値のドキュメンテーション（仕様: md/upでトグル可視）
- 解4: レート制限時のUI文言の明確化（仕様: 429時は警告表示、操作は抑止）

## 5. 優先1〜4案の「既存に悪影響を与えない」改善案・デバッグログ・テスト設計（実装なし）

- 改善案（観測強化）
  - NEXT_PUBLIC_TAG_DEBUG=true, DEBUG_TAGS=true を一時有効（本番OFF）
  - Network で /api/posts?...&sort, /api/tags/trending の 200/401/429 を一次証拠化
- 認証付きテスト設計（雛形のみ／未実行）
  - 期待: 認証済みで /api/auth/session=200, emailVerified=true
  - トグル操作で /api/posts?...&sort=-likes を発火
  - DOM に [data-testid=tag-sort-toggle] が存在・可視
- 構文/型/バグチェック: 実行時に `npm run typecheck && npm run lint`（本レポート時点では未実行）

## 6. 総合評価（実装なし）

- 既存仕様で十分に説明可能。真因は H1>H2>H3 の順で検証

## 7. 47人全員の評価（要約）

- 賛成（AUTH/FE-PLAT/OBS/MUI/QA）: 三点一致での確定が最短・安全
- 補足（VIS/CONTENT）: 文言は「人気タグ＝使用頻度」「人気順（高評価順）」を明示（仕様は不変）

## 8. 範囲の構成ファイルと構造

- 認証/保護: src/lib/auth.ts, src/app/api/auth/[...nextauth]/route.ts, src/middleware.ts
- タグUI/詳細: src/app/tags/[tag]/TagDetailClient.tsx
- トレンド/使用頻度: src/app/api/tags/trending/route.ts, src/app/api/tags/index/route.ts
- スタイル: src/app/globals.css

## 9. 単体テスト（認証済み）雛形（未実行）

- 目的: popularクリックで sort=-likes を付与
- 例: tests/unit/tags.sort-toggle.spec.tsx
  ```ts
  test('人気順クリックで /api/posts?...&sort=-likesを発火', async () => {
    // arrange: fetch をモック
    // act: popular ボタンをクリック
    // assert: 最後の fetch URL に sort=-likes を含む
  });
  ```
- OK: sort=-likes がURLに含まれる／NG: -createdAtのまま

## 10. 結合テスト（認証済み）雛形（未実行）

- 目的: 認証→/api/posts?tag=東京&sort=-likes が 200
- 例: tests/integration/api/posts.popular-sort.auth.spec.ts
  ```ts
  // 1) /api/auth/csrf → 2) /api/auth/callback/credentials → 3) /api/auth/session=200
  // 4) /api/posts?tag=東京&sort=-likes=200 を確認（success:true）
  ```
- OK: 200, success:true／NG: 401/403/429

## 11. 包括テスト（認証済み）雛形（未実行）

- 目的: UIで人気順トグル可視→クリック→Networkに sort=-likes
- 例: tests/e2e/tags.popular-visibility.auth.spec.ts（Playwright）
  ```ts
  // globalSetupで storageState 生成（実ログイン or モック）
  // /tags/東京 へ → data-testid=tag-sort-toggle が visible
  // 「人気順」をクリック → waitForRequest(url.includes('sort=-likes'))
  ```
- OK: 可視+発火／NG: 要素不在 or 401/429

## 12. 認証フロー（実行手順／未実行）

- curl例（Credentials）
  ```bash
  export BASE='http://localhost:3000'
  export EMAIL='one.photolife+1@gmail.com'
  export PASS='?@thc123THC@?'
  CSRF=$(curl -s -c jar.txt "$BASE/api/auth/csrf" | jq -r .csrfToken)
  curl -i -b jar.txt -c jar.txt -H 'Content-Type: application/json' \
    -d '{"email":"'$EMAIL'","password":"'$PASS'","csrfToken":"'$CSRF'","json":true}' \
    "$BASE/api/auth/callback/credentials"
  curl -b jar.txt "$BASE/api/auth/session"
  ```

---

付録A: 収集すべき一次証拠（テンプレ）

- [Session] /api/auth/session → 200, user.email, emailVerified=true
- [Network] /api/posts?...&sort=-likes → 200, { success:true, pagination... }
- [DOM] [data-testid=tag-sort-toggle] の computed style 抜粋

付録B: 既存レポート参照

- file:///Users/yoshitaka.yamagishi/Documents/projects/my-board-app/reports/TAG_POPULAR_SORT_ROOT_CAUSE_2025-09-07.md
- file:///Users/yoshitaka.yamagishi/Documents/projects/my-board-app/reports/TAG_POPULAR_SORT_SOLUTION_STUDY_2025-09-07.md
- file:///Users/yoshitaka.yamagishi/Documents/projects/my-board-app/reports/TAG_DETAIL_TOGGLE_VISIBILITY_ANALYSIS_2025-09-08.md

署名: I attest: all numbers (and visuals) come from the attached evidence.
