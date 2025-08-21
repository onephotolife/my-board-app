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
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatQuote as FormatQuoteIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  Image as ImageIcon
} from '@mui/icons-material';

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
    
    if (!content.trim()) {
      setError('内容を入力してください');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || '無題',
          content,
          author: session?.user?.name || session?.user?.email || '匿名',
          category,
          tags
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/board');
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || '投稿の作成に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        {/* ヘッダー */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => router.push('/board')} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
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
              label="タイトル（オプション）"
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="投稿のタイトルを入力..."
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
              multiline
              rows={12}
              label="内容 *"
              variant="outlined"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="投稿内容を入力...&#10;&#10;Markdown記法が使えます：&#10;**太字** *斜体* `コード` [リンク](URL)"
              required
            />

            {/* タグ */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  label="タグを追加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Button onClick={handleAddTag} variant="outlined">
                  追加
                </Button>
              </Box>
              {tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Stack>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* アクションボタン */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={loading}
              >
                キャンセル
              </Button>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                >
                  下書き保存
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  disabled={loading || !content.trim()}
                  sx={{
                    background: loading ? 'grey.400' : 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    color: 'white'
                  }}
                >
                  {loading ? '投稿中...' : '投稿する'}
                </Button>
              </Stack>
            </Box>
          </form>
        </Paper>

        {/* プレビュー */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              プレビュー
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {title && (
              <Typography variant="h5" gutterBottom>
                {title}
              </Typography>
            )}
            
            {category && (
              <Chip 
                label={category === 'general' ? '一般' : 
                       category === 'tech' ? '技術' : 
                       category === 'question' ? '質問' : 
                       category === 'discussion' ? '議論' : 'お知らせ'}
                size="small"
                sx={{ mb: 2 }}
              />
            )}
            
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {content || '内容のプレビューがここに表示されます...'}
            </Typography>
            
            {tags.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}