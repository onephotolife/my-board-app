'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Send as SendIcon,
  Cancel as CancelIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatQuote as FormatQuoteIcon,
  Code as CodeIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import AppLayout from '@/components/AppLayout';

export default function NewPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 認証チェック
  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // フロントエンドバリデーション
    const newValidationErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newValidationErrors.title = 'タイトルを入力してください';
    } else if (title.length > 100) {
      newValidationErrors.title = 'タイトルは100文字以内で入力してください';
    }
    
    if (!content.trim()) {
      newValidationErrors.content = '本文を入力してください';
    } else if (content.length > 1000) {
      newValidationErrors.content = '本文は1000文字以内で入力してください';
    }
    
    if (tags.length > 5) {
      newValidationErrors.tags = 'タグは最大5個までです';
    }
    
    if (Object.keys(newValidationErrors).length > 0) {
      setValidationErrors(newValidationErrors);
      return;
    }

    setLoading(true);
    setError('');
    setValidationErrors({});
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          tags: tags.filter(tag => tag.trim()),
          status: 'published'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/board');
        }, 1500);
      } else {
        if (data.error?.details && typeof data.error.details === 'object') {
          setValidationErrors(data.error.details);
        } else {
          setError(data.error?.message || '投稿の作成に失敗しました');
        }
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag) && tags.length < 5 && newTag.length <= 20) {
      setTags([...tags, newTag]);
      setTagInput('');
      setValidationErrors(prev => ({ ...prev, tags: '' }));
    } else if (newTag.length > 20) {
      setValidationErrors(prev => ({ ...prev, tags: 'タグは20文字以内で入力してください' }));
    } else if (tags.length >= 5) {
      setValidationErrors(prev => ({ ...prev, tags: 'タグは最大5個までです' }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleCancel = () => {
    if (content || title) {
      const confirmed = window.confirm('入力内容が失われますが、よろしいですか？');
      if (confirmed) {
        router.push('/board');
      }
    } else {
      router.push('/board');
    }
  };

  const insertFormat = (format: string) => {
    const textarea = document.getElementById('content-input') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newText = '';
    switch (format) {
      case 'bold':
        newText = `**${selectedText || 'テキスト'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'テキスト'}*`;
        break;
      case 'list':
        newText = `\n- ${selectedText || 'リスト項目'}`;
        break;
      case 'quote':
        newText = `\n> ${selectedText || '引用文'}`;
        break;
      case 'code':
        newText = `\`${selectedText || 'コード'}\``;
        break;
      case 'link':
        newText = `[${selectedText || 'リンクテキスト'}](URL)`;
        break;
      default:
        return;
    }
    
    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
    
    // カーソル位置を調整
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + newText.length, start + newText.length);
    }, 0);
  };

  return (
    <AppLayout>
      <Box sx={{ 
        py: { xs: 2, md: 4 },
        px: { xs: 2, sm: 3, md: 4 }
      }}>
        <Container maxWidth="md">
          {/* ヘッダー */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                新規投稿
              </Typography>
            </Box>
          </Box>

          {/* 成功メッセージ */}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              投稿が作成されました！掲示板にリダイレクトしています...
            </Alert>
          )}

          {/* エラーメッセージ */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* 投稿フォーム */}
          <Paper sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              {/* タイトル */}
              <TextField
                fullWidth
                label="タイトル *"
                variant="outlined"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (validationErrors.title) {
                    setValidationErrors(prev => ({ ...prev, title: '' }));
                  }
                }}
                sx={{ mb: 3 }}
                placeholder="投稿のタイトルを入力..."
                error={!!validationErrors.title}
                helperText={validationErrors.title || `${title.length}/100文字`}
                inputProps={{ maxLength: 100 }}
                required
              />

              {/* カテゴリー */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>カテゴリー</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  label="カテゴリー"
                >
                  <MenuItem value="general">一般</MenuItem>
                  <MenuItem value="tech">技術</MenuItem>
                  <MenuItem value="question">質問</MenuItem>
                  <MenuItem value="discussion">議論</MenuItem>
                  <MenuItem value="announcement">お知らせ</MenuItem>
                </Select>
              </FormControl>

              {/* フォーマットツールバー */}
              <Paper sx={{ p: 1, mb: 2, bgcolor: 'grey.100' }} elevation={0}>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => insertFormat('bold')}>
                    <FormatBoldIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => insertFormat('italic')}>
                    <FormatItalicIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => insertFormat('list')}>
                    <FormatListBulletedIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => insertFormat('quote')}>
                    <FormatQuoteIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => insertFormat('code')}>
                    <CodeIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => insertFormat('link')}>
                    <LinkIcon />
                  </IconButton>
                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                    Markdownをサポート
                  </Typography>
                </Stack>
              </Paper>

              {/* 内容 */}
              <TextField
                id="content-input"
                fullWidth
                label="本文 *"
                variant="outlined"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (validationErrors.content) {
                    setValidationErrors(prev => ({ ...prev, content: '' }));
                  }
                }}
                multiline
                minRows={10}
                maxRows={20}
                sx={{ mb: 3 }}
                placeholder="投稿の内容を入力..."
                error={!!validationErrors.content}
                helperText={validationErrors.content || `${content.length}/1000文字`}
                inputProps={{ maxLength: 1000 }}
                required
              />

              {/* タグ入力 */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    label="タグ"
                    variant="outlined"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="タグを入力（最大5個）"
                    size="small"
                    sx={{ flex: 1 }}
                    error={!!validationErrors.tags}
                    helperText={validationErrors.tags}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddTag}
                    disabled={tags.length >= 5}
                  >
                    追加
                  </Button>
                </Box>
                
                {/* タグ表示 */}
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* ボタン */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  endIcon={<SendIcon />}
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? <CircularProgress size={24} /> : '投稿する'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Container>
      </Box>
    </AppLayout>
  );
}