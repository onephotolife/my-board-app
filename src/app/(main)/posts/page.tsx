'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import AuthGuard from '@/components/AuthGuard';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorName?: string;
  authorEmail?: string;
  authorInfo?: {
    name: string;
    email: string;
    avatar?: string | null;
  };
  status: string;
  tags: string[];
  likes: string[];
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PostsListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);

  // 投稿一覧を取得
  const fetchPosts = async (page: number = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/posts?page=${page}&limit=12`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error('投稿の取得に失敗しました');
      }
      
      const data = await response.json();
      setPosts(data.posts || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
      });
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError('投稿の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 削除ダイアログを開く
  const handleDeleteClick = (id: string) => {
    setPostToDelete(id);
    setDeleteDialogOpen(true);
  };

  // 削除をキャンセル
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPostToDelete(null);
  };

  // 投稿を削除（確認後）
  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/posts/${postToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }
      
      // リストから削除
      setPosts(posts.filter(post => post._id !== postToDelete));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      
      // ダイアログを閉じる
      handleDeleteCancel();
    } catch (err) {
      console.error('削除エラー:', err);
      setError('投稿の削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  // 投稿を編集
  const handleEdit = (id: string) => {
    router.push(`/board?edit=${id}`);
  };

  // 投稿詳細を表示
  const handleViewPost = (id: string) => {
    router.push(`/posts/${id}`);
  };

  // 新規投稿ダイアログを閉じる
  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setFormData({ title: '', content: '' });
  };

  // 新規投稿を保存
  const handleSavePost = async () => {
    if (saving) return;
    
    try {
      if (!formData.title || !formData.content) {
        setError('タイトルと内容は必須です');
        return;
      }

      setSaving(true);
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }
      
      handleCloseCreateDialog();
      fetchPosts(1); // 投稿リストを更新
    } catch (error) {
      console.error('投稿の保存エラー:', error);
      setError(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // ページ変更
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    fetchPosts(value);
  };

  // フィルタリングされた投稿
  const filteredPosts = posts.filter(post => {
    const searchLower = searchTerm.toLowerCase();
    return (
      post.title?.toLowerCase().includes(searchLower) ||
      post.content?.toLowerCase().includes(searchLower) ||
      post.authorInfo?.name?.toLowerCase().includes(searchLower) ||
      post.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  // 著者アバターの色を取得
  const getAvatarColor = (name: string = '') => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7',
      '#3f51b5', '#2196f3', '#00bcd4', '#009688',
      '#4caf50', '#8bc34a', '#ff9800', '#ff5722',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <AuthGuard>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            投稿一覧
          </Typography>
          <Typography variant="body1" color="text.secondary">
            すべての投稿を閲覧・管理できます
          </Typography>
        </Box>

        {/* 検索・フィルター */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="投稿を検索..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="list">
                <ViewListIcon />
              </ToggleButton>
              <ToggleButton value="grid">
                <ViewModuleIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              onClick={() => setOpenCreateDialog(true)}
            >
              新規投稿
            </Button>
          </Box>
        </Paper>

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ローディング */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress size={60} />
          </Box>
        ) : filteredPosts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm ? '検索結果がありません' : '投稿がありません'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? '別のキーワードで検索してください' : '最初の投稿を作成してみましょう！'}
            </Typography>
          </Paper>
        ) : (
          <>
            {/* 投稿リスト/グリッド */}
            <Box
              sx={{
                display: viewMode === 'grid' ? 'grid' : 'block',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 3,
              }}
            >
              {filteredPosts.map((post) => (
                <Card
                  key={post._id}
                  sx={{
                    mb: viewMode === 'list' ? 2 : 0,
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  <CardContent onClick={() => handleViewPost(post._id)}>
                    {/* 著者情報 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: getAvatarColor(post.authorInfo?.name || post.authorName),
                          width: 32,
                          height: 32,
                          mr: 1,
                        }}
                      >
                        {(post.authorInfo?.name || post.authorName || '?')[0].toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {post.authorInfo?.name || post.authorName || '名無し'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(post.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                        </Typography>
                      </Box>
                      {post.canEdit && (
                        <Chip label="編集可" size="small" color="primary" variant="outlined" />
                      )}
                    </Box>

                    {/* タイトル */}
                    <Typography variant="h6" gutterBottom noWrap>
                      {post.title}
                    </Typography>

                    {/* 内容（プレビュー） */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: viewMode === 'grid' ? 3 : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 2,
                      }}
                    >
                      {post.content}
                    </Typography>

                    {/* タグ */}
                    {post.tags && post.tags.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                        {post.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ mb: 0.5 }}
                          />
                        ))}
                      </Stack>
                    )}

                    <Divider sx={{ my: 1 }} />

                    {/* 統計情報 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ThumbUpIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          {post.likes?.length || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CommentIcon fontSize="small" color="action" />
                        <Typography variant="caption">
                          0
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>

                  {/* アクションボタン */}
                  {post.canEdit && (
                    <CardActions>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(post._id);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(post._id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </CardActions>
                  )}
                </Card>
              ))}
            </Box>

            {/* ページネーション */}
            {pagination.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
      </Container>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="xs"
        fullWidth
        PaperProps={{
          style: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 2147483647,
          }
        }}
        sx={{
          '& .MuiBackdrop-root': {
            zIndex: 2147483646,
          },
        }}
      >
        <DialogTitle id="delete-dialog-title">
          投稿を削除しますか？
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            この操作は取り消すことができません。本当にこの投稿を削除してもよろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleDeleteCancel}
            disabled={deleting}
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新規投稿作成ダイアログ */}
      <Dialog 
        open={openCreateDialog} 
        onClose={handleCloseCreateDialog} 
        maxWidth="sm"
        fullWidth
        aria-labelledby="post-dialog-title"
        aria-describedby="post-dialog-description"
        PaperProps={{
          style: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            maxHeight: '90vh',
            width: '90%',
            maxWidth: '600px',
            zIndex: 2147483647,
          }
        }}
        sx={{
          '& .MuiBackdrop-root': {
            zIndex: 2147483646,
          },
        }}
      >
        <DialogTitle id="post-dialog-title">
          新規投稿
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
            sx={{ mb: 2, mt: 1 }}
            inputProps={{
              maxLength: 100,
              'aria-label': 'タイトル',
            }}
            helperText={`${formData.title.length}/100文字`}
            required
            error={formData.title.length > 100}
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
              maxLength: 1000,
              'aria-label': '内容',
            }}
            helperText={`${formData.content.length}/1000文字`}
            required
            error={formData.content.length > 1000}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseCreateDialog}>
            キャンセル
          </Button>
          <Button
            onClick={handleSavePost}
            variant="contained"
            disabled={!formData.title || !formData.content || saving}
          >
            {saving ? '保存中...' : '投稿'}
          </Button>
        </DialogActions>
      </Dialog>
    </AuthGuard>
  );
}