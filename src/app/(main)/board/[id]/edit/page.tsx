'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';

export default function EditPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${params.id}`);
        if (!response.ok) {
          throw new Error('投稿が見つかりません');
        }
        const post = await response.json();

        // 権限チェック
        if (!post.canEdit) {
          setError('編集権限がありません');
          setTimeout(() => router.push('/board'), 2000);
          return;
        }

        setFormData({
          title: post.title,
          content: post.content,
          tags: post.tags || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '投稿の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      setError('ログインが必要です');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          tags: formData.tags,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '投稿の更新に失敗しました');
      }

      // 成功したら一覧ページへ
      router.push('/board');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput],
      });
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToDelete),
    });
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          href="/board"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          掲示板に戻る
        </Button>
        <Typography variant="h4" component="h1">
          投稿を編集
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="タイトル"
            fullWidth
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            inputProps={{ maxLength: 100 }}
            helperText={`${formData.title.length}/100文字`}
            sx={{ mb: 3 }}
          />

          <TextField
            label="本文"
            fullWidth
            required
            multiline
            rows={10}
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            inputProps={{ maxLength: 1000 }}
            helperText={`${formData.content.length}/1000文字`}
            sx={{ mb: 3 }}
          />

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="タグを追加"
                size="small"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button onClick={handleAddTag} variant="outlined">
                追加
              </Button>
            </Box>
            {formData.tags.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleDeleteTag(tag)}
                    size="small"
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              component={Link}
              href="/board"
              variant="outlined"
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !formData.title || !formData.content}
            >
              {saving ? '更新中...' : '更新する'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}