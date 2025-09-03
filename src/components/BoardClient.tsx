'use client';

import { useState, useCallback, memo } from 'react';
import Alert from '@mui/material/Alert';
import dynamic from 'next/dynamic';

import { useSecureFetch } from '@/components/CSRFProvider';
import type { UnifiedPost} from '@/types/post';
import { normalizePostToUnified } from '@/types/post';

// 動的インポートでバンドルサイズを削減
const PostForm = dynamic(() => import('./PostForm'), { 
  ssr: false,
  loading: () => <div style={{ height: 200 }} />
});
const VirtualizedPostList = dynamic(() => import('./VirtualizedPostList'), { 
  ssr: false,
  loading: () => <div style={{ height: 400 }} />
});
const EditDialog = dynamic(() => import('./EditDialog'), { ssr: false });

interface BoardClientProps {
  initialPosts: UnifiedPost[];
}

const BoardClient = memo(function BoardClient({ initialPosts }: BoardClientProps) {
  const [posts, setPosts] = useState<UnifiedPost[]>(initialPosts);
  const [editingPost, setEditingPost] = useState<UnifiedPost | null>(null);
  const [error, setError] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const secureFetch = useSecureFetch();

  const handleSubmit = useCallback(async (title: string, content: string, author: string) => {
    setError('');
    
    try {
      const response = await secureFetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content, author }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const normalizedPost = normalizePostToUnified(data.data);
        setPosts(prev => [normalizedPost, ...prev]);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      setError('投稿の作成に失敗しました');
    }
  }, [secureFetch]);

  const handleEdit = useCallback((post: UnifiedPost) => {
    setEditingPost(post);
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdate = useCallback(async (content: string) => {
    if (!editingPost) return;
    setError('');

    try {
      const response = await secureFetch(`/api/posts/${editingPost._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const normalizedPost = normalizePostToUnified(data.data);
        setPosts(prev => prev.map(p => p._id === editingPost._id ? normalizedPost : p));
        setIsEditDialogOpen(false);
        setEditingPost(null);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to update post:', error);
      setError('投稿の更新に失敗しました');
    }
  }, [editingPost, secureFetch]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('この投稿を削除しますか？')) return;
    
    try {
      const response = await secureFetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPosts(prev => prev.filter(p => p._id !== id));
      } else {
        setError('投稿の削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      setError('投稿の削除に失敗しました');
    }
  }, [secureFetch]);

  const handleCloseDialog = useCallback(() => {
    setIsEditDialogOpen(false);
  }, []);

  const handleCloseError = useCallback(() => {
    setError('');
  }, []);

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={handleCloseError}>
          {error}
        </Alert>
      )}

      <PostForm onSubmit={handleSubmit} />

      <VirtualizedPostList
        posts={posts}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isEditDialogOpen && (
        <EditDialog
          open={isEditDialogOpen}
          post={editingPost}
          onClose={handleCloseDialog}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
});

export default BoardClient;