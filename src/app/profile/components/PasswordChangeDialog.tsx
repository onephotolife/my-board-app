'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
} from '@mui/icons-material';
import { validatePassword, validatePasswordConfirm } from '@/lib/validations/profile';

interface PasswordChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<{ success: boolean; message?: string }>;
}

export default function PasswordChangeDialog({ open, onClose, onSubmit }: PasswordChangeDialogProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // フォームのリセット
  const resetForm = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setSubmitMessage(null);
  };

  // ダイアログを閉じる
  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  // 入力変更ハンドラー
  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // リアルタイムバリデーション
    if (field === 'newPassword') {
      const validation = validatePassword(value);
      setErrors(prev => ({ ...prev, newPassword: validation.error || '' }));
      
      // 確認パスワードも再検証
      if (formData.confirmPassword) {
        const confirmValidation = validatePasswordConfirm(value, formData.confirmPassword);
        setErrors(prev => ({ ...prev, confirmPassword: confirmValidation.error || '' }));
      }
    } else if (field === 'confirmPassword') {
      const validation = validatePasswordConfirm(formData.newPassword, value);
      setErrors(prev => ({ ...prev, confirmPassword: validation.error || '' }));
    }
  };

  // パスワード表示切り替え
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // フォーム送信
  const handleSubmit = async () => {
    // バリデーション
    const currentPasswordError = !formData.currentPassword ? '現在のパスワードを入力してください' : '';
    const newPasswordValidation = validatePassword(formData.newPassword);
    const confirmPasswordValidation = validatePasswordConfirm(formData.newPassword, formData.confirmPassword);
    
    setErrors({
      currentPassword: currentPasswordError,
      newPassword: newPasswordValidation.error || '',
      confirmPassword: confirmPasswordValidation.error || '',
    });
    
    if (currentPasswordError || !newPasswordValidation.isValid || !confirmPasswordValidation.isValid) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitMessage(null);
    
    try {
      const result = await onSubmit(formData);
      
      if (result.success) {
        setSubmitMessage({ type: 'success', text: result.message || 'パスワードを変更しました' });
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setSubmitMessage({ type: 'error', text: result.message || 'パスワードの変更に失敗しました' });
      }
    } catch (error) {
      setSubmitMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="primary" />
            <Typography variant="h6">パスワード変更</Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={isSubmitting}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {submitMessage && (
          <Alert severity={submitMessage.type} sx={{ mb: 2 }} onClose={() => setSubmitMessage(null)}>
            {submitMessage.text}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            type={showPassword.current ? 'text' : 'password'}
            label="現在のパスワード"
            value={formData.currentPassword}
            onChange={handleChange('currentPassword')}
            error={!!errors.currentPassword}
            helperText={errors.currentPassword}
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('current')}
                    edge="end"
                    disabled={isSubmitting}
                  >
                    {showPassword.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            fullWidth
            type={showPassword.new ? 'text' : 'password'}
            label="新しいパスワード"
            value={formData.newPassword}
            onChange={handleChange('newPassword')}
            error={!!errors.newPassword}
            helperText={errors.newPassword || '8文字以上、大文字・小文字・数字・特殊文字を含む'}
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('new')}
                    edge="end"
                    disabled={isSubmitting}
                  >
                    {showPassword.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            fullWidth
            type={showPassword.confirm ? 'text' : 'password'}
            label="新しいパスワード（確認）"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('confirm')}
                    edge="end"
                    disabled={isSubmitting}
                  >
                    {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <LockIcon />}
        >
          変更する
        </Button>
      </DialogActions>
    </Dialog>
  );
}