'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Stack, 
  Alert, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Grid 
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import RefreshIcon from '@mui/icons-material/Refresh';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

import { useSNSStore } from '@/store/sns-store';
import { useTimelineQuery, useLikeMutation, useNotificationsQuery } from '@/hooks/sns/useReactQuerySNS';
import { useSNSContext } from '@/contexts/SNSContext.v2';

export default function SNSIntegrationTest() {
  const { isConnected, connectionStatus, connect, disconnect } = useSNSContext();
  const { currentUser, featureFlags, unreadNotificationCount } = useSNSStore();
  
  // React Query Hooks
  const timelineQuery = useTimelineQuery('home');
  const notificationsQuery = useNotificationsQuery();
  const likeMutation = useLikeMutation();
  
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'success' | 'error'>>({
    socket: 'pending',
    reactQuery: 'pending',
    zustand: 'pending',
    timeline: 'pending',
    notifications: 'pending',
  });

  // Connection Test
  useEffect(() => {
    setTestResults(prev => ({
      ...prev,
      socket: isConnected ? 'success' : connectionStatus === 'error' ? 'error' : 'pending',
    }));
  }, [isConnected, connectionStatus]);

  // React Query Test
  useEffect(() => {
    if (timelineQuery.data || notificationsQuery.data) {
      setTestResults(prev => ({
        ...prev,
        reactQuery: 'success',
      }));
    } else if (timelineQuery.error || notificationsQuery.error) {
      setTestResults(prev => ({
        ...prev,
        reactQuery: 'error',
      }));
    }
  }, [timelineQuery.data, timelineQuery.error, notificationsQuery.data, notificationsQuery.error]);

  // Zustand Store Test
  useEffect(() => {
    if (currentUser) {
      setTestResults(prev => ({
        ...prev,
        zustand: 'success',
      }));
    }
  }, [currentUser]);

  // Timeline Data Test
  useEffect(() => {
    if (timelineQuery.data?.pages?.[0]?.posts) {
      setTestResults(prev => ({
        ...prev,
        timeline: 'success',
      }));
    } else if (timelineQuery.error) {
      setTestResults(prev => ({
        ...prev,
        timeline: 'error',
      }));
    }
  }, [timelineQuery.data, timelineQuery.error]);

  // Notifications Test
  useEffect(() => {
    if (notificationsQuery.data?.pages?.[0]?.notifications) {
      setTestResults(prev => ({
        ...prev,
        notifications: 'success',
      }));
    } else if (notificationsQuery.error) {
      setTestResults(prev => ({
        ...prev,
        notifications: 'error',
      }));
    }
  }, [notificationsQuery.data, notificationsQuery.error]);

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch(status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon color="warning" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch(status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'warning';
    }
  };

  const handleTestLike = async (postId: string, isLiked: boolean) => {
    try {
      await likeMutation.mutateAsync({
        postId,
        action: isLiked ? 'unlike' : 'like',
      });
    } catch (error) {
      console.error('Like test failed:', error);
    }
  };

  const handleRefreshAll = () => {
    timelineQuery.refetch();
    notificationsQuery.refetch();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        SNS統合テスト
      </Typography>

      {/* 接続状態 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          接続状態
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6}>
            <Stack direction="row" spacing={1} alignItems="center">
              {getStatusIcon(testResults.socket)}
              <Typography>Socket.io: {connectionStatus}</Typography>
            </Stack>
          </Grid>
          <Grid item xs={6}>
            <Stack direction="row" spacing={1}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={connect}
                disabled={isConnected}
                size="small"
              >
                接続
              </Button>
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={disconnect}
                disabled={!isConnected}
                size="small"
              >
                切断
              </Button>
              <Button
                variant="outlined"
                onClick={handleRefreshAll}
                startIcon={<RefreshIcon />}
                size="small"
              >
                更新
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* テスト結果 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          システムテスト結果
        </Typography>
        <List>
          {Object.entries(testResults).map(([key, status]) => (
            <ListItem key={key}>
              <ListItemText
                primary={(
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getStatusIcon(status)}
                    <Typography>{key.toUpperCase()}</Typography>
                    <Chip 
                      label={status} 
                      color={getStatusColor(status)}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                )}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* タイムライン表示 */}
      {featureFlags.timeline && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            タイムラインデータ（React Query）
          </Typography>
          
          {timelineQuery.isLoading && <CircularProgress size={20} />}
          
          {timelineQuery.error && (
            <Alert severity="error">
              {(timelineQuery.error as Error).message}
            </Alert>
          )}
          
          {timelineQuery.data?.pages?.[0]?.posts && (
            <List>
              {timelineQuery.data.pages.flatMap(page => page.posts).slice(0, 3).map((post) => (
                <React.Fragment key={post._id}>
                  <ListItem>
                    <ListItemText
                      primary={post.content}
                      secondary={(
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption">
                            {new Date(post.createdAt).toLocaleString('ja-JP')}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => handleTestLike(post._id, !!post.isLiked)}
                            startIcon={post.isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                            disabled={likeMutation.isPending}
                          >
                            {post.engagement.likes}
                          </Button>
                        </Stack>
                      )}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
          
          {timelineQuery.hasNextPage && (
            <Button 
              onClick={() => timelineQuery.fetchNextPage()}
              disabled={timelineQuery.isFetchingNextPage}
              fullWidth
              sx={{ mt: 1 }}
            >
              {timelineQuery.isFetchingNextPage ? '読み込み中...' : 'もっと読む'}
            </Button>
          )}
        </Paper>
      )}

      {/* 通知表示 */}
      {featureFlags.notifications && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            通知（未読: {unreadNotificationCount}）
          </Typography>
          
          {notificationsQuery.isLoading && <CircularProgress size={20} />}
          
          {notificationsQuery.error && (
            <Alert severity="error">
              {(notificationsQuery.error as Error).message}
            </Alert>
          )}
          
          {notificationsQuery.data?.pages?.[0]?.notifications && (
            <List>
              {notificationsQuery.data.pages.flatMap(page => page.notifications).slice(0, 3).map((notification) => (
                <React.Fragment key={notification._id}>
                  <ListItem>
                    <ListItemText
                      primary={notification.message}
                      secondary={(
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={notification.type}
                            size="small"
                            color={notification.isRead ? 'default' : 'primary'}
                          />
                          <Typography variant="caption">
                            {new Date(notification.createdAt).toLocaleString('ja-JP')}
                          </Typography>
                        </Stack>
                      )}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}