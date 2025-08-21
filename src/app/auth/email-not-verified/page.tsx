'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { signOut } from 'next-auth/react';

export default function EmailNotVerifiedPage() {
  const { data: session } = useSession();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleResendEmail = async () => {
    setResending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: '確認メールを再送信しました。メールボックスをご確認ください。' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'メールの再送信に失敗しました' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'ネットワークエラーが発生しました' 
      });
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

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
          {/* メールアイコン */}
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
              bgcolor: 'warning.light',
              color: 'white',
            }}
          >
            <EmailIcon sx={{ fontSize: 60 }} />
          </Box>

          {/* タイトル */}
          <Typography variant="h4" gutterBottom fontWeight="bold">
            メール確認が必要です
          </Typography>

          {/* 説明文 */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            会員制掲示板をご利用いただくには、
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            メールアドレスの確認が必要です。
          </Typography>

          {/* ユーザー情報 */}
          {session?.user?.email && (
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>登録メールアドレス:</strong> {session.user.email}
              </Typography>
            </Alert>
          )}

          {/* 手順説明 */}
          <Alert severity="warning" sx={{ mb: 4, textAlign: 'left' }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              確認手順：
            </Typography>
            <Box component="ol" sx={{ pl: 2, mb: 0 }}>
              <li>登録時に送信された確認メールを開く</li>
              <li>メール内の「確認する」ボタンをクリック</li>
              <li>確認完了後、再度ログインしてください</li>
            </Box>
          </Alert>

          {/* メッセージ表示 */}
          {message && (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          )}

          {/* アクションボタン */}
          <Stack spacing={2}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={resending ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
              onClick={handleResendEmail}
              disabled={resending}
              fullWidth
            >
              {resending ? '送信中...' : '確認メールを再送信'}
            </Button>

            <Button
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              fullWidth
            >
              ログアウト
            </Button>
          </Stack>

          {/* ヘルプテキスト */}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}