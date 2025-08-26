import { 
  useQuery, 
  useMutation, 
  useInfiniteQuery, 
  useQueryClient 
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/client';
import { useSNSStore } from '@/store/sns-store';
import type { 
  SNSPost, 
  TimelineResponse, 
  FollowersResponse,
  NotificationsResponse,
  ApiResponse 
} from '@/types/sns';

// Timeline Hook with React Query
export function useTimelineQuery(type: 'home' | 'explore' | 'mentions' = 'home') {
  const { featureFlags } = useSNSStore();
  
  return useInfiniteQuery({
    queryKey: queryKeys.timeline.list({ type }),
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams();
      params.append('type', type);
      if (pageParam) params.append('cursor', pageParam);
      params.append('limit', '20');
      
      const response = await fetch(`/api/timeline?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }
      
      const data: ApiResponse<TimelineResponse> = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch timeline');
      }
      
      return data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: featureFlags.timeline,
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分
    refetchInterval: 60 * 1000, // 1分ごとに更新
  });
}

// Followers Hook
export function useFollowersQuery(userId: string, page = 1) {
  const { featureFlags } = useSNSStore();
  
  return useQuery({
    queryKey: queryKeys.follows.followers(userId, page),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      
      const response = await fetch(`/api/users/${userId}/followers?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch followers');
      }
      
      const data: ApiResponse<FollowersResponse> = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch followers');
      }
      
      return data.data;
    },
    enabled: featureFlags.follow && !!userId,
    staleTime: 60 * 1000, // 1分
  });
}

// Following Hook
export function useFollowingQuery(userId: string, page = 1) {
  const { featureFlags } = useSNSStore();
  
  return useQuery({
    queryKey: queryKeys.follows.following(userId, page),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      
      const response = await fetch(`/api/users/${userId}/following?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch following');
      }
      
      const data: ApiResponse<any> = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch following');
      }
      
      return data.data;
    },
    enabled: featureFlags.follow && !!userId,
    staleTime: 60 * 1000, // 1分
  });
}

// Notifications Hook
export function useNotificationsQuery(isRead?: boolean) {
  const { featureFlags } = useSNSStore();
  
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list({ isRead }),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', pageParam.toString());
      params.append('limit', '30');
      if (isRead !== undefined) params.append('isRead', isRead.toString());
      
      const response = await fetch(`/api/notifications?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data: ApiResponse<NotificationsResponse> = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
      
      return data.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pagination.totalPages ? currentPage + 1 : undefined;
    },
    enabled: featureFlags.notifications,
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 2 * 60 * 1000, // 2分ごとに更新
  });
}

// Like Mutation
export function useLikeMutation() {
  const queryClient = useQueryClient();
  const { updateTimelinePost } = useSNSStore();
  
  return useMutation({
    mutationFn: async ({ postId, action }: { postId: string; action: 'like' | 'unlike' }) => {
      const url = action === 'like' 
        ? `/api/posts/${postId}/like`
        : `/api/posts/${postId}/unlike`;
      
      const response = await fetch(url, {
        method: action === 'like' ? 'POST' : 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} post`);
      }
      
      const data: ApiResponse<{ likesCount: number }> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || `Failed to ${action} post`);
      }
      
      return { postId, likesCount: data.data?.likesCount || 0, action };
    },
    onMutate: async ({ postId, action }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.timeline.all });
      
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.timeline.all });
      
      queryClient.setQueriesData(
        { queryKey: queryKeys.timeline.all },
        (old: any) => {
          if (!old) return old;
          
          const updatePost = (post: SNSPost) => {
            if (post._id !== postId) return post;
            
            return {
              ...post,
              isLiked: action === 'like',
              engagement: {
                ...post.engagement,
                likes: action === 'like' 
                  ? post.engagement.likes + 1 
                  : Math.max(post.engagement.likes - 1, 0),
              },
            };
          };
          
          if (Array.isArray(old)) {
            return old.map(updatePost);
          }
          
          if (old.pages) {
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                posts: page.posts?.map(updatePost) || [],
              })),
            };
          }
          
          return old;
        }
      );
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // ロールバック
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (data) => {
      // サーバーの実際のカウントで更新
      updateTimelinePost(data.postId, {
        isLiked: data.action === 'like',
        engagement: {
          likes: data.likesCount,
          comments: 0,
          shares: 0,
          views: 0,
        },
      });
    },
    onSettled: () => {
      // キャッシュの再検証
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.likes.all });
    },
  });
}

// Follow Mutation
export function useFollowMutation() {
  const queryClient = useQueryClient();
  const { updateCurrentUser, currentUser } = useSNSStore();
  
  return useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'follow' | 'unfollow' }) => {
      const url = action === 'follow'
        ? `/api/users/${userId}/follow`
        : `/api/users/${userId}/unfollow`;
      
      const response = await fetch(url, {
        method: action === 'follow' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }
      
      const data: ApiResponse<any> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || `Failed to ${action} user`);
      }
      
      return { userId, action, data: data.data };
    },
    onMutate: async ({ action }) => {
      // Optimistic update for following count
      if (currentUser) {
        const newCount = action === 'follow'
          ? (currentUser.stats?.followingCount || 0) + 1
          : Math.max((currentUser.stats?.followingCount || 0) - 1, 0);
        
        updateCurrentUser({
          ...currentUser,
          stats: {
            ...currentUser.stats!,
            followingCount: newCount,
          },
        });
      }
    },
    onSuccess: (data) => {
      // キャッシュの無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.follows.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.user(data.userId) });
    },
    onError: () => {
      // エラー時は元に戻す
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
      }
    },
  });
}

// Mark Notification as Read Mutation
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  const { updateUnreadCount } = useSNSStore();
  
  return useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      const response = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      
      const data: ApiResponse<{ updatedCount: number; unreadCount: number }> = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to mark notifications as read');
      }
      
      return data.data;
    },
    onSuccess: (data) => {
      // 未読カウントを更新
      updateUnreadCount(data.unreadCount);
      
      // キャッシュの無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.setQueryData(queryKeys.notifications.unread(), data.unreadCount);
    },
  });
}