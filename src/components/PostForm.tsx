'use client';

import { useState, memo } from 'react';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

import { csrfFetch } from '@/hooks/useCSRF';

interface PostFormProps {
  onSubmit: (title: string, content: string, author: string) => Promise<void>;
}

const PostForm = memo(function PostForm({ onSubmit }: PostFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(title, content, author);
      setTitle('');
      setContent('');
      setAuthor('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: { xs: 2, sm: 3 },
        mb: { xs: 3, sm: 4 },
        width: '100%'
      }}
    >
      <form onSubmit={handleSubmit}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2, 
            mb: 2 
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            label="タイトル"
            placeholder="タイトルを入力"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            slotProps={{
              htmlInput: { maxLength: 100 }
            }}
            helperText={`${title.length}/100文字`}
          />
          <TextField
            fullWidth
            variant="outlined"
            label="投稿者名"
            placeholder="お名前を入力"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            slotProps={{
              htmlInput: { maxLength: 50 }
            }}
            helperText={`${author.length}/50文字`}
          />
        </Box>
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          label="投稿内容"
          placeholder="投稿内容を入力してください"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{
            htmlInput: { maxLength: 200 }
          }}
          helperText={`${content.length}/200文字`}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!title.trim() || !content.trim() || !author.trim() || submitting}
          fullWidth
        >
          投稿する
        </Button>
      </form>
    </Paper>
  );
});

export default PostForm;