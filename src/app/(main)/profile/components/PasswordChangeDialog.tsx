'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  TextField,
  Button,
  Box,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Typography,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { validatePassword, validatePasswordConfirm } from '@/lib/validations/profile';

interface PasswordChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<{ success: boolean; message?: string }>;
}

// パスワード要件のチェック項目
const passwordRequirements = [
  { id: 'length', label: '8文字以上', check: (pwd: string) => pwd.length >= 8 },
  { id: 'uppercase', label: '大文字を含む', check: (pwd: string) => /[A-Z]/.test(pwd) },
  { id: 'lowercase', label: '小文字を含む', check: (pwd: string) => /[a-z]/.test(pwd) },
  { id: 'number', label: '数字を含む', check: (pwd: string) => /\d/.test(pwd) },
  { id: 'special', label: '特殊文字を含む', check: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

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
  const [passwordStrength, setPasswordStrength] = useState<{ [key: string]: boolean }>({});
  const [mounted, setMounted] = useState(false);
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // クライアントサイドでのみレンダリング
  useEffect(() => {
    setMounted(true);
  }, []);

  // ダイアログが開いたときの処理
  useEffect(() => {
    if (open) {
      // 現在のフォーカスを保存
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // bodyのスクロールを無効化
      document.body.style.overflow = 'hidden';
      
      // ダイアログにフォーカスを移動
      setTimeout(() => {
        if (dialogRef.current) {
          const firstInput = dialogRef.current.querySelector('input');
          if (firstInput) {
            firstInput.focus();
          }
        }
      }, 100);
      
      // Escキーでダイアログを閉じる
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSubmitting) {
          handleClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    } else {
      // ダイアログが閉じたときに元の要素にフォーカスを戻す
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      document.body.style.overflow = '';
    }
  }, [open, isSubmitting]);

  // パスワード強度をチェック
  useEffect(() => {
    const strength: { [key: string]: boolean } = {};
    passwordRequirements.forEach(req => {
      strength[req.id] = req.check(formData.newPassword);
    });
    setPasswordStrength(strength);
  }, [formData.newPassword]);

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
    setShowPassword({
      current: false,
      new: false,
      confirm: false,
    });
    setSubmitMessage(null);
    setPasswordStrength({});
  };

  // ダイアログを閉じる
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setTimeout(() => {
        resetForm();
      }, 200);
    }
  };

  // 背景クリックでダイアログを閉じる
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
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
      
      if (formData.confirmPassword) {
        const confirmValidation = validatePasswordConfirm(value, formData.confirmPassword);
        setErrors(prev => ({ ...prev, confirmPassword: confirmValidation.error || '' }));
      }
    } else if (field === 'confirmPassword') {
      const validation = validatePasswordConfirm(formData.newPassword, value);
      setErrors(prev => ({ ...prev, confirmPassword: validation.error || '' }));
    } else if (field === 'currentPassword') {
      setErrors(prev => ({ ...prev, currentPassword: value ? '' : '現在のパスワードを入力してください' }));
    }
  };

  // パスワード表示切り替え
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  if (!open || !mounted) {
    return null;
  }

  const dialogContent = (
    <>
      {/* 背景（Backdrop） */}
      <Box
        onClick={handleBackdropClick}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998, // 高いz-indexで他の要素の上に表示
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)', // 背景をぼかして視認性向上
          animation: open ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.3s ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
          '@keyframes fadeOut': {
            from: { opacity: 1 },
            to: { opacity: 0 },
          },
        }}
      />
      
      {/* ダイアログ本体 - z-indexを最大に */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999, // 最上位に配置
          pointerEvents: 'none', // 背景クリックを通す
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <Box
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-dialog-title"
          sx={{
            pointerEvents: 'auto', // ダイアログ内のクリックは有効
            width: '100%',
            maxWidth: 500,
            maxHeight: 'calc(100vh - 40px)',
            animation: open ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-out',
            '@keyframes slideIn': {
              from: { 
                opacity: 0,
                transform: 'scale(0.95) translateY(-20px)',
              },
              to: { 
                opacity: 1,
                transform: 'scale(1) translateY(0)',
              },
            },
            '@keyframes slideOut': {
              from: { 
                opacity: 1,
                transform: 'scale(1) translateY(0)',
              },
              to: { 
                opacity: 0,
                transform: 'scale(0.95) translateY(-20px)',
              },
            },
          }}
        >
          <Paper
            elevation={24}
            sx={{
              borderRadius: 2,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
              overflow: 'hidden',
              // 影を強調して浮き上がって見えるように
              boxShadow: '0 24px 48px rgba(0,0,0,0.3), 0 12px 24px rgba(0,0,0,0.22)',
            }}
          >
            <form onSubmit={handleSubmit} noValidate>
              {/* ヘッダー */}
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                    }}
                  >
                    <LockIcon />
                  </Box>
                  <Typography id="password-dialog-title" variant="h6" component="h2">
                    パスワード変更
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleClose}
                  disabled={isSubmitting}
                  aria-label="閉じる"
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* コンテンツ - スクロール可能エリア */}
              <Box sx={{ 
                px: 3, 
                py: 3,
                overflowY: 'auto',
                flex: 1,
                // カスタムスクロールバー
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  bgcolor: 'grey.100',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'grey.400',
                  borderRadius: '4px',
                  '&:hover': {
                    bgcolor: 'grey.500',
                  },
                },
              }}>
                {submitMessage && (
                  <Alert
                    severity={submitMessage.type}
                    sx={{ mb: 3 }}
                    onClose={() => setSubmitMessage(null)}
                    icon={submitMessage.type === 'success' ? <CheckIcon /> : <ErrorIcon />}
                  >
                    {submitMessage.text}
                  </Alert>
                )}

                <Stack spacing={3}>
                  {/* 現在のパスワード */}
                  <TextField
                    fullWidth
                    type={showPassword.current ? 'text' : 'password'}
                    label="現在のパスワード"
                    value={formData.currentPassword}
                    onChange={handleChange('currentPassword')}
                    error={!!errors.currentPassword}
                    helperText={errors.currentPassword}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility('current')}
                            edge="end"
                            disabled={isSubmitting}
                            aria-label={showPassword.current ? 'パスワードを隠す' : 'パスワードを表示'}
                            tabIndex={-1}
                          >
                            {showPassword.current ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Divider sx={{ my: 1 }} />

                  {/* 新しいパスワード */}
                  <Box>
                    <TextField
                      fullWidth
                      type={showPassword.new ? 'text' : 'password'}
                      label="新しいパスワード"
                      value={formData.newPassword}
                      onChange={handleChange('newPassword')}
                      error={!!errors.newPassword}
                      helperText={errors.newPassword}
                      disabled={isSubmitting}
                      autoComplete="new-password"
                      variant="outlined"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => togglePasswordVisibility('new')}
                              edge="end"
                              disabled={isSubmitting}
                              aria-label={showPassword.new ? 'パスワードを隠す' : 'パスワードを表示'}
                              tabIndex={-1}
                            >
                              {showPassword.new ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    
                    {/* パスワード要件チェックリスト */}
                    {formData.newPassword && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          パスワード要件:
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {passwordRequirements.map(req => (
                            <Box
                              key={req.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                py: 0.25,
                              }}
                            >
                              {passwordStrength[req.id] ? (
                                <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                              ) : (
                                <ErrorIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  color: passwordStrength[req.id] ? 'success.main' : 'text.secondary',
                                  fontWeight: passwordStrength[req.id] ? 500 : 400,
                                }}
                              >
                                {req.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* パスワード確認 */}
                  <TextField
                    fullWidth
                    type={showPassword.confirm ? 'text' : 'password'}
                    label="新しいパスワード（確認）"
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword || (
                      formData.confirmPassword && formData.newPassword === formData.confirmPassword
                        ? '✓ パスワードが一致しています'
                        : ''
                    )}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    variant="outlined"
                    FormHelperTextProps={{
                      sx: {
                        color: formData.confirmPassword && formData.newPassword === formData.confirmPassword
                          ? 'success.main'
                          : undefined,
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility('confirm')}
                            edge="end"
                            disabled={isSubmitting}
                            aria-label={showPassword.confirm ? 'パスワードを隠す' : 'パスワードを表示'}
                            tabIndex={-1}
                          >
                            {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </Box>

              {/* フッター */}
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1.5,
                  borderTop: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                }}
              >
                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  variant="outlined"
                  color="inherit"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={
                    isSubmitting ||
                    !formData.currentPassword ||
                    !formData.newPassword ||
                    !formData.confirmPassword ||
                    !!errors.currentPassword ||
                    !!errors.newPassword ||
                    !!errors.confirmPassword ||
                    Object.values(passwordStrength).some(v => !v)
                  }
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <LockIcon />
                    )
                  }
                >
                  {isSubmitting ? '変更中...' : 'パスワードを変更'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Box>
      </Box>
    </>
  );

  // Portalを使用してダイアログをbodyの直下にレンダリング
  return ReactDOM.createPortal(dialogContent, document.body);
}