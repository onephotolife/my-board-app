import { redirect } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import Link from 'next/link';

import { auth } from '@/lib/auth';

import PasswordChangeForm from './PasswordChangeForm';

export default async function ChangePasswordPage() {
  // サーバー側で認証チェック
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=%2Fprofile%2Fchange-password');
  }

  if (!session.user.emailVerified) {
    redirect('/auth/email-not-verified');
  }
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="sm">
        {/* ヘッダーナビゲーション */}
        <Box sx={{ mb: 4 }}>
          <Breadcrumbs sx={{ mb: 2 }}>
            <MuiLink 
              component={Link} 
              href="/dashboard" 
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              ダッシュボード
            </MuiLink>
            <MuiLink 
              component={Link} 
              href="/profile" 
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              プロフィール
            </MuiLink>
            <Typography color="text.primary">パスワード変更</Typography>
          </Breadcrumbs>
        </Box>

        {/* メインコンテンツ */}
        <Paper 
          elevation={3}
          sx={{ 
            p: 4,
            borderRadius: 2,
            background: 'white'
          }}
        >
          {/* タイトル部分 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton 
              component={Link}
              href="/profile" 
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <SecurityIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              パスワード変更
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            セキュリティのため、定期的にパスワードを変更することをお勧めします。
            新しいパスワードは、大文字、小文字、数字、特殊文字を含む8文字以上で設定してください。
          </Typography>

          {/* パスワード変更フォーム（クライアントコンポーネント） */}
          <PasswordChangeForm userEmail={session.user.email!} />
        </Paper>

        {/* セキュリティ情報 */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <SecurityIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
            パスワード変更後は、セキュリティのため再度ログインが必要になる場合があります。
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}