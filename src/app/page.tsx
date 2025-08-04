import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BoardClient from '@/components/BoardClient';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

// サーバーサイドでデータベースから直接取得（キャッシュ付き）
const getPosts = unstable_cache(
  async () => {
    try {
      await dbConnect();
      const posts = await Post.find({})
        .sort({ createdAt: -1 })
        .limit(20) // 初期表示は20件まで
        .lean() // パフォーマンス向上のためlean()を使用
        .exec();
      
      // シリアライズ可能な形式に変換
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (posts as any[]).map((post) => ({
        _id: post._id.toString(),
        title: post.title || '',
        content: post.content || '',
        author: post.author || '',
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  },
  ['posts'],
  { revalidate: 60, tags: ['posts'] }
);

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