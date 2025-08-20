'use client';

import { useSearchParams } from 'next/navigation';
import { Container, Paper, Typography, Button, Box, Alert } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Link from 'next/link';
import { Suspense } from 'react';
import { getAuthErrorMessage } from '@/lib/auth-errors';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorInfo = () => {
    const errorInfo = getAuthErrorMessage(error);
    return errorInfo;
  };
  
  const errorInfo = getErrorInfo();

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
          <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
          
          <Typography component="h1" variant="h5" gutterBottom>
            {errorInfo.title}
          </Typography>
          
          <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
            {errorInfo.message}
          </Alert>
          
          {errorInfo.action && (
            <Alert severity="info" sx={{ mb: 3 }}>
              💡 {errorInfo.action}
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            エラーコード: {error || 'UNKNOWN'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Link href="/auth/signin" passHref style={{ textDecoration: 'none' }}>
              <Button variant="contained">
                ログインページへ
              </Button>
            </Link>
            <Link href="/" passHref style={{ textDecoration: 'none' }}>
              <Button variant="outlined">
                ホームへ戻る
              </Button>
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}