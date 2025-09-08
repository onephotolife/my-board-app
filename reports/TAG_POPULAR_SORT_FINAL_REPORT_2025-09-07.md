# タグ人気順「見えない」— 実測最終レポート（ローカル・認証遵守／部分実行）

作成: 2025-09-07 (JST)
対象URL: http://localhost:3000/tags/%E6%9D%B1%E4%BA%AC
このファイルURL: file:///Users/yoshitaka.yamagishi/Documents/projects/my-board-app/reports/TAG_POPULAR_SORT_FINAL_REPORT_2025-09-07.md

## 1. サマリ

- 結論: 仕様/実装は正当（popular=likes降順）。ユニット観測で popular 切替時の `sort=-likes` リクエストを確認。
- E2E/UI 実測: サンドボックスの制約（WebServer起動EPERM）により未実行。
- 認証: E2Eは `E2E_MOCK_AUTH=1` による storageState 生成で認証状態を準備（実サインインはDB要件により不可）。

## 2. 実行環境

- OS/シェル: Codex CLI（macOS 相当）/ zsh
- Node: v22.17.0 / npm: 10.9.2
- Playwright: ^1.55.0 / Jest: ^30.0.5 / Next: ^15.5.2

## 3. 実行コマンド（抜粋）

```
# 型チェック
npm run -s typecheck

# Lint
npm run -s lint

# ユニットテスト（本件のみ）
npx jest src/__tests__/unit/tags.sort-toggle.test.tsx -c jest.config.js --reporters=default

# E2E（認証storageStateをモック生成）
E2E_MOCK_AUTH=1 NEXT_PUBLIC_TAG_DEBUG=true \
  npx playwright test tests/e2e/tags.popular-visibility.auth.spec.ts \
  -c playwright-e2e.config.ts --project=authenticated --reporter=line,html,junit,json --output=./test-results
```

## 4. 主要ログ（IPoV）

[証拠1] ユニット: fetch URIログ（人気順切替）

```
[UNIT-DEBUG] fetch called: /api/posts?tag=%E6%9D%B1%E4%BA%AC&sort=-createdAt&page=1&limit=20
[UNIT-DEBUG] fetch called: /api/posts?tag=%E6%9D%B1%E4%BA%AC&sort=-likes&page=1&limit=20
PASS src/__tests__/unit/tags.sort-toggle.test.tsx
```

要約: popular クリック後、`sort=-likes` リクエストが発行。

[証拠2] Playwright: WebServer起動失敗（ポート3000禁止）

```
[WebServer] Error: listen EPERM: operation not permitted 0.0.0.0:3000
Error: Process from config.webServer was not able to start. Exit code: 1
```

要約: サンドボックスにより Next 開発サーバ起動不可。

[証拠3] 認証準備（モック storageState）

- 変更: tests/e2e/global-setup.ts に `E2E_MOCK_AUTH=1` ガードで `tests/e2e/.auth/user.json` を生成。
- 参照: tests/e2e/utils/create-mock-storage-state.ts（`next-auth.session-token=mock-session-token-for-e2e-testing`）。
  要約: E2Eで認証状態を用意（実APIログインはDB非稼働のため不可）。

## 5. TRIPLE_MATCH_GATE

- line: ユニット1件=PASS（line表示OK）
- JUnit/JSON totals: ユニット限定なら一致（E2Eは未生成）
- Log Health: エラーはUI/API内部の想定ハンドリング（ユニット中のFetchモックでエラー文言出力）。
- 判定: E2Eが未走行のため 全体として INCONCLUSIVE。

## 6. 認証要件の遵守

- ユニット: 認証非依存（UIコンポーネントのリクエスト発行検証のみ）。
- E2E: `E2E_MOCK_AUTH=1` で storageState を生成（ミドルウェアのE2Eバイパス仕様に適合）。
- 実APIサインイン: DB未稼働のため実行不可 → UNEXECUTED (AUTH REQUIRED)。

## 7. 結論（再掲）

- 真因: 未認証と likes=0同値が“視認差の欠如”を生む。仕様変更不要。
- 実装: popular→likes降順はユニットで確認済み。
- 実測の不足: E2E/UIはWebServer禁止（EPERM）で未実行。

## 8. アクションリクエスト（再実行条件）

- いずれかを満たした環境で再実行を希望：
  1. ローカルでポート3000のListenが許可されていること
  2. MONGODB_URIが到達可能（または mongodb-memory-server をNextランタイムに組込）
- 再実行手順（推奨）:
  - `npm run dev` → `E2E_MOCK_AUTH=1 npx playwright test -c playwright-e2e.config.ts --project=authenticated tests/e2e/tags.popular-visibility.auth.spec.ts`
  - 必要に応じて本番相当の実APIログイン: `/api/auth/csrf` → `/api/auth/callback/credentials` → `/api/auth/session`

---

署名: I attest: all numbers (and visuals) come from the attached evidence.
