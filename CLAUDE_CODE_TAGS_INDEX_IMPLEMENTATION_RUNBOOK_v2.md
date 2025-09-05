# ONE-SHOT: タグ一覧ページ 実装ランブック v2（自走・ローカル/Actions非使用・100点版）

目的: Claude Code がこの1ファイルのみで、現状仕様を精査しつつ安全に「タグ一覧ページ（/tags）」を追加・統合・検証し、失敗時の復旧まで自走完了する。

---

## 0. SPEC-LOCK（現在仕様の固定点）

- ルート:
  - タイムライン: `/timeline`（`emailVerified:true` 必須）
  - タグ詳細: `/tags/[tag]`（既存）
- API/データ:
  - `/api/tags/search` → `{ success, data: Tag[] }`（前方一致）
  - `/api/tags/trending` → `{ success, data: Array<{ key, count }>} `
  - `Tag` モデル: key, display, countTotal, lastUsedAt
- ユーティリティ:
  - `normalizeTag`, `extractHashtags`, `linkifyHashtags`: `src/app/utils/hashtag.ts`
- レート制限: `withRateLimit`（devは60req/min程度）

---

## 1. プレフライト（多角的点検）

1-1) Node/依存/ポート

```bash
node -v  # 20.18.1+
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
npm ci
```

OK: Node20系、ポート空き、依存導入

1-2) 環境変数（.env.local）

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random>
MONGODB_URI=<your-mongodb-uri>
```

OK: `npm run dev` で致命エラーなし

1-3) 起動

```bash
npm run dev &
npx wait-on http://localhost:3000
```

OK: 到達

---

## 2. 設計（最小価値+安全統合）

- 新規一覧ページ: `/tags`
  - 検索（前方一致）、並び替え（人気/最近）、ページング
  - 各行クリックで `/tags/<key>` へ
- 新規API: `/api/tags/index`
  - 入力: `q`, `sort=popular|recent`, `page(>=1)`, `limit(<=50)`
  - 出力: `{ success, data: Array<{ key, display, countTotal, lastUsedAt }>, pagination: { page, limit, hasNext } }`
  - rate limit: 60/min
- 公開可（認証不要）: タグ一覧自体は公開で問題なし

---

## 3. 実装ステップ（小さい粒度で進める）

3-1) API 追加 `/api/tags/index`

- ファイル: `src/app/api/tags/index/route.ts`
- 仕様: v1の擬似コードを準用（normalizeTag、find→sort→paginate、rate limit）
- OK: 200, 正しいJSON, 件数とhasNextが妥当 / NG: 429は警告扱い、500はログ採取

3-2) ページ追加 `/tags`

- ファイル: `src/app/tags/page.tsx`
- UI: MUIで検索TextField/トグル/リスト/ボタン（v1参考）
- 初回ロード: sort=popular, page=1
- 検索/切替: page=1に戻して再フェッチ
- OK: 要素が表示/更新 / NG: 無限ローディング→Console/Network取得

3-3) a11y/テストID

- `data-testid` を必ず付与
- 検索キーは `#` を外して送る（クライアントで前処理）

---

## 4. デバッグログ・OK/NG・復旧

ログ例:

```ts
console.log('[TAGS-INDEX]', { status: res.status, page, sort, q, count: data?.data?.length });
```

- 429: 300–800ms の待機後に再試行。直列で実行
- 500: サーバーログを貼付（スタックトレース）。`Tag` モデルや `connectDB` のエラー有無
- 空結果: 仕様通り（0件OK）。UIは「見つかりません」を表示

---

## 5. Playwright E2E（段階）

- 新規: `tests/e2e/tags.index.spec.ts`
  シナリオ:

1. `/tags` 到達 → リスト0件以上、ロード成功
2. 検索: 「東」を入力→Enter→一覧更新（ゼロでもOK）
3. 並び替え「最近」→200/要素更新（順序は厳密比較不要）
4. 1件クリック→`/tags/<key>` 遷移→200
5. 429検証: `GET /api/tags/index` を短時間で複数→429観測→待機で復帰

実行:

```bash
npx playwright test tests/e2e/tags.index.spec.ts --project=chromium --workers=1 --reporter=html
```

---

## 6. リスク別チェック（多角的視点）

- 認証ルートとの干渉: `/tags` は公開でOK。middlewareで保護対象に含めない
- 既存 `/tags/[tag]` との整合: key/encodeURIComponent の一致
- NFKC/絵文字: `normalizeTag` を検索前処理に使用（`#`剥離、VS16削除など）
- パフォーマンス: limit<=50, ソートは索引（`key`, `countTotal`, `lastUsedAt` のindex）で対応
- レート制限: devで60/min。429は警告扱いにしてフレーク回避

---

## 7. 最終ゲート（TRIPLE MATCH）

- [ ] API契約: `/api/tags/index` が `{ success, data, pagination }` を返す
- [ ] UI挙動: `/tags` で検索・並び替え・ページング・詳細遷移が成立
- [ ] E2E: 直列/待機で安定PASS（429は観測→復帰）

---

## 8. 実行手順（Claude用まとめ）

1. プレフライト（Node20/依存/ポート）→ `npm run dev` 起動
2. API `/api/tags/index` 実装→curl/ブラウザで200確認
3. ページ `/tags` 実装→表示と操作確認
4. E2E追加→`--workers=1` で実行→レポート保存
5. 失敗時: ログ/HTML断片/スクショ添付の上、復旧手順で対処

---

## 9. 付録: 最小API/ページ骨子（貼付可）

- v1の擬似コードを参照（本ファイル上部）。必要なら再掲してから実装

以上。これに従えば、既存仕様に沿って「タグ一覧ページ」を安全に統合できます。
