'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  CircularProgress,
  Box,
  Alert 
} from '@mui/material';
import { signOut } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('📊 ダッシュボード - セッション状態:', {
      status,
      session: session ? 'あり' : 'なし',
      user: session?.user,
      timestamp: new Date().toISOString()
    });

    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      console.log('⚠️ 未認証のためサインインページへリダイレクト');
      router.push('/auth/signin');
      return;
    }

    setLoading(false);
  }, [status, session, router]);

  const handleSignOut = async () => {
    console.log('🚪 ログアウト処理開始');
    await signOut({ redirect: true, callbackUrl: '/auth/signin' });
  };

  if (status === 'loading' || loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Alert severity="success" sx={{ mb: 3 }}>
          ✅ ログインに成功しました！ダッシュボードページが正常に表示されています。
        </Alert>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              ダッシュボード
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              ようこそ、{session.user?.name || session.user?.email}さん
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              ユーザー情報
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>メールアドレス:</strong> {session.user?.email}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>名前:</strong> {session.user?.name || '未設定'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>セッションID:</strong> {session.user?.id || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>メール確認済み:</strong> {session.user?.emailVerified ? 'はい' : 'いいえ'}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              クイックアクション
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                href="/board"
                sx={{ 
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                  color: 'white'
                }}
              >
                掲示板を見る
              </Button>
              <Button 
                variant="contained"
                href="/posts/new"
                sx={{ 
                  background: 'linear-gradient(45deg, #f093fb 30%, #f5576c 90%)',
                  color: 'white'
                }}
              >
                新規投稿
              </Button>
              <Button 
                variant="contained"
                href="/profile"
                sx={{ 
                  background: 'linear-gradient(45deg, #4facfe 30%, #00f2fe 90%)',
                  color: 'white'
                }}
              >
                プロフィール編集
              </Button>
              <Button 
                variant="outlined"
                onClick={handleSignOut}
                sx={{ 
                  borderColor: '#dc2626',
                  color: '#dc2626',
                  '&:hover': {
                    borderColor: '#b91c1c',
                    backgroundColor: 'rgba(220, 38, 38, 0.04)'
                  }
                }}
              >
                ログアウト
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              デバッグ情報
            </Typography>
            <Box 
              component="pre" 
              sx={{ 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            >
              {JSON.stringify({
                sessionStatus: status,
                sessionData: session,
                timestamp: new Date().toISOString()
              }, null, 2)}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}