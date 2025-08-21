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
  Alert,
  Grid,
  Paper,
  Avatar,
  IconButton,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  Stack
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PostAdd as PostAddIcon,
  Forum as ForumIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Comment as CommentIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { signOut } from 'next-auth/react';

// 日付フォーマット関数
const formatTimeAgo = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}日前`;
  if (diffHour > 0) return `${diffHour}時間前`;
  if (diffMin > 0) return `${diffMin}分前`;
  return 'たった今';
};

interface Post {
  _id: string;
  content: string;
  author?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalPosts: number;
  todayPosts: number;
  lastLogin: string;
  memberSince: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalPosts: 0,
    todayPosts: 0,
    lastLogin: new Date().toISOString(),
    memberSince: new Date().toISOString()
  });
  const [loadingPosts, setLoadingPosts] = useState(true);

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
    
    // 最新の投稿を取得
    fetchLatestPosts();
    // ユーザー統計を取得
    fetchUserStats();
  }, [status, session, router]);

  const fetchLatestPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.slice(0, 5)); // 最新5件のみ表示
      }
    } catch (error) {
      console.error('投稿の取得に失敗:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchUserStats = async () => {
    // 実際のAPIがあれば使用、今はモックデータ
    if (session?.user) {
      setUserStats({
        totalPosts: Math.floor(Math.random() * 50) + 1,
        todayPosts: Math.floor(Math.random() * 5),
        lastLogin: new Date().toISOString(),
        memberSince: '2024-01-01T00:00:00Z'
      });
    }
  };

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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* サイドバー */}
      <Box
        sx={{
          width: 280,
          bgcolor: 'white',
          borderRight: '1px solid #e0e0e0',
          p: 3,
          display: { xs: 'none', md: 'block' }
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              margin: '0 auto',
              mb: 2,
              bgcolor: 'primary.main',
              fontSize: '2rem'
            }}
          >
            {session.user?.name?.[0] || session.user?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="h6" gutterBottom>
            {session.user?.name || 'ユーザー'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {session.user?.email}
          </Typography>
          <Chip
            label="メンバー"
            color="primary"
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <List>
          <ListItem button onClick={() => router.push('/dashboard')}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'primary.light' }}>
                <DashboardIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="ダッシュボード" />
          </ListItem>
          <ListItem button onClick={() => router.push('/board')}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'success.light' }}>
                <ForumIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="掲示板" />
          </ListItem>
          <ListItem button onClick={() => router.push('/posts/new')}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'warning.light' }}>
                <PostAddIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="新規投稿" />
          </ListItem>
          <ListItem button onClick={() => router.push('/profile')}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'info.light' }}>
                <PersonIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="プロフィール" />
          </ListItem>
          <ListItem button onClick={() => router.push('/settings')}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'secondary.light' }}>
                <SettingsIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="設定" />
          </ListItem>
        </List>

        <Divider sx={{ my: 3 }} />

        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleSignOut}
          sx={{
            borderColor: 'error.main',
            color: 'error.main',
            '&:hover': {
              borderColor: 'error.dark',
              bgcolor: 'error.light',
              bgcolor: 'rgba(211, 47, 47, 0.04)'
            }
          }}
        >
          ログアウト
        </Button>
      </Box>

      {/* メインコンテンツ */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* ヘッダー */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: 4,
            mb: 4
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  ダッシュボード
                </Typography>
                <Typography variant="body1">
                  おかえりなさい、{session.user?.name || session.user?.email}さん
                </Typography>
              </Box>
              <Badge badgeContent={3} color="error">
                <IconButton sx={{ color: 'white' }}>
                  <NotificationsIcon />
                </IconButton>
              </Badge>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ pb: 4 }}>

          {/* 統計カード */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CommentIcon sx={{ mr: 2 }} />
                  <Typography variant="h6">総投稿数</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {userStats.totalPosts}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  全期間の投稿
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ mr: 2 }} />
                  <Typography variant="h6">今日の投稿</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {userStats.todayPosts}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  本日の活動
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccessTimeIcon sx={{ mr: 2 }} />
                  <Typography variant="h6">最終ログイン</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  今
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  アクティブ中
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  color: 'white'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 2 }} />
                  <Typography variant="h6">メンバー歴</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {formatTimeAgo(userStats.memberSince)}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  登録から経過
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* クイックアクション */}
            <Grid item xs={12} md={8}>
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    クイックアクション
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          }
                        }}
                        onClick={() => router.push('/board')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                            <ForumIcon />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6">掲示板を見る</Typography>
                            <Typography variant="body2" color="text.secondary">
                              最新の投稿をチェック
                            </Typography>
                          </Box>
                          <ArrowForwardIcon color="action" />
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          }
                        }}
                        onClick={() => router.push('/posts/new')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                            <PostAddIcon />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6">新規投稿</Typography>
                            <Typography variant="body2" color="text.secondary">
                              新しい話題を投稿
                            </Typography>
                          </Box>
                          <ArrowForwardIcon color="action" />
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          }
                        }}
                        onClick={() => router.push('/profile')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                            <PersonIcon />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6">プロフィール</Typography>
                            <Typography variant="body2" color="text.secondary">
                              情報を編集
                            </Typography>
                          </Box>
                          <ArrowForwardIcon color="action" />
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          }
                        }}
                        onClick={() => router.push('/my-posts')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                            <CommentIcon />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6">自分の投稿</Typography>
                            <Typography variant="body2" color="text.secondary">
                              投稿履歴を確認
                            </Typography>
                          </Box>
                          <ArrowForwardIcon color="action" />
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* 最新の投稿 */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      最新の投稿
                    </Typography>
                    <Button
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => router.push('/board')}
                    >
                      すべて見る
                    </Button>
                  </Box>
                  
                  {loadingPosts ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : posts.length > 0 ? (
                    <List>
                      {posts.map((post, index) => (
                        <div key={post._id}>
                          <ListItem
                            alignItems="flex-start"
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                            onClick={() => router.push(`/posts/${post._id}`)}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.light' }}>
                                {post.author?.[0] || 'U'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={(
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {post.title || '無題の投稿'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatTimeAgo(post.createdAt)}
                                  </Typography>
                                </Box>
                              )}
                              secondary={(
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                  }}
                                >
                                  {post.content}
                                </Typography>
                              )}
                            />
                          </ListItem>
                          {index < posts.length - 1 && <Divider variant="inset" component="li" />}
                        </div>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        まだ投稿がありません
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<PostAddIcon />}
                        sx={{ mt: 2 }}
                        onClick={() => router.push('/posts/new')}
                      >
                        最初の投稿を作成
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* お知らせ・活動 */}
            <Grid item xs={12} md={4}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    お知らせ
                  </Typography>
                  <Stack spacing={2}>
                    <Alert severity="info">
                      新機能: マークダウン記法に対応しました
                    </Alert>
                    <Alert severity="success">
                      メンテナンス完了: システムが安定稼働中です
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    最近の活動
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.light' }}>
                          <CheckCircleIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="ログイン"
                        secondary="たった今"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'info.light' }}>
                          <CommentIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="新規投稿"
                        secondary="2時間前"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.light' }}>
                          <PersonIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary="プロフィール更新"
                        secondary="昨日"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

        </Container>
      </Box>
    </Box>
  );
}