'use client';

import { useState, useEffect, useCallback } from 'react';
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
}

export default function TagDetailClient({ tagKey }: TagDetailClientProps) {
  // const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const limit = 20;

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

      const response = await fetch(`/api/posts?${params}`);

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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom data-testid="tag-page-title">
          <TagIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />#{tagKey}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {posts.length > 0 ? `${posts.length}件の投稿` : '関連する投稿を表示'}
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
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

      {posts.length > 0 && (
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

                <Button
                  component={Link}
                  href={`/posts/${post._id}`}
                  size="small"
                  sx={{ ml: 'auto' }}
                >
                  詳細を見る
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

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
