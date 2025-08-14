'use client';

import { Box, Typography, Button, Container } from '@mui/material';
import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';

export default function NotFound() {
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
        <Typography
          variant="h1"
          sx={{
            fontSize: '6rem',
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
          }}
        >
          404
        </Typography>
        
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ mb: 2, fontWeight: 500 }}
        >
          ページが見つかりません
        </Typography>
        
        <Typography
          variant="body1"
          color="text.secondary"
          paragraph
          sx={{ mb: 4, maxWidth: '400px' }}
        >
          お探しのページは移動または削除された可能性があります。
          URLをご確認いただくか、ホームページからお探しください。
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            component={Link}
            href="/"
            variant="contained"
            startIcon={<HomeIcon />}
            size="large"
          >
            ホームに戻る
          </Button>
          
          <Button
            component={Link}
            href="/board"
            variant="outlined"
            startIcon={<SearchIcon />}
            size="large"
          >
            掲示板を見る
          </Button>
        </Box>
        
        <Box
          sx={{
            mt: 6,
            p: 2,
            borderRadius: 1,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            エラーコード: 404 | Not Found
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}