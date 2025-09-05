# ONE-SHOT: タグ詳細ページ(/tags/[tag]) UI/UX 改善ランブック v1（ローカル・100点版）

目的: 既存の`/tags/[tag]`ページが最低限の表示のみでUXが低い状況を改善し、タイムライン/一覧との整合を保ちながら、視認性・操作性・可読性を大幅に向上させる。

---

## 0. 現在仕様の把握（前提）

- ルート: `/tags/[tag]` は既に存在（SSR/ISR, `revalidate=60` など）。
- データ: `Post` の `tags` 配列にキーが格納。タグキーは `normalizeTag` 準拠。
- 問題: 見出し/余白/タイポグラフィ/並び替え/ページング/リンク化/メタ情報/空表示が弱く、UXが低い。

---

## 1. 改善目標（UI/UX要件）

- 見出し: `#<display>` を大きく表示し、件数・最終更新（任意）を補助表示。
- 並び替え: `新着/人気` 切替（人気は `likes` または `countTotal` の代替指標がなければ新着のみでも可）。
- ページング: 20件/ページ、次へ読み込み（ボタン or 無限スクロール）。
- 本文リンク化: `linkifyHashtags` を適用し、本文中の `#タグ` をクリック可能に。
- カード表示: `MUI Card` でタイトル/本文/メタ（作者/日付/いいね）を整える。
- 空状態: 「このタグの投稿はまだありません」「新規投稿」導線。
- a11y/テストID: `data-testid="tag-page-title"`, `data-testid="tag-post-card-<id>"` など。

---

## 2. 設計（ページ構成）

- `src/app/tags/[tag]/page.tsx`
  - ヘッダ部: タグ名（`#display` or `tag`キー）、件数、トレンド導線（任意）
  - 操作部: 並び替えトグル、結果数表示、（任意）期間フィルタ
  - リスト部: カードのグリッド/リスト（1列〜2列レスポンシブ）
  - ページング: 次を読み込むボタン（初期は簡易）
- サーバ取得: 該当タグの投稿取得APIまたはサーバフェッチ（既存タイムラインAPIの拡張で`?tag=`対応可）。

---

## 3. 実装ステップ（小さく段階的に）

3-1) 投稿取得APIの確認/拡張

- 既存 `/api/posts` が `tag` クエリを受けて絞れるか確認。なければ追加（`find({ tags: key })`）。
- ページング: `page`, `limit`（<=50）
- ソート: `sort=-createdAt`（新着）を初期。人気が必要なら `likes` 数で降順に（モデルにある場合）。
- 応答: `{ success, data, pagination }` 形式を統一。

3-2) タグ詳細ページのUI実装

- ヘッダ: 大きい `Typography`、サブ情報（結果数/最終更新）
- 並び替えトグル: `ToggleButtonGroup`（`newest`/`popular`）
- リスト: `Card` にタイトル/本文・`linkifyHashtags` 適用・作者/日付・いいね数
- ページング: `次へ` ボタンで `page++` → 追記
- 空: 0件表示と `/posts/new` への導線

3-3) スタイル

- 余白・フォント階層・セクション間`Divider`・アクセントカラー（既存テーマに合わせる）

3-4) a11y/テストID

- `data-testid="tag-page-title"` に `#<display>`
- 各カードに `data-testid="tag-post-card-<postId>"`

---

## 4. デバッグログ・OK/NG・復旧

- ログ例:

```ts
console.log('[TAG-PAGE]', { tag, status: res.status, count: data?.data?.length, page, sort });
```

- OK: 200でリストが出る、並び替え/ページングで更新、本文リンク化
- NG: 500→サーバログ採取、429→警告+待機再試行、空→0件UIで問題なし

---

## 5. Playwright E2E（タグ詳細）

- 新規: `tests/e2e/tags.detail.spec.ts`
  シナリオ:

1. `/tags/javascript` 到達 → タイトル `#javascript` 表示
2. リストが0件以上（0件でも空UIが出ればOK）
3. 並び替えトグル（新着→人気）→200/要素更新
4. 本文に `#` リンクが含まれる（`a[href*="/tags/"]`）
5. 1件クリック→`/tags/<他key>` へ遷移
6. 429を最後に検証→待機で復帰

---

## 6. コード骨子（抜粋の擬似コード）

API（`/api/posts` 拡張例）

```ts
// GET /api/posts?tag=<key>&sort=-createdAt&page=1&limit=20
// 既存のfind条件に { tags: key } を追加し、paginate/lean()
```

ページ（`src/app/tags/[tag]/page.tsx`）

```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Stack,
  Divider,
  Button,
} from '@mui/material';
import { linkifyHashtags } from '@/app/utils/hashtag';

export default function TagDetailPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [hasNext, setHasNext] = useState(false);

  async function load(p = 1) {
    const qs = new URLSearchParams({
      tag,
      sort: sort === 'newest' ? '-createdAt' : '-likes',
      page: String(p),
      limit: '20',
    });
    const res = await fetch('/api/posts?' + qs.toString());
    const data = await res.json();
    setItems(p === 1 ? data.data : [...items, ...data.data]);
    setHasNext(data.pagination?.hasNext || false);
  }
  useEffect(() => {
    setPage(1);
    load(1);
  }, [tag, sort]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" data-testid="tag-page-title" sx={{ mb: 2 }}>
        #{tag}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <ToggleButtonGroup value={sort} exclusive onChange={(_, v) => v && setSort(v)}>
          <ToggleButton value="newest">新着</ToggleButton>
          <ToggleButton value="popular">人気</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Stack spacing={2}>
        {items.length === 0 && (
          <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography color="text.secondary">このタグの投稿はまだありません。</Typography>
            <Button LinkComponent={Link} href="/posts/new" sx={{ mt: 1 }}>
              最初の投稿を作成
            </Button>
          </Box>
        )}
        {items.map((post) => (
          <Card key={post._id} data-testid={`tag-post-card-${post._id}`}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {post.title}
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                {linkifyHashtags(post.content).map((chunk, i) =>
                  typeof chunk === 'string' ? (
                    chunk
                  ) : (
                    <Link key={i} href={chunk.href}>
                      {chunk.text}
                    </Link>
                  )
                )}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={2}>
                <Typography variant="caption">
                  {new Date(post.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="caption">いいね: {post.likes?.length ?? 0}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
      {hasNext && (
        <Box sx={{ mt: 2 }}>
          <Button
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

## 7. 実行手順（Claude自走）

1. 起動: `npm run dev &` → `wait-on`
2. APIの`tag`フィルタ/ページング/ソート拡張を確認/実装
3. `/tags/[tag]` を上記設計に沿って改善
4. E2E: `tests/e2e/tags.detail.spec.ts` を追加/実行
5. 429/500時は本書の復旧手順で対処

---

## 8. 最終セルフチェック

- [ ] タイトル`#<tag>`/カードUI/リンク化/並び替え/ページング
- [ ] 0件UI＋新規投稿導線
- [ ] E2E成功（429は警告/復帰）
- [ ] 既存設計（/timeline, /tags/index）と整合

以上。
