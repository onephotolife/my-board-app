'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Avatar,
  Chip,
  Divider,
  Fab,
  InputBase,
  IconButton,
  Alert,
  Stack,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Comment as CommentIcon,
  ThumbUp as ThumbUpIcon,
  Visibility as VisibilityIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  LocalOffer as LocalOfferIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

// カテゴリー定数
const CATEGORIES = {
  all: 'すべて',
  general: '一般',
  tech: '技術',
  question: '質問',
  discussion: '議論',
  announcement: 'お知らせ',
} as const;

const SORT_OPTIONS = {
  '-createdAt': '新着順',
  'createdAt': '古い順',
  '-views': '閲覧数多い順',
  'views': '閲覧数少ない順',
  '-updatedAt': '更新日時新しい順',
  'updatedAt': '更新日時古い順',
} as const;

interface Post {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'published' | 'draft' | 'deleted';
  views: number;
  likes: string[];
  tags: string[];
  category: 'general' | 'tech' | 'question' | 'discussion' | 'announcement';
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
  isLikedByUser?: boolean;
}

interface PostsResponse {
  success: boolean;
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const formatTimeAgo = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}日前`;
  if (diffHour > 0) return `${diffHour}時間前`;
  if (diffMin > 0) return `${diffMin}分前`;
  return 'たった今';
};

export default function BoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [error, setError] = useState<string | null>(null);
  const postsPerPage = 10;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      fetchPosts();
    }
  }, [status, router, page, category, sortBy]);

  // 検索のデバウンス
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page !== 1) {
        setPage(1); // 検索時はページを1に戻す
      } else {
        fetchPosts();
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: postsPerPage.toString(),
        sort: sortBy,
        ...(category !== 'all' && { category }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/posts?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '投稿の取得に失敗しました');
      }
      
      const data: PostsResponse = await response.json();
      
      if (data.success) {
        setPosts(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else {
        throw new Error('投稿の取得に失敗しました');
      }
    } catch (error) {
      console.error('投稿の取得に失敗:', error);
      setError(error instanceof Error ? error.message : '投稿の取得に失敗しました');
      setPosts([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // いいねをトグルする関数
  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'toggle_like' }),
      });
      
      if (response.ok) {
        // 投稿リストを更新
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? {
                  ...post,
                  isLikedByUser: !currentlyLiked,
                  likes: currentlyLiked 
                    ? post.likes.filter(id => id !== session?.user?.id)
                    : [...post.likes, session?.user?.id || '']
                }
              : post
          )
        );
      }
    } catch (error) {
      console.error('いいねの更新に失敗:', error);
    }
  };

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* ヘッダー */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 6,
          mb: 4
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
            会員制掲示板
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            メンバー限定のコミュニティスペース
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* 検索・フィルター */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Paper
                component="form"
                sx={{
                  p: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'grey.100'
                }}
                elevation={0}
              >
                <IconButton sx={{ p: '10px' }}>
                  <SearchIcon />
                </IconButton>
                <InputBase
                  sx={{ ml: 1, flex: 1 }}
                  placeholder="投稿を検索..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>カテゴリー</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  label="カテゴリー"
                  startAdornment={<CategoryIcon sx={{ mr: 1, fontSize: 20 }} />}
                >
                  {Object.entries(CATEGORIES).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>並び替え</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="並び替え"
                  startAdornment={<SortIcon sx={{ mr: 1, fontSize: 20 }} />}
                >
                  {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* 統計情報 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {total}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                総投稿数
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" gutterBottom>
                {posts.filter(p => {
                  const date = new Date(p.createdAt);
                  const today = new Date();
                  return date.toDateString() === today.toDateString();
                }).length}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                今日の投稿
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {page}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                現在のページ
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* 投稿一覧 */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }} color="text.secondary">
              投稿を読み込み中...
            </Typography>
          </Box>
        ) : posts.length > 0 ? (
          <>
            <Grid container spacing={3}>
              {posts.map((post) => (
                <Grid item xs={12} key={post._id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => router.push(`/posts/${post._id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {post.author.name[0]?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {post.author.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {formatTimeAgo(post.createdAt)}
                              </Typography>
                              <Chip
                                label={CATEGORIES[post.category]}
                                size="small"
                                variant="outlined"
                                color={post.category === 'announcement' ? 'error' : post.category === 'tech' ? 'primary' : 'default'}
                                sx={{ ml: 1 }}
                              />
                              {post.tags.length > 0 && (
                                <Chip
                                  label={post.tags[0]}
                                  size="small"
                                  variant="filled"
                                  sx={{ ml: 1, fontSize: '0.7rem', height: '20px' }}
                                  icon={<LocalOfferIcon sx={{ fontSize: '12px !important' }} />}
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
                        {post.canEdit && (
                          <Chip
                            label="自分の投稿"
                            size="small"
                            color="success"
                            variant="filled"
                          />
                        )}
                      </Box>

                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        {post.title}
                      </Typography>
                      
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          mb: 2
                        }}
                      >
                        {post.content}
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Stack direction="row" spacing={3}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {post.views}
                            </Typography>
                          </Box>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 0.5,
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.7 }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(post._id, post.isLikedByUser || false);
                            }}
                          >
                            <ThumbUpIcon 
                              sx={{ 
                                fontSize: 18, 
                                color: post.isLikedByUser ? 'primary.main' : 'text.secondary' 
                              }} 
                            />
                            <Typography 
                              variant="caption" 
                              color={post.isLikedByUser ? 'primary.main' : 'text.secondary'}
                            >
                              {post.likes.length}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CommentIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              0
                            </Typography>
                          </Box>
                        </Stack>
                        
                        <Button size="small" sx={{ textTransform: 'none' }}>
                          続きを読む
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* ページネーション */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        ) : (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom color="text.secondary">
              まだ投稿がありません
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              最初の投稿を作成してみましょう！
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => router.push('/posts/new')}
              sx={{
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                color: 'white'
              }}
            >
              新規投稿を作成
            </Button>
          </Paper>
        )}
      </Container>

      {/* フローティングアクションボタン */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
        }}
        onClick={() => router.push('/posts/new')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}