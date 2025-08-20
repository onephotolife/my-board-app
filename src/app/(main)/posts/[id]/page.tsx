'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import AuthGuard from '@/components/AuthGuard';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
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

export default function PostDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 投稿を取得
  const fetchPost = async () => {
    if (!postId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('投稿が見つかりません');
        }
        throw new Error('投稿の取得に失敗しました');
      }
      
      const data = await response.json();
      setPost(data);
      setIsLiked(data.likes?.includes(session?.user?.id) || false);
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError(err instanceof Error ? err.message : '投稿の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  // いいねの切り替え
  const handleLikeToggle = async () => {
    if (!post || !session) return;
    
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('いいねの更新に失敗しました');
      }
      
      const data = await response.json();
      // APIからの応答に基づいて状態を更新
      setIsLiked(data.isLiked);
      // いいね数を更新
      setPost(prev => {
        if (!prev) return null;
        return {
          ...prev,
          likes: data.isLiked 
            ? [...(prev.likes || []), session.user?.id || ''].filter(Boolean)
            : (prev.likes || []).filter(id => id !== session.user?.id),
          likeCount: data.likeCount
        };
      });
    } catch (err) {
      console.error('いいねエラー:', err);
      setError('いいねの更新に失敗しました');
    }
  };

  // 削除ダイアログを開く
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  // 削除をキャンセル
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  // 投稿を削除（確認後）
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }
      
      router.push('/posts');
    } catch (err) {
      console.error('削除エラー:', err);
      setError('投稿の削除に失敗しました');
      setDeleting(false);
    }
  };

  // 投稿を編集
  const handleEdit = () => {
    router.push(`/board?edit=${postId}`);
  };

  // 共有
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.content,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // クリップボードにコピー
      navigator.clipboard.writeText(window.location.href);
      alert('URLをクリップボードにコピーしました');
    }
  };

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

  if (loading) {
    return (
      <AuthGuard>
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress size={60} />
          </Box>
        </Container>
      </AuthGuard>
    );
  }

  if (error || !post) {
    return (
      <AuthGuard>
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || '投稿が見つかりません'}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/posts')}
          >
            投稿一覧に戻る
          </Button>
        </Container>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.back()}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="body1" color="text.secondary">
            投稿詳細
          </Typography>
        </Box>

        <Paper sx={{ p: 4 }}>
          {/* 著者情報 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                bgcolor: getAvatarColor(post.authorInfo?.name),
                width: 48,
                height: 48,
                mr: 2,
              }}
            >
              {(post.authorInfo?.name || '?')[0].toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {post.authorInfo?.name || '名無し'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(post.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                {post.updatedAt !== post.createdAt && ' (編集済み)'}
              </Typography>
            </Box>
            {post.canEdit && (
              <Stack direction="row" spacing={1}>
                <IconButton onClick={handleEdit}>
                  <EditIcon />
                </IconButton>
                <IconButton color="error" onClick={handleDeleteClick}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* タイトル */}
          <Typography variant="h4" component="h1" gutterBottom>
            {post.title}
          </Typography>

          {/* タグ */}
          {post.tags && post.tags.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
              {post.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          )}

          {/* 内容 */}
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              mb: 4,
              lineHeight: 1.8,
            }}
          >
            {post.content}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* アクションボタン */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={isLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
              onClick={handleLikeToggle}
              variant={isLiked ? 'contained' : 'outlined'}
              disabled={!session}
            >
              いいね ({post.likes?.length || 0})
            </Button>
            <Button
              startIcon={<ShareIcon />}
              onClick={handleShare}
              variant="outlined"
            >
              共有
            </Button>
          </Box>
        </Paper>
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
    </AuthGuard>
  );
}