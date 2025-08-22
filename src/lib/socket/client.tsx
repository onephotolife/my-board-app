'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

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
    throw new Error('useSocket must be used within SocketProvider');
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
    if (status === 'authenticated' && session?.user) {
      const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
        path: '/socket.io',
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      socketInstance.on('connect', () => {
        console.log('🔌 Connected to Socket.io server');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('🔌 Disconnected from Socket.io server');
        setIsConnected(false);
      });

      socketInstance.on('connected', (data) => {
        console.log('✅ Authenticated connection:', data);
      });

      socketInstance.on('user:online', (data) => {
        setOnlineUsers(prev => [...new Set([...prev, data.userId])]);
      });

      socketInstance.on('user:offline', (data) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      });

      socketInstance.on('user:typing', (data) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, data.userName);
          return newMap;
        });

        setTimeout(() => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        }, 3000);
      });

      socketInstance.on('user:stopped-typing', (data) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
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
  onNewPost?: (data: any) => void;
  onPostUpdated?: (data: any) => void;
  onPostDeleted?: (data: any) => void;
  onPostLiked?: (data: any) => void;
}) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (data: any) => {
      console.log('📝 New post received:', data);
      handlers.onNewPost?.(data);
    };

    const handlePostUpdated = (data: any) => {
      console.log('✏️ Post updated:', data);
      handlers.onPostUpdated?.(data);
    };

    const handlePostDeleted = (data: any) => {
      console.log('🗑️ Post deleted:', data);
      handlers.onPostDeleted?.(data);
    };

    const handlePostLiked = (data: any) => {
      console.log('❤️ Post liked:', data);
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