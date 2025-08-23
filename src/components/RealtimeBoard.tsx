'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Divider,
  InputAdornment,
  Pagination,
  Skeleton,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
  Clear as ClearIcon,
  NewReleases as NewReleasesIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import RealtimeBoardWrapper from '@/components/RealtimeBoardWrapper';
import ReportButton from '@/components/ReportButton';
import { useSocket } from '@/lib/socket/client';
import { modern2025Styles } from '@/styles/modern-2025';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  category: string;
  tags: string[];
  likes: string[];
  views: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
  isLikedByUser?: boolean;
  isNew?: boolean;
}

export default function RealtimeBoard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { socket } = useSocket();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [selectedTag, setSelectedTag] = useState<string>('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sort: sortBy,
      });

      if (category && category !== 'all') {
        params.append('category', category);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (selectedTag) {
        params.append('tag', selectedTag);
      }

      const response = await fetch(`/api/posts?${params}`);
      const data = await response.json();

      if (data.success) {
        console.log('📊 投稿データ取得成功:', {
          count: data.data.length,
          firstPost: data.data[0] ? {
            title: data.data[0].title,
            tags: data.data[0].tags,
            hasTags: Array.isArray(data.data[0].tags),
            tagsLength: data.data[0].tags?.length
          } : null
        });
        setPosts(data.data);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError(data.error?.message || '投稿の取得に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [page, category, searchQuery, sortBy, selectedTag]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPosts();
    }
  }, [status, fetchPosts]);

  const handleNewPost = useCallback((newPost: Post) => {
    setPosts(prevPosts => {
      const updatedPost = { ...newPost, isNew: true };
      const filteredPosts = prevPosts.filter(p => p._id !== newPost._id);
      
      if (sortBy === '-createdAt') {
        return [updatedPost, ...filteredPosts].slice(0, 10);
      }
      return [...filteredPosts, updatedPost].slice(0, 10);
    });

    setTimeout(() => {
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p._id === newPost._id ? { ...p, isNew: false } : p
        )
      );
    }, 3000);
  }, [sortBy]);

  const handlePostUpdated = useCallback((updatedPost: Post) => {
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p._id === updatedPost._id
          ? { ...updatedPost, isNew: true }
          : p
      )
    );

    setTimeout(() => {
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p._id === updatedPost._id ? { ...p, isNew: false } : p
        )
      );
    }, 3000);
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
  }, []);

  const handlePostLiked = useCallback((data: any) => {
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p._id === data.postId
          ? {
              ...p,
              likes: data.action === 'liked'
                ? [...(p.likes || []), data.userId]
                : (p.likes || []).filter(id => id !== data.userId),
              isLikedByUser: data.userId === session?.user?.id
                ? data.action === 'liked'
                : p.isLikedByUser,
            }
          : p
      )
    );
  }, [session]);

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'toggle_like' }),
      });

      const data = await response.json();

      if (data.success) {
        // 即座にローカル状態を更新
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === postId
              ? {
                  ...post,
                  likes: data.data.isLiked 
                    ? [...(post.likes || []), session?.user?.id || '']
                    : (post.likes || []).filter(id => id !== session?.user?.id),
                  isLikedByUser: data.data.isLiked
                }
              : post
          )
        );

        // Socket.ioでリアルタイム更新も送信
        if (socket) {
          socket.emit('post:like', {
            postId,
            action: data.data.isLiked ? 'liked' : 'unliked',
            userId: session?.user?.id,
          });
        }
      } else {
        console.error('いいねAPI エラー:', data.error);
      }
    } catch (err) {
      console.error('いいねエラー:', err);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('この投稿を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success && socket) {
        socket.emit('post:delete', { postId });
      }
    } catch (err) {
      console.error('削除エラー:', err);
    }
  };

  if (status === 'loading') {
    return (
      <AppLayout title="掲示板" subtitle="読み込み中...">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress size={60} />
        </Box>
      </AppLayout>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <AppLayout 
      title="掲示板" 
      subtitle="リアルタイムで更新される投稿一覧"
    >
      <RealtimeBoardWrapper
        onNewPost={handleNewPost}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={handlePostDeleted}
        onPostLiked={handlePostLiked}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            {selectedTag && (
              <Alert 
                severity="info" 
                onClose={() => setSelectedTag('')}
                sx={{ mb: 2 }}
              >
                タグ「#{selectedTag}」でフィルタリング中
              </Alert>
            )}
          
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              mb: 4,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid',
              borderColor: 'rgba(99, 102, 241, 0.08)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03)',
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="投稿を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      fontSize: '15px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.08)',
                        borderWidth: '1.5px',
                      },
                      '&:hover': {
                        backgroundColor: '#fafbfc',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                          borderWidth: '2px',
                        },
                      },
                    },
                    '& .MuiInputBase-input': {
                      padding: '14px',
                      fontWeight: 500,
                      color: modern2025Styles.colors.text.primary,
                      '&::placeholder': {
                        color: modern2025Styles.colors.text.secondary,
                        opacity: 0.6,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5 }}>
                        <SearchIcon sx={{ color: modern2025Styles.colors.text.secondary }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={() => setSearchQuery('')}
                          sx={{ 
                            '&:hover': { 
                              backgroundColor: 'rgba(0, 0, 0, 0.04)' 
                            } 
                          }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel 
                    sx={{ 
                      backgroundColor: 'white',
                      px: 0.5,
                      '&.Mui-focused': {
                        color: modern2025Styles.colors.primary,
                      },
                    }}
                  >
                    カテゴリー
                  </InputLabel>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    label="カテゴリー"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: '12px',
                          mt: 1,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        },
                      },
                    }}
                    sx={{
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      fontSize: '15px',
                      '& .MuiSelect-select': {
                        padding: '14px',
                        fontWeight: 500,
                        color: modern2025Styles.colors.text.primary,
                      },
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.08)',
                        borderWidth: '1.5px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      },
                      '&:hover': {
                        backgroundColor: '#fafbfc',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiSelect-icon': {
                        color: modern2025Styles.colors.text.secondary,
                        transition: 'transform 0.3s',
                      },
                      '&.Mui-expanded .MuiSelect-icon': {
                        transform: 'rotate(180deg)',
                      },
                    }}
                  >
                    <MenuItem value="all" sx={{ py: 1.5, fontWeight: 500 }}>すべて</MenuItem>
                    <MenuItem value="general" sx={{ py: 1.5 }}>一般</MenuItem>
                    <MenuItem value="tech" sx={{ py: 1.5 }}>技術</MenuItem>
                    <MenuItem value="question" sx={{ py: 1.5 }}>質問</MenuItem>
                    <MenuItem value="discussion" sx={{ py: 1.5 }}>議論</MenuItem>
                    <MenuItem value="announcement" sx={{ py: 1.5 }}>お知らせ</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel 
                    sx={{ 
                      backgroundColor: 'white',
                      px: 0.5,
                      '&.Mui-focused': {
                        color: modern2025Styles.colors.primary,
                      },
                    }}
                  >
                    並び順
                  </InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="並び順"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: '12px',
                          mt: 1,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        },
                      },
                    }}
                    sx={{
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      fontSize: '15px',
                      '& .MuiSelect-select': {
                        padding: '14px',
                        fontWeight: 500,
                        color: modern2025Styles.colors.text.primary,
                      },
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.08)',
                        borderWidth: '1.5px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      },
                      '&:hover': {
                        backgroundColor: '#fafbfc',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiSelect-icon': {
                        color: modern2025Styles.colors.text.secondary,
                        transition: 'transform 0.3s',
                      },
                      '&.Mui-expanded .MuiSelect-icon': {
                        transform: 'rotate(180deg)',
                      },
                    }}
                  >
                    <MenuItem value="-createdAt" sx={{ py: 1.5, fontWeight: 500 }}>新しい順</MenuItem>
                    <MenuItem value="createdAt" sx={{ py: 1.5 }}>古い順</MenuItem>
                    <MenuItem value="-views" sx={{ py: 1.5 }}>閲覧数順</MenuItem>
                    <MenuItem value="-likes" sx={{ py: 1.5 }}>いいね順</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/posts/new')}
                  data-testid="new-post-button"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '15px',
                    padding: '12px 24px',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
                    },
                    '& .MuiButton-startIcon': {
                      mr: 1,
                    },
                  }}
                >
                  新規投稿
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={3}>
            {[...Array(3)].map((_, index) => (
              <Grid item xs={12} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="80%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : posts.length === 0 ? (
          <Paper 
            elevation={0}
            sx={{ 
              p: 6, 
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              background: 'white',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              投稿がありません
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/posts/new')}
              sx={{ mt: 2 }}
            >
              最初の投稿を作成
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {posts.map((post) => (
              <Grid item xs={12} key={post._id}>
                <Card
                  elevation={0}
                  sx={{
                    position: 'relative',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: 'divider',
                    background: 'white',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: post.isNew ? 'pulse 1s ease-in-out' : 'none',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.08)',
                      borderColor: modern2025Styles.colors.primary,
                    },
                    '@keyframes pulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.7)' },
                      '70%': { boxShadow: '0 0 0 10px rgba(102, 126, 234, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0)' },
                    },
                  }}
                  data-testid={`post-card-${post._id}`}
                >
                  {post.isNew && (
                    <Chip
                      icon={<NewReleasesIcon />}
                      label="新着"
                      color="error"
                      size="small"
                      sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
                    />
                  )}
                  
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom data-testid={`post-title-${post._id}`}>
                        {post.title}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          label={post.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                          data-testid={`post-category-${post._id}`}
                        />
                        {post.tags && post.tags.length > 0 && post.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={`#${tag}`}
                            size="small"
                            variant={selectedTag === tag ? "filled" : "outlined"}
                            color={selectedTag === tag ? "secondary" : "default"}
                            data-testid={`post-tag-${post._id}-${tag}`}
                            onClick={() => {
                              if (selectedTag === tag) {
                                setSelectedTag('');
                              } else {
                                setSelectedTag(tag);
                                setPage(1); // Reset to first page when filtering
                              }
                            }}
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                backgroundColor: selectedTag === tag 
                                  ? modern2025Styles.colors.secondary 
                                  : 'rgba(99, 102, 241, 0.08)',
                                borderColor: modern2025Styles.colors.primary,
                                transform: 'scale(1.05)',
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }} data-testid={`post-content-${post._id}`}>
                      {post.content}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption" data-testid={`post-author-${post._id}`}>
                            {post.author.name}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption" data-testid={`post-date-${post._id}`}>
                            {format(new Date(post.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <VisibilityIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography 
                            variant="caption"
                            data-testid={`post-views-${post._id}`}
                          >
                            {post.views}
                          </Typography>
                        </Box>
                      </Stack>
                      
                      <Stack direction="row" spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            onClick={() => handleLike(post._id)}
                            color={post.isLikedByUser ? 'error' : 'default'}
                            data-testid={`like-button-${post._id}`}
                            sx={{
                              '&:hover': {
                                transform: 'scale(1.1)',
                              },
                              '& .MuiSvgIcon-root': {
                                fontSize: 24,
                              },
                            }}
                          >
                            {post.isLikedByUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                          </IconButton>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            data-testid={`like-count-${post._id}`}
                            sx={{ minWidth: 20, textAlign: 'center' }}
                          >
                            {post.likes?.length || 0}
                          </Typography>
                        </Box>
                        
                        {(post.canEdit || post.canDelete) && (
                          <Stack direction="row" spacing={0.5}>
                            {post.canEdit && (
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/posts/${post._id}/edit`)}
                                sx={{
                                  color: 'text.secondary',
                                  '&:hover': { 
                                    color: modern2025Styles.colors.primary,
                                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                            {post.canDelete && (
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(post._id)}
                                sx={{
                                  color: 'text.secondary',
                                  '&:hover': { 
                                    color: 'error.main',
                                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        )}

                        <ReportButton postId={post._id} />
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              size="large"
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: '8px',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    background: modern2025Styles.colors.primary,
                    '&:hover': {
                      background: modern2025Styles.colors.primary,
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  },
                },
              }}
            />
          </Box>
        )}
        </Container>
      </RealtimeBoardWrapper>
    </AppLayout>
  );
}
                sx={{ mb: 2 }}
              >
                タグ「#{selectedTag}」でフィルタリング中
              </Alert>
            )}
          
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              mb: 4,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid',
              borderColor: 'rgba(99, 102, 241, 0.08)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03)',
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="投稿を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      fontSize: '15px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.08)',
                        borderWidth: '1.5px',
                      },
                      '&:hover': {
                        backgroundColor: '#fafbfc',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                          borderWidth: '2px',
                        },
                      },
                    },
                    '& .MuiInputBase-input': {
                      padding: '14px',
                      fontWeight: 500,
                      color: modern2025Styles.colors.text.primary,
                      '&::placeholder': {
                        color: modern2025Styles.colors.text.secondary,
                        opacity: 0.6,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5 }}>
                        <SearchIcon sx={{ color: modern2025Styles.colors.text.secondary }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={() => setSearchQuery('')}
                          sx={{ 
                            '&:hover': { 
                              backgroundColor: 'rgba(0, 0, 0, 0.04)' 
                            } 
                          }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel 
                    sx={{ 
                      backgroundColor: 'white',
                      px: 0.5,
                      '&.Mui-focused': {
                        color: modern2025Styles.colors.primary,
                      },
                    }}
                  >
                    カテゴリー
                  </InputLabel>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    label="カテゴリー"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: '12px',
                          mt: 1,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        },
                      },
                    }}
                    sx={{
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      fontSize: '15px',
                      '& .MuiSelect-select': {
                        padding: '14px',
                        fontWeight: 500,
                        color: modern2025Styles.colors.text.primary,
                      },
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.08)',
                        borderWidth: '1.5px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      },
                      '&:hover': {
                        backgroundColor: '#fafbfc',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiSelect-icon': {
                        color: modern2025Styles.colors.text.secondary,
                        transition: 'transform 0.3s',
                      },
                      '&.Mui-expanded .MuiSelect-icon': {
                        transform: 'rotate(180deg)',
                      },
                    }}
                  >
                    <MenuItem value="all" sx={{ py: 1.5, fontWeight: 500 }}>すべて</MenuItem>
                    <MenuItem value="general" sx={{ py: 1.5 }}>一般</MenuItem>
                    <MenuItem value="tech" sx={{ py: 1.5 }}>技術</MenuItem>
                    <MenuItem value="question" sx={{ py: 1.5 }}>質問</MenuItem>
                    <MenuItem value="discussion" sx={{ py: 1.5 }}>議論</MenuItem>
                    <MenuItem value="announcement" sx={{ py: 1.5 }}>お知らせ</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel 
                    sx={{ 
                      backgroundColor: 'white',
                      px: 0.5,
                      '&.Mui-focused': {
                        color: modern2025Styles.colors.primary,
                      },
                    }}
                  >
                    並び順
                  </InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="並び順"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: '12px',
                          mt: 1,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        },
                      },
                    }}
                    sx={{
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      fontSize: '15px',
                      '& .MuiSelect-select': {
                        padding: '14px',
                        fontWeight: 500,
                        color: modern2025Styles.colors.text.primary,
                      },
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.08)',
                        borderWidth: '1.5px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      },
                      '&:hover': {
                        backgroundColor: '#fafbfc',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                        },
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                        '& fieldset': {
                          borderColor: modern2025Styles.colors.primary,
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiSelect-icon': {
                        color: modern2025Styles.colors.text.secondary,
                        transition: 'transform 0.3s',
                      },
                      '&.Mui-expanded .MuiSelect-icon': {
                        transform: 'rotate(180deg)',
                      },
                    }}
                  >
                    <MenuItem value="-createdAt" sx={{ py: 1.5, fontWeight: 500 }}>新しい順</MenuItem>
                    <MenuItem value="createdAt" sx={{ py: 1.5 }}>古い順</MenuItem>
                    <MenuItem value="-views" sx={{ py: 1.5 }}>閲覧数順</MenuItem>
                    <MenuItem value="-likes" sx={{ py: 1.5 }}>いいね順</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/posts/new')}
                  data-testid="new-post-button"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '15px',
                    padding: '12px 24px',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
                    },
                    '& .MuiButton-startIcon': {
                      mr: 1,
                    },
                  }}
                >
                  新規投稿
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={3}>
            {[...Array(3)].map((_, index) => (
              <Grid item xs={12} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="80%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : posts.length === 0 ? (
          <Paper 
            elevation={0}
            sx={{ 
              p: 6, 
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              background: 'white',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              投稿がありません
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/posts/new')}
              sx={{ mt: 2 }}
            >
              最初の投稿を作成
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {posts.map((post) => (
              <Grid item xs={12} key={post._id}>
                <Card
                  elevation={0}
                  sx={{
                    position: 'relative',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: 'divider',
                    background: 'white',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: post.isNew ? 'pulse 1s ease-in-out' : 'none',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.08)',
                      borderColor: modern2025Styles.colors.primary,
                    },
                    '@keyframes pulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.7)' },
                      '70%': { boxShadow: '0 0 0 10px rgba(102, 126, 234, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(102, 126, 234, 0)' },
                    },
                  }}
                  data-testid={`post-card-${post._id}`}
                >
                  {post.isNew && (
                    <Chip
                      icon={<NewReleasesIcon />}
                      label="新着"
                      color="error"
                      size="small"
                      sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
                    />
                  )}
                  
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom data-testid={`post-title-${post._id}`}>
                        {post.title}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          label={post.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                          data-testid={`post-category-${post._id}`}
                        />
                        {post.tags && post.tags.length > 0 && post.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={`#${tag}`}
                            size="small"
                            variant={selectedTag === tag ? "filled" : "outlined"}
                            color={selectedTag === tag ? "secondary" : "default"}
                            data-testid={`post-tag-${post._id}-${tag}`}
                            onClick={() => {
                              if (selectedTag === tag) {
                                setSelectedTag('');
                              } else {
                                setSelectedTag(tag);
                                setPage(1); // Reset to first page when filtering
                              }
                            }}
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                backgroundColor: selectedTag === tag 
                                  ? modern2025Styles.colors.secondary 
                                  : 'rgba(99, 102, 241, 0.08)',
                                borderColor: modern2025Styles.colors.primary,
                                transform: 'scale(1.05)',
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }} data-testid={`post-content-${post._id}`}>
                      {post.content}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption" data-testid={`post-author-${post._id}`}>
                            {post.author.name}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption" data-testid={`post-date-${post._id}`}>
                            {format(new Date(post.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <VisibilityIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography 
                            variant="caption"
                            data-testid={`post-views-${post._id}`}
                          >
                            {post.views}
                          </Typography>
                        </Box>
                      </Stack>
                      
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          onClick={() => handleLike(post._id)}
                          color={post.isLikedByUser ? 'error' : 'default'}
                          data-testid={`like-button-${post._id}`}
                        >
                          <Badge 
                            badgeContent={post.likes?.length || 0} 
                            color="error"
                            data-testid={`like-count-${post._id}`}
                          >
                            {post.isLikedByUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                          </Badge>
                        </IconButton>
                        
                        {post.canEdit && (
                          <IconButton
                            onClick={() => router.push(`/posts/${post._id}/edit`)}
                            color="primary"
                            data-testid={`edit-button-${post._id}`}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        
                        {post.canDelete && (
                          <IconButton
                            onClick={() => handleDelete(post._id)}
                            color="error"
                            data-testid={`delete-button-${post._id}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                        
                        {!post.canEdit && !post.canDelete && (
                          <ReportButton postId={post._id} />
                        )}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              size="large"
            />
          </Box>
        )}
        </Container>
      </RealtimeBoardWrapper>
    </AppLayout>
  );
}