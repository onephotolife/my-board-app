import { Suspense } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BoardClient from '@/components/BoardClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// サーバーサイドでデータを取得
async function getPosts() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000');
    
    const res = await fetch(`${baseUrl}/api/posts`, {
      cache: 'no-store'  // 常に最新のデータを取得
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch posts');
    }
    
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export default async function Home() {
  const initialPosts = await getPosts();

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
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ 
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
          textAlign: { xs: 'center', sm: 'left' }
        }}
      >
        オープン掲示板
      </Typography>
      
      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      }>
        <BoardClient initialPosts={initialPosts} />
      </Suspense>
    </Container>
  );
}