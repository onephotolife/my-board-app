'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
// import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Paper,
  Alert,
  Chip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TagIcon from '@mui/icons-material/Tag';

import { linkifyHashtags } from '@/app/utils/hashtag';
// Portalは撤去。通常DOMで描画する

interface Post {
  _id: string;
  title?: string;
  content?: string;
  author?: string | { name?: string; email?: string };
  tags?: string[];
  likes?: number | string[];
  comments?: number;
  createdAt: string;
  updatedAt?: string;
}

interface PostsResponse {
  success: boolean;
  data: Post[];
  pagination?: {
    page: number;
    limit: number;
    total?: number;
    hasNext?: boolean;
  };
}

interface TagDetailClientProps {
  tagKey: string;
  initial?: {
    posts: Post[];
    hasNext: boolean;
  };
}

export default function TagDetailClient({ tagKey, initial }: TagDetailClientProps) {
  // const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(initial?.posts ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(initial?.hasNext ?? false);
  const limit = 20;
  // Portal撤去後の保守用メモ: 以前は環境変数で切り替え
  const [usePortalFallback, setUsePortalFallback] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const forcePortal = process.env.NEXT_PUBLIC_TAG_FORCE_PORTAL === 'true';

  const ensurePortalRoot = useCallback((): HTMLElement => {
    let el = document.getElementById('tag-portal-fallback') as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'tag-portal-fallback';
      Object.assign(el.style, {
        position: 'fixed',
        top: '96px',
        left: '312px',
        right: '24px',
        bottom: '24px',
        overflow: 'auto',
        zIndex: '2147483638',
        background: 'transparent',
        pointerEvents: 'auto',
      } as CSSStyleDeclaration);
      document.body.appendChild(el);
    }
    setPortalRoot(el);
    return el;
  }, []);

  // postsが取得できた直後はまずPortalで確実に可視化し、のちに診断で通常DOMへ戻す
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_TAG_PORTAL_FALLBACK === 'true') return;
    if (posts.length > 0) {
      if (forcePortal) {
        ensurePortalRoot();
        setUsePortalFallback(true);
      } else {
        // 一旦フォールバックONにして確実に見せる
        ensurePortalRoot();
        setUsePortalFallback(true);
      }
    }
  }, [posts.length, forcePortal, ensurePortalRoot]);

  // 最終手段の可視デバッグ: フラグがONのときだけ固定バーを出す
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TAG_DEBUG !== 'true') return;
    try {
      const id = 'tag-debug-overlay';
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        Object.assign(el.style, {
          position: 'fixed',
          top: '8px',
          right: '8px',
          zIndex: '2147483646',
          background: '#e3f2fd',
          color: '#0d47a1',
          fontSize: '12px',
          padding: '6px 8px',
          border: '1px solid #90caf9',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        } as CSSStyleDeclaration);
        document.body.appendChild(el);
      }
      el!.textContent = `Debug(tag): ${tagKey} posts=${posts.length} loading=${loading} error=${error ?? 'none'} page=${page}`;
      return () => {
        const node = document.getElementById(id);
        if (node) node.remove();
      };
    } catch {}
  }, [tagKey, posts.length, loading, error, page]);

  // 可視性確保のための一時オーバーレイ（先頭5件）
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TAG_DEBUG !== 'true') return;
    try {
      const id = 'tag-plain-overlay';
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        Object.assign(el.style, {
          position: 'fixed',
          top: '120px',
          left: 'calc(280px + 24px)', // サイドバーの右側あたり
          maxWidth: '420px',
          zIndex: '2147483645',
          background: '#fffde7',
          color: '#3e2723',
          border: '1px dashed #fbc02d',
          borderRadius: '6px',
          padding: '8px 10px',
          fontSize: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        } as CSSStyleDeclaration);
        document.body.appendChild(el);
      }
      if (posts.length > 0) {
        const items = posts
          .slice(0, 5)
          .map(
            (p) =>
              p.title ||
              (p.content
                ? p.content.slice(0, 20) + (p.content.length > 20 ? '…' : '')
                : '(no title)')
          )
          .join(' | ');
        el!.textContent = `PLAIN LIST (top5): ${items}`;
        el!.style.display = 'block';
      } else {
        el!.style.display = 'none';
      }
      return () => {
        const node = document.getElementById(id);
        if (node) node.remove();
      };
    } catch {
      // noop
    }
  }, [posts]);

  // 可視性の自己診断: カードが高さ0/不可視ならフォールバックPortalへ切替
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_TAG_PORTAL_FALLBACK === 'true') return;
    // 強制Portalが有効なら即座にポータルルートを用意して終了
    if (forcePortal) {
      let el = document.getElementById('tag-portal-fallback') as HTMLElement | null;
      if (!el) {
        el = document.createElement('div');
        el.id = 'tag-portal-fallback';
        Object.assign(el.style, {
          position: 'fixed',
          top: '96px',
          left: '312px',
          right: '24px',
          bottom: '24px',
          overflow: 'auto',
          zIndex: '2147483638',
          background: 'transparent',
        } as CSSStyleDeclaration);
        document.body.appendChild(el);
      }
      setPortalRoot(el);
      setUsePortalFallback(true);
      return;
    }
    let attempts = 0;
    const getRoot = () => ensurePortalRoot();

    const tick = () => {
      attempts += 1;
      try {
        const card = document.querySelector(
          '[data-testid^="tag-post-card-"]'
        ) as HTMLElement | null;
        if (!card) {
          // まだDOMに現れていない → 一定回数待機、超えたらフォールバック
          if (attempts >= 8 && posts.length > 0) {
            getRoot();
            setUsePortalFallback(true);
            return;
          }
          return;
        }
        const style = window.getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        const invisible =
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) === 0 ||
          rect.height <= 1 ||
          rect.width <= 1;
        if (invisible) {
          getRoot();
          setUsePortalFallback(true);
        } else {
          // 可視でも一時的にPortalを維持（再度の不可視化で瞬断しないため）
          setUsePortalFallback(true);
        }
      } catch {}
    };

    const id = window.setInterval(tick, 300);
    return () => {
      window.clearInterval(id);
    };
  }, [posts.length]);

  // ポータル状態が有効なときは右上にステータスを常時表示
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TAG_DEBUG !== 'true') {
      const node = document.getElementById('tag-portal-status');
      if (node) node.remove();
      return;
    }
    try {
      const id = 'tag-portal-status';
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        Object.assign(el.style, {
          position: 'fixed',
          top: '8px',
          right: '8px',
          zIndex: '2147483646',
          background: '#fff3cd',
          color: '#7a5d00',
          fontSize: '12px',
          padding: '6px 8px',
          border: '1px solid #ffeeba',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        } as CSSStyleDeclaration);
        document.body.appendChild(el);
      }
      el!.textContent = usePortalFallback
        ? 'Tags: Portal fallback ACTIVE'
        : 'Tags: Portal fallback OFF';
      el!.style.display = usePortalFallback ? 'block' : 'none';
    } catch {}
  }, [usePortalFallback]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const sortParam = sortBy === 'newest' ? '-createdAt' : '-likes';
      const params = new URLSearchParams({
        tag: tagKey,
        sort: sortParam,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/posts?${params}`, {
        // 認証Cookieを確実に送る（same-originでも明示）
        credentials: 'include',
        // キャッシュを使わず常に最新を取得
        cache: 'no-store',
      });

      if (response.status === 429) {
        setError('レート制限に達しました。しばらくお待ちください。');
        setTimeout(() => fetchPosts(), 1000);
        return;
      }

      if (!response.ok) {
        throw new Error('投稿の取得に失敗しました');
      }

      const data: PostsResponse = await response.json();

      if (!data.success) {
        throw new Error('投稿の取得に失敗しました');
      }

      if (page === 1) {
        setPosts(data.data || []);
      } else {
        setPosts((prev) => [...prev, ...(data.data || [])]);
      }

      setHasNext(data.pagination?.hasNext || false);
    } catch (err) {
      console.error('[TAG-PAGE-ERROR]', err);
      setError('投稿の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [tagKey, sortBy, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSortChange = (
    _: React.MouseEvent<HTMLElement>,
    newSort: 'newest' | 'popular' | null
  ) => {
    if (newSort !== null) {
      setSortBy(newSort);
      setPage(1);
    }
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getAuthorName = (author?: string | { name?: string; email?: string }) => {
    if (typeof author === 'string') {
      return author;
    }
    return author?.name || author?.email || '不明なユーザー';
  };

  const renderContent = (content?: string) => {
    if (!content) return null;
    const parts = linkifyHashtags(content);
    return (
      <Typography variant="body2" color="text.secondary" sx={{ '& a': { textDecoration: 'none' } }}>
        {parts.map((part, idx) =>
          typeof part === 'string' ? (
            <span key={idx}>{part}</span>
          ) : (
            <Link
              key={idx}
              href={part.href}
              style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}
              aria-label={`タグ ${part.text}`}
            >
              {part.text}
            </Link>
          )
        )}
      </Typography>
    );
  };

  const cardList = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {posts.map((post) => (
        <Card
          key={post._id}
          data-testid={`tag-post-card-${post._id}`}
          sx={{
            '&:hover': {
              boxShadow: 3,
              transform: 'translateY(-2px)',
              transition: 'all 0.3s ease',
            },
          }}
        >
          <CardContent>
            {post.title && (
              <Typography variant="h6" component="h2" gutterBottom>
                <Link
                  href={`/posts/${post._id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {post.title}
                </Link>
              </Typography>
            )}

            {renderContent(post.content)}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {getAuthorName(post.author)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarTodayIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(post.createdAt)}
                </Typography>
              </Box>
            </Box>

            {post.tags && post.tags.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {post.tags.map((t) => (
                  <Chip
                    key={t}
                    label={`#${t}`}
                    size="small"
                    component={Link}
                    href={`/tags/${encodeURIComponent(t)}`}
                    clickable
                    sx={{
                      textDecoration: 'none',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                      },
                    }}
                  />
                ))}
              </Box>
            )}
          </CardContent>

          <CardActions>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {post.likes !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FavoriteIcon fontSize="small" color="action" />
                  <Typography variant="caption">
                    {typeof post.likes === 'number'
                      ? post.likes
                      : Array.isArray(post.likes)
                        ? post.likes.length
                        : 0}
                  </Typography>
                </Box>
              )}

              {post.comments !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CommentIcon fontSize="small" color="action" />
                  <Typography variant="caption">{post.comments}</Typography>
                </Box>
              )}
            </Box>

            <Button component={Link} href={`/posts/${post._id}`} size="small" sx={{ ml: 'auto' }}>
              詳細を見る
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );

  return (
    <Container
      maxWidth="md"
      sx={{
        py: 4,
        position: 'relative',
        zIndex: 2147483639,
        minHeight: 'auto',
        height: 'auto',
        display: 'block',
        overflow: 'visible',
      }}
    >
      {process.env.NEXT_PUBLIC_TAG_DEBUG === 'true' && (
        <Alert severity="info" sx={{ mb: 2 }} data-testid="tag-debug-info">
          Debug: tag={tagKey} posts={posts.length} loading={String(loading)} error={error || 'none'}{' '}
          page={page}
        </Alert>
      )}

      {/* フォールバック簡易レンダリング（デバッグ時のみ） */}
      {process.env.NEXT_PUBLIC_TAG_DEBUG === 'true' && posts.length > 0 && (
        <Box
          data-testid="tag-plain-list"
          sx={{
            mb: 2,
            p: 1,
            background: '#fffde7',
            border: '1px dashed #fbc02d',
            color: '#3e2723',
            zIndex: 2147483639,
            position: 'relative',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            簡易表示（切り分け用）: 先頭5件
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {posts.slice(0, 5).map((p) => (
              <li key={p._id} style={{ lineHeight: '1.6' }}>
                {p.title ||
                  (p.content
                    ? p.content.slice(0, 20) + (p.content.length > 20 ? '…' : '')
                    : '(no title)')}
              </li>
            ))}
          </ul>
        </Box>
      )}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom data-testid="tag-page-title">
          <TagIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />#{tagKey}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {posts.length > 0 ? `${posts.length}件の投稿` : '関連する投稿を表示'}
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3, position: 'relative', zIndex: 2147483638 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={sortBy}
            exclusive
            onChange={handleSortChange}
            aria-label="sort posts"
            data-testid="tag-sort-toggle"
          >
            <ToggleButton value="newest" aria-label="newest posts">
              <AccessTimeIcon sx={{ mr: 1 }} />
              最新順
            </ToggleButton>
            <ToggleButton value="popular" aria-label="popular posts">
              <TrendingUpIcon sx={{ mr: 1 }} />
              人気順
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="tag-error-alert">
          {error}
        </Alert>
      )}

      {loading && page === 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && posts.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            まだ投稿がありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            #{tagKey} のタグを付けた最初の投稿を作成しましょう
          </Typography>
          <Button component={Link} href="/posts/new" variant="contained" color="primary">
            新規投稿を作成
          </Button>
        </Paper>
      )}

      {process.env.NEXT_PUBLIC_TAG_DEBUG === 'true' && usePortalFallback && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Portalフォールバックモードで表示中
        </Alert>
      )}

      {posts.length > 0 &&
        (usePortalFallback && portalRoot ? (
          createPortal(
            <div id="tag-portal-content" style={{ position: 'relative', padding: 8 }}>
              <div style={{ position: 'sticky', top: 0, zIndex: 2147483639 }}>
                {process.env.NEXT_PUBLIC_TAG_DEBUG === 'true' && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    Portalフォールバック表示中（カード＋簡易リスト）
                  </Alert>
                )}
              </div>
              <div id="tag-portal-cards" style={{ position: 'relative', zIndex: 2147483638 }}>
                {cardList}
              </div>
              <div
                id="tag-portal-plain"
                style={{ position: 'relative', zIndex: 2147483639, marginTop: 12 }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  簡易表示（ポータル）: 先頭5件
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {posts.slice(0, 5).map((p) => (
                    <li key={p._id} style={{ lineHeight: '1.6' }}>
                      {p.title ||
                        (p.content
                          ? p.content.slice(0, 20) + (p.content.length > 20 ? '…' : '')
                          : '(no title)')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            portalRoot
          )
        ) : (
          <Box
            id="tag-inline-cards"
            sx={{ position: 'relative', zIndex: 2147483638, overflow: 'visible' }}
          >
            {cardList}
          </Box>
        ))}

      {!loading && hasNext && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loading}
            data-testid="tag-load-more-button"
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                読み込み中...
              </>
            ) : (
              'さらに読み込む'
            )}
          </Button>
        </Box>
      )}

      {loading && page > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Container>
  );
}
