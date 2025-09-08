import { cookies } from 'next/headers';

import { normalizeTag } from '@/app/utils/hashtag';
import type { TrendingItem } from '@/components/TrendingTagsBar';

import TagDetailClient from './TagDetailClient';
import type { Post } from './TagDetailClient';

// Next.js 15+: params は非同期。必ず await してから使用する
export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const key = normalizeTag(decodeURIComponent(tag));

  // SSR 初期取得（開発/本番共通）。認証Cookieを明示的に転送
  let initial: { posts: Post[]; hasNext: boolean } | undefined;
  let trendingInitial: TrendingItem[] | undefined;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const query = new URLSearchParams({
      tag: key,
      sort: '-createdAt',
      page: '1',
      limit: '20',
    });
    const res = await fetch(`/api/posts?${query.toString()}`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success) {
        initial = {
          posts: Array.isArray(data.data) ? (data.data as Post[]) : [],
          hasNext: !!data?.pagination?.hasNext,
        };
      }
    }
    // トレンド（使用頻度）もSSRで取得（UIヘッダーを確実表示）
    try {
      const resTrending = await fetch(`/api/tags/trending?days=30&limit=20`, {
        cache: 'no-store',
        headers: { cookie: cookieHeader },
      });
      if (resTrending.ok) {
        const json = await resTrending.json();
        if (Array.isArray(json?.data)) trendingInitial = json.data as TrendingItem[];
      }
    } catch {}
  } catch {
    // SSR初期取得に失敗してもCSRで復旧するため握りつぶす
  }

  return (
    <div>
      {process.env.NEXT_PUBLIC_TAG_DEBUG === 'true' && (
        <div
          data-testid="tag-page-ssr-debug"
          style={{
            padding: '8px 12px',
            margin: '8px 0',
            border: '1px dashed #90caf9',
            background: '#e3f2fd',
            color: '#0d47a1',
            fontSize: 12,
          }}
        >
          SSR Debug: tag={key} initialPosts={initial?.posts?.length ?? 0} hasNext=
          {String(initial?.hasNext ?? false)}
        </div>
      )}
      <TagDetailClient tagKey={key} initial={initial} trendingInitial={trendingInitial} />
    </div>
  );
}
