'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('無効なリンクです。メール内のリンクを正しくクリックしたか確認してください。');
      return;
    }

    const verifyEmail = async () => {
      try {
        console.log('🔍 メール確認開始:', { token });
        
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 レスポンスステータス:', response.status);
        
        const data = await response.json();
        console.log('📦 レスポンスデータ:', data);
        
        if (response.ok) {
          if (data.alreadyVerified) {
            setStatus('success');
            setMessage('メールアドレスは既に確認済みです。');
          } else {
            setStatus('success');
            setMessage('メールアドレスの確認が完了しました！');
          }
          
          // リダイレクト開始
          setIsRedirecting(true);
          setTimeout(() => {
            router.push('/auth/signin?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          const errorMsg = data.error || 'メール確認に失敗しました';
          
          // エラーメッセージを適切に設定
          if (response.status === 400) {
            if (errorMsg.includes('無効')) {
              setMessage('トークンが無効です。メール内のリンクを正しくクリックしたか確認してください。');
            } else if (errorMsg.includes('期限')) {
              setMessage('確認リンクの有効期限が切れています。新規登録からやり直してください。');
            } else {
              setMessage(errorMsg);
            }
          } else {
            setMessage('サーバーエラーが発生しました。しばらく待ってから再度お試しください。');
          }
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
        setStatus('error');
        setMessage('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  // ローディング状態
  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <Paper
          elevation={24}
          sx={{
            p: 6,
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            メールアドレスを確認中...
          </Typography>
          <Typography color="text.secondary">
            しばらくお待ちください
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 6,
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          {/* アイコン */}
          <Box
            sx={{
              width: 100,
              height: 100,
              margin: '0 auto',
              mb: 3,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: status === 'success' ? 'success.light' : 'error.light',
              color: 'white',
            }}
          >
            {status === 'success' ? (
              <CheckCircleIcon sx={{ fontSize: 60 }} />
            ) : (
              <ErrorIcon sx={{ fontSize: 60 }} />
            )}
          </Box>

          {/* タイトル */}
          <Typography variant="h4" gutterBottom fontWeight="bold">
            {status === 'success' ? '確認完了！' : 'エラーが発生しました'}
          </Typography>

          {/* メッセージ */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {message}
          </Typography>

          {/* リダイレクト中の表示 */}
          {isRedirecting && (
            <Alert severity="info" sx={{ mb: 3 }}>
              まもなくログインページへ移動します...
            </Alert>
          )}

          {/* エラー時のトラブルシューティング */}
          {status === 'error' && (
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                トラブルシューティング：
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                {message.includes('期限') && (
                  <>
                    <li>メール確認リンクは24時間有効です</li>
                    <li>期限切れの場合は新規登録からやり直してください</li>
                  </>
                )}
                {message.includes('無効') && (
                  <>
                    <li>メール内のリンクを正しくクリックしたか確認</li>
                    <li>リンクが切れている場合は、URL全体をコピー&ペースト</li>
                  </>
                )}
                {message.includes('ネットワーク') && (
                  <>
                    <li>インターネット接続を確認</li>
                    <li>ファイアウォールやプロキシの設定を確認</li>
                  </>
                )}
              </Box>
            </Alert>
          )}

          {/* アクションボタン */}
          <Stack direction="row" spacing={2} justifyContent="center">
            {status === 'error' && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  href="/auth/signup"
                  sx={{ minWidth: 150 }}
                >
                  新規登録へ
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  href="/auth/signin"
                  sx={{ minWidth: 150 }}
                >
                  ログインへ
                </Button>
              </>
            )}
            {status === 'success' && !isRedirecting && (
              <Button
                variant="contained"
                color="primary"
                href="/auth/signin"
                sx={{ minWidth: 200 }}
              >
                ログインページへ
              </Button>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}