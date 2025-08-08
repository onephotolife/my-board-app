'use client';

import { useState, Suspense, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  CircularProgress,
  IconButton,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function SignInFormEnhanced() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // フォーム状態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // エラー状態
  const [errors, setErrors] = useState<FormErrors>({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  
  // UI状態
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'info' | 'success' | 'error' });
  
  // URLパラメータから状態を取得
  const verified = searchParams.get('verified') === 'true';
  const error = searchParams.get('error');

  // エラーパラメータの処理
  useEffect(() => {
    if (error) {
      let errorMessage = 'ログインに失敗しました';
      
      switch (error) {
        case 'CredentialsSignin':
          errorMessage = 'メールアドレスまたはパスワードが正しくありません';
          break;
        case 'SessionRequired':
          errorMessage = 'ログインが必要です';
          break;
        case 'OAuthSignin':
        case 'OAuthCallback':
        case 'OAuthCreateAccount':
        case 'EmailCreateAccount':
        case 'Callback':
          errorMessage = '認証プロバイダーでエラーが発生しました';
          break;
        case 'EmailSignin':
          errorMessage = 'メール送信に失敗しました';
          break;
        case 'Default':
        default:
          errorMessage = '予期しないエラーが発生しました';
      }
      
      setErrors({ general: errorMessage });
    }
  }, [error]);

  // ブロック状態の管理
  useEffect(() => {
    if (loginAttempts >= 5) {
      setIsBlocked(true);
      const timer = setTimeout(() => {
        setIsBlocked(false);
        setLoginAttempts(0);
      }, 300000); // 5分間ブロック
      
      return () => clearTimeout(timer);
    }
  }, [loginAttempts]);

  // フォームバリデーション
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // メールアドレスの検証
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    
    // パスワードの検証
    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (password.length < 6) {
      newErrors.password = 'パスワードは6文字以上である必要があります';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ログイン処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ブロック状態チェック
    if (isBlocked) {
      setSnackbar({
        open: true,
        message: 'ログイン試行回数が上限に達しました。しばらくお待ちください。',
        severity: 'error'
      });
      return;
    }
    
    // バリデーション
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setLoginAttempts(prev => prev + 1);
        
        // エラーメッセージのカスタマイズ
        let errorMessage = 'ログインに失敗しました';
        
        if (result.error === 'CredentialsSignin') {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません';
          
          if (loginAttempts >= 3) {
            errorMessage += `（残り${5 - loginAttempts}回の試行が可能です）`;
          }
        }
        
        setErrors({ general: errorMessage });
        
        // エラーログの記録（本番環境では外部サービスに送信）
        console.error('Login failed:', {
          email: email.toLowerCase(),
          timestamp: new Date().toISOString(),
          attempt: loginAttempts + 1
        });
      } else if (result?.ok) {
        // 成功時の処理
        setSnackbar({
          open: true,
          message: 'ログインに成功しました。リダイレクトしています...',
          severity: 'success'
        });
        
        // セッション確立を待つ
        setTimeout(() => {
          router.push('/board');
          router.refresh(); // セッションの更新
        }, 1000);
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      setErrors({ 
        general: 'システムエラーが発生しました。時間をおいて再度お試しください。' 
      });
    } finally {
      setLoading(false);
    }
  };

  // パスワードリセットのリクエスト
  const handlePasswordReset = () => {
    if (!email) {
      setErrors({ email: 'パスワードリセットにはメールアドレスが必要です' });
      return;
    }
    
    // パスワードリセットページへ遷移
    router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            ログイン
          </Typography>
          
          {/* 成功メッセージ */}
          {verified && (
            <Alert 
              severity="success" 
              icon={<CheckCircleOutlineIcon />}
              sx={{ mt: 2, mb: 2 }}
            >
              メールアドレスが確認されました。ログインしてください。
            </Alert>
          )}
          
          {/* エラーメッセージ */}
          {errors.general && (
            <Alert 
              severity="error"
              icon={<ErrorOutlineIcon />}
              sx={{ mt: 2, mb: 2 }}
            >
              {errors.general}
            </Alert>
          )}
          
          {/* ブロック警告 */}
          {isBlocked && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              ログイン試行回数が上限に達しました。5分後に再度お試しください。
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="メールアドレス"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors({ ...errors, email: undefined });
                }
              }}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading || isBlocked}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="パスワード"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              error={!!errors.password}
              helperText={errors.password}
              disabled={loading || isBlocked}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading || isBlocked}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || isBlocked}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'ログイン'
              )}
            </Button>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Link 
                component="button"
                variant="body2"
                onClick={handlePasswordReset}
                type="button"
                sx={{ cursor: 'pointer' }}
              >
                パスワードを忘れた方
              </Link>
              <Link href="/auth/signup" underline="hover">
                新規登録はこちら
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
      
      {/* スナックバー通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default function EnhancedSignInPage() {
  return (
    <Suspense 
      fallback={
        <Box display="flex" justifyContent="center" mt={8}>
          <CircularProgress />
        </Box>
      }
    >
      <SignInFormEnhanced />
    </Suspense>
  );
}