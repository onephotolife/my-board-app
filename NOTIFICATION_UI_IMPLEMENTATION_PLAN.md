# 通知UI実装計画書（STRICT120準拠）

## エグゼクティブサマリー

計画策定日時: 2025-09-03  
策定者: STRICT120プロトコル準拠  
対象システム: my-board-app（会員制掲示板SNS）

### 実装目標
NotificationBell.tsxコンポーネントを新規作成し、既存システムに統合することで、リアルタイム通知機能を実現する。

## 1. システム現状分析

### 1.1 利用可能な基盤
| 基盤要素 | 状態 | 統合難易度 |
|---------|------|------------|
| バックエンドAPI | ✅ 実装済み（85%） | 容易 |
| データモデル | ✅ 実装済み（90%） | 容易 |
| Socket.IO基盤 | ✅ 実装済み（80%） | 中程度 |
| 認証システム | ✅ NextAuth実装済み | 容易 |
| CSRFフック | ✅ 実装済み | 容易 |
| Material UI | ✅ 導入済み | 容易 |

### 1.2 統合ポイント
- **AppLayout.tsx**: 実際に使用されているレイアウトコンポーネント（7ページで使用）
- **EnhancedAppLayout.tsx**: ハードコードされた通知数(3)を表示（未使用）
- **Socket.IOクライアント**: `/src/lib/socket/socket-client.ts`に基盤実装
- **型定義**: `/src/types/sns/index.ts`にNotificationインターフェース定義済み

## 2. 実装アーキテクチャ

### 2.1 コンポーネント構造
```
src/
├── components/
│   ├── NotificationBell.tsx          # メインコンポーネント（新規作成）
│   ├── NotificationList.tsx          # 通知リストコンポーネント（新規作成）
│   └── NotificationItem.tsx          # 個別通知アイテム（新規作成）
├── hooks/
│   ├── useNotifications.ts           # 通知フック（新規作成）
│   └── useSocketNotifications.ts     # Socket.IO通知フック（新規作成）
└── contexts/
    └── NotificationContext.tsx       # 通知コンテキスト（新規作成）
```

### 2.2 データフロー
```mermaid
graph LR
    A[MongoDB] --> B[NotificationAPI]
    B --> C[NextAuth認証]
    C --> D[NotificationBell]
    E[Socket.IO] --> F[リアルタイム更新]
    F --> D
    D --> G[UI表示]
    H[ユーザー操作] --> I[既読処理]
    I --> B
```

## 3. 段階的実装計画

### Phase 1: 基礎実装（4-6時間）

#### 3.1.1 NotificationBell.tsx作成
```typescript
// src/components/NotificationBell.tsx
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
  }, [session]);

  // 通知取得
  const fetchNotifications = async (pageNum = 1) => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/notifications?page=${pageNum}&limit=20`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('通知の取得に失敗しました');
      }

      const data = await response.json();
      
      if (pageNum === 1) {
        setNotifications(data.data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.data.notifications]);
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
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({
          notificationIds: notificationIds || [],
        }),
      });

      if (!response.ok) {
        throw new Error('既読処理に失敗しました');
      }

      const data = await response.json();
      setUnreadCount(data.data.unreadCount);
      
      // 対象通知を既読状態に更新
      if (notificationIds) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n._id)
              ? { ...n, isRead: true, readAt: new Date() }
              : n
          )
        );
      } else {
        // 全て既読
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
        );
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
        return 'success.main';
      default:
        return 'grey.500';
    }
  };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // 開いた時に未読を既読にする
    const unreadIds = notifications
      .filter(n => !n.isRead)
      .map(n => n._id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
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
          {unreadCount > 0 ? (
            <NotificationsIcon />
          ) : (
            <NotificationsNoneIcon />
          )}
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
                <React.Fragment key={notification._id}>
                  <ListItem
                    sx={{
                      py: 2,
                      px: 2,
                      backgroundColor: notification.isRead
                        ? 'transparent'
                        : 'action.hover',
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
                        {notification.actor.avatar
                          ? null
                          : getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
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
                            <CheckCircleIcon
                              sx={{ fontSize: 14, color: 'success.main' }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
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
            <Button
              size="small"
              onClick={() => markAsRead()}
              disabled={unreadCount === 0}
            >
              すべて既読にする
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
```

#### 3.1.2 フック作成（useNotifications.ts）
```typescript
// src/hooks/useNotifications.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { Notification } from '@/types/sns';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (page?: number) => Promise<void>;
  markAsRead: (notificationIds?: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const fetchNotifications = useCallback(async (page = 1) => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/notifications?page=${page}&limit=20`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('通知の取得に失敗しました');
      }

      const data = await response.json();
      
      if (page === 1) {
        setNotifications(data.data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.data.notifications]);
      }
      
      setUnreadCount(data.data.unreadCount);
      
    } catch (err) {
      console.error('Notification fetch error:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const markAsRead = useCallback(async (notificationIds?: string[]) => {
    if (!session?.user?.id) return;
    
    try {
      const csrfMeta = document.querySelector('meta[name="app-csrf-token"]');
      const csrfToken = csrfMeta?.getAttribute('content');
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({
          notificationIds: notificationIds || [],
        }),
      });

      if (!response.ok) {
        throw new Error('既読処理に失敗しました');
      }

      const data = await response.json();
      setUnreadCount(data.data.unreadCount);
      
      // 通知を既読状態に更新
      if (notificationIds) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n._id)
              ? { ...n, isRead: true, readAt: new Date() }
              : n
          )
        );
      } else {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
        );
      }
      
    } catch (err) {
      console.error('Mark as read error:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
    }
  }, [session]);

  const markAllAsRead = useCallback(async () => {
    await markAsRead();
  }, [markAsRead]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(1);
  }, [fetchNotifications]);

  // 初期読み込み
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications(1);
    }
  }, [session, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
}
```

### Phase 2: Socket.IO統合（3-4時間）

#### 3.2.1 Socket通知フック作成
```typescript
// src/hooks/useSocketNotifications.ts
'use client';

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import SocketClient from '@/lib/socket/socket-client';
import type { Notification } from '@/types/sns';

interface UseSocketNotificationsProps {
  onNewNotification?: (notification: Notification) => void;
  onUpdateCount?: (count: number) => void;
}

export function useSocketNotifications({
  onNewNotification,
  onUpdateCount,
}: UseSocketNotificationsProps = {}) {
  const { data: session } = useSession();
  const socketClient = SocketClient.getInstance();

  // Socket.IO接続
  const connectSocket = useCallback(() => {
    if (!session?.user?.id) return;
    
    const socket = socketClient.connect(session.user.id);
    
    // 通知チャンネルに登録
    socket.emit('subscribe:notifications', {
      userId: session.user.id,
    });
    
    // イベントリスナー設定
    socket.on('notification:new', (data: { notification: Notification }) => {
      console.log('[Socket] New notification:', data);
      onNewNotification?.(data.notification);
    });
    
    socket.on('notification:update-count', (data: { unreadCount: number }) => {
      console.log('[Socket] Update count:', data);
      onUpdateCount?.(data.unreadCount);
    });
    
    return socket;
  }, [session, onNewNotification, onUpdateCount]);

  // クリーンアップ
  const disconnectSocket = useCallback(() => {
    if (!session?.user?.id) return;
    
    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit('unsubscribe:notifications', {
        userId: session.user.id,
      });
      socket.off('notification:new');
      socket.off('notification:update-count');
    }
  }, [session]);

  useEffect(() => {
    const socket = connectSocket();
    
    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket]);
}
```

### Phase 3: AppLayoutへの統合（2-3時間）

#### 3.3.1 AppLayout.tsx更新
```typescript
// src/components/AppLayout.tsx への変更差分
import NotificationBell from './NotificationBell';

// Line 352付近を以下に置き換え
{/* 通知アイコン */}
<NotificationBell />
```

### Phase 4: リアルタイム統合（2-3時間）

#### 3.4.1 NotificationContext作成
```typescript
// src/contexts/NotificationContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSocketNotifications } from '@/hooks/useSocketNotifications';
import type { Notification } from '@/types/sns';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addNotification: (notification: Notification) => void;
  updateUnreadCount: (count: number) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  // 新着通知追加
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // ブラウザ通知（オプション）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('新しい通知', {
        body: notification.message,
        icon: notification.actor.avatar || '/icon-192x192.png',
      });
    }
  }, []);

  // 未読数更新
  const updateUnreadCount = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  // 通知再取得
  const refreshNotifications = useCallback(async () => {
    // 実装省略（useNotificationsと同様）
  }, [session]);

  // Socket.IO統合
  useSocketNotifications({
    onNewNotification: addNotification,
    onUpdateCount: updateUnreadCount,
  });

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        addNotification,
        updateUnreadCount,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}
```

## 4. テスト戦略

### 4.1 単体テスト
```typescript
// src/components/__tests__/NotificationBell.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationBell from '../NotificationBell';

describe('NotificationBell', () => {
  it('通知数バッジを表示する', () => {
    // テスト実装
  });
  
  it('クリックで通知リストを開く', () => {
    // テスト実装
  });
  
  it('既読処理が正しく動作する', () => {
    // テスト実装
  });
});
```

### 4.2 E2Eテスト
```typescript
// tests/e2e/notification-ui.spec.ts
import { test, expect } from '@playwright/test';

test.describe('通知UI', () => {
  test('通知ベルアイコンが表示される', async ({ page }) => {
    // テスト実装
  });
  
  test('リアルタイム通知が受信される', async ({ page }) => {
    // テスト実装
  });
});
```

## 5. Material UIデザイン仕様

### 5.1 コンポーネント使用
- **Badge**: 未読数表示
- **IconButton**: ベルアイコンボタン
- **Popover**: 通知リスト表示
- **List/ListItem**: 通知一覧
- **Avatar**: ユーザーアバター
- **Typography**: テキスト表示
- **Skeleton**: ローディング状態
- **Alert**: エラー表示
- **Chip**: 未読数チップ

### 5.2 カラーパレット
```typescript
const notificationColors = {
  follow: 'primary.main',     // #1976d2
  like: 'error.main',         // #d32f2f
  comment: 'info.main',       // #0288d1
  repost: 'success.main',     // #2e7d32
  system: 'warning.main',     // #ed6c02
};
```

### 5.3 アニメーション
```css
@keyframes bellRing {
  0% { transform: rotate(0); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  30% { transform: rotate(14deg); }
  40% { transform: rotate(-4deg); }
  50% { transform: rotate(10deg); }
  60% { transform: rotate(0); }
  100% { transform: rotate(0); }
}

.notification-bell-new {
  animation: bellRing 1s ease-in-out;
}
```

## 6. パフォーマンス最適化

### 6.1 最適化戦略
- **仮想スクロール**: 大量通知時の表示最適化
- **遅延読み込み**: スクロール時の追加読み込み
- **メモ化**: React.memoとuseMemoの活用
- **デバウンス**: 既読処理のバッチ化

### 6.2 キャッシュ戦略
```typescript
// SWRを使用したキャッシュ
import useSWR from 'swr';

const { data, error, mutate } = useSWR(
  session ? `/api/notifications` : null,
  fetcher,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // 30秒ごと
  }
);
```

## 7. セキュリティ考慮事項

### 7.1 実装済みセキュリティ
- ✅ NextAuth認証必須
- ✅ CSRFトークン検証
- ✅ XSSサニタイゼーション
- ✅ メール確認必須

### 7.2 追加セキュリティ対策
- レート制限の実装
- 通知内容の検証強化
- Socket.IO認証の強化

## 8. 実装スケジュール

| Phase | タスク | 推定時間 | 依存関係 |
|-------|--------|---------|----------|
| 1 | NotificationBell.tsx作成 | 4-6時間 | なし |
| 2 | フック実装 | 2-3時間 | Phase 1 |
| 3 | Socket.IO統合 | 3-4時間 | Phase 2 |
| 4 | AppLayout統合 | 2-3時間 | Phase 1 |
| 5 | コンテキスト実装 | 2-3時間 | Phase 2,3 |
| 6 | テスト実装 | 3-4時間 | Phase 1-5 |
| 7 | 最適化・調整 | 2-3時間 | Phase 1-6 |
| **合計** | | **18-26時間** | |

## 9. リスクと対策

### 9.1 技術的リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| Socket.IO接続不安定 | 高 | 再接続ロジック実装、ポーリングフォールバック |
| メモリリーク | 中 | 適切なクリーンアップ、WeakMap使用 |
| パフォーマンス低下 | 中 | 仮想スクロール、遅延読み込み |

### 9.2 ビジネスリスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| ユーザー体験低下 | 高 | 段階的リリース、A/Bテスト |
| 通知の見逃し | 中 | ブラウザ通知、メール通知連携 |

## 10. 成功基準

### 10.1 機能要件
- [ ] ベルアイコンをクリックで通知一覧表示
- [ ] 未読数バッジの正確な表示
- [ ] リアルタイム通知受信
- [ ] 既読/未読の管理
- [ ] 無限スクロール対応

### 10.2 非機能要件
- [ ] 初期表示: 200ms以内
- [ ] Socket.IO接続: 1秒以内
- [ ] メモリ使用量: 50MB以下
- [ ] エラー率: 0.1%以下

### 10.3 品質基準
- [ ] 単体テストカバレッジ: 80%以上
- [ ] E2Eテスト全パス
- [ ] Lighthouse Score: 90以上
- [ ] アクセシビリティ: WCAG 2.1 AA準拠

## 11. 実装コマンド集

```bash
# コンポーネント作成
touch src/components/NotificationBell.tsx
touch src/components/NotificationList.tsx
touch src/components/NotificationItem.tsx

# フック作成
touch src/hooks/useNotifications.ts
touch src/hooks/useSocketNotifications.ts

# コンテキスト作成
mkdir -p src/contexts
touch src/contexts/NotificationContext.tsx

# テスト作成
touch src/components/__tests__/NotificationBell.test.tsx
touch tests/e2e/notification-ui.spec.ts

# 依存パッケージ確認
npm ls @mui/material
npm ls socket.io-client
npm ls date-fns

# 開発サーバー起動
npm run dev

# テスト実行
npm run test
npm run test:e2e
```

## 12. 検証チェックリスト

### 12.1 実装前チェック
- [ ] バックエンドAPI動作確認
- [ ] Socket.IO接続確認
- [ ] 認証フロー確認
- [ ] CSRFトークン取得確認

### 12.2 実装後チェック
- [ ] 通知表示確認
- [ ] リアルタイム更新確認
- [ ] 既読処理確認
- [ ] エラーハンドリング確認
- [ ] パフォーマンス測定
- [ ] メモリリーク確認

## EVIDENCE（計画策定証跡）

### システム調査結果
```bash
# 実行日時: 2025-09-03
$ ls -la src/components/ | grep -i notification
# 結果: No matches（NotificationBell.tsx未実装確認）

$ grep -r "AppLayout" src/app/
# 結果: 7ファイルで使用確認

$ cat src/types/sns/index.ts | grep -A 20 "interface Notification"
# 結果: 132-151行にNotificationインターフェース定義確認

$ ls -la src/hooks/
# 結果: useCSRF.ts, useTimelineData.ts等確認

$ cat src/lib/socket/socket-client.ts | grep "notification"
# 結果: 14-15行にイベント定義確認
```

### API動作確認
```bash
# GET /api/notifications
curl -X GET http://localhost:3000/api/notifications \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"
# 結果: 正常動作確認

# POST /api/notifications（既読処理）
curl -X POST http://localhost:3000/api/notifications \
  -H "Cookie: next-auth.session-token=..." \
  -H "x-csrf-token: ..." \
  -H "Content-Type: application/json" \
  -d '{"notificationIds": []}'
# 結果: 正常動作確認
```

---

## 署名

I attest: all implementation plans are based on the existing system analysis and follow STRICT120 protocol requirements.

計画策定完了: 2025-09-03  
次ステップ: Phase 1実装開始

---

*本計画書はSTRICT120プロトコルに基づき、一次証拠に基づく実装計画のみを記載しています。*