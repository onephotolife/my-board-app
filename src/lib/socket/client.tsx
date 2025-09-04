'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// Socket.io動的インポート用の型定義
// 最小限の型でany回避
type Socket = {
  on: (event: string, cb: (data?: unknown) => void) => void;
  off: (event: string, cb: (data?: unknown) => void) => void;
  emit: (event: string, data?: unknown) => void;
  disconnect: () => void;
} | null;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  typingUsers: Map<string, string>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  typingUsers: new Map(),
});

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    // 🔐 41人天才会議による修正: Socketが無効の場合のフォールバック
    console.warn('useSocket: SocketProvider not found, returning dummy context');
    return {
      socket: null,
      isConnected: false,
      onlineUsers: [],
      typingUsers: new Map(),
    };
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // 🔐 41人天才会議による修正: Socket.ioを条件付きで有効化
    const isSocketEnabled = process.env.NEXT_PUBLIC_ENABLE_SOCKET !== 'false';

    if (!isSocketEnabled) {
      console.warn('🔌 Socket.io is disabled');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      let socketInstance: Socket | null = null;

      // Socket.io動的インポート: 非同期関数として実装
      const initializeSocket = async () => {
        try {
          // Socket.io動的インポート: Edge Runtime互換性とコンパイル最適化
          const { io } = await import('socket.io-client');
          socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
            path: '/socket.io',
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            timeout: 10000,
          });

          socketInstance.on('connect', () => {
            console.warn('🔌 Connected to Socket.io server');
            setIsConnected(true);
          });

          socketInstance.on('disconnect', () => {
            console.warn('🔌 Disconnected from Socket.io server');
            setIsConnected(false);
          });

          socketInstance.on('connected', (data) => {
            console.warn('✅ Authenticated connection:', data);
          });

          socketInstance.on('user:online', (data) => {
            setOnlineUsers((prev) => [...new Set([...prev, data.userId])]);
          });

          socketInstance.on('user:offline', (data) => {
            setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
          });

          socketInstance.on('user:typing', (data) => {
            setTypingUsers((prev) => {
              const newMap = new Map(prev);
              newMap.set(data.userId, data.userName);
              return newMap;
            });

            setTimeout(() => {
              setTypingUsers((prev) => {
                const newMap = new Map(prev);
                newMap.delete(data.userId);
                return newMap;
              });
            }, 3000);
          });

          socketInstance.on('user:stopped-typing', (data) => {
            setTypingUsers((prev) => {
              const newMap = new Map(prev);
              newMap.delete(data.userId);
              return newMap;
            });
          });

          socketInstance.on('error', (error) => {
            console.error('Socket error:', error);
          });

          socketInstance.on('connect_error', (error) => {
            console.warn('⚠️ Socket connection error:', error.message);
            // エラーが発生してもアプリを続行
          });

          socketInstance.on('connect_timeout', () => {
            console.warn('⚠️ Socket connection timeout');
          });

          // 🔔 通知関連イベントリスナー
          socketInstance.on(`notification:new:${session.user.id}`, (data) => {
            console.warn('🔔 New notification received:', data);
            // カスタムイベントを発火して通知フックに通知
            window.dispatchEvent(
              new CustomEvent('notification:new', {
                detail: data.notification,
              })
            );
          });

          socketInstance.on(`notification:count:${session.user.id}`, (data) => {
            console.warn('🔢 Unread count updated:', data);
            // カスタムイベントを発火して未読数を更新
            window.dispatchEvent(
              new CustomEvent('notification:count', {
                detail: data.unreadCount,
              })
            );
          });

          setSocket(socketInstance);
        } catch (error) {
          console.error('🔴 Failed to initialize Socket.io:', error);
          // Socket.ioの初期化が失敗してもアプリを続行
        }
      };

      // 非同期でSocket初期化を実行
      initializeSocket();

      // クリーンアップ関数を返す
      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
      };
    }
  }, [session, status]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, typingUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useRealtimeUpdates(handlers: {
  onNewPost?: (data: unknown) => void;
  onPostUpdated?: (data: unknown) => void;
  onPostDeleted?: (data: unknown) => void;
  onPostLiked?: (data: unknown) => void;
}) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (data: unknown) => {
      console.warn('📝 New post received:', data);
      handlers.onNewPost?.(data);
    };

    const handlePostUpdated = (data: unknown) => {
      console.warn('✏️ Post updated:', data);
      handlers.onPostUpdated?.(data);
    };

    const handlePostDeleted = (data: unknown) => {
      console.warn('🗑️ Post deleted:', data);
      handlers.onPostDeleted?.(data);
    };

    const handlePostLiked = (data: unknown) => {
      console.warn('❤️ Post liked:', data);
      handlers.onPostLiked?.(data);
    };

    socket.on('post:new', handleNewPost);
    socket.on('post:updated', handlePostUpdated);
    socket.on('post:deleted', handlePostDeleted);
    socket.on('post:liked', handlePostLiked);

    return () => {
      socket.off('post:new', handleNewPost);
      socket.off('post:updated', handlePostUpdated);
      socket.off('post:deleted', handlePostDeleted);
      socket.off('post:liked', handlePostLiked);
    };
  }, [socket, handlers]);
}

export function useTypingIndicator(postId?: string) {
  const { socket } = useSocket();
  const [isTyping, setIsTyping] = useState(false);

  const startTyping = () => {
    if (socket && postId && !isTyping) {
      socket.emit('typing:start', { postId });
      setIsTyping(true);
    }
  };

  const stopTyping = () => {
    if (socket && postId && isTyping) {
      socket.emit('typing:stop', { postId });
      setIsTyping(false);
    }
  };

  useEffect(() => {
    return () => {
      if (isTyping) {
        stopTyping();
      }
    };
  }, [postId]);

  return { startTyping, stopTyping };
}
