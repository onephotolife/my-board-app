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
  IconButton,
  Alert,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  PostAdd as PostAddIcon
} from '@mui/icons-material';
import AppLayout from '@/components/AppLayout';

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

// いいね機能削除

export default function MyPostsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
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

  const filteredPosts = posts;

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
    <AppLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* ページヘッダー */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            マイ投稿
          </Typography>
          <Typography variant="body1" color="text.secondary">
            あなたの投稿履歴を管理
          </Typography>
        </Box>
        {/* 成功メッセージ */}
        {deleteSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            投稿を削除しました
          </Alert>
        )}

        {/* 統計情報 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary" gutterBottom>
                {posts.length}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                総投稿数
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
    </AppLayout>
  );
}