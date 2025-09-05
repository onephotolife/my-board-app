'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useHashtagSuggestions } from '@/hooks/useHashtagSuggestions';
import HashtagSuggestions from '@/components/HashtagSuggestions';
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
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Send as SendIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import AppLayout from '@/components/AppLayout';
import { csrfFetch } from '@/hooks/useCSRF';

// Authenticated form component with all hooks
function AuthenticatedNewPostForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Hashtag suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Hashtag suggestions hook
  const {
    suggestions,
    loading: suggestionsLoading,
    error: suggestionsError,
    searchSuggestions,
    clearSuggestions
  } = useHashtagSuggestions({
    minQueryLength: 1,
    maxSuggestions: 8,
    debounceMs: 200
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // フロントエンドバリデーション
    const newValidationErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newValidationErrors.title = 'タイトルを入力してください';
    } else if (title.length > 100) {
      newValidationErrors.title = 'タイトルは100文字以内で入力してください';
    }
    
    if (!author.trim()) {
      newValidationErrors.author = '投稿者名を入力してください';
    } else if (author.length > 50) {
      newValidationErrors.author = '投稿者名は50文字以内で入力してください';
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
      const response = await csrfFetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          author: author.trim(),
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

  // Hashtag detection and suggestion logic
  const detectHashtagContext = useCallback((text: string, position: number) => {
    // Find hashtag context at cursor position
    const beforeCursor = text.slice(0, position);
    const hashtagMatch = beforeCursor.match(/#([\p{L}\p{N}_]*)$/u);
    
    if (hashtagMatch) {
      const query = hashtagMatch[1];
      setHashtagQuery(query);
      setShowSuggestions(true);
      searchSuggestions(query);
    } else {
      setShowSuggestions(false);
      clearSuggestions();
    }
  }, [searchSuggestions, clearSuggestions]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newPosition = e.target.selectionStart || 0;
    
    setContent(newContent);
    setCursorPosition(newPosition);
    
    if (validationErrors.content) {
      setValidationErrors(prev => ({ ...prev, content: '' }));
    }
    
    // Detect hashtag context
    detectHashtagContext(newContent, newPosition);
  }, [validationErrors.content, detectHashtagContext]);

  const handleHashtagSelect = useCallback((hashtag: string) => {
    if (!contentInputRef.current) return;
    
    const textarea = contentInputRef.current;
    const beforeCursor = content.slice(0, cursorPosition);
    const afterCursor = content.slice(cursorPosition);
    
    // Find the start of current hashtag being typed
    const hashtagStart = beforeCursor.lastIndexOf('#');
    if (hashtagStart === -1) return;
    
    // Replace the partial hashtag with the selected one
    const beforeHashtag = content.slice(0, hashtagStart);
    const newContent = beforeHashtag + hashtag + ' ' + afterCursor;
    const newPosition = hashtagStart + hashtag.length + 1;
    
    setContent(newContent);
    setShowSuggestions(false);
    clearSuggestions();
    
    // Set cursor position after the inserted hashtag
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  }, [content, cursorPosition, clearSuggestions]);

  const handleSuggestionsClose = useCallback(() => {
    setShowSuggestions(false);
    clearSuggestions();
  }, [clearSuggestions]);

  const handleCancel = () => {
    if (content || title || author) {
      const confirmed = window.confirm('入力内容が失われますが、よろしいですか？');
      if (confirmed) {
        router.push('/board');
      }
    } else {
      router.push('/board');
    }
  };

  return (
    <AppLayout>
      <Box sx={{ 
        py: { xs: 2, md: 4 },
        px: { xs: 2, sm: 3, md: 4 }
      }}
      >
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
                data-testid="title-input"
                required
              />

              {/* 投稿者名 */}
              <TextField
                fullWidth
                label="投稿者名 *"
                variant="outlined"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  if (validationErrors.author) {
                    setValidationErrors(prev => ({ ...prev, author: '' }));
                  }
                }}
                sx={{ mb: 3 }}
                placeholder="お名前を入力..."
                error={!!validationErrors.author}
                helperText={validationErrors.author || `${author.length}/50文字`}
                inputProps={{ maxLength: 50 }}
                data-testid="author-input"
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

              {/* 内容 */}
              <Box sx={{ position: 'relative', mb: 3 }}>
                <TextField
                  fullWidth
                  label="本文 *"
                  variant="outlined"
                  value={content}
                  onChange={handleContentChange}
                  multiline
                  minRows={10}
                  maxRows={20}
                  placeholder="投稿の内容を入力... (#でハッシュタグ候補を表示)"
                  error={!!validationErrors.content}
                  helperText={validationErrors.content || `${content.length}/1000文字`}
                  inputProps={{ maxLength: 1000 }}
                  data-testid="content-input"
                  required
                  ref={contentInputRef}
                  onKeyDown={(e) => {
                    // Handle cursor position tracking
                    setTimeout(() => {
                      if (contentInputRef.current) {
                        setCursorPosition(contentInputRef.current.selectionStart || 0);
                      }
                    }, 0);
                  }}
                  onSelect={(e) => {
                    // Handle text selection changes
                    const target = e.target as HTMLTextAreaElement;
                    setCursorPosition(target.selectionStart || 0);
                  }}
                />
                
                {/* Hashtag Suggestions */}
                <HashtagSuggestions
                  suggestions={suggestions}
                  loading={suggestionsLoading}
                  error={suggestionsError}
                  visible={showSuggestions}
                  onSelect={handleHashtagSelect}
                  onClose={handleSuggestionsClose}
                  anchorEl={contentInputRef.current}
                  maxHeight={250}
                />
              </Box>

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
                  data-testid="submit-button"
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

// Main page component with authentication checks
export default function NewPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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

  // 認証済みの場合、フォームコンポーネントをレンダー
  return <AuthenticatedNewPostForm />;
}