'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Container,
  Typography,
  Paper,
  Button
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LoginIcon from '@mui/icons-material/Login';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireEmailVerified?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * 認証ガードコンポーネント
 * ページレベルまたはコンポーネントレベルで認証保護を提供
 */
export default function AuthGuard({
  children,
  requireAuth = true,
  requireEmailVerified = true,
  redirectTo = '/auth/signin',
  fallback
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    // 認証が必要で、セッションがない場合
    if (requireAuth && !session) {
      const callbackUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?callbackUrl=${callbackUrl}`);
      return;
    }

    // メール確認が必要で、未確認の場合
    if (requireAuth && requireEmailVerified && session && !(session.user as any)?.emailVerified) {
      router.push('/auth/verify-email');
      return;
    }
  }, [session, status, requireAuth, requireEmailVerified, redirectTo, pathname, router]);

  // ローディング中
  if (status === 'loading') {
    return fallback || (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            読み込み中...
          </Typography>
        </Box>
      </Container>
    );
  }

  // 認証が必要で、セッションがない場合
  if (requireAuth && !session) {
    return fallback || (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            ログインが必要です
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            このページにアクセスするにはログインが必要です
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<LoginIcon />}
            onClick={() => {
              const callbackUrl = encodeURIComponent(pathname);
              router.push(`${redirectTo}?callbackUrl=${callbackUrl}`);
            }}
          >
            ログインページへ
          </Button>
        </Paper>
      </Container>
    );
  }

  // メール確認が必要で、未確認の場合
  if (requireAuth && requireEmailVerified && session && !(session.user as any)?.emailVerified) {
    return fallback || (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            メール確認が必要です
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            アカウントのメールアドレスを確認してください
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push('/auth/verify-email')}
          >
            メール確認ページへ
          </Button>
        </Paper>
      </Container>
    );
  }

  // 認証条件を満たしている場合、子コンポーネントを表示
  return <>{children}</>;
}

/**
 * 使用例:
 * 
 * // ページ全体を保護
 * <AuthGuard>
 *   <YourProtectedComponent />
 * </AuthGuard>
 * 
 * // カスタムオプション
 * <AuthGuard 
 *   requireEmailVerified={false}
 *   redirectTo="/custom-login"
 *   fallback={<CustomLoadingComponent />}
 * >
 *   <YourComponent />
 * </AuthGuard>
 * 
 * // 認証不要（条件付きレンダリング用）
 * <AuthGuard requireAuth={false}>
 *   <PublicComponent />
 * </AuthGuard>
 */