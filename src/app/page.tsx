import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Link from 'next/link';

export default function Home() {
  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        mt: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
        width: '100%',
        maxWidth: { xs: '100%', sm: '600px', md: '900px' }
      }}
    >
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 'bold',
            mb: 3
          }}
        >
          会員制掲示板へようこそ
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          会員限定の安全なコミュニティで情報を共有しましょう
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            この掲示板は会員限定です。利用するには登録とログインが必要です。
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/signin" passHref style={{ textDecoration: 'none' }}>
            <Button variant="contained" size="large" sx={{ minWidth: 150 }}>
              ログイン
            </Button>
          </Link>
          <Link href="/auth/signup" passHref style={{ textDecoration: 'none' }}>
            <Button variant="outlined" size="large" sx={{ minWidth: 150 }}>
              新規登録
            </Button>
          </Link>
        </Box>
        
        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            機能紹介
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'left' }}>
            • メールアドレス認証による安全な会員登録<br />
            • 会員のみが投稿・閲覧可能な掲示板<br />
            • 自分の投稿の編集・削除機能<br />
            • パスワードリセット機能<br />
            • セキュアなセッション管理
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}