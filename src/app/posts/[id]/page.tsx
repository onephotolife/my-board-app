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
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
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
  Comment as CommentIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Visibility as VisibilityIcon,
  Send as SendIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

interface Post {
  _id: string;
  title?: string;
  content: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  content: string;
  author: string;
  createdAt: string;
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

export default function PostDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated' && postId) {
      fetchPost();
      // 仮のコメントデータ
      setComments([
        {
          _id: '1',
          content: 'この投稿とても参考になりました！',
          author: 'ユーザー1',
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          content: '私も同じ意見です。素晴らしい内容ですね。',
          author: 'ユーザー2',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
    }
  }, [status, postId, router]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
        setEditContent(data.content);
        setEditTitle(data.title || '');
      } else if (response.status === 404) {
        setError('投稿が見つかりません');
      } else {
        setError('投稿の取得に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/board');
      } else {
        setError('投稿の削除に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    }
    setDeleteDialogOpen(false);
  };

  const handleEdit = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });
      
      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setEditDialogOpen(false);
      } else {
        setError('投稿の更新に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    }
  };

  const handleLike = () => {
    setLiked(!liked);
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

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    
    setSubmittingComment(true);
    // コメント投稿のAPI実装（仮）
    const newComment: Comment = {
      _id: Date.now().toString(),
      content: commentText,
      author: session?.user?.name || session?.user?.email || '匿名',
      createdAt: new Date().toISOString()
    };
    
    setComments([newComment, ...comments]);
    setCommentText('');
    setSubmittingComment(false);
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

  const isAuthor = post.author === session?.user?.name || post.author === session?.user?.email;

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
                <IconButton onClick={() => setEditDialogOpen(true)}>
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
                {post.author?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {post.author || '匿名ユーザー'}
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

          {/* タイトル */}
          {post.title && (
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              {post.title}
            </Typography>
          )}

          {/* 内容 */}
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 4 }}>
            {post.content}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* アクションボタン */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              startIcon={liked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
              onClick={handleLike}
              variant={liked ? 'contained' : 'outlined'}
              size="small"
            >
              いいね {liked ? 1 : 0}
            </Button>
            <Button
              startIcon={<CommentIcon />}
              variant="outlined"
              size="small"
            >
              コメント {comments.length}
            </Button>
            <IconButton onClick={handleBookmark}>
              {bookmarked ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
            </IconButton>
            <IconButton onClick={handleShare}>
              <ShareIcon />
            </IconButton>
          </Stack>
        </Paper>

        {/* コメントセクション */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              コメント ({comments.length})
            </Typography>
            
            {/* コメント入力 */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="コメントを入力..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                variant="outlined"
              />
              <Button
                variant="contained"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || submittingComment}
                sx={{
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                  alignSelf: 'flex-end'
                }}
              >
                <SendIcon />
              </Button>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* コメント一覧 */}
            {comments.length > 0 ? (
              <List>
                {comments.map((comment, index) => (
                  <div key={comment._id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          {comment.author[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {comment.author}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(comment.createdAt)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {comment.content}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < comments.length - 1 && <Divider variant="inset" component="li" />}
                  </div>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                まだコメントがありません
              </Typography>
            )}
          </CardContent>
        </Card>
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

      {/* 編集ダイアログ */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>投稿を編集</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="タイトル"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={10}
            label="内容"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleEdit} variant="contained">
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}