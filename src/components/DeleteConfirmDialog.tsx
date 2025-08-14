'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Box,
  Typography
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { usePermissions } from '@/contexts/PermissionContext';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  resourceOwnerId?: string;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  resourceOwnerId,
  title = '投稿を削除',
  message = 'この投稿を削除してもよろしいですか？この操作は取り消せません。',
  confirmText = '削除',
  cancelText = 'キャンセル'
}: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canDelete } = usePermissions();

  const hasPermission = resourceOwnerId ? canDelete(resourceOwnerId) : true;

  const handleConfirm = async () => {
    if (!hasPermission) {
      setError('この投稿を削除する権限がありません');
      return;
    }

    setDeleting(true);
    setError(null);
    
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('403') || err.message.includes('権限')) {
          setError('削除権限がありません');
        } else {
          setError('削除に失敗しました');
        }
      } else {
        setError('予期しないエラーが発生しました');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={deleting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          m: 2,
          width: { xs: 'calc(100% - 32px)', sm: '100%' },
          maxWidth: { xs: '100%', sm: '400px' }
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          <Typography component="span" variant="h6">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!hasPermission && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            削除権限がありません
          </Alert>
        )}
        
        <DialogContentText>
          {message}
        </DialogContentText>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={deleting}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={deleting || !hasPermission}
        >
          {deleting ? '削除中...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}