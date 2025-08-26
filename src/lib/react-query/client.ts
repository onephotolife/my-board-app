import { QueryClient } from '@tanstack/react-query';

// React Query Client Configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Next.js 15 App Router向けの設定
      staleTime: 60 * 1000, // 1分間はキャッシュを新鮮とみなす
      gcTime: 5 * 60 * 1000, // 5分間キャッシュを保持（旧cacheTime）
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // 本番環境では true に変更検討
      refetchOnMount: true,
      refetchOnReconnect: 'always',
      networkMode: 'offlineFirst', // オフラインファースト戦略
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',
    },
  },
});

// SNS機能用のQuery Keys Factory
export const queryKeys = {
  all: ['sns'] as const,
  timeline: {
    all: ['sns', 'timeline'] as const,
    list: (filters?: { type?: string; cursor?: string }) => 
      ['sns', 'timeline', 'list', filters] as const,
    detail: (id: string) => ['sns', 'timeline', 'detail', id] as const,
  },
  follows: {
    all: ['sns', 'follows'] as const,
    followers: (userId: string, page?: number) => 
      ['sns', 'follows', 'followers', userId, page] as const,
    following: (userId: string, page?: number) => 
      ['sns', 'follows', 'following', userId, page] as const,
  },
  notifications: {
    all: ['sns', 'notifications'] as const,
    list: (filters?: { isRead?: boolean; page?: number }) => 
      ['sns', 'notifications', 'list', filters] as const,
    unread: () => ['sns', 'notifications', 'unread'] as const,
  },
  likes: {
    all: ['sns', 'likes'] as const,
    post: (postId: string) => ['sns', 'likes', 'post', postId] as const,
  },
  comments: {
    all: ['sns', 'comments'] as const,
    post: (postId: string, page?: number) => 
      ['sns', 'comments', 'post', postId, page] as const,
  },
  profile: {
    all: ['sns', 'profile'] as const,
    user: (userId: string) => ['sns', 'profile', 'user', userId] as const,
    current: () => ['sns', 'profile', 'current'] as const,
  },
} as const;

// エラーハンドリングヘルパー
export function handleQueryError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}