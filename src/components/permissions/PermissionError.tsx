'use client';

import { Alert, AlertTitle, Box, Button, Paper, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import LockIcon from '@mui/icons-material/Lock';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface PermissionErrorProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  variant?: 'inline' | 'page';
}

export default function PermissionError({
  title = 'アクセス権限がありません',
  message = 'このページまたは機能にアクセスする権限がありません。',
  showHomeButton = true,
  showBackButton = true,
  variant = 'page'
}: PermissionErrorProps) {
  const router = useRouter();

  if (variant === 'inline') {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <LockIcon
            sx={{
              fontSize: 64,
              color: 'error.main',
              opacity: 0.8,
            }}
          />
        </Box>

        <Typography variant="h4" component="h1" gutterBottom color="error">
          {title}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {message}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {showBackButton && (
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
            >
              戻る
            </Button>
          )}
          {showHomeButton && (
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={() => router.push('/')}
            >
              ホームへ
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

// 403エラー専用コンポーネント
export function ForbiddenError() {
  return (
    <PermissionError
      title="403 - アクセス禁止"
      message="このリソースにアクセスする権限がありません。管理者にお問い合わせください。"
    />
  );
}

// 所有者限定エラー
export function OwnerOnlyError() {
  return (
    <PermissionError
      title="所有者限定"
      message="この操作はリソースの所有者のみが実行できます。"
      variant="inline"
    />
  );
}