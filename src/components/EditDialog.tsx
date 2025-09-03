'use client';

import { useState, useEffect, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Typography
} from '@mui/material';

import { usePermissions } from '@/contexts/PermissionContext';
import type { UnifiedPost } from '@/types/post';

interface EditDialogProps {
  open: boolean;
  post: UnifiedPost | null;
  onClose: () => void;
  onUpdate: (data: { title: string; content: string; category: string; tags: string[] }) => Promise<void>;
}

const EditDialog = memo(function EditDialog({ open, post, onClose, onUpdate }: EditDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [updating, setUpdating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { canEdit } = usePermissions();

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setCategory(post.category || 'general');
      setTags(post.tags || []);
    }
  }, [post]);

  const getAuthorId = (author: any): string => {
    if (typeof author === 'string') return author;
    if (author && typeof author === 'object' && author._id) return author._id;
    return '';
  };

  const hasPermission = post?.author ? canEdit(getAuthorId(post.author)) : false;

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

  const handleUpdate = async () => {
    if (!hasPermission) {
      alert('この投稿を編集する権限がありません');
      return;
    }

    // バリデーション
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = 'タイトルを入力してください';
    } else if (title.length > 100) {
      errors.title = 'タイトルは100文字以内で入力してください';
    }
    
    if (!content.trim()) {
      errors.content = '本文を入力してください';
    } else if (content.length > 1000) {
      errors.content = '本文は1000文字以内で入力してください';
    }
    
    if (tags.length > 5) {
      errors.tags = 'タグは最大5個までです';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setUpdating(true);
    try {
      await onUpdate({
        title: title.trim(),
        content: content.trim(),
        category,
        tags: tags.filter(tag => tag.trim())
      });
      onClose();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          m: 2,
          width: { xs: 'calc(100% - 32px)', sm: '100%' },
          maxWidth: { xs: '100%', sm: '800px' }
        }
      }}
    >
      <DialogTitle>投稿を編集</DialogTitle>
      <DialogContent>
        {!hasPermission && (
          <Alert severity="error" sx={{ mb: 2 }}>
            この投稿を編集する権限がありません
          </Alert>
        )}
        
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
          sx={{ mb: 2, mt: 1 }}
          error={!!validationErrors.title}
          helperText={validationErrors.title || `${title.length}/100文字`}
          disabled={!hasPermission || updating}
          inputProps={{ maxLength: 100 }}
        />

        {/* カテゴリー */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>カテゴリー</InputLabel>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            label="カテゴリー"
            disabled={!hasPermission || updating}
          >
            <MenuItem value="general">一般</MenuItem>
            <MenuItem value="tech">技術</MenuItem>
            <MenuItem value="question">質問</MenuItem>
            <MenuItem value="discussion">議論</MenuItem>
            <MenuItem value="announcement">お知らせ</MenuItem>
          </Select>
        </FormControl>

        {/* 内容 */}
        <TextField
          fullWidth
          multiline
          rows={8}
          label="本文 *"
          variant="outlined"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (validationErrors.content) {
              setValidationErrors(prev => ({ ...prev, content: '' }));
            }
          }}
          sx={{ mb: 2 }}
          error={!!validationErrors.content}
          helperText={validationErrors.content || `${content.length}/1000文字`}
          disabled={!hasPermission || updating}
          inputProps={{ maxLength: 1000 }}
        />

        {/* タグ */}
        <Box sx={{ mb: 2 }}>
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
              disabled={!hasPermission || updating}
            />
            <Button 
              onClick={handleAddTag} 
              variant="outlined"
              disabled={!hasPermission || updating}
            >
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
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    onDelete={!hasPermission || updating ? undefined : () => handleRemoveTag(tag)}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {tags.length}/5個
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={updating}>キャンセル</Button>
        <Button 
          onClick={handleUpdate} 
          variant="contained" 
          disabled={!title.trim() || !content.trim() || updating || !hasPermission}
        >
          更新
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default EditDialog;