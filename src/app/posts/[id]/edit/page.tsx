'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Skeleton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  const [validation, setValidation] = useState({
    title: '',
    content: ''
  });

  // 投稿データの取得
  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('投稿が見つかりません');
        }
        throw new Error('投稿の取得に失敗しました');
      }
      
      const data = await response.json();
      setPost(data);
      setFormData({
        title: data.title,
        content: data.content
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : '投稿の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 未認証の場合
  if (status === 'unauthenticated') {
    router.push(`/auth/signin?callbackUrl=/posts/${postId}/edit`);
    return null;
  }

  const validateForm = () => {
    const errors = {
      title: '',
      content: ''
    };
    
    if (!formData.title.trim()) {
      errors.title = 'タイトルを入力してください';
    } else if (formData.title.length > 100) {
      errors.title = 'タイトルは100文字以内で入力してください';
    }
    
    if (!formData.content.trim()) {
      errors.content = '内容を入力してください';
    } else if (formData.content.length > 500) {
      errors.content = '内容は500文字以内で入力してください';
    }
    
    setValidation(errors);
    return !errors.title && !errors.content;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
        }),
      });
      
      if (!response.ok) {
        throw new Error('投稿の更新に失敗しました');
      }
      
      setSuccessMessage('投稿を更新しました');
      
      // 1秒後にリダイレクト
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : '投稿の更新中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この投稿を削除してもよろしいですか？')) {
      return;
    }
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('投稿の削除に失敗しました');
      }
      
      router.push('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : '投稿の削除中にエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  if (status === 'loading' || isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  if (error && !post) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button sx={{ mt: 2 }} onClick={() => router.push('/')}>
          一覧へ戻る
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon fontSize="large" />
          投稿を編集
        </Typography>
        <Typography variant="body2" color="text.secondary">
          投稿内容を編集できます
        </Typography>
      </Paper>

      {/* メッセージ */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* 編集フォーム */}
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="タイトル"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  setValidation({ ...validation, title: '' });
                }}
                error={!!validation.title}
                helperText={validation.title || `${formData.title.length}/100文字`}
                disabled={isSubmitting || isDeleting}
                required
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="内容"
                value={formData.content}
                onChange={(e) => {
                  setFormData({ ...formData, content: e.target.value });
                  setValidation({ ...validation, content: '' });
                }}
                error={!!validation.content}
                helperText={validation.content || `${formData.content.length}/500文字`}
                disabled={isSubmitting || isDeleting}
                required
                multiline
                rows={10}
                placeholder="投稿内容を入力してください..."
              />
            </Box>

            {/* 投稿情報 */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                投稿者: {post?.author}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                作成日: {post && new Date(post.createdAt).toLocaleString('ja-JP')}
              </Typography>
              {post?.updatedAt && post.updatedAt !== post.createdAt && (
                <Typography variant="body2" color="text.secondary">
                  更新日: {new Date(post.updatedAt).toLocaleString('ja-JP')}
                </Typography>
              )}
            </Box>

            {/* アクションボタン */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
                startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
              >
                {isDeleting ? '削除中...' : '削除'}
              </Button>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={isSubmitting || isDeleting}
                  startIcon={<CancelIcon />}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting || isDeleting || !formData.title.trim() || !formData.content.trim()}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {isSubmitting ? '更新中...' : '更新する'}
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}