'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket, useRealtimeUpdates } from '@/lib/socket/client';
import { Alert, Snackbar, Chip, Box } from '@mui/material';
import { WifiTethering, WifiTetheringOff } from '@mui/icons-material';

interface RealtimeBoardWrapperProps {
  children: React.ReactNode;
  onNewPost?: (post: any) => void;
  onPostUpdated?: (post: any) => void;
  onPostDeleted?: (postId: string) => void;
  onPostLiked?: (data: any) => void;
}

export default function RealtimeBoardWrapper({
  children,
  onNewPost,
  onPostUpdated,
  onPostDeleted,
  onPostLiked,
}: RealtimeBoardWrapperProps) {
  const { isConnected, typingUsers, onlineUsers } = useSocket();
  const [notification, setNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  const handleNewPost = useCallback((data: any) => {
    console.log('📝 New post in wrapper:', data);
    setNotification(`${data.author.name}さんが新しい投稿を作成しました`);
    setShowNotification(true);
    onNewPost?.(data.post);
  }, [onNewPost]);

  const handlePostUpdated = useCallback((data: any) => {
    console.log('✏️ Post updated in wrapper:', data);
    setNotification(`${data.author.name}さんが投稿を編集しました`);
    setShowNotification(true);
    onPostUpdated?.(data.post);
  }, [onPostUpdated]);

  const handlePostDeleted = useCallback((data: any) => {
    console.log('🗑️ Post deleted in wrapper:', data);
    setNotification(`${data.author.name}さんが投稿を削除しました`);
    setShowNotification(true);
    onPostDeleted?.(data.postId);
  }, [onPostDeleted]);

  const handlePostLiked = useCallback((data: any) => {
    console.log('❤️ Post liked in wrapper:', data);
    onPostLiked?.(data);
  }, [onPostLiked]);

  useRealtimeUpdates({
    onNewPost: handleNewPost,
    onPostUpdated: handlePostUpdated,
    onPostDeleted: handlePostDeleted,
    onPostLiked: handlePostLiked,
  });

  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  return (
    <>
      <Box sx={{ position: 'fixed', top: 70, right: 20, zIndex: 1000 }}>
        <Chip
          icon={isConnected ? <WifiTethering /> : <WifiTetheringOff />}
          label={isConnected ? 'リアルタイム接続中' : 'オフライン'}
          color={isConnected ? 'success' : 'default'}
          variant="outlined"
          size="small"
        />
        {onlineUsers.length > 0 && (
          <Chip
            label={`オンライン: ${onlineUsers.length}人`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ ml: 1 }}
          />
        )}
      </Box>

      {typingUsers.size > 0 && (
        <Box sx={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1000 }}>
          {Array.from(typingUsers.values()).map((userName, index) => (
            <Chip
              key={index}
              label={`${userName}さんが入力中...`}
              color="info"
              variant="filled"
              size="small"
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Box>
      )}

      {children}

      <Snackbar
        open={showNotification}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity="info" sx={{ width: '100%' }}>
          {notification}
        </Alert>
      </Snackbar>
    </>
  );
}