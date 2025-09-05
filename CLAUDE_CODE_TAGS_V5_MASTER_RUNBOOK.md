# ONE-SHOT: タグ機能 v5 Master 最終版（ローカル専用・Actions非使用・100点）

目的: タグ一覧/詳細/関連APIを、会員制仕様/Next.js 15準拠/型安全/UI/UX/テスト安定性の全観点で「確実に」仕上げる。状況差異に強い多角的チェック、段階的小ステップ、明確なOK/NG、デバッグログ、復旧策、最終ゲート完備。

---

## 0. SPEC-LOCK（非交渉・遵守）

- 認証保護: `/tags`, `/tags/*`, `/api/tags/*` は必ず認証（emailVerified: true）前提。
- Next.js 15 params: Clientの`params`はPromise。原則「Server→Client分離」でServer側で`params`を処理し、Clientへprops受け渡し。代替としてのみ`React.use(params)`許容。
- 文字列正規化: `normalizeTag`（NFKC, Variation Selector除去, ZWJ考慮, 長さ1-64, 先頭#除去, 小文字化）。
- データモデル: `Tag{ key, display, countTotal, lastUsedAt }`、`Post{ tags: string[] }`。
- レート制限: dev 60/min目安。429は「警告→遅延→再試行」。大量並列禁止。
- パッケージマネージャ: npmのみ。pnpm/yarn禁止。
- Node: v20.18.1+を強く推奨（engine設定あり）。

---

## 1. プレフライト（多角的・安全開始）

```bash
node -v  # 20.18.1+ 推奨。低い場合でも続行可だが不一致は要注意（OK/NGで確認）。
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
npm ci
npm run dev &
npx wait-on http://localhost:3000
```

- OK: 200到達・トップ表示可
- NG: 起動不可/ポート競合 → 上記killで再実行

現状読み取り（必ず目視）:

- API: `src/app/api/tags/index/route.ts`, `.../search/route.ts`, `.../trending/route.ts`, `/api/posts` GETの`?tag`対応
- Pages: `src/app/tags/page.tsx`, `src/app/tags/[tag]/page.tsx`
- Middleware: `src/middleware.ts` の `protectedPaths`/`protectedApiPaths`
- Auth: `src/app/api/auth/[...nextauth]/route.ts` が標準ハンドラ形式（`const handler=NextAuth(...); export { handler as GET, handler as POST }`）。`/api/auth/_log` 実装済み
- E2E: `tests/e2e/storageState.json`（emailVerified:true）/ `tests/e2e/utils/create-storage-state.ts`

---

## 2. 認証統一（Middleware）

やること（差分のみ実装）:

- `protectedPaths` に `'/tags'`, `'/tags/*'`
- `protectedApiPaths` に `'/api/tags'`

OK/NG:

- OK: 未認証で `/auth/signin?callbackUrl=...` にリダイレクト、認証後アクセス可
- NG: 未認証でも閲覧できる/401・403乱発 → 追加漏れor storageState不整合

---

## 3. APIの契約確認・堅牢化

3-1) `/api/tags/index`（既存仕様の確認）

- 入力: `q`（任意）, `sort=popular|recent`, `page>=1`, `limit<=50`
- 正規化: `const key = normalizeTag(qRaw)`、検索は `^key` 正規表現（Regexエスケープ）
- ソート: `popular → {countTotal:-1}` / `recent → {lastUsedAt:-1}`
- ページング: `skip=(page-1)*limit`, `limit=limit+1`→`hasNext`判定→返却時に`slice(0,limit)`
- 応答: `{ success:true, data, pagination:{ page, limit, hasNext } }`
- レート制限: 60/min

3-2) `/api/posts` のタグ絞込

- GET例: `?tag=<key>&sort=-createdAt&page=1&limit=20`
- 条件: `{ tags: key }`（`$in: [key]`でも可）

デバッグログ（実装時/テスト時のみ）:

```ts
console.log('[TAGS-INDEX]', { status: res.status, q, sort, page, count: data?.data?.length });
console.log('[TAG-PAGE]', { tag, status: res.status, sort, page, count: data?.data?.length });
```

NG対応:

- 500: 正規化/Regex/DB接続箇所を確認。
- 401/403: middleware保護とstorageState（emailVerified:true）を再確認。

---

## 4. /tags（一覧）完成度チェックと微調整

要件:

- 検索（`#`不要で入力）、人気/最近ソート、ページ送り、`/tags/<key>`へ遷移
- a11y/テストID: `tags-index-search`, `tags-index-sort`, `tags-index-item-<key>`, リストラッパー`tags-list`
- 429時: Alert表示→指数バックオフ（400→800→1600ms）で再試行（最大3回）

OK/NG:

- OK: 200でリスト表示。検索/ソート/ページングが遅延含め安定。
- NG: 429が連発→バックオフ/直列実行へ。401→storageState再生成。

---

## 5. /tags/[tag]（詳細）Next.js 15対応 + 型安全 + UX

5-1) Server→Client 分離（原則）
`src/app/tags/[tag]/page.tsx`（Server）:

```tsx
import { normalizeTag } from '@/app/utils/hashtag';
import TagDetailClient from './TagDetailClient';

export default async function Page({ params }: { params: { tag: string } }) {
  const key = normalizeTag(decodeURIComponent(params.tag));
  return <TagDetailClient tagKey={key} />;
}
```

5-2) Client側（`TagDetailClient.tsx`）の必須要件

- 並び替え（例: newest/popular）、ページング、ローディング/空状態、エラーUI
- 本文に `linkifyHashtags(post.content)` を適用し、`a[href*="/tags/"]` が生成される
- author描画は安全展開:

```tsx
const getAuthorName = (author?: string | { name?: string; email?: string }) =>
  typeof author === 'string' ? author : author?.name || author?.email || '不明なユーザー';
```

- data-testid: `tag-page-title`, `tag-post-card-<id>`, `tag-post-content-<id>` など

5-3) 代替案（やむを得ない場合のみ）
Clientで`params`を受けて `use(params)` でアンラップ。

OK/NG:

- OK: params警告なし、authorで例外なし、本文リンク生成OK
- NG: 警告継続→Server→Client分離未適用。author例外→安全展開未適用。

---

## 6. linkifyの徹底（多角的確認）

対象:

- `src/components/EnhancedPostCard.tsx`（既に適用例あり）
- `src/components/PostItem.tsx`（適用例あり）
- `src/components/RealtimeBoard.tsx`（未適用なら適用へ）
- `src/components/board/PostCard.tsx`（未適用なら適用へ）

実装スニペット（共通パターン）:

```tsx
import NextLink from 'next/link';
import { linkifyHashtags } from '@/app/utils/hashtag';
// ...
<Typography component="div" sx={{ whiteSpace: 'pre-wrap' }}>
  {linkifyHashtags(post.content).map((part, idx) =>
    typeof part === 'string' ? (
      <span key={idx}>{part}</span>
    ) : (
      <Link key={idx} component={NextLink} href={part.href} underline="hover">
        {part.text}
      </Link>
    )
  )}
</Typography>;
```

OK/NG:

- OK: タイムライン/カード/詳細すべてでタグがクリック可能リンクになる
- NG: 平文のまま→適用漏れ箇所を特定して適用

---

## 7. E2E（直列・堅牢待機・429復帰・認証固定）

7-0) 共通前提

- Playwrightは必ず直列（`--workers=1`）
- `tests/e2e/storageState.json` を使用（emailVerified:true）。不整合時は再生成

7-1) storageState再生成

```bash
npx playwright test tests/e2e/utils/create-storage-state.ts --workers=1
```

OK: `storageState.json`更新・認証後ページ到達確認
NG: ログイン要素未検知 → 選択子を `data-testid` に合わせて更新

7-2) 安定化共通待機

```ts
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(300);
```

クリック遷移は:

```ts
await Promise.all([page.waitForURL(/\/tags\/[^/]+$/), firstItem.click()]);
```

7-3) 429対策（ヘルパ）

```ts
async function withRetry<T>(fn: () => Promise<T>) {
  const delays = [400, 800, 1600];
  for (let i = 0; i < delays.length; i++) {
    const res: any = await fn();
    if (!res || (res.status && res.status() !== 429)) return res;
    await new Promise((r) => setTimeout(r, delays[i]));
  }
  return fn();
}
```

7-4) シナリオ

- `tags.v5.index.spec.ts`
  - 到達→タイトル/リスト検証
  - 検索→Enter→結果（0件OK）
  - ソート切替→200
  - アイテムクリック→詳細へ
  - 429復帰確認
- `tags.v5.detail.spec.ts`
  - 到達→`#<tag>`見出し
  - 並び替え（newest/popular）
  - 本文の`a[href*="/tags/"]`存在→クリックで別タグへ
  - 429復帰確認

NG取り扱い:

- 401/403: storageState再生成、middleware保護範囲再確認
- タイムアウト: 待機の追加（`waitForSelector`, `waitForURL`）/ 直列実行の再確認

---

## 8. 代表的失敗と即時復旧策

- `params.tag` 警告:
  - Server→Client分離が未適用 → 5-1適用
  - 代替: Clientで`use(params)`
- `Objects are not valid as a React child`:
  - `post.author`の直接描画 → 5-2の安全展開で必ず文字列に
- `MODULE_NOT_FOUND: 'next'`:
  - pnpm使用の痕跡 → npmに統一し`npm ci`やり直し
- 429多発:
  - 並列実行/短間隔叩き → 直列/バックオフ/テストの待機強化
- 401/403:
  - `emailVerified:true`不整合 → storageState再生成/NextAuthルート標準化確認

- `/tags/<tag>` 人気順エラー（400 Bad Request）:
  - 真因: `/api/posts` のバリデーションが `sort` に `-likes` を許容していなかった、または `likes` が配列のため通常の `.sort({ likes: -1 })` では意図通りに並ばない。
  - 対策: `postFilterSchema.sort` に `'likes' | '-likes'` を追加し、API側で `-likes` のときは集計パイプラインで `$size` により `likesCount` を算出して `$sort`。
  - 実装指針:
    1. `src/lib/validations/post.ts` の `postFilterSchema` に `'likes', '-likes'` を追加
    2. `src/app/api/posts/route.ts` で `sort.includes('likes')` の場合に `useAggregateForLikes=true` とし、
       ```js
       [
         { $match: query },
         { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
         { $sort: { likesCount: -1, _id: -1 } },
         { $skip: skip },
         { $limit: limit },
       ];
       ```
       で取得
  - 確認: `/tags/react` → 「人気順」に切替で200/データ表示。E2Eの並び替えテストがPASS。

---

## 9. 最終ゲート（TRIPLE MATCH・全観点）

- [ ] Middleware: `/tags`, `/tags/*`, `/api/tags` を保護
- [ ] API契約: `/api/tags/index`・`/api/posts?tag=` が仕様通り
- [ ] /tags: 検索/ソート/ページング/遷移が安定（429復帰含む）
- [ ] /tags/[tag]: タイトル・カードUI・本文リンク化・並び替え・ページング・空状態
- [ ] E2E: 直列でグリーン。401は不可。429は観測→復帰

すべてOKなら「完了」。いずれかNGなら該当章に戻り復旧策を実施。

---

## 付録A: 実装チェックリスト（抜け漏れ防止）

- [ ] `src/middleware.ts` に `/tags`, `/tags/*`, `/api/tags`
- [ ] `src/app/api/auth/[...nextauth]/route.ts` が標準ハンドラ
- [ ] `src/app/api/auth/_log/route.ts` が 204/200 を返す
- [ ] `src/app/tags/[tag]/page.tsx` はServer→Client分離
- [ ] `TagDetailClient.tsx` の author安全展開/本文linkify/テストID
- [ ] `RealtimeBoard.tsx`, `board/PostCard.tsx` に linkify を適用
- [ ] `tests/e2e/storageState.json` は emailVerified:true
- [ ] Playwrightは `--workers=1` で実行

---

以上。
