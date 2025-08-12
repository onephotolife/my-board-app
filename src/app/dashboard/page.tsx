'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Card, 
  CardContent,
  Avatar,
  Chip,
  Divider,
  Skeleton
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArticleIcon from '@mui/icons-material/Article';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function DashboardPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/auth/signin?callbackUrl=/dashboard');
    }
  });
  
  const [accountCreatedDate, setAccountCreatedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      // メール未確認の場合
      if (!(session?.user as any)?.emailVerified) {
        redirect('/auth/verify-email');
      }
      setAccountCreatedDate(new Date().toLocaleDateString('ja-JP'));
      setIsLoading(false);
    }
  }, [status, session]);

  if (status === 'loading' || isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={200} height={24} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardContent>
                <Skeleton variant="rectangular" height={200} />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DashboardIcon fontSize="large" />
          ダッシュボード
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ようこそ、{session?.user?.name || session?.user?.email}さん
        </Typography>
      </Box>

      {/* カードグリッド */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {/* ユーザー情報カード */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">プロフィール</Typography>
                <Typography variant="body2" color="text.secondary">
                  アカウント情報
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>名前:</strong> {session?.user?.name || '未設定'}
              </Typography>
              <Typography variant="body2">
                <strong>メール:</strong> {session?.user?.email}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" component="span">
                  <strong>ステータス:</strong>
                </Typography>
                <Chip 
                  label="メール確認済み" 
                  color="success" 
                  size="small" 
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 投稿統計カード */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                <ArticleIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">投稿統計</Typography>
                <Typography variant="body2" color="text.secondary">
                  あなたの活動
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>総投稿数:</strong> 0件
              </Typography>
              <Typography variant="body2">
                <strong>今月の投稿:</strong> 0件
              </Typography>
              <Typography variant="body2">
                <strong>最終投稿日:</strong> なし
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* アクティビティカード */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'success.main' }}>
                <TrendingUpIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">アクティビティ</Typography>
                <Typography variant="body2" color="text.secondary">
                  最近の活動
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>ログイン回数:</strong> 1回
              </Typography>
              <Typography variant="body2">
                <strong>最終ログイン:</strong> 今
              </Typography>
              <Typography variant="body2">
                <strong>アカウント作成日:</strong> {accountCreatedDate}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* クイックアクション */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          クイックアクション
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Chip
            label="新規投稿を作成"
            component="a"
            href="/posts/new"
            clickable
            color="primary"
            variant="outlined"
          />
          <Chip
            label="プロフィールを編集"
            component="a"
            href="/profile"
            clickable
            color="primary"
            variant="outlined"
          />
          <Chip
            label="投稿一覧を見る"
            component="a"
            href="/"
            clickable
            color="primary"
            variant="outlined"
          />
        </Box>
      </Paper>
    </Container>
  );
}