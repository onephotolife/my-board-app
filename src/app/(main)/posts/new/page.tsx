'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  FormHelperText
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';

export default function NewPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  const [validation, setValidation] = useState({
    title: '',
    content: ''
  });

  // 未認証の場合
  if (status === 'unauthenticated') {
    router.push('/auth/signin?callbackUrl=/posts/new');
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
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          author: session?.user?.name || session?.user?.email || 'Anonymous'
        }),
      });
      
      if (!response.ok) {
        throw new Error('投稿の作成に失敗しました');
      }
      
      const data = await response.json();
      
      // 成功したら投稿詳細ページまたは一覧ページへリダイレクト
      router.push('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : '投稿の作成中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  if (status === 'loading') {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreateIcon fontSize="large" />
          新規投稿作成
        </Typography>
        <Typography variant="body2" color="text.secondary">
          新しい投稿を作成して共有しましょう
        </Typography>
      </Paper>

      {/* エラーメッセージ */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 投稿フォーム */}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                required
                multiline
                rows={10}
                placeholder="投稿内容を入力してください..."
              />
            </Box>

            {/* 投稿者情報 */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                投稿者: {session?.user?.name || session?.user?.email || 'Anonymous'}
              </Typography>
            </Box>

            {/* アクションボタン */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={isSubmitting}
                startIcon={<CancelIcon />}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
              >
                {isSubmitting ? '投稿中...' : '投稿する'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 投稿ガイドライン */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          投稿ガイドライン
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • タイトルは簡潔で内容がわかりやすいものにしましょう
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • 他のユーザーを尊重し、建設的な内容を心がけましょう
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • 個人情報や機密情報は投稿しないでください
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • 不適切な内容は削除される場合があります
        </Typography>
      </Paper>
    </Container>
  );
}