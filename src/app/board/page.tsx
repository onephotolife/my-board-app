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
  Pagination
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
  Visibility as VisibilityIcon
} from '@mui/icons-material';

interface Post {
  _id: string;
  title?: string;
  content: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  views?: number;
  likes?: number;
  comments?: number;
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
  const postsPerPage = 10;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      fetchPosts();
    }
  }, [status, router, page]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
        setTotalPages(Math.ceil(data.length / postsPerPage));
      }
    } catch (error) {
      console.error('投稿の取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.title && post.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedPosts = filteredPosts.slice(
    (page - 1) * postsPerPage,
    page * postsPerPage
  );

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
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button startIcon={<FilterListIcon />} variant="outlined">
                  フィルター
                </Button>
                <Button startIcon={<SortIcon />} variant="outlined">
                  並び替え
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* 統計情報 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {posts.length}
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
                {session?.user?.name ? '1' : '0'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                アクティブメンバー
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 投稿一覧 */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }} color="text.secondary">
              投稿を読み込み中...
            </Typography>
          </Box>
        ) : paginatedPosts.length > 0 ? (
          <>
            <Grid container spacing={3}>
              {paginatedPosts.map((post) => (
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
                            {post.author?.[0]?.toUpperCase() || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {post.author || '匿名ユーザー'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {formatTimeAgo(post.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Chip
                          label="未読"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>

                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        {post.title || '無題の投稿'}
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
                              {post.views || Math.floor(Math.random() * 100)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ThumbUpIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {post.likes || Math.floor(Math.random() * 20)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CommentIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {post.comments || Math.floor(Math.random() * 10)}
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