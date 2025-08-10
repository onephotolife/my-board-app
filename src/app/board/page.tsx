'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // ログアウト処理
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  // 投稿一覧を取得
  const fetchPosts = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts?page=${page}&limit=10`);
      if (!response.ok) throw new Error('投稿の取得に失敗しました');
      
      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch {
      setError('投稿の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 新規投稿/編集ダイアログを開く
  const handleOpenDialog = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        content: post.content,
      });
    } else {
      setEditingPost(null);
      setFormData({ title: '', content: '' });
    }
    setOpenDialog(true);
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPost(null);
    setFormData({ title: '', content: '' });
  };

  // 投稿を保存（リアルタイム更新対応）
  const handleSave = async () => {
    try {
      const url = editingPost
        ? `/api/posts/${editingPost._id}`
        : '/api/posts';
      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('保存に失敗しました');
      
      const savedPost = await response.json();
      
      // リアルタイム更新
      if (editingPost) {
        // 編集の場合
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === savedPost._id ? savedPost : post
          )
        );
      } else {
        // 新規投稿の場合（先頭に追加）
        setPosts(prevPosts => [savedPost, ...prevPosts]);
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      }

      handleCloseDialog();
    } catch {
      setError('保存に失敗しました');
    }
  };

  // 投稿を削除（リアルタイム更新対応）
  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('削除に失敗しました');
      
      // リアルタイム削除
      setPosts(prevPosts => prevPosts.filter(post => post._id !== id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
    } catch {
      setError('削除に失敗しました');
    }
  };

  // ページ変更
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    fetchPosts(value);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          掲示板
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            新規投稿
          </Button>
          {session && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3}>
        <List>
          {posts.map((post, index) => (
            <Box key={post._id}>
              {index > 0 && <Divider />}
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  post.author === session?.user?.id && (
                    <Box>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleOpenDialog(post)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDelete(post._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Typography variant="h6" component="div">
                      {post.title}
                    </Typography>
                  }
                  secondary={
                    <Box component="span">
                      <Typography
                        sx={{ display: 'inline' }}
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {post.authorName}
                      </Typography>
                      {' — '}
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {new Date(post.createdAt).toLocaleString('ja-JP')}
                      </Typography>
                      <Box
                        component="div"
                        sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
                      >
                        <Typography variant="body1">
                          {post.content}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            </Box>
          ))}
        </List>
        
        {pagination.totalPages > 1 && (
          <Box display="flex" justifyContent="center" p={2}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {/* 投稿作成/編集ダイアログ */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPost ? '投稿を編集' : '新規投稿'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="タイトル"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="内容"
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.title || !formData.content}
          >
            {editingPost ? '更新' : '投稿'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}