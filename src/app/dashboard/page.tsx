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
import Sidebar from '@/components/Sidebar';

// 日付フォーマット関数（メンバー歴は日数で表示）
const formatTimeAgo = (date: string | Date | undefined) => {
  if (!date) return '不明';
  
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // 常に日数で表示（0日の場合も「0日」と表示）
  return `${diffDay}日`;
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

    // ダッシュボードに到達したら、リダイレクトフラグをクリア
    if (typeof window !== 'undefined' && sessionStorage.getItem('auth-redirecting') === 'true') {
      console.log('✅ ダッシュボードに到達、リダイレクトフラグをクリア');
      sessionStorage.removeItem('auth-redirecting');
    }

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
    try {
      const response = await fetch('/api/users/stats');
      
      if (response.ok) {
        const { data } = await response.json();
        
        console.log('[Dashboard] ユーザー統計取得成功:', {
          email: data.email,
          memberSince: data.memberSince,
          totalPosts: data.totalPosts
        });
        
        setUserStats({
          totalPosts: data.totalPosts,
          todayPosts: data.todayPosts,
          lastLogin: data.lastLogin,
          memberSince: data.memberSince
        });
      } else {
        // APIエラー時はフォールバック
        console.error('[Dashboard] ユーザー統計取得失敗');
        if (session?.user) {
          setUserStats({
            totalPosts: 0,
            todayPosts: 0,
            lastLogin: new Date().toISOString(),
            memberSince: session.user.createdAt || new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('[Dashboard] ユーザー統計取得エラー:', error);
      // エラー時はフォールバック
      if (session?.user) {
        setUserStats({
          totalPosts: 0,
          todayPosts: 0,
          lastLogin: new Date().toISOString(),
          memberSince: session.user.createdAt || new Date().toISOString()
        });
      }
    }
  };;


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
    <>
      <Sidebar />
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#f5f5f5',
        marginLeft: { xs: 0, md: '280px' },  // デスクトップ時にサイドバー分のマージンを追加
        pt: { xs: 8, md: 0 },  // モバイル時はAppBarの高さ分のpadding-topを追加（64px）
        overflow: 'auto'
      }}>
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
              {/* 通知ベルアイコンを削除 */}
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
    </>
  );
}