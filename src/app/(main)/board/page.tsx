'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Pagination,
  CircularProgress,
  Alert,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EnhancedPostCard from '@/components/EnhancedPostCard';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorName: string;
  authorEmail?: string;
  authorInfo?: {
    name: string;
    email: string;
    avatar?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BoardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editPostId = searchParams?.get('edit');
  
  // デバッグ用ログ
  useEffect(() => {
    if (session) {
      console.log('Board Page Session:', {
        userId: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
      });
    }
  }, [session]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 投稿一覧を取得（認証必須）
  const fetchPosts = async (page: number = 1) => {
    setLoading(true);
    setError('');
    
    try {
      // キャッシュを無効化してリアルタイムデータを取得
      const timestamp = Date.now();
      const response = await fetch(`/api/posts?page=${page}&limit=10&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const data = await response.json();
      
      if (data.requireAuth) {
        // 認証が必要な場合
        console.log('認証が必要です');
        setError('この掲示板は会員限定です。ログインしてください。');
        setPosts([]);
        return;
      }
      
      if (data.error && response.status === 500) {
        throw new Error(data.error);
      }
      
      console.log(`投稿取得成功: ${data.posts?.length || 0}件`);
      // APIレスポンスをコンポーネント用の形式に変換
      const formattedPosts = (data.posts || []).map((post: any) => ({
        ...post,
        authorName: post.authorInfo?.name || post.authorName || '名無し',
        authorEmail: post.authorInfo?.email || post.authorEmail,
      }));
      setPosts(formattedPosts);
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError('投稿の読み込みに失敗しました');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // セッションストレージにデータを保存
  useEffect(() => {
    if (posts.length > 0) {
      sessionStorage.setItem('boardPosts', JSON.stringify({
        posts,
        timestamp: Date.now(),
        pagination,
      }));
    }
  }, [posts, pagination]);

  // 初回ロード時にセッションストレージから復元
  useEffect(() => {
    const cached = sessionStorage.getItem('boardPosts');
    if (cached) {
      const { posts: cachedPosts, timestamp, pagination: cachedPagination } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      // 5分以内のキャッシュは使用
      if (age < 5 * 60 * 1000) {
        setPosts(cachedPosts);
        setPagination(cachedPagination);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // 認証状態が確定してから投稿を取得
    if (status === 'loading') {
      console.log('認証状態を確認中...');
      return;
    }
    
    if (status === 'unauthenticated') {
      console.log('未認証状態');
      setError('ログインが必要です');
      setLoading(false);
      return;
    }
    
    if (status === 'authenticated') {
      console.log('認証済み、投稿を取得します');
      fetchPosts();
    }
  }, [status]);

  // 編集パラメータがある場合、該当する投稿を取得して編集ダイアログを開く
  useEffect(() => {
    if (editPostId && posts.length > 0) {
      // 投稿リストから編集対象を探す
      const postToEdit = posts.find(p => p._id === editPostId);
      if (postToEdit) {
        setEditingPost(postToEdit);
        setFormData({
          title: postToEdit.title,
          content: postToEdit.content,
        });
        setOpenDialog(true);
      } else {
        // 投稿リストにない場合はAPIから取得
        fetchSinglePost(editPostId);
      }
    }
  }, [editPostId, posts.length]); // postsの長さのみを依存配列に含める

  // 単一の投稿を取得
  const fetchSinglePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error('投稿の取得に失敗しました');
      }
      
      const post = await response.json();
      // 取得した投稿で編集ダイアログを開く（直接stateを更新）
      setEditingPost(post);
      setFormData({
        title: post.title,
        content: post.content,
      });
      setOpenDialog(true);
    } catch (err) {
      console.error('投稿取得エラー:', err);
      setError('編集する投稿が見つかりません');
    }
  };

  // 新規投稿/編集ダイアログを開く
  const handleOpenDialog = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        content: post.content,
      });
    } else {
      setEditingPost(null);
      setFormData({ title: '', content: '' });
    }
    setOpenDialog(true);
    // フォーカスをダイアログに移動させるため、FABからフォーカスを外す
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPost(null);
    setFormData({ title: '', content: '' });
    
    // 編集パラメータがある場合はURLから削除
    if (editPostId) {
      router.push('/board');
    }
  };

  // 投稿を保存（リアルタイム更新対応）
  const handleSave = async () => {
    // 既に保存中の場合は処理しない
    if (saving) return;
    
    try {
      // フォームデータの検証
      if (!formData.title || !formData.content) {
        setError('タイトルと内容は必須です');
        return;
      }

      setSaving(true); // 保存開始
      console.log('送信するデータ:', formData);
      console.log('編集中の投稿ID:', editingPost?._id);

      const url = editingPost
        ? `/api/posts/${editingPost._id}`
        : '/api/posts';
      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('APIエラーレスポンス:', errorData);
        if (errorData.details) {
          // バリデーションエラーの詳細を表示
          const errorMessages = errorData.details.map((d: any) => d.message).join(', ');
          throw new Error(errorMessages || errorData.error || '保存に失敗しました');
        }
        throw new Error(errorData.error || '保存に失敗しました');
      }
      
      const data = await response.json();
      const savedPost = data.post || data;
      
      // _idフィールドの確認（MongoDBの_idまたはidを使用）
      if (!savedPost._id && savedPost.id) {
        savedPost._id = savedPost.id;
      }
      
      // レスポンスデータをコンポーネント用の形式に変換
      const formattedPost = {
        ...savedPost,
        _id: savedPost._id || savedPost.id, // _idを確実に設定
        authorName: savedPost.authorInfo?.name || savedPost.authorName || session?.user?.name || '名無し',
        authorEmail: savedPost.authorInfo?.email || savedPost.authorEmail || session?.user?.email,
      };
      
      // _idが存在することを確認
      if (!formattedPost._id) {
        console.error('投稿にIDが設定されていません:', formattedPost);
        // 一時的なIDを生成
        formattedPost._id = `temp-${Date.now()}`;
      }
      
      // リアルタイム更新
      if (editingPost) {
        // 編集の場合
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === formattedPost._id ? formattedPost : post
          )
        );
      } else {
        // 新規投稿の場合 - 重複を防ぐ
        setPosts(prevPosts => {
          // 既に同じIDの投稿が存在しないか確認
          const exists = prevPosts.some(p => p._id === formattedPost._id);
          if (exists) {
            console.warn('重複する投稿を検出、スキップします:', formattedPost._id);
            return prevPosts;
          }
          return [formattedPost, ...prevPosts];
        });
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
        
        // 確実にするため、少し遅れて再取得
        setTimeout(() => {
          fetchPosts(1);
        }, 500);
      }

      handleCloseDialog();
      setSaving(false); // 保存完了
    } catch (error) {
      console.error('投稿の保存エラー:', error);
      setError(error instanceof Error ? error.message : '保存に失敗しました');
      setSaving(false); // エラー時もリセット
    }
  };

  // 削除ダイアログを開く
  const handleDeleteClick = (id: string) => {
    console.log('削除ボタンクリック:', id);
    setPostToDelete(id);
    setDeleteDialogOpen(true);
  };

  // 削除をキャンセル
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPostToDelete(null);
  };

  // 投稿を削除（確認後）
  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/posts/${postToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('削除に失敗しました');
      
      // リアルタイム削除
      setPosts(prevPosts => prevPosts.filter(post => post._id !== postToDelete));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      
      // ダイアログを閉じる
      handleDeleteCancel();
    } catch {
      setError('削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  // ページ変更
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    fetchPosts(value);
  };

  return (
    <AuthGuard>
      <>
      <Container 
        maxWidth="md" 
        sx={{ 
          mt: 4, 
          mb: 4,
          position: 'relative',
          zIndex: 1,
          isolation: 'isolate',
        }}
        id="board-content"
        className="board-container"
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress size={60} />
          </Box>
        ) : posts.length === 0 ? (
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              まだ投稿がありません
            </Typography>
            <Typography variant="body2" color="text.secondary">
              最初の投稿を作成してみましょう！
            </Typography>
          </Paper>
        ) : (
          <Box>
            {posts.map((post, index) => (
              <EnhancedPostCard
                key={post._id || `post-${index}-${Date.now()}`}
                post={post}
                currentUserId={session?.user?.id || session?.user?.email}
                onEdit={handleOpenDialog}
                onDelete={handleDeleteClick}
              />
            ))}
          </Box>
        )}
        
        {pagination.totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              size="large"
            />
          </Box>
        )}
      </Container>
      </>

      {/* FABボタン - AuthGuardの直下、main要素の外に配置 */}
      {session && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => handleOpenDialog()}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1100,
          }}
        >
          <AddIcon />
        </Fab>
      )}
      
      {/* 投稿作成/編集ダイアログ - 強制的に中央配置 */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm"
        fullWidth
        aria-labelledby="post-dialog-title"
        aria-describedby="post-dialog-description"
        PaperProps={{
          style: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            maxHeight: '90vh',
            width: '90%',
            maxWidth: '600px',
          }
        }}
      >
        <DialogTitle id="post-dialog-title">
            {editingPost ? '投稿を編集' : '新規投稿'}
          </DialogTitle>
          <DialogContent id="post-dialog-description">
            <TextField
              autoFocus
              margin="dense"
              label="タイトル"
              fullWidth
              variant="outlined"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
              inputProps={{
                maxLength: 100,
                'aria-label': 'タイトル',
              }}
              helperText={`${formData.title.length}/100文字`}
              required
              error={formData.title.length > 100}
            />
            <TextField
              margin="dense"
              label="内容"
              fullWidth
              multiline
              rows={6}
              variant="outlined"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              inputProps={{ 
                maxLength: 1000,
                'aria-label': '内容',
              }}
              helperText={`${formData.content.length}/1000文字`}
              required
              error={formData.content.length > 1000}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!formData.title || !formData.content || saving}
            >
              {saving ? '保存中...' : (editingPost ? '更新' : '投稿')}
            </Button>
          </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="xs"
        fullWidth
        PaperProps={{
          style: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            zIndex: 2147483647,
          }
        }}
        sx={{
          '& .MuiBackdrop-root': {
            zIndex: 2147483646,
          },
        }}
      >
        <DialogTitle id="delete-dialog-title">
          投稿を削除しますか？
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            この操作は取り消すことができません。本当にこの投稿を削除してもよろしいですか？
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleDeleteCancel}
            disabled={deleting}
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </AuthGuard>
  );
}