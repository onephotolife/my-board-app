'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
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
  Save as SaveIcon,
  Cancel as CancelIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatQuote as FormatQuoteIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

// カテゴリー定数
const CATEGORIES = {
  general: '一般',
  tech: '技術',
  question: '質問',
  discussion: '議論',
  announcement: 'お知らせ',
} as const;

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
}

export default function EditPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 認証チェック
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
        const postData = data.data;
        setPost(postData);
        
        // 編集権限チェック
        if (!postData.canEdit) {
          setError('この投稿を編集する権限がありません');
          return;
        }
        
        // フォームに値を設定
        setTitle(postData.title);
        setContent(postData.content);
        setCategory(postData.category);
        setTags(postData.tags || []);
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

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
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

    setSaving(true);
    setError('');
    setValidationErrors({});
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          tags: tags.filter(tag => tag.trim()),
          status: saveAsDraft ? 'draft' : 'published'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/posts/${postId}`);
        }, 1500);
      } else {
        if (data.error?.details && typeof data.error.details === 'object') {
          setValidationErrors(data.error.details);
        } else {
          setError(data.error?.message || '投稿の更新に失敗しました');
        }
      }
    } catch (err) {
      console.error('投稿更新エラー:', err);
      setError('ネットワークエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
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
    setValidationErrors(prev => ({ ...prev, tags: '' }));
  };

  const handleCancel = () => {
    const hasChanges = 
      title !== (post?.title || '') ||
      content !== (post?.content || '') ||
      category !== (post?.category || 'general') ||
      JSON.stringify(tags) !== JSON.stringify(post?.tags || []);
      
    if (hasChanges) {
      const confirmed = window.confirm('変更内容が失われますが、よろしいですか？');
      if (confirmed) {
        router.push(`/posts/${postId}`);
      }
    } else {
      router.push(`/posts/${postId}`);
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

  // ローディング状態
  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // エラー状態
  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
        <Container maxWidth="md">
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Stack direction="row" spacing={2}>
            <Button onClick={() => router.push('/board')} variant="outlined">
              掲示板に戻る
            </Button>
            {postId && (
              <Button onClick={() => router.push(`/posts/${postId}`)} variant="outlined">
                投稿詳細に戻る
              </Button>
            )}
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        {/* ヘッダー */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => router.push(`/posts/${postId}`)} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              投稿を編集
            </Typography>
          </Box>
          
          {/* 削除ボタン */}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={saving}
          >
            削除
          </Button>
        </Box>

        {/* 成功メッセージ */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            投稿が更新されました！投稿詳細にリダイレクトしています...
          </Alert>
        )}

        {/* 編集フォーム */}
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
                {Object.entries(CATEGORIES).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
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

            {/* 本文 */}
            <TextField
              id="content-input"
              fullWidth
              multiline
              rows={12}
              label="本文 *"
              variant="outlined"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (validationErrors.content) {
                  setValidationErrors(prev => ({ ...prev, content: '' }));
                }
              }}
              sx={{ mb: 3 }}
              placeholder="投稿内容を入力...&#10;&#10;Markdown記法が使えます：&#10;**太字** *斜体* `コード` [リンク](URL)"
              error={!!validationErrors.content}
              helperText={validationErrors.content || `${content.length}/1000文字`}
              inputProps={{ maxLength: 1000 }}
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
                  inputProps={{ maxLength: 20 }}
                />
                <Button onClick={handleAddTag} variant="outlined" disabled={tags.length >= 5}>
                  追加
                </Button>
              </Box>
              
              {validationErrors.tags && (
                <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                  {validationErrors.tags}
                </Alert>
              )}
              
              {tags.length > 0 && (
                <Box sx={{ mt: 1 }}>
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
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {tags.length}/5個
                  </Typography>
                </Box>
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
                disabled={saving}
              >
                キャンセル
              </Button>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={saving || !title.trim() || !content.trim()}
                >
                  {saving ? '保存中...' : '下書き保存'}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  disabled={saving || !title.trim() || !content.trim()}
                  sx={{
                    background: saving ? 'grey.400' : 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    color: 'white'
                  }}
                >
                  {saving ? '更新中...' : '更新'}
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
            
            <Typography variant="h5" gutterBottom>
              {title || 'タイトルのプレビュー'}
            </Typography>
            
            <Chip 
              label={CATEGORIES[category as keyof typeof CATEGORIES]}
              size="small"
              sx={{ mb: 2 }}
            />
            
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {content || '本文のプレビューがここに表示されます...'}
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

      {/* 削除確認ダイアログ */}
      {deleteDialogOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300
          }}
        >
          <Paper sx={{ p: 3, maxWidth: 400, mx: 2 }}>
            <Typography variant="h6" gutterBottom>
              投稿を削除しますか？
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              この操作は取り消せません。本当に削除してもよろしいですか？
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button 
                onClick={handleDelete} 
                color="error" 
                variant="contained"
              >
                削除
              </Button>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
}