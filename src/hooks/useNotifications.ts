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