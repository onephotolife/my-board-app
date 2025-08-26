'use client';

import React, { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { useSNSStore } from '@/store/sns-store';
import { socketClient } from '@/lib/socket/socket-client';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/client';
import type { SNSPost, Notification, PostEngagement } from '@/types/sns';

interface SNSContextValue {
  isConnected: boolean;
  connectionStatus: string;
  connect: () => void;
  disconnect: () => void;
  emitEvent: (event: string, data: any) => void;
}

const SNSContext = createContext<SNSContextValue>({
  isConnected: false,
  connectionStatus: 'disconnected',
  connect: () => {},
  disconnect: () => {},
  emitEvent: () => {},
});

export function useSNSContext() {
  const context = useContext(SNSContext);
  if (!context) {
    throw new Error('useSNSContext must be used within SNSProvider');
  }
  return context;
}

interface SNSProviderProps {
  children: ReactNode;
}

export function SNSProvider({ children }: SNSProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const {
    currentUser,
    featureFlags,
    addToTimeline,
    updateTimelinePost,
    addNotification,
    updateUnreadCount,
    updateCurrentUser,
  } = useSNSStore();

  // Socket接続管理
  const connect = useCallback(() => {
    if (!session?.user?.id || !featureFlags.realtimeNotifications) {
      return;
    }

    console.log('[SNS] Connecting socket for user:', session.user.id);
    socketClient.connect(session.user.id, session.user.email || undefined);
    
    // 接続状態の監視
    socketClient.on('status:changed', ({ status, error }: any) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
      
      if (error) {
        console.error('[SNS] Socket connection error:', error);
      }
    });
  }, [session?.user, featureFlags.realtimeNotifications]);

  const disconnect = useCallback(() => {
    console.log('[SNS] Disconnecting socket');
    socketClient.disconnect();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // イベント送信ヘルパー
  const emitEvent = useCallback((event: string, data: any) => {
    socketClient.emitEvent(event as any, data);
  }, []);

  // Socket.ioイベントリスナーの設定
  useEffect(() => {
    if (!isConnected || !featureFlags.realtimeNotifications) {
      return;
    }

    // タイムラインの新投稿
    const handleNewPost = (data: { post: SNSPost }) => {
      console.log('[SNS] New timeline post received:', data.post._id);
      
      if (featureFlags.timeline) {
        // Zustandストアを更新
        addToTimeline(data.post);
        
        // React Queryキャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: queryKeys.timeline.all,
        });
      }
    };

    // 新着通知
    const handleNewNotification = (data: { notification: Notification }) => {
      console.log('[SNS] New notification received:', data.notification.type);
      
      if (featureFlags.notifications) {
        // Zustandストアを更新
        addNotification(data.notification);
        
        // React Queryキャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
        
        // ブラウザ通知（許可されている場合）
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('新しい通知', {
            body: data.notification.message,
            icon: '/icon-192x192.png',
          });
        }
      }
    };

    // 通知カウント更新
    const handleNotificationCount = (data: { unreadCount: number }) => {
      console.log('[SNS] Notification count update:', data.unreadCount);
      
      if (featureFlags.notifications) {
        updateUnreadCount(data.unreadCount);
        
        // React Queryキャッシュを更新
        queryClient.setQueryData(
          queryKeys.notifications.unread(),
          data.unreadCount
        );
      }
    };

    // エンゲージメント更新
    const handleEngagementUpdate = (data: { postId: string; engagement: PostEngagement }) => {
      console.log('[SNS] Post engagement update:', data.postId);
      
      if (featureFlags.timeline) {
        // Zustandストアを更新
        updateTimelinePost(data.postId, { engagement: data.engagement });
        
        // React Queryキャッシュを部分更新
        queryClient.setQueriesData(
          { queryKey: queryKeys.timeline.all },
          (old: any) => {
            if (!old) return old;
            
            if (Array.isArray(old)) {
              return old.map((post: SNSPost) =>
                post._id === data.postId
                  ? { ...post, engagement: data.engagement }
                  : post
              );
            }
            
            if (old.posts && Array.isArray(old.posts)) {
              return {
                ...old,
                posts: old.posts.map((post: SNSPost) =>
                  post._id === data.postId
                    ? { ...post, engagement: data.engagement }
                    : post
                ),
              };
            }
            
            return old;
          }
        );
      }
    };

    // イベントリスナー登録
    socketClient.addEventListener('timeline:new-post', handleNewPost);
    socketClient.addEventListener('notification:new', handleNewNotification);
    socketClient.addEventListener('notification:update-count', handleNotificationCount);
    socketClient.addEventListener('post:engagement-update', handleEngagementUpdate);

    // クリーンアップ
    return () => {
      socketClient.removeEventListener('timeline:new-post', handleNewPost);
      socketClient.removeEventListener('notification:new', handleNewNotification);
      socketClient.removeEventListener('notification:update-count', handleNotificationCount);
      socketClient.removeEventListener('post:engagement-update', handleEngagementUpdate);
    };
  }, [
    isConnected,
    featureFlags,
    addToTimeline,
    updateTimelinePost,
    addNotification,
    updateUnreadCount,
    queryClient,
  ]);

  // セッション変更時の処理
  useEffect(() => {
    if (session?.user?.id && featureFlags.realtimeNotifications) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.id, featureFlags.realtimeNotifications, connect, disconnect]);

  // ユーザー情報の初期化
  useEffect(() => {
    if (session?.user) {
      const userProfile = {
        _id: session.user.id || '',
        name: session.user.name || '',
        email: session.user.email || '',
        profile: {
          bio: '',
          avatar: session.user.image || undefined,
          coverImage: undefined,
          location: undefined,
          website: undefined,
          joinedAt: new Date(),
          isPrivate: false,
          isVerified: false,
        },
        stats: {
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          likesCount: 0,
        },
        settings: {
          notifications: {
            email: true,
            push: true,
            follows: true,
            likes: true,
            comments: true,
            mentions: true,
          },
          privacy: {
            showEmail: false,
            showFollowers: true,
            showFollowing: true,
          },
        },
      };
      updateCurrentUser(userProfile);
    } else {
      updateCurrentUser(null);
    }
  }, [session, updateCurrentUser]);

  // ブラウザ通知の許可リクエスト
  useEffect(() => {
    if (
      featureFlags.notifications &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }
  }, [featureFlags.notifications]);

  const value: SNSContextValue = {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    emitEvent,
  };

  return <SNSContext.Provider value={value}>{children}</SNSContext.Provider>;
}