'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  List,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import PostForm from '@/components/PostForm';
import PostItem from '@/components/PostItem';
import EditDialog from '@/components/EditDialog';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      if (data.success) {
        setPosts(data.data);
      } else {
        setError('投稿の取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setError('投稿の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (title: string, content: string, author: string) => {
    setError('');
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content, author }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPosts([data.data, ...posts]);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      setError('投稿の作成に失敗しました');
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (content: string) => {
    if (!editingPost) return;
    setError('');

    try {
      const response = await fetch(`/api/posts/${editingPost._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPosts(posts.map(p => p._id === editingPost._id ? data.data : p));
        setIsEditDialogOpen(false);
        setEditingPost(null);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to update post:', error);
      setError('投稿の更新に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('この投稿を削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPosts(posts.filter(p => p._id !== id));
      } else {
        setError('投稿の削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      setError('投稿の削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <Container 
        maxWidth="md" 
        sx={{ 
          mt: { xs: 2, sm: 3, md: 4 },
          display: 'flex', 
          justifyContent: 'center',
          minHeight: '100vh',
          alignItems: 'center'
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

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
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <PostForm onSubmit={handleSubmit} />

      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {posts.map((post, index) => (
          <Box key={post._id}>
            <PostItem
              post={post}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            {index < posts.length - 1 && <Divider />}
          </Box>
        ))}
      </List>

      <EditDialog
        open={isEditDialogOpen}
        post={editingPost}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={handleUpdate}
      />
    </Container>
  );
}