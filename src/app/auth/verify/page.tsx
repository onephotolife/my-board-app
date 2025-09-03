'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Stack,
  LinearProgress,
  Collapse,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  CheckCircleOutline as SuccessIcon,
  ErrorOutline as ErrorIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Login as LoginIcon,
  AppRegistration as RegisterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import { AuthErrorCode } from '@/lib/errors/auth-errors';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(0);

  useEffect(() => {
    const tokenParam = searchParams.get('token');

    if (!tokenParam) {
      setStatus('error');
      setMessage('無効なリンクです。メール内のリンクを正しくクリックしたか確認してください。');
      setErrorCode(AuthErrorCode.INVALID_TOKEN);
      return;
    }

    const verifyEmail = async () => {
      try {
        console.warn('🔍 メール確認開始:', { token: tokenParam });
        
        const response = await fetch(`/api/auth/verify?token=${encodeURIComponent(tokenParam)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        console.warn('📦 レスポンスデータ:', data);
        
        if (data.success) {
          setStatus('success');
          if (data.data?.alreadyVerified) {
            setMessage('メールアドレスは既に確認済みです。');
          } else {
            setMessage(data.message || 'メールアドレスの確認が完了しました！');
          }
          
          if (data.data?.email) {
            setEmail(data.data.email);
          }
          
          // 3秒後にリダイレクト
          setRedirectCountdown(3);
          const redirectTimer = setInterval(() => {
            setRedirectCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(redirectTimer);
                router.push(data.redirectUrl || '/auth/signin?verified=true');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
        } else {
          setStatus('error');
          setMessage(data.error?.message || 'メール確認に失敗しました');
          setErrorCode(data.error?.code || null);
          setCanResend(data.error?.canResend || false);
          
          if (data.error?.details?.email) {
            setEmail(data.error.details.email);
          }
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
        setStatus('error');
        setMessage('ネットワークエラーが発生しました。インターネット接続を確認してください。');
        setErrorCode(AuthErrorCode.INTERNAL_ERROR);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const handleResend = async () => {
    if (!email || resending || resendCooldown > 0) return;

    setResending(true);
    try {
      const response = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSnackbarMessage(data.message || '確認メールを再送信しました。');
        setSnackbarOpen(true);
        
        // クールダウン設定
        if (data.data?.cooldownSeconds) {
          setResendCooldown(data.data.cooldownSeconds);
          const cooldownTimer = setInterval(() => {
            setResendCooldown((prev) => {
              if (prev <= 1) {
                clearInterval(cooldownTimer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        setSnackbarMessage(data.error?.message || '再送信に失敗しました。');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('❌ Resend error:', error);
      setSnackbarMessage('ネットワークエラーが発生しました。');
      setSnackbarOpen(true);
    } finally {
      setResending(false);
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <SuccessIcon sx={{ fontSize: 80, color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 80, color: 'error.main' }} />;
      default:
        return <CircularProgress size={80} />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return '確認完了！';
      case 'error':
        return 'エラーが発生しました';
      default:
        return 'メールアドレスを確認中...';
    }
  };

  const getAlertSeverity = () => {
    if (errorCode === AuthErrorCode.TOKEN_EXPIRED) return 'warning';
    if (errorCode === AuthErrorCode.ALREADY_VERIFIED) return 'info';
    return 'error';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Card
        elevation={10}
        sx={{
          maxWidth: 600,
          width: '100%',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 5 }}>
          <Stack spacing={4} alignItems="center">
            {/* アイコン */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 120,
                height: 120,
                borderRadius: '50%',
                bgcolor: status === 'success' 
                  ? 'success.lighter' 
                  : status === 'error'
                  ? 'error.lighter'
                  : 'primary.lighter',
                background: status === 'success'
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                  : status === 'error'
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              }}
            >
              {getIcon()}
            </Box>

            {/* タイトル */}
            <Typography variant="h4" fontWeight="bold" textAlign="center">
              {getTitle()}
            </Typography>

            {/* メッセージ */}
            <Typography 
              variant="body1" 
              color="text.secondary" 
              textAlign="center"
              sx={{ maxWidth: 400 }}
            >
              {status === 'loading' && 'しばらくお待ちください...'}
              {status !== 'loading' && message}
            </Typography>

            {/* リダイレクトカウントダウン */}
            {status === 'success' && redirectCountdown > 0 && (
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" color="text.secondary" textAlign="center" mb={1}>
                  {redirectCountdown}秒後にログインページへ移動します
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(3 - redirectCountdown) * 33.33} 
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}

            {/* エラー詳細 */}
            {status === 'error' && (
              <Collapse in={status === 'error'} sx={{ width: '100%' }}>
                <Alert 
                  severity={getAlertSeverity()}
                  sx={{ borderRadius: 2 }}
                >
                  <AlertTitle>トラブルシューティング</AlertTitle>
                  {errorCode === AuthErrorCode.TOKEN_EXPIRED && (
                    <>
                      • 確認リンクは24時間有効です<br />
                      • 期限が切れた場合は再送信してください<br />
                      {canResend && email && '• 下のボタンから再送信できます'}
                    </>
                  )}
                  {errorCode === AuthErrorCode.INVALID_TOKEN && (
                    <>
                      • メール内のリンクを正しくクリックしたか確認してください<br />
                      • リンクが切れている場合は、URL全体をコピー&ペーストしてください<br />
                      • ブラウザのアドレスバーにトークンパラメータが含まれているか確認してください
                    </>
                  )}
                  {errorCode === AuthErrorCode.ALREADY_VERIFIED && (
                    <>
                      • このメールアドレスは既に確認済みです<br />
                      • ログインページから通常通りログインできます
                    </>
                  )}
                  {errorCode === AuthErrorCode.INTERNAL_ERROR && (
                    <>
                      • ネットワーク接続を確認してください<br />
                      • しばらく待ってから再度お試しください<br />
                      • 問題が解決しない場合は、新規登録からやり直してください
                    </>
                  )}
                </Alert>
              </Collapse>
            )}

            {/* アクションボタン */}
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              {status === 'error' && canResend && email && (
                <Button
                  variant="contained"
                  startIcon={resending ? <CircularProgress size={20} /> : <RefreshIcon />}
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                  sx={{ minWidth: 150 }}
                >
                  {resendCooldown > 0 
                    ? `再送信 (${resendCooldown}秒)` 
                    : resending 
                    ? '送信中...' 
                    : 'メールを再送信'}
                </Button>
              )}
              
              {status === 'error' && (
                <>
                  <Button
                    component={Link}
                    href="/auth/signup"
                    variant="contained"
                    startIcon={<RegisterIcon />}
                    sx={{ minWidth: 150 }}
                  >
                    新規登録へ
                  </Button>
                  <Button
                    component={Link}
                    href="/auth/signin"
                    variant="outlined"
                    startIcon={<LoginIcon />}
                    sx={{ minWidth: 150 }}
                  >
                    ログインへ
                  </Button>
                </>
              )}
              
              {status === 'success' && (
                <Button
                  component={Link}
                  href="/auth/signin"
                  variant="contained"
                  startIcon={<LoginIcon />}
                  size="large"
                  sx={{ minWidth: 200 }}
                >
                  ログインページへ
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* スナックバー */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarMessage.includes('成功') ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ローディングコンポーネント
function LoadingFallback() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card elevation={10} sx={{ p: 5, borderRadius: 3 }}>
        <Stack spacing={3} alignItems="center">
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            読み込み中...
          </Typography>
        </Stack>
      </Card>
    </Box>
  );
}

// メインエクスポート（Suspenseで囲む）
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}