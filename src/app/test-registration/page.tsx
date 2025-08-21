'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';

export default function TestRegistrationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    password: 'Test1234!',
    name: 'テストユーザー'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || '登録に失敗しました' });
        return;
      }

      setMessage({ type: 'success', text: '登録成功！メール確認トークンを取得中...' });
      
      // データベースからトークンを取得（開発環境のみ）
      const tokenResponse = await fetch('/api/test/get-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        setVerificationToken(tokenData.token);
        setMessage({ 
          type: 'success', 
          text: `登録成功！トークン: ${tokenData.token}` 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'ネットワークエラー' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/test/manual-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error });
        return;
      }

      setMessage({ type: 'success', text: 'メール確認完了！ログインできます。' });
    } catch (error) {
      setMessage({ type: 'error', text: 'ネットワークエラー' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWithToken = () => {
    if (verificationToken) {
      router.push(`/auth/verify-email?token=${verificationToken}`);
    }
  };

  const handleLogin = () => {
    router.push('/auth/signin');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            テスト登録フロー
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            このページは開発環境でのテスト用です
          </Alert>

          <Stack spacing={3}>
            <TextField
              label="メールアドレス"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="パスワード"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="名前"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />

            <Button
              variant="contained"
              onClick={handleRegister}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : '1. ユーザー登録'}
            </Button>

            {verificationToken && (
              <>
                <Divider />
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  トークン: {verificationToken}
                </Typography>
                
                <Button
                  variant="outlined"
                  onClick={handleVerifyWithToken}
                  fullWidth
                >
                  2a. メール確認ページへ（トークン付き）
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleManualVerify}
                  disabled={loading}
                  fullWidth
                >
                  2b. 手動でメール確認を完了
                </Button>
              </>
            )}

            <Divider />
            
            <Button
              variant="contained"
              color="secondary"
              onClick={handleLogin}
              fullWidth
            >
              3. ログインページへ
            </Button>

            {message && (
              <Alert severity={message.type}>
                {message.text}
              </Alert>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}