import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';

import { useNotifications } from '@/hooks/useNotifications';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ notifications: [], unreadCount: 0 }),
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  } as Response)
);

// Mock document.querySelector for CSRF token
const mockGetAttribute = jest.fn();
global.document.querySelector = jest.fn(() => ({
  getAttribute: mockGetAttribute,
}));

const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: '2025-12-31',
};

const mockNotifications = [
  {
    _id: 'notif-1',
    recipient: 'test-user-id',
    type: 'follow' as const,
    actor: {
      _id: 'actor-1',
      name: 'John Doe',
      avatar: undefined,
    },
    target: {
      type: 'user' as const,
      id: 'target-1',
      preview: undefined,
    },
    message: 'John Doeさんがあなたをフォローしました',
    isRead: false,
    createdAt: new Date('2025-09-01T10:00:00Z'),
  },
  {
    _id: 'notif-2',
    recipient: 'test-user-id',
    type: 'like' as const,
    actor: {
      _id: 'actor-2',
      name: 'Jane Smith',
      avatar: 'https://example.com/avatar.jpg',
    },
    target: {
      type: 'post' as const,
      id: 'post-1',
      preview: 'テスト投稿',
    },
    message: 'Jane Smithさんがあなたの投稿にいいねしました',
    isRead: true,
    readAt: new Date('2025-09-01T11:00:00Z'),
    createdAt: new Date('2025-09-01T09:00:00Z'),
  },
];

describe('useNotifications Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ data: mockSession });
    mockGetAttribute.mockReturnValue('mock-csrf-token');
  });

  describe('初期化テスト', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('セッションがある場合、自動的に通知を取得する', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            notifications: mockNotifications,
            unreadCount: 1,
            pagination: { hasMore: false },
          },
        }),
      });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
        expect(result.current.unreadCount).toBe(1);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications?page=1&limit=20',
        expect.objectContaining({
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('セッションがない場合、通知を取得しない', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null });

      renderHook(() => useNotifications());

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('fetchNotificationsテスト', () => {
    it('通知を正常に取得できる', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            notifications: mockNotifications,
            unreadCount: 1,
            pagination: { hasMore: false },
          },
        }),
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications(1);
      });

      expect(result.current.notifications).toEqual(mockNotifications);
      expect(result.current.unreadCount).toBe(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('ページネーションが機能する', async () => {
      const page1 = [mockNotifications[0]];
      const page2 = [mockNotifications[1]];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              notifications: page1,
              unreadCount: 1,
              pagination: { hasMore: true },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              notifications: page2,
              unreadCount: 1,
              pagination: { hasMore: false },
            },
          }),
        });

      const { result } = renderHook(() => useNotifications());

      // 1ページ目を取得
      await act(async () => {
        await result.current.fetchNotifications(1);
      });

      expect(result.current.notifications).toHaveLength(1);

      // 2ページ目を追加取得
      await act(async () => {
        await result.current.fetchNotifications(2);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0]).toEqual(page1[0]);
      expect(result.current.notifications[1]).toEqual(page2[0]);
    });

    it('エラー時にエラー状態が設定される', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.loading).toBe(false);
    });

    it('401エラー時に適切なエラーメッセージが設定される', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.fetchNotifications();
      });

      expect(result.current.error).toBe('通知の取得に失敗しました');
    });
  });

  describe('markAsReadテスト', () => {
    it('特定の通知を既読にできる', async () => {
      // 初期データセット
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              notifications: mockNotifications,
              unreadCount: 1,
              pagination: { hasMore: false },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { unreadCount: 0 },
          }),
        });

      const { result } = renderHook(() => useNotifications());

      // 初期データ取得を待つ
      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      // 既読処理実行
      await act(async () => {
        await result.current.markAsRead(['notif-1']);
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: JSON.stringify({
            notificationIds: ['notif-1'],
          }),
        })
      );

      expect(result.current.unreadCount).toBe(0);
      expect(result.current.notifications[0].isRead).toBe(true);
    });

    it('すべての通知を既読にできる', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              notifications: mockNotifications,
              unreadCount: 1,
              pagination: { hasMore: false },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { unreadCount: 0 },
          }),
        });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        await result.current.markAsRead();
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            notificationIds: [],
          }),
        })
      );

      expect(result.current.unreadCount).toBe(0);
      result.current.notifications.forEach(notification => {
        expect(notification.isRead).toBe(true);
      });
    });

    it('既読処理でエラーが発生した場合、エラー状態が設定される', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              notifications: mockNotifications,
              unreadCount: 1,
              pagination: { hasMore: false },
            },
          }),
        })
        .mockRejectedValueOnce(new Error('既読処理エラー'));

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        await result.current.markAsRead(['notif-1']);
      });

      expect(result.current.error).toBe('既読処理エラー');
    });
  });

  describe('markAllAsReadテスト', () => {
    it('markAllAsReadがmarkAsReadを呼び出す', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              notifications: mockNotifications,
              unreadCount: 1,
              pagination: { hasMore: false },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { unreadCount: 0 },
          }),
        });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            notificationIds: [],
          }),
        })
      );
    });
  });

  describe('refreshNotificationsテスト', () => {
    it('refreshNotificationsが最初のページを再取得する', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              notifications: [mockNotifications[0]],
              unreadCount: 1,
              pagination: { hasMore: false },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              notifications: mockNotifications,
              unreadCount: 2,
              pagination: { hasMore: false },
            },
          }),
        });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.refreshNotifications();
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/notifications?page=1&limit=20',
        expect.any(Object)
      );
    });
  });

  describe('ローディング状態テスト', () => {
    it('データ取得中はloading状態がtrueになる', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(promise);

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.fetchNotifications();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({
            data: {
              notifications: [],
              unreadCount: 0,
              pagination: { hasMore: false },
            },
          }),
        });
        await promise;
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});