'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
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
  Pagination,
  CircularProgress,
  Alert,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EnhancedPostCard from '@/components/EnhancedPostCard';

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

  // 投稿一覧を取得（認証必須）
  const fetchPosts = async (page: number = 1) => {
    setLoading(true);
    setError('');
    
    try {
      // キャッシュを無効化してリアルタイムデータを取得
      const timestamp = Date.now();
      const response = await fetch(`/api/posts?page=${page}&limit=10&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const data = await response.json();
      
      if (data.requireAuth) {
        // 認証が必要な場合
        console.log('認証が必要です');
        setError('この掲示板は会員限定です。ログインしてください。');
        setPosts([]);
        return;
      }
      
      if (data.error && response.status === 500) {
        throw new Error(data.error);
      }
      
      console.log(`投稿取得成功: ${data.posts?.length || 0}件`);
      setPosts(data.posts || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError('投稿の読み込みに失敗しました');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // セッションストレージにデータを保存
  useEffect(() => {
    if (posts.length > 0) {
      sessionStorage.setItem('boardPosts', JSON.stringify({
        posts,
        timestamp: Date.now(),
        pagination,
      }));
    }
  }, [posts, pagination]);

  // 初回ロード時にセッションストレージから復元
  useEffect(() => {
    const cached = sessionStorage.getItem('boardPosts');
    if (cached) {
      const { posts: cachedPosts, timestamp, pagination: cachedPagination } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      // 5分以内のキャッシュは使用
      if (age < 5 * 60 * 1000) {
        setPosts(cachedPosts);
        setPagination(cachedPagination);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // 認証状態が確定してから投稿を取得
    if (status === 'loading') {
      console.log('認証状態を確認中...');
      return;
    }
    
    if (status === 'unauthenticated') {
      console.log('未認証状態');
      setError('ログインが必要です');
      setLoading(false);
      return;
    }
    
    if (status === 'authenticated') {
      console.log('認証済み、投稿を取得します');
      fetchPosts();
    }
  }, [status]);

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
        cache: 'no-store',
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
        
        // 確実にするため、少し遅れて再取得
        setTimeout(() => {
          fetchPosts(1);
        }, 500);
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

  return (
    <AuthGuard>
      <Container 
        maxWidth="md" 
        sx={{ 
          mt: 4, 
          mb: 4,
          position: 'relative',
          zIndex: 1,
          isolation: 'isolate',
        }}
        id="board-content"
        className="board-container"
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress size={60} />
          </Box>
        ) : posts.length === 0 ? (
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              まだ投稿がありません
            </Typography>
            <Typography variant="body2" color="text.secondary">
              最初の投稿を作成してみましょう！
            </Typography>
          </Paper>
        ) : (
          <Box>
            {posts.map((post) => (
              <EnhancedPostCard
                key={post._id}
                post={post}
                currentUserId={session?.user?.id}
                onEdit={handleOpenDialog}
                onDelete={handleDelete}
              />
            ))}
          </Box>
        )}
        
        {pagination.totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              size="large"
            />
          </Box>
        )}

        {/* FABボタン（モバイル用） */}
        {session && (
          <Fab
            color="primary"
            aria-label="add"
            onClick={() => handleOpenDialog()}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
            }}
          >
            <AddIcon />
          </Fab>
        )}
        
        {/* 投稿作成/編集ダイアログ */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="sm" 
          fullWidth
          disableRestoreFocus
          PaperProps={{
            sx: { borderRadius: 2 },
            role: 'dialog',
            'aria-labelledby': 'post-dialog-title',
            'aria-describedby': 'post-dialog-description',
          }}
        >
          <DialogTitle id="post-dialog-title">
            {editingPost ? '投稿を編集' : '新規投稿'}
          </DialogTitle>
          <DialogContent id="post-dialog-description">
            <TextField
              autoFocus
              margin="dense"
              label="タイトル"
              fullWidth
              variant="outlined"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
              inputProps={{
                'aria-label': 'タイトル',
              }}
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
              inputProps={{ 
                maxLength: 500,
                'aria-label': '内容',
              }}
              helperText={`${formData.content.length}/500文字`}
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
    </AuthGuard>
  );
}