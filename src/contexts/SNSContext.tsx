'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSNSStore } from '@/store/sns-store';
import { io, Socket } from 'socket.io-client';
import type { SNSPost, Notification, PostEngagement } from '@/types/sns';

interface SNSContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SNSContext = createContext<SNSContextValue>({
  socket: null,
  isConnected: false,
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
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  
  const {
    currentUser,
    featureFlags,
    addToTimeline,
    updateTimelinePost,
    addNotification,
    updateUnreadCount,
  } = useSNSStore();

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!featureFlags.realtimeNotifications || !currentUser) {
      return;
    }

    const socketInstance = io({
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('[SNS] Socket connected');
      setIsConnected(true);

      // Subscribe to user's timeline and notifications
      if (currentUser) {
        socketInstance.emit('subscribe:timeline', { userId: currentUser._id });
        socketInstance.emit('subscribe:notifications', { userId: currentUser._id });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('[SNS] Socket disconnected');
      setIsConnected(false);
    });

    // Handle real-time timeline updates
    socketInstance.on('timeline:new-post', (data: { post: SNSPost }) => {
      console.log('[SNS] New timeline post:', data.post._id);
      if (featureFlags.timeline) {
        addToTimeline(data.post);
      }
    });

    // Handle real-time notifications
    socketInstance.on('notification:new', (data: { notification: Notification }) => {
      console.log('[SNS] New notification:', data.notification.type);
      if (featureFlags.notifications) {
        addNotification(data.notification);
      }
    });

    // Handle notification count updates
    socketInstance.on('notification:update-count', (data: { unreadCount: number }) => {
      console.log('[SNS] Notification count update:', data.unreadCount);
      if (featureFlags.notifications) {
        updateUnreadCount(data.unreadCount);
      }
    });

    // Handle post engagement updates
    socketInstance.on('post:engagement-update', (data: { postId: string; engagement: PostEngagement }) => {
      console.log('[SNS] Post engagement update:', data.postId);
      if (featureFlags.timeline) {
        updateTimelinePost(data.postId, { engagement: data.engagement });
      }
    });

    setSocket(socketInstance);

    return () => {
      console.log('[SNS] Cleaning up socket connection');
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [
    currentUser,
    featureFlags.realtimeNotifications,
    featureFlags.timeline,
    featureFlags.notifications,
    addToTimeline,
    updateTimelinePost,
    addNotification,
    updateUnreadCount,
  ]);

  const value: SNSContextValue = {
    socket,
    isConnected,
  };

  return <SNSContext.Provider value={value}>{children}</SNSContext.Provider>;
}

// Higher-order component to wrap components with SNS features
export function withSNSFeatures<P extends object>(Component: React.ComponentType<P>) {
  return function WrappedComponent(props: P) {
    return (
      <SNSProvider>
        <Component {...props} />
      </SNSProvider>
    );
  };
}