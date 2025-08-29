'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Divider,
  Skeleton,
  Badge,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSocket } from '@/lib/socket/client';
import { useCSRFContext, useSecureFetch } from '@/components/CSRFProvider';
import FollowButton from '@/components/FollowButton';

// タイムライン投稿の型定義
interface TimelinePost {
  _id: string;
  author: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  content: string;
  likes: string[];
  comments: number;
  createdAt: string;
  updatedAt: string;
}

interface TimelineMetadata {
  followingCount: number;
  isAuthenticated: boolean;
  lastUpdate: string;
}

interface TimelinePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// デバッグログクラス
class TimelineDebugLogger {
  private logs: any[] = [];
  
  log(category: string, data: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      category,
      data,
      component: 'Timeline.tsx'
    };
    this.logs.push(entry);
    console.log('[TIMELINE-DEBUG]', JSON.stringify(entry));
  }
  
  getAll() {
    return this.logs;
  }
  
  clear() {
    this.logs = [];
  }
}

const debugLogger = new TimelineDebugLogger();

export default function Timeline() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [metadata, setMetadata] = useState<TimelineMetadata | null>(null);
  const [pagination, setPagination] = useState<TimelinePagination | null>(null);
  const { socket, isConnected } = useSocket();
  const { token: csrfToken } = useCSRFContext();
  const secureFetch = useSecureFetch();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 認証チェック
  useEffect(() => {
    debugLogger.log('auth-check', {
      status,
      session: session ? { id: session.user?.id, email: session.user?.email } : null,
      emailVerified: session?.user?.emailVerified
    });

    if (status === 'loading') return;
    
    if (!session) {
      debugLogger.log('auth-redirect', { reason: 'no-session' });
      router.push('/auth/signin');
      return;
    }

    if (!session.user?.emailVerified) {
      debugLogger.log('auth-redirect', { reason: 'email-not-verified' });
      router.push('/auth/email-not-verified');
      return;
    }
  }, [session, status, router]);

  // タイムラインデータの取得
  const fetchTimelineData = useCallback(async (pageNum: number = 1) => {
    if (!session?.user?.id) {
      debugLogger.log('fetch-abort', { reason: 'no-user-id' });
      return;
    }

    try {
      debugLogger.log('fetch-start', { page: pageNum, userId: session.user.id });
      
      const url = `/api/timeline?page=${pageNum}&limit=20`;
      const response = await secureFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch timeline');
      }

      const data = await response.json();
      debugLogger.log('fetch-success', {
        page: pageNum,
        postsCount: data.data?.length,
        metadata: data.metadata,
        pagination: data.pagination
      });

      if (data.success) {
        if (pageNum === 1) {
          setPosts(data.data || []);
        } else {
          setPosts(prev => [...prev, ...(data.data || [])]);
        }
        setMetadata(data.metadata);
        setPagination(data.pagination);
        setHasMore(data.pagination?.hasNext || false);
      }
    } catch (err) {
      debugLogger.log('fetch-error', { 
        error: err instanceof Error ? err.message : 'Unknown error',
        page: pageNum 
      });
      setError(err instanceof Error ? err.message : 'タイムラインの取得に失敗しました');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session, secureFetch]);

  // 初回データ取得
  useEffect(() => {
    if (session?.user?.id && session?.user?.emailVerified) {
      fetchTimelineData(1);
    }
  }, [session, fetchTimelineData]);

  // Socket.ioリアルタイム更新
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewPost = (post: TimelinePost) => {
      debugLogger.log('socket-new-post', { postId: post._id });
      setPosts(prev => [post, ...prev]);
    };

    const handlePostUpdate = (updatedPost: TimelinePost) => {
      debugLogger.log('socket-update-post', { postId: updatedPost._id });
      setPosts(prev => prev.map(p => 
        p._id === updatedPost._id ? updatedPost : p
      ));
    };

    const handlePostDelete = (postId: string) => {
      debugLogger.log('socket-delete-post', { postId });
      setPosts(prev => prev.filter(p => p._id !== postId));
    };

    socket.on('timeline:new-post', handleNewPost);
    socket.on('timeline:update-post', handlePostUpdate);
    socket.on('timeline:delete-post', handlePostDelete);

    return () => {
      socket.off('timeline:new-post', handleNewPost);
      socket.off('timeline:update-post', handlePostUpdate);
      socket.off('timeline:delete-post', handlePostDelete);
    };
  }, [socket, isConnected]);

  // 無限スクロール
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
        debugLogger.log('infinite-scroll-trigger', { page: page + 1 });
        setLoadingMore(true);
        setPage(prev => prev + 1);
        fetchTimelineData(page + 1);
      }
    }, options);

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loading, page, fetchTimelineData]);

  // いいねトグル
  const handleLikeToggle = async (postId: string) => {
    if (!session?.user?.id) return;

    try {
      debugLogger.log('like-toggle', { postId, userId: session.user.id });
      
      const response = await secureFetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(prev => prev.map(p => 
          p._id === postId ? { ...p, likes: data.likes } : p
        ));
      }
    } catch (err) {
      debugLogger.log('like-error', { 
        postId,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  // リフレッシュ
  const handleRefresh = () => {
    debugLogger.log('manual-refresh', { timestamp: new Date().toISOString() });
    setPage(1);
    setLoading(true);
    fetchTimelineData(1);
  };

  // ローディング状態
  if (status === 'loading' || (loading && posts.length === 0)) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Skeleton variant="text" width="30%" />
                    <Skeleton variant="text" width="20%" />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={60} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Container>
    );
  }

  // エラー状態
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={handleRefresh} startIcon={<RefreshIcon />}>
          再試行
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            タイムライン
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {isConnected && (
              <Chip
                icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />}
                label="リアルタイム"
                color="success"
                size="small"
              />
            )}
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
        {metadata && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              フォロー中: {metadata.followingCount}人
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 投稿リスト */}
      <Stack spacing={2}>
        {posts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              まだ投稿がありません
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ユーザーをフォローして、タイムラインに投稿を表示しましょう
            </Typography>
          </Paper>
        ) : (
          posts.map((post) => (
            <Card key={post._id}>
              <CardContent>
                {/* 投稿者情報 */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    src={post.author.image}
                    alt={post.author.name}
                    sx={{ width: 40, height: 40 }}
                  >
                    {!post.author.image && <PersonIcon />}
                  </Avatar>
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {post.author.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <CalendarIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      {format(new Date(post.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </Typography>
                  </Box>
                  {session?.user?.id !== post.author._id && (
                    <FollowButton
                      userId={post.author._id}
                      initialIsFollowing={false}
                    />
                  )}
                </Box>

                {/* 投稿内容 */}
                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </Typography>

                <Divider sx={{ my: 1 }} />

                {/* アクション */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconButton
                    onClick={() => handleLikeToggle(post._id)}
                    color={post.likes.includes(session?.user?.id || '') ? 'error' : 'default'}
                  >
                    {post.likes.includes(session?.user?.id || '') ? (
                      <FavoriteIcon />
                    ) : (
                      <FavoriteBorderIcon />
                    )}
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    {post.likes.length}
                  </Typography>
                  
                  <IconButton>
                    <CommentIcon />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    {post.comments}
                  </Typography>
                  
                  <IconButton>
                    <ShareIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      {/* 無限スクロール用センチネル */}
      {hasMore && (
        <Box ref={sentinelRef} sx={{ py: 2, textAlign: 'center' }}>
          {loadingMore && <CircularProgress size={30} />}
        </Box>
      )}

      {/* ページネーション情報 */}
      {pagination && !hasMore && posts.length > 0 && (
        <Paper sx={{ p: 2, mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            全{pagination.total}件の投稿を表示しました
          </Typography>
        </Paper>
      )}
    </Container>
  );
}