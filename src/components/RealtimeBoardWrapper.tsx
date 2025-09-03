'use client';

import { useEffect, useState, useCallback } from 'react';
import { Alert, Snackbar, Chip, Box } from '@mui/material';
import { WifiTethering, WifiTetheringOff } from '@mui/icons-material';

import { useSocket, useRealtimeUpdates } from '@/lib/socket/client';

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
    console.warn('📝 New post in wrapper:', data);
    setNotification(`${data.author.name}さんが新しい投稿を作成しました`);
    setShowNotification(true);
    onNewPost?.(data.post);
  }, [onNewPost]);

  const handlePostUpdated = useCallback((data: any) => {
    console.warn('✏️ Post updated in wrapper:', data);
    setNotification(`${data.author.name}さんが投稿を編集しました`);
    setShowNotification(true);
    onPostUpdated?.(data.post);
  }, [onPostUpdated]);

  const handlePostDeleted = useCallback((data: any) => {
    console.warn('🗑️ Post deleted in wrapper:', data);
    setNotification(`${data.author.name}さんが投稿を削除しました`);
    setShowNotification(true);
    onPostDeleted?.(data.postId);
  }, [onPostDeleted]);

  const handlePostLiked = useCallback((data: any) => {
    console.warn('❤️ Post liked in wrapper:', data);
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
      {/* オフライン/接続状態のチップを削除 */}

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