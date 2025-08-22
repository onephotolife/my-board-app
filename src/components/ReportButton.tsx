'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Report as ReportIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface ReportButtonProps {
  postId: string;
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'スパム' },
  { value: 'inappropriate', label: '不適切な内容' },
  { value: 'harassment', label: 'ハラスメント' },
  { value: 'misinformation', label: '誤情報' },
  { value: 'other', label: 'その他' },
];

export default function ReportButton({
  postId,
  variant = 'icon',
  size = 'small',
  onReportSubmitted,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !description.trim()) {
      setError('理由と詳細説明を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          reason,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setReason('');
          setDescription('');
          onReportSubmitted?.();
        }, 2000);
      } else {
        setError(data.error?.message || '通報の送信に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      setError('');
      setSuccess(false);
      setReason('');
      setDescription('');
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <Tooltip title="投稿を通報">
          <IconButton
            size={size}
            onClick={() => setOpen(true)}
            color="error"
          >
            <ReportIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          variant="outlined"
          color="error"
          size={size}
          startIcon={<ReportIcon />}
          onClick={() => setOpen(true)}
        >
          通報
        </Button>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          投稿を通報
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {success ? (
            <Alert severity="success">
              通報が送信されました。モデレーターが確認します。
            </Alert>
          ) : (
            <>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>通報理由 *</InputLabel>
                <Select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  label="通報理由 *"
                  disabled={loading}
                >
                  {REPORT_REASONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="詳細説明 *"
                placeholder="具体的な問題の説明を入力してください（10文字以上）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                helperText={`${description.length}/500文字`}
                inputProps={{ maxLength: 500 }}
                disabled={loading}
                error={description.length > 0 && description.length < 10}
              />
            </>
          )}
        </DialogContent>

        {!success && (
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="error"
              disabled={loading || !reason || description.length < 10}
              startIcon={loading ? <CircularProgress size={16} /> : <ReportIcon />}
            >
              {loading ? '送信中...' : '通報する'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}