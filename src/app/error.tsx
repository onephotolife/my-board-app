'use client';

import { useEffect } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログサービスに送信（本番環境）
    if (process.env.NODE_ENV === 'production') {
      console.error('Application error:', error);
      // TODO: Sentryなどのエラー追跡サービスに送信
    }
  }, [error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 2,
            bgcolor: 'error.50',
            border: '1px solid',
            borderColor: 'error.200',
            mb: 4,
          }}
        >
          <ReportProblemIcon
            sx={{
              fontSize: 64,
              color: 'error.main',
              mb: 2,
            }}
          />
          
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ mb: 2, fontWeight: 500 }}
          >
            エラーが発生しました
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            paragraph
            sx={{ mb: 0 }}
          >
            申し訳ございません。予期しないエラーが発生しました。
            問題が続く場合は、サポートまでお問い合わせください。
          </Typography>
        </Paper>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            onClick={() => reset()}
            variant="contained"
            startIcon={<RefreshIcon />}
            size="large"
          >
            もう一度試す
          </Button>
          
          <Button
            href="/"
            component="a"
            variant="outlined"
            startIcon={<HomeIcon />}
            size="large"
          >
            ホームに戻る
          </Button>
        </Box>
        
        {process.env.NODE_ENV === 'development' && error.message && (
          <Paper
            sx={{
              mt: 4,
              p: 2,
              maxWidth: '100%',
              bgcolor: 'grey.100',
              border: '1px solid',
              borderColor: 'grey.300',
            }}
          >
            <Typography variant="caption" component="pre" sx={{ 
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
            }}>
              {error.message}
            </Typography>
            {error.digest && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Error ID: {error.digest}
              </Typography>
            )}
          </Paper>
        )}
        
        {process.env.NODE_ENV === 'production' && error.digest && (
          <Box
            sx={{
              mt: 4,
              p: 2,
              borderRadius: 1,
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              エラーID: {error.digest}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}