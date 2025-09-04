'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Divider,
  Button,
  CircularProgress,
  Skeleton,
  Alert,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Person as PersonIcon,
  Favorite as FavoriteIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

import type { Notification } from '@/types/sns';

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { data: session } = useSession();
  const listRef = useRef<HTMLDivElement>(null);

  // 初期データ取得
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // リアルタイム通知（CustomEvent）を反映
  useEffect(() => {
    if (!session?.user?.id) return;

    const handleNewNotification = (event: Event) => {
      const custom = event as CustomEvent;
      const newNotification = custom.detail;
      if (!newNotification) return;
      setNotifications((prev) => {
        // 重複防止
        if (prev.some((n) => n._id === newNotification._id)) return prev;
        return [newNotification, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    const handleUnreadCountUpdate = (event: Event) => {
      const custom = event as CustomEvent;
      const newUnreadCount = custom.detail;
      if (typeof newUnreadCount === 'number' && !Number.isNaN(newUnreadCount)) {
        setUnreadCount(newUnreadCount);
      }
    };

    window.addEventListener('notification:new', handleNewNotification as EventListener);
    window.addEventListener('notification:count', handleUnreadCountUpdate as EventListener);

    return () => {
      window.removeEventListener('notification:new', handleNewNotification as EventListener);
      window.removeEventListener('notification:count', handleUnreadCountUpdate as EventListener);
    };
  }, [session?.user?.id]);

  // 通知取得
  const fetchNotifications = async (pageNum = 1) => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notifications?page=${pageNum}&limit=20`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('通知の取得に失敗しました');
      }

      const data = await response.json();

      if (pageNum === 1) {
        setNotifications(data.data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.data.notifications]);
      }

      setUnreadCount(data.data.unreadCount);
      setHasMore(data.data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Notification fetch error:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  // 既読処理
  const markAsRead = async (notificationIds?: string[]) => {
    if (!session?.user?.id) return;

    try {
      const csrfMeta = document.querySelector('meta[name="app-csrf-token"]');
      const csrfToken = csrfMeta?.getAttribute('content');

      // 送信ペイロードを組み立て（空配列は送らない）
      let finalIds: string[] | undefined = undefined;
      if (notificationIds && notificationIds.length > 0) {
        const coerced = notificationIds.map((id) => String(id));
        const valid = coerced.filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
        if (valid.length > 0) {
          finalIds = valid;
        }
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: finalIds ? JSON.stringify({ notificationIds: finalIds }) : undefined,
      });

      if (!response.ok) {
        throw new Error('既読処理に失敗しました');
      }

      const data = await response.json();
      setUnreadCount(data.data.unreadCount);

      // 対象通知を既読状態に更新
      if (finalIds) {
        setNotifications((prev) =>
          prev.map((n) =>
            finalIds!.includes(n._id) ? { ...n, isRead: true, readAt: new Date() } : n
          )
        );
      } else {
        // 全て既読
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date() })));
      }
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  // 通知アイコン取得
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <PersonIcon />;
      case 'like':
        return <FavoriteIcon />;
      case 'comment':
        return <CommentIcon />;
      case 'repost':
      case 'mention':
        return <ShareIcon />;
      default:
        return <InfoIcon />;
    }
  };

  // 通知色取得
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow':
        return 'primary.main';
      case 'like':
        return 'error.main';
      case 'comment':
        return 'info.main';
      case 'repost':
      case 'mention':
        return 'success.main';
      default:
        return 'grey.500';
    }
  };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // 開いた時に最新データを取得
    fetchNotifications(1);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleScroll = () => {
    if (!listRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      fetchNotifications(page + 1);
    }
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          color: 'text.primary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
        aria-label="通知"
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              height: 20,
              minWidth: 20,
            },
          }}
        >
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* ヘッダー */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            通知
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount}件の未読`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {/* 通知リスト */}
        <Box
          ref={listRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {loading && notifications.length === 0 ? (
            // スケルトンローディング
            <List>
              {[1, 2, 3].map((i) => (
                <ListItem key={i} sx={{ py: 2 }}>
                  <ListItemAvatar>
                    <Skeleton variant="circular" width={40} height={40} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Skeleton variant="text" width="80%" />}
                    secondary={<Skeleton variant="text" width="60%" />}
                  />
                </ListItem>
              ))}
            </List>
          ) : notifications.length === 0 ? (
            // 通知なし
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <NotificationsNoneIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography>通知はありません</Typography>
            </Box>
          ) : (
            // 通知リスト
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={`${notification._id}-${index}`}>
                  <ListItem
                    sx={{
                      py: 2,
                      px: 2,
                      backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      },
                      cursor: 'pointer',
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={notification.actor.avatar}
                        sx={{
                          bgcolor: getNotificationColor(notification.type),
                        }}
                      >
                        {notification.actor.avatar ? null : getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" component="span">
                            {notification.message}
                          </Typography>
                          {!notification.isRead && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: ja,
                            })}
                          </Typography>
                          {notification.isRead && (
                            <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
              {loading && hasMore && (
                <ListItem sx={{ py: 2, justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </ListItem>
              )}
            </List>
          )}
        </Box>

        {/* フッター */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Button size="small" onClick={() => markAsRead()} disabled={unreadCount === 0}>
              すべて既読にする
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
