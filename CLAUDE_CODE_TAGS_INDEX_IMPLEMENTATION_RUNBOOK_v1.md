# Claude Code 実行用: タグ一覧ページ 実装ランブック v1（ローカル・Actions非使用）

目的: 既存のタグ機能（抽出/正規化/検索/トレンド/タグ詳細）を踏まえ、プロジェクトに最適な「タグ一覧ページ（全タグ一覧＋基本フィルタ）」を安全に統合し、E2Eまで一気通貫で完了させる。

---

## 0. 既存仕様の要点（調査サマリ）

- ルート/認証:
  - 正式タイムラインは `/timeline`（`emailVerified:true`が必須）
  - タグ詳細: `src/app/tags/[tag]/page.tsx` で該当タグの投稿一覧を表示（SSR/ISR）
- API/データ:
  - `src/app/api/tags/search/route.ts` → `{ success, data: Tag[] }`（prefix検索）
  - `src/app/api/tags/trending/route.ts` → `{ success, data: Array<{ key, count }> }`
  - `Tag`モデル（`src/lib/models/Tag.ts`）: key, display, countTotal, lastUsedAt など
  - 投稿は `Post.tags: string[]` にタグキーを保持
- UI/ユーティリティ:
  - ハッシュタグ抽出/正規化/リンク化は `src/app/utils/hashtag.ts`
  - `RealtimeBoard.tsx` は本文表示（linkify未適用箇所あり得るため後で検証）
  - タグクリック→`/tags/<key>` 遷移は既に一部実装済

---

## 1. 追加する機能の設計

1-1) 目的

- 全タグの「索引ページ」を用意し、ユーザーが新しいタグを発見・探索できるようにする。
- 最小は以下:
  - ルート: `/tags`（公開可）
  - 表示: 人気順（countTotal降順）。最新使用順での切替（オプション）
  - 検索: 前方一致（`/api/tags/search`を内部利用）
  - ページング: 無限スクロール or limit/offset（初期はシンプルにページング）
  - 各タグは `#display` と件数を表示しクリックで `/tags/<key>` へ

1-2) ルーティング

- `src/app/tags/page.tsx` を新規作成（App Router, 可能ならISR）
- サーバーフェッチ兼用 or クライアントで `fetch('/api/tags/index')`（後述）
- SEO: 基本的に索引ページは公開でも問題ない（保護不要）

1-3) API 設計（新規）

- 追加: `GET /api/tags/index`
  - クエリ: `q`（オプション, 前方一致）, `sort`（`popular`|`recent`）, `page`（1-based）, `limit`（<= 50）
  - 実装: Mongoで `Tag` コレクションを find → sort → paginate
  - レスポンス: `{ success: true, data: Array<{ key, display, countTotal, lastUsedAt }>, pagination: { page, limit, hasNext } }`
  - rate limit: `withRateLimit(req, handler, { windowMs: 60_000, max: 60 })`

1-4) UI 構成

- `src/app/tags/page.tsx`:
  - 検索入力（`#`不要、内部でnormalizeして前方一致）
  - 並び替えトグル（人気/最近）
  - タグリスト（`List` or `Grid`）
  - ページング（次へ/前へ）または IntersectionObserver
  - 各タグアイテム: `#display`、`countTotal`、最終使用日（薄く）
  - クリックで `/tags/<key>`

1-5) アクセシビリティ/テストID

- `data-testid="tags-index-search"`, `data-testid="tags-index-sort"`, `data-testid="tags-index-item-<key>"`
- Live regionで「n件見つかりました」を発声（任意）

---

## 2. 実装手順（ステップバイステップ）

2-1) API追加: `/api/tags/index`

- ファイル: `src/app/api/tags/index/route.ts`
- 仕様:
  - `q` を `normalizeTag(q)` のキーへ（空なら全件）
  - `sort=popular` → `{ countTotal: -1 }`、`sort=recent` → `{ lastUsedAt: -1 }`
  - ページング: `page` と `limit` で `skip = (page-1)*limit`, `limit`
  - 返却: 上記レスポンス形
  - rate limit: 60req/min
  - エラー時: `{ success:false, error:'INDEX_FAILED' }` 500

2-2) ページ追加: `/tags`

- ファイル: `src/app/tags/page.tsx`
- クライアント or サーバーでのフェッチ方針:
  - 初回はサーバーフェッチ（`fetch` with `{ next:{ revalidate: 60 } }`）+ クライアントで検索/ページング（再フェッチ）
- UI:
  - 検索フォーム（エンターで1ページ目再フェッチ）
  - 並び替えトグル（人気/最近）
  - リスト表示（クリックで `/tags/<key>`）
  - 0件時メッセージ

2-3) バリデーション/ユーティリティ

- `normalizeTag` を用いて検索キー化
- 文字数・limitは防御コード追加

2-4) rate limit 警告対応

- 429時はトースト/メッセージで再試行案内（UIは警告表示でOK）

---

## 3. テストと検証（Playwright）

3-1) 新規テスト: `tests/e2e/tags.index.spec.ts`

- シナリオ:
  1. `/tags` へアクセス → 初期リストが表示（>=0件）
  2. 検索に「東」を入力 → リスト更新 → `data-testid="tags-index-item-<key>"` が0件でもフリーズなし
  3. 並び替え「最近」を選択 → 順序が変わる（件数が同一でもOK、少なくとも200応答・要素更新）
  4. アイテムをクリック → `/tags/<key>` へ遷移 → タグ詳細ページ200
  5. 429誘発（連続リクエスト）→ 警告ログを出し復帰確認

3-2) 既存E2Eとの整合

- `--workers=1`、間隔に `waitForTimeout(400-800ms)` を挿入
- 認証不要設計のため、`storageState` なしでも基本OK（ただし `/tags/[tag]` 側の実装要件に合わせる）

---

## 4. デバッグログ/OK-NG判定

- API `/api/tags/index`:
  - OK: 200, `{ success:true, data:[...], pagination:{...} }`
  - NG: 429（警告続行）, 500（エラーログ採取）
- `/tags` UI:
  - OK: 入力/切替時にリスト更新、クリックでタグ詳細へ
  - NG: 無限ローディング/空表示固定→Console/Networkログ採取

ログ例:

```ts
console.log('[TAGS-INDEX]', { status: res.status, count: data?.data?.length, page, sort, q });
```

---

## 5. 実装テンプレ（抜粋の擬似コード）

API `/api/tags/index/route.ts`（概略）

```ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb-local';
import Tag from '@/lib/models/Tag';
import { normalizeTag } from '@/app/utils/hashtag';
import { withRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  return withRateLimit(
    req,
    async (request) => {
      const url = new URL(request.url);
      const rawQ = url.searchParams.get('q') || '';
      const sort = url.searchParams.get('sort') === 'recent' ? 'recent' : 'popular';
      const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 50);

      const key = normalizeTag(rawQ);
      const filter = key ? { key: { $regex: new RegExp('^' + key) } } : {};
      const sortObj = sort === 'recent' ? { lastUsedAt: -1 } : { countTotal: -1 };

      await connectDB();
      const items = await Tag.find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const hasNext = items.length === limit;
      return NextResponse.json({
        success: true,
        data: items,
        pagination: { page, limit, hasNext },
      });
    },
    { windowMs: 60_000, max: 60 }
  );
}
```

ページ `src/app/tags/page.tsx`（概略）

```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  List,
  ListItem,
  ListItemText,
  Box,
  Typography,
  Button,
} from '@mui/material';

export default function TagsIndexPage() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  async function load(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ sort, page: String(p), limit: '20' });
    if (q.trim()) params.set('q', q.trim());
    const res = await fetch('/api/tags/index?' + params.toString());
    const data = await res.json();
    setItems(p === 1 ? data.data : [...items, ...data.data]);
    setHasNext(data.pagination?.hasNext || false);
    setLoading(false);
  }

  useEffect(() => {
    setPage(1);
    load(1);
  }, [sort]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        タグ一覧
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          data-testid="tags-index-search"
          size="small"
          placeholder="#検索（#不要）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setPage(1);
              load(1);
            }
          }}
        />
        <ToggleButtonGroup
          data-testid="tags-index-sort"
          value={sort}
          exclusive
          onChange={(_, v) => v && setSort(v)}
        >
          <ToggleButton value="popular">人気順</ToggleButton>
          <ToggleButton value="recent">最近</ToggleButton>
        </ToggleButtonGroup>
        <Button
          onClick={() => {
            setPage(1);
            load(1);
          }}
        >
          検索
        </Button>
      </Box>
      <List>
        {items.map((t) => (
          <ListItem
            key={t.key}
            data-testid={`tags-index-item-${t.key}`}
            component={Link}
            href={`/tags/${encodeURIComponent(t.key)}`}
          >
            <ListItemText
              primary={`#${t.display || t.key}`}
              secondary={`投稿数: ${t.countTotal ?? 0}`}
            />
          </ListItem>
        ))}
      </List>
      {hasNext && (
        <Box sx={{ mt: 2 }}>
          <Button
            disabled={loading}
            onClick={() => {
              const np = page + 1;
              setPage(np);
              load(np);
            }}
          >
            さらに読み込む
          </Button>
        </Box>
      )}
    </Box>
  );
}
```

---

## 6. 実装・検証手順（Claude Code 実行）

6-1) ブランチ/起動

```bash
# 事前にNode 20系/依存導入/ポート解放済みであること
npm run dev &
npx wait-on http://localhost:3000
```

6-2) 実装

- 上記APIとページを追加
- `normalizeTag` 利用・型/ESLintに従う

6-3) 手動検証

- `http://localhost:3000/tags` を開き、検索/並び替え/遷移が動くか
- Networkで `/api/tags/index` が200、429時はUI警告

6-4) Playwright 追加テスト

- `tests/e2e/tags.index.spec.ts` を作成

```bash
npx playwright test tests/e2e/tags.index.spec.ts --project=chromium --workers=1 --reporter=line
```

- OK: すべてpass、429は警告扱いで継続

---

## 7. 失敗時の復旧

- 500: サーバーログ/例外箇所のスタックトレース添付
- ESLint: 未使用/any/暗黙anyを排除
- 429: 直列実行+待機/指数バックオフ

---

## 8. 最終セルフチェック

- [ ] `/tags` でタグ一覧が表示/検索/ソート/ページング可能
- [ ] アイテムクリックで `/tags/<key>` に遷移
- [ ] `/api/tags/index` が `{ success, data, pagination }` を返す
- [ ] E2EテストがPass（429は警告扱い）
- [ ] 既存仕様（`/tags/[tag]`, `/timeline`）と整合

以上。
