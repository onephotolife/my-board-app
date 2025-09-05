# ONE-SHOT: タグ機能 v4 Fix & Hardening（ローカル専用・Actions非使用・100点版）

目的: タグ関連ページを会員制（認証必須）へ統一し、Next.js 15の`params`仕様変更と`author`描画バグを解消、/tags 一覧・/tags/[tag] のUXを高水準で安定化。Claude Codeは本書のみで自走可能。

---

## 0. 要求仕様（SPEC-LOCK）

- 認証: タグ関連の「ページ」は認証必須（SNS会員制掲示板）。
  - `/tags`（一覧）・`/tags/[tag]`（詳細）は会員のみ閲覧可
  - APIは原則ページと同等の保護に合わせる（/api/tags/\* も保護）
- Next.js 15 対応:
  - Client コンポーネントの`page.tsx`で `params`はPromise → `use(params)`でunwrap、またはServer→Client分離
- データ整合:
  - `post.author` は Object の可能性があるため、文字列描画時に安全に展開（`name`/`email`）
- レート制限:
  - 429は警告扱いで再試行、直列・バックオフ

---

## 1. プレフライト（環境/起動）

```bash
node -v  # 20.18.1+ 推奨
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
npm ci
npm run dev &
npx wait-on http://localhost:3000
```

OK: 到達200

---

## 2. 認証化の統一（Middleware更新）

2-1) `/tags` を保護対象に追加

- ファイル: `src/middleware.ts`
- `protectedPaths` に以下を追加:
  - `'/tags'`
  - `'/tags/*'`

2-2) タグAPI も保護

- `protectedApiPaths` に `'/api/tags'` を追加（これで`/api/tags/index|search|trending`全てが認証必須）
- 期待挙動: 未ログイン→`/auth/signin?callbackUrl=...` へ誘導、ログイン後閲覧可

2-3) テスト影響

- Playwrightは `storageState.json` を使用（emailVerified:true）
- 401/403が残る場合は storageState 再生成

---

## 3. /tags/[tag] の致命バグ修正（Next.js 15 & author描画）

3-A) 最適解: Server→Client 分離（推奨）

- page.tsx（Server Component, デフォルト）
  - `export default async function Page({ params }: { params: { tag: string } }) { ... }`
  - `const key = normalizeTag(decodeURIComponent(params.tag))`
  - Server側で `key` を安全に決定し、Client子コンポーネントへprop渡し
- `TagDetailClient.tsx`（'use client'）
  - 受け取った `tagKey` を元にクライアントフェッチ・UI（並び替え/ページング/カード/リンク化）
  - これで `params Promise` 問題は根治（Server側で完結）

3-B) 代替解: Clientで`use(params)`を使う

- page.tsx（'use client'）
  - `import { use } from 'react'`
  - シグネチャ: `({ params }: { params: Promise<{ tag: string }> })`
  - 本文: `const { tag } = use(params)`
- 注意: 将来的にもServer→Client分離の方が安定・SEOに有利

3-C) author描画の型安全化

- 事象: `Objects are not valid as a React child`（`post.author`がObject）
- 対応: 描画時に安全展開

```tsx
const authorName =
  typeof post.author === 'string'
    ? post.author
    : post.author?.name || post.author?.email || '不明なユーザー';
<Typography variant="caption" color="text.secondary">
  {authorName}
</Typography>;
```

- 望ましい代替: 既存 `normalizePostToUnified` を再利用してUI層は常に文字列へ正規化

3-D) linkifyHashtags の徹底

- 本文描画に `linkifyHashtags(post.content)` を適用
- `a[href*="/tags/"]` で遷移可能に（`Link`で包む）

---

## 4. /tags（一覧）の保護下再確認

- 認証後のみ表示（middlewareで保護）
- 429時のUI警告・再試行
- data-testid を堅牢に維持

---

## 5. デバッグログ/OK-NG/復旧

- ログ例:

```ts
console.log('[TAG-PAGE]', { tag, status: res.status, page, sort, count: data?.data?.length });
console.log('[TAGS-INDEX]', { status: res.status, q, sort, page, count: data?.data?.length });
```

- 401/403: storageStateをemailVerified:trueで再生成
- 429: バックオフ（400→800→1600ms）して再試行
- `params`警告: Server→Client分離 or `use(params)` による解消
- `Objects are not valid` : `authorName`安全展開 or 正規化導入

---

## 6. Playwright E2E 更新

6-1) 認証前提に変更

- すべての /tags 系テストは `storageState.json` を前提に
- サインイン前は 302/401 を許容しない（page 到達を前提）

6-2) tags.index.spec.ts

- `/tags` 到達 → 検索/ソート/ページング → クリックで `/tags/<key>`。
- 429は警告扱いで復帰確認

6-3) tags.detail.spec.ts

- `/tags/javascript` 到達 → タイトル表示 → リスト（0件でも空UI）
- 並び替え `newest|popular` → 200
- 本文 `a[href*="/tags/"]` を確認 → クリックで他タグへ
- 429を最後に実施

安定化Tips:

```ts
await page.waitForSelector('[data-testid="tag-page-title"]', { state: 'visible' });
await page.waitForLoadState('domcontentloaded');
```

---

## 7. 実装の骨子（擬似コード）

7-A) Server page.tsx（/tags/[tag]）

```tsx
import { normalizeTag } from '@/app/utils/hashtag';
import TagDetailClient from './TagDetailClient';

export default async function Page({ params }: { params: { tag: string } }) {
  const key = normalizeTag(decodeURIComponent(params.tag));
  return <TagDetailClient tagKey={key} />;
}
```

7-B) TagDetailClient（'use client'）

```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { linkifyHashtags } from '@/app/utils/hashtag';

export default function TagDetailClient({ tagKey }: { tagKey: string }) {
  // fetch(`/api/posts?tag=${encodeURIComponent(tagKey)}&sort=-createdAt&page=1&limit=20`)
  // authorName の安全展開、Card表示、さらに読み込む
}
```

---

## 8. 最終セルフチェック（TRIPLE MATCH）

- [ ] Middleware: `/tags`, `/tags/*` が保護。`/api/tags` も保護。
- [ ] Next.js 15: `params` Promise 警告なし（Server→Client分離 or `use(params)`)。
- [ ] `author`描画で Object がそのまま出力されない。
- [ ] /tags と /tags/[tag] が認証下で機能（検索/並び替え/ページング/遷移）。
- [ ] E2E が安定PASS（429は観測→復帰）。

以上。
