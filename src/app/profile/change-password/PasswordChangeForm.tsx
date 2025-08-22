'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  LinearProgress,
  Typography,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { signOut } from 'next-auth/react';

interface PasswordChangeFormProps {
  userEmail: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

export default function PasswordChangeForm({ userEmail }: PasswordChangeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // パスワード要件チェック
  const passwordRequirements: PasswordRequirement[] = [
    {
      label: '8文字以上',
      test: (pwd: string) => pwd.length >= 8,
      met: formData.newPassword.length >= 8
    },
    {
      label: '大文字を含む',
      test: (pwd: string) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(formData.newPassword)
    },
    {
      label: '小文字を含む',
      test: (pwd: string) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(formData.newPassword)
    },
    {
      label: '数字を含む',
      test: (pwd: string) => /\d/.test(pwd),
      met: /\d/.test(formData.newPassword)
    },
    {
      label: '特殊文字を含む (@$!%*?&など)',
      test: (pwd: string) => /[@$!%*?&]/.test(pwd),
      met: /[@$!%*?&]/.test(formData.newPassword)
    }
  ];

  // パスワード強度計算
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const metRequirements = passwordRequirements.filter(req => req.test(password)).length;
    
    if (password.length === 0) {
      return { score: 0, label: '', color: 'error' };
    }
    
    if (metRequirements <= 2) {
      return { score: 25, label: '弱い', color: 'error' };
    } else if (metRequirements === 3) {
      return { score: 50, label: '普通', color: 'warning' };
    } else if (metRequirements === 4) {
      return { score: 75, label: '強い', color: 'info' };
    } else {
      return { score: 100, label: '非常に強い', color: 'success' };
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // バリデーション
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('すべてのフィールドを入力してください');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('新しいパスワードは現在のパスワードと異なる必要があります');
      return;
    }

    // すべての要件を満たしているかチェック
    const allRequirementsMet = passwordRequirements.every(req => req.test(formData.newPassword));
    if (!allRequirementsMet) {
      setError('パスワードがすべての要件を満たしていません');
      return;
    }

    setLoading(true);

    try {
      // 新しいAPIエンドポイントを使用
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        
        // 成功メッセージを表示後、サインアウトして再ログインを促す
        setTimeout(async () => {
          if (data.requireReauth) {
            await signOut({ callbackUrl: '/auth/signin?message=password-changed' });
          } else {
            router.push('/profile');
          }
        }, 2000);
      } else {
        setError(data.error || 'パスワードの変更に失敗しました');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError('パスワードの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          パスワードを変更しました。再度ログインしてください。
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* 現在のパスワード */}
        <TextField
          fullWidth
          type={showCurrentPassword ? 'text' : 'password'}
          label="現在のパスワード"
          value={formData.currentPassword}
          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          disabled={loading}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  edge="end"
                >
                  {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        {/* 新しいパスワード */}
        <Box>
          <TextField
            fullWidth
            type={showNewPassword ? 'text' : 'password'}
            label="新しいパスワード"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            disabled={loading}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          {/* パスワード強度インジケーター */}
          {formData.newPassword && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ mr: 1 }}>
                  パスワード強度:
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600,
                    color: `${passwordStrength.color}.main`
                  }}
                >
                  {passwordStrength.label}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={passwordStrength.score} 
                color={passwordStrength.color}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* パスワード要件リスト */}
          {formData.newPassword && (
            <List dense sx={{ mt: 2 }}>
              {passwordRequirements.map((req, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {req.met ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={req.label}
                    primaryTypographyProps={{
                      variant: 'caption',
                      color: req.met ? 'text.primary' : 'text.disabled'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* パスワード確認 */}
        <TextField
          fullWidth
          type={showConfirmPassword ? 'text' : 'password'}
          label="新しいパスワード（確認）"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          disabled={loading}
          required
          error={formData.confirmPassword !== '' && formData.confirmPassword !== formData.newPassword}
          helperText={
            formData.confirmPassword !== '' && formData.confirmPassword !== formData.newPassword
              ? 'パスワードが一致しません'
              : ''
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        {/* 送信ボタン */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || !passwordRequirements.every(req => req.met) || formData.confirmPassword !== formData.newPassword}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{
            background: loading ? undefined : 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
            mt: 2
          }}
        >
          {loading ? '変更中...' : 'パスワードを変更'}
        </Button>
      </Stack>
    </Box>
  );
}