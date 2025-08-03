'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';

interface Post {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface EditDialogProps {
  open: boolean;
  post: Post | null;
  onClose: () => void;
  onUpdate: (content: string) => Promise<void>;
}

export default function EditDialog({ open, post, onClose, onUpdate }: EditDialogProps) {
  const [content, setContent] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (post) {
      setContent(post.content);
    }
  }, [post]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await onUpdate(content);
      onClose();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          m: 2,
          width: { xs: 'calc(100% - 32px)', sm: '100%' },
          maxWidth: { xs: '100%', sm: '600px' }
        }
      }}
    >
      <DialogTitle>投稿を編集</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          sx={{ mt: 1 }}
          slotProps={{
            htmlInput: { maxLength: 200 }
          }}
          helperText={`${content.length}/200文字`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={updating}>キャンセル</Button>
        <Button 
          onClick={handleUpdate} 
          variant="contained" 
          disabled={!content.trim() || updating}
        >
          更新
        </Button>
      </DialogActions>
    </Dialog>
  );
}