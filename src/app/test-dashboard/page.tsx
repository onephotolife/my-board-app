import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Card, 
  CardContent,
  Avatar,
  Chip,
  Divider
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArticleIcon from '@mui/icons-material/Article';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function TestDashboardPage() {
  // テストユーザーセッションデータ
  const testSession = {
    user: {
      name: 'テストユーザー',
      email: 'test@example.com',
      emailVerified: true
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DashboardIcon fontSize="large" />
          ダッシュボード（MUI修正テスト）
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ようこそ、{testSession.user?.name || testSession.user?.email}さん
        </Typography>
      </Box>

      {/* ユーザー情報カード - Grid v2 API使用 */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
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
                  <strong>名前:</strong> {testSession.user?.name || '未設定'}
                </Typography>
                <Typography variant="body2">
                  <strong>メール:</strong> {testSession.user?.email}
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
        </Grid>

        {/* 投稿統計カード */}
        <Grid size={{ xs: 12, md: 4 }}>
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
        </Grid>

        {/* アクティビティカード */}
        <Grid size={{ xs: 12, md: 4 }}>
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
                  <strong>アカウント作成日:</strong> {new Date().toLocaleDateString('ja-JP')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* クイックアクション */}
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon />
              クイックアクション
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid>
                <Chip
                  label="新規投稿を作成"
                  component="a"
                  href="/posts/new"
                  clickable
                  color="primary"
                  variant="outlined"
                />
              </Grid>
              <Grid>
                <Chip
                  label="プロフィールを編集"
                  component="a"
                  href="/profile"
                  clickable
                  color="primary"
                  variant="outlined"
                />
              </Grid>
              <Grid>
                <Chip
                  label="投稿一覧を見る"
                  component="a"
                  href="/"
                  clickable
                  color="primary"
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* MUI修正確認メッセージ */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
        <Typography variant="h6" color="success.dark">
          ✅ MUI修正確認ポイント
        </Typography>
        <Typography variant="body2" color="success.dark" sx={{ mt: 1 }}>
          • Grid v2 (.MuiGrid2-container) を使用<br/>
          • item, xs, md プロパティを size プロパティに変更<br/>
          • HTML構造: &lt;p&gt;タグ内に&lt;div&gt;(Chip)が含まれないよう修正<br/>
          • ステータスChipをBoxコンポーネントで囲む構造に変更
        </Typography>
      </Box>
    </Container>
  );
}