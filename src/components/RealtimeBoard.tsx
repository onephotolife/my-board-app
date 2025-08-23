'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
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
  FiberManualRecord as FiberManualRecordIcon,
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
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTag, setSelectedTag] = useState('');
  const { socket, isConnected } = useSocket();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const fetchDataRef = useRef<(() => void) | null>(null);

  // モバイル対応の設定スタイル（統一）
  const modern2025Styles = {
    colors: {
      primary: '#6366f1',
      secondary: '#ec4899',
      accent: '#14b8a6',
      warning: '#f59e0b',
      danger: '#ef4444',
      dark: '#1e293b',
      light: '#f8fafc',
      text: {
        primary: '#1e293b',
        secondary: '#64748b',
        muted: '#94a3b8',
      },
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      accent: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  };

  // API呼び出し関数
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (category !== 'all') params.append('category', category);
      if (selectedTag) params.append('tag', selectedTag);
      params.append('sort', sortBy);
      params.append('page', page.toString());
      params.append('limit', '10');
      
      const response = await fetch(`/api/posts?${params}`);
      
      if (!response.ok) {
        throw new Error('投稿の取得に失敗しました');
      }
      
      const data = await response.json();
      setPosts(data.posts || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err.message : '投稿の取得に失敗しました');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, category, sortBy, page, selectedTag]);

  // fetchDataRefを更新
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // 初回読み込みとフィルタ変更時の処理
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 検索クエリのデバウンス処理
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1); // 検索時はページを1にリセット
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Socket.IOのイベントリスナー設定
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePostCreated = (newPost: Post) => {
      console.log('New post received:', newPost);
      // 新しい投稿を最初に追加（新着フラグ付き）
      setPosts(prevPosts => [{ ...newPost, isNew: true }, ...prevPosts.filter(p => p._id !== newPost._id)]);
      
      // 3秒後に新着フラグを削除
      setTimeout(() => {
        setPosts(prevPosts => 
          prevPosts.map(p => p._id === newPost._id ? { ...p, isNew: false } : p)
        );
      }, 3000);
    };

    const handlePostUpdated = (updatedPost: Post) => {
      console.log('Post updated:', updatedPost);
      setPosts(prevPosts => 
        prevPosts.map(p => p._id === updatedPost._id ? updatedPost : p)
      );
    };

    const handlePostDeleted = (deletedPostId: string) => {
      console.log('Post deleted:', deletedPostId);
      setPosts(prevPosts => prevPosts.filter(p => p._id !== deletedPostId));
    };

    const handlePostLiked = ({ postId, userId, likes }: { postId: string; userId: string; likes: string[] }) => {
      console.log('Post liked:', { postId, userId, likes });
      setPosts(prevPosts => 
        prevPosts.map(p => {
          if (p._id === postId) {
            return {
              ...p,
              likes,
              isLikedByUser: session?.user?.id ? likes.includes(session.user.id) : false
            };
          }
          return p;
        })
      );
    };

    const handlePostUnliked = ({ postId, userId, likes }: { postId: string; userId: string; likes: string[] }) => {
      console.log('Post unliked:', { postId, userId, likes });
      setPosts(prevPosts => 
        prevPosts.map(p => {
          if (p._id === postId) {
            return {
              ...p,
              likes,
              isLikedByUser: session?.user?.id ? likes.includes(session.user.id) : false
            };
          }
          return p;
        })
      );
    };

    const handleViewsIncremented = ({ postId, views }: { postId: string; views: number }) => {
      console.log('Views incremented:', { postId, views });
      setPosts(prevPosts => 
        prevPosts.map(p => p._id === postId ? { ...p, views } : p)
      );
    };

    // Socket.IOイベントリスナーの登録
    socket.on('post:created', handlePostCreated);
    socket.on('post:updated', handlePostUpdated);
    socket.on('post:deleted', handlePostDeleted);
    socket.on('post:liked', handlePostLiked);
    socket.on('post:unliked', handlePostUnliked);
    socket.on('post:views-incremented', handleViewsIncremented);

    // 現在のページに参加
    socket.emit('join:board');

    // クリーンアップ
    return () => {
      socket.off('post:created', handlePostCreated);
      socket.off('post:updated', handlePostUpdated);
      socket.off('post:deleted', handlePostDeleted);
      socket.off('post:liked', handlePostLiked);
      socket.off('post:unliked', handlePostUnliked);
      socket.off('post:views-incremented', handleViewsIncremented);
      socket.emit('leave:board');
    };
  }, [socket, isConnected, session?.user?.id]);

  // 投稿削除ハンドラー
  const handleDelete = async (postId: string) => {
    if (!confirm('この投稿を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Socket.IOで他のクライアントに通知される
        setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('投稿の削除に失敗しました');
    }
  };

  // いいねハンドラー
  const handleLike = async (postId: string) => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    try {
      const post = posts.find(p => p._id === postId);
      if (!post) return;

      const isLiked = post.isLikedByUser;
      const endpoint = isLiked 
        ? `/api/posts/${postId}/unlike`
        : `/api/posts/${postId}/like`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'いいねの処理に失敗しました');
      }

      const data = await response.json();
      
      // 楽観的UI更新
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p._id === postId 
            ? { ...p, likes: data.likes, isLikedByUser: !isLiked }
            : p
        )
      );
    } catch (err) {
      console.error('Error toggling like:', err);
      alert(err instanceof Error ? err.message : 'いいねの処理に失敗しました');
    }
  };

  return (
    <AppLayout>
      <RealtimeBoardWrapper>
        <Container maxWidth="lg" sx={{ 
          py: { xs: 2, md: 4 },
          px: { xs: 2, sm: 3, md: 4 }
        }}>
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              background: modern2025Styles.gradients.primary,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            掲示板
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            リアルタイムで更新される投稿一覧
          </Typography>
          
          {isConnected ? (
            <Chip 
              icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />}
              label="リアルタイム接続中" 
              color="success" 
              size="small"
              sx={{ 
                mb: 2,
                '& .MuiChip-icon': {
                  color: '#22c55e',
                },
              }}
            />
          ) : (
            <Chip 
              icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />}
              label="接続中..." 
              color="default" 
              size="small"
              sx={{ 
                mb: 2,
                '& .MuiChip-icon': {
                  color: '#94a3b8',
                },
              }}
            />
          )}
          
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
            p: { xs: 3, sm: 4 }, 
            mb: 4,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: '1px solid',
            borderColor: 'rgba(99, 102, 241, 0.08)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03)',
          }}
        >
          <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
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
                    fontSize: { xs: '14px', sm: '15px' },
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
                    padding: { xs: '12px', sm: '14px' },
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
                    fontSize: { xs: '14px', sm: '15px' },
                    '& .MuiSelect-select': {
                      padding: { xs: '12px', sm: '14px' },
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
                    fontSize: { xs: '14px', sm: '15px' },
                    '& .MuiSelect-select': {
                      padding: { xs: '12px', sm: '14px' },
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
                  fontSize: { xs: '14px', sm: '15px' },
                  padding: { xs: '10px 20px', sm: '12px 24px' },
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
                          color="default"
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
                          {post.isLikedByUser ? <FavoriteIcon sx={{ color: '#6b7280' }} /> : <FavoriteBorderIcon sx={{ color: '#6b7280' }} />}
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
