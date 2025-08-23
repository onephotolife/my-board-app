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
  IconButton,
  Alert,
  Stack,
  Tab,
  Tabs
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  PostAdd as PostAddIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import Sidebar from '@/components/Sidebar';

interface Post {
  _id: string;
  title?: string;
  content: string;
  author?: string | {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  views?: number;
  likes?: number;
  comments?: number;
  status?: 'published' | 'archived';
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

export default function MyPostsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      fetchMyPosts();
    }
  }, [status, router]);

  const fetchMyPosts = async () => {
    setLoading(true);
    try {
      // 専用のmy-postsエンドポイントを使用
      const response = await fetch('/api/posts/my-posts');
      if (response.ok) {
        const result = await response.json();
        const myPosts = result.data || [];
        
        // ダミーデータを追加
        if (myPosts.length === 0) {
          myPosts.push(
            {
              _id: '1',
              title: 'はじめての投稿',
              content: 'これは私の最初の投稿です。会員制掲示板を使い始めました！',
              author: session?.user?.name || session?.user?.email,
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              updatedAt: new Date(Date.now() - 86400000).toISOString(),
              views: 42,
              likes: 5,
              comments: 3,
              status: 'published'
            },
            {
              _id: '2',
              title: '技術的な質問',
              content: 'Next.jsのApp Routerについて詳しく教えてください。',
              author: session?.user?.name || session?.user?.email,
              createdAt: new Date(Date.now() - 172800000).toISOString(),
              updatedAt: new Date(Date.now() - 172800000).toISOString(),
              views: 28,
              likes: 2,
              comments: 5,
              status: 'published'
            }
          );
        }
        
        setPosts(myPosts);
      }
    } catch (error) {
      console.error('投稿の取得に失敗:', error);
    } finally {
      setLoading(false);
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
      
      if (response.ok) {
        setPosts(posts.filter(p => p._id !== postId));
        setDeleteSuccess(true);
        setTimeout(() => setDeleteSuccess(false), 3000);
      }
    } catch (error) {
      console.error('削除に失敗:', error);
    }
  };

  const getFilteredPosts = () => {
    switch (tabValue) {
      case 0: // すべて
        return posts;
      case 1: // 公開済み
        return posts.filter(p => p.status !== 'archived');
      case 2: // アーカイブ
        return posts.filter(p => p.status === 'archived');
      default:
        return posts;
    }
  };

  const filteredPosts = getFilteredPosts();

  if (status === 'loading') {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        pt: { xs: 8, md: 0 }  // モバイル時はAppBarの高さ分のpadding-topを追加（64px）
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Sidebar />
      <Box sx={{ 
        display: { xs: 'block', md: 'flex' },
        minHeight: '100vh', 
        bgcolor: '#f5f5f5'
      }}>
        <Box sx={{ 
          display: { xs: 'none', md: 'block' },
          width: 280,
          flexShrink: 0
        }} />
        
        <Box sx={{ 
          flex: 1,
          pt: { xs: 8, md: 0 },  // モバイル時はAppBarの高さ分のpadding-topを追加（64px）
          overflow: 'auto',
          width: '100%'
        }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                自分の投稿
              </Typography>
            </Box>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            あなたの投稿履歴を管理
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* 成功メッセージ */}
        {deleteSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            投稿を削除しました
          </Alert>
        )}

        {/* 統計情報 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {posts.length}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                総投稿数
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" gutterBottom>
                {posts.reduce((sum, p) => sum + (p.views || 0), 0)}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                総閲覧数
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {posts.reduce((sum, p) => sum + (p.likes || 0), 0)}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                総いいね数
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" gutterBottom>
                {posts.reduce((sum, p) => sum + (p.comments || 0), 0)}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                総コメント数
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* タブとフィルター */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
          >
            <Tab label={`すべて (${posts.length})`} />
            <Tab label={`公開済み (${posts.filter(p => p.status !== 'archived').length})`} />
            <Tab label={`アーカイブ (${posts.filter(p => p.status === 'archived').length})`} />
          </Tabs>
        </Paper>

        {/* 投稿一覧 */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }} color="text.secondary">
              投稿を読み込み中...
            </Typography>
          </Box>
        ) : filteredPosts.length > 0 ? (
          <Grid container spacing={3}>
            {filteredPosts.map((post) => (
              <Grid item xs={12} key={post._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          {post.title || '無題の投稿'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(post.createdAt)}
                          </Typography>
                          {post.status === 'archived' && (
                            <Chip label="アーカイブ" size="small" color="warning" />
                          )}
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          onClick={() => router.push(`/posts/${post._id}`)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => router.push(`/posts/${post._id}/edit`)}
                          color="default"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => handleDelete(post._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        mb: 2
                      }}
                    >
                      {post.content}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {post.views || 0} 閲覧
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ThumbUpIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {post.likes || 0} いいね
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CommentIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {post.comments || 0} コメント
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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
              startIcon={<PostAddIcon />}
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
      </Box>
      </Box>
    </>
  );
}