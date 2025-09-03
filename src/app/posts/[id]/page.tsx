'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Avatar,
  Divider,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Share as ShareIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Bookmark as BookmarkIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

import { useCSRFContext } from '@/components/CSRFProvider';

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


// カテゴリー定数
const CATEGORIES = {
  general: '一般',
  tech: '技術',
  question: '質問',
  discussion: '議論',
  announcement: 'お知らせ',
} as const;

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

export default function PostDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { token: csrfToken } = useCSRFContext();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [likingPost, setLikingPost] = useState(false);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated' && postId) {
      fetchPost();
    }
  }, [status, postId, router]);

  const fetchPost = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/posts/${postId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('投稿が見つかりません');
          return;
        }
        throw new Error('投稿の取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPost(data.data);
      } else {
        throw new Error(data.error?.message || '投稿の取得に失敗しました');
      }
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError(err instanceof Error ? err.message : '投稿の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken || ''
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        router.push('/board');
      } else {
        setError(data.error?.message || '投稿の削除に失敗しました');
      }
    } catch (err) {
      console.error('投稿削除エラー:', err);
      setError('ネットワークエラーが発生しました');
    }
    setDeleteDialogOpen(false);
  };

  const handleLike = async () => {
    if (!post || likingPost) return;
    
    setLikingPost(true);
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle_like'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 投稿データを更新
        setPost(prevPost => {
          if (!prevPost) return null;
          return {
            ...prevPost,
            likes: data.data.isLiked 
              ? [...(prevPost.likes || []).filter(id => id !== session?.user?.id), session?.user?.id || '']
              : (prevPost.likes || []).filter(id => id !== session?.user?.id),
            isLikedByUser: data.data.isLiked
          };
        });
      } else {
        console.error('いいね処理エラー:', data.error?.message);
      }
    } catch (err) {
      console.error('いいね処理エラー:', err);
    } finally {
      setLikingPost(false);
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title || '掲示板の投稿',
        text: post?.content.substring(0, 100) + '...',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('リンクをコピーしました');
    }
  };


  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => router.push('/board')} sx={{ mt: 2 }}>
          掲示板に戻る
        </Button>
      </Container>
    );
  }

  if (!post) {
    return null;
  }

  const isAuthor = post.canEdit || false;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* ヘッダー */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', mb: 4 }}>
        <Container maxWidth="md">
          <Box sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton onClick={() => router.push('/board')}>
              <ArrowBackIcon />
            </IconButton>
            {isAuthor && (
              <Stack direction="row" spacing={1}>
                <IconButton onClick={() => router.push(`/posts/${postId}/edit`)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => setDeleteDialogOpen(true)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Stack>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md">
        {/* 投稿本文 */}
        <Paper sx={{ p: 4, mb: 4 }}>
          {/* 投稿者情報 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                {post.author.name[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {post.author.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(post.createdAt)}
                    </Typography>
                  </Box>
                  {post.updatedAt !== post.createdAt && (
                    <Typography variant="caption" color="text.secondary">
                      （編集済み）
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* カテゴリーとタグ */}
          <Box sx={{ mb: 2 }}>
            <Chip
              label={CATEGORIES[post.category]}
              size="small"
              color={post.category === 'announcement' ? 'error' : post.category === 'tech' ? 'primary' : 'default'}
              sx={{ mr: 1 }}
              data-testid={`post-detail-category-${post._id}`}
            />
            {post.tags && post.tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                variant="outlined"
                sx={{ mr: 1 }}
                data-testid={`post-detail-tag-${post._id}-${tag}`}
              />
            ))}
          </Box>

          {/* タイトル */}
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            {post.title}
          </Typography>

          {/* 内容 */}
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 4 }}>
            {post.content}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* 統計情報 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, color: 'text.secondary' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VisibilityIcon sx={{ fontSize: 18 }} />
              <Typography 
                variant="body2"
                data-testid={`post-detail-views-${post._id}`}
              >
                {post.views} 閲覧
              </Typography>
            </Box>
          </Box>

          {/* アクションボタン */}
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={handleBookmark}>
              {bookmarked ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
            </IconButton>
            <IconButton onClick={handleShare}>
              <ShareIcon />
            </IconButton>
          </Stack>
        </Paper>

      </Container>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>投稿を削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            この操作は取り消せません。本当に削除してもよろしいですか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}