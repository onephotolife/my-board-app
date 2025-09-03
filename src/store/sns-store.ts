import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type {
  UserProfile,
  SNSPost,
  Notification,
  FeatureFlags,
  TimelineResponse,
  FollowersResponse,
  NotificationsResponse,
  ApiResponse,
} from '@/types/sns';

interface SNSStore {
  // State
  currentUser: UserProfile | null;
  timeline: SNSPost[];
  notifications: Notification[];
  unreadNotificationCount: number;
  followers: UserProfile[];
  following: UserProfile[];
  isLoading: boolean;
  error: string | null;
  featureFlags: FeatureFlags;
  
  // Timeline Actions
  fetchTimeline: (type?: 'home' | 'explore' | 'mentions', cursor?: string) => Promise<void>;
  addToTimeline: (post: SNSPost) => void;
  updateTimelinePost: (postId: string, updates: Partial<SNSPost>) => void;
  clearTimeline: () => void;
  
  // Follow Actions
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  fetchFollowers: (userId: string, page?: number) => Promise<void>;
  fetchFollowing: (userId: string, page?: number) => Promise<void>;
  
  // Like Actions
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  
  // Notification Actions
  fetchNotifications: (isRead?: boolean, page?: number) => Promise<void>;
  markNotificationAsRead: (notificationIds?: string[]) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  updateUnreadCount: (count: number) => void;
  
  // User Actions
  updateCurrentUser: (user: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  
  // Utility Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  updateFeatureFlags: (flags: Partial<FeatureFlags>) => void;
  reset: () => void;
}

const initialState = {
  currentUser: null,
  timeline: [],
  notifications: [],
  unreadNotificationCount: 0,
  followers: [],
  following: [],
  isLoading: false,
  error: null,
  featureFlags: {
    follow: process.env.NEXT_PUBLIC_SNS_FEATURE_FOLLOW === 'true',
    timeline: process.env.NEXT_PUBLIC_SNS_FEATURE_TIMELINE === 'true',
    likes: process.env.NEXT_PUBLIC_SNS_FEATURE_LIKES === 'true',
    notifications: process.env.NEXT_PUBLIC_SNS_FEATURE_NOTIFICATIONS === 'true',
    comments: process.env.NEXT_PUBLIC_SNS_FEATURE_COMMENTS === 'true',
    realtimeNotifications: process.env.NEXT_PUBLIC_SNS_FEATURE_REALTIME_NOTIFICATIONS === 'true',
    profile: process.env.NEXT_PUBLIC_SNS_FEATURE_PROFILE === 'true',
    search: process.env.NEXT_PUBLIC_SNS_FEATURE_SEARCH === 'true',
    privacy: process.env.NEXT_PUBLIC_SNS_FEATURE_PRIVACY === 'true',
    recommendations: process.env.NEXT_PUBLIC_SNS_FEATURE_RECOMMENDATIONS === 'true',
    analytics: process.env.NEXT_PUBLIC_SNS_FEATURE_ANALYTICS === 'true',
  },
};

export const useSNSStore = create<SNSStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Timeline Actions
        fetchTimeline: async (type = 'home', cursor) => {
          set({ isLoading: true, error: null });
          try {
            const params = new URLSearchParams();
            if (type) params.append('type', type);
            if (cursor) params.append('cursor', cursor);
            
            const response = await fetch(`/api/timeline?${params}`, {
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to fetch timeline');
            
            const data: ApiResponse<TimelineResponse> = await response.json();
            
            if (data.success && data.data) {
              set((state) => ({
                timeline: cursor ? [...state.timeline, ...data.data!.posts] : data.data!.posts,
                isLoading: false,
              }));
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch timeline',
              isLoading: false 
            });
          }
        },

        addToTimeline: (post) => {
          set((state) => ({
            timeline: [post, ...state.timeline],
          }));
        },

        updateTimelinePost: (postId, updates) => {
          set((state) => ({
            timeline: state.timeline.map((post) =>
              post._id === postId ? { ...post, ...updates } : post
            ),
          }));
        },

        clearTimeline: () => {
          set({ timeline: [] });
        },

        // Follow Actions
        followUser: async (userId) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`/api/users/${userId}/follow`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetUserId: userId }),
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to follow user');
            
            const data: ApiResponse<any> = await response.json();
            
            if (data.success) {
              // Update following count
              set((state) => ({
                currentUser: state.currentUser ? {
                  ...state.currentUser,
                  stats: {
                    ...state.currentUser.stats!,
                    followingCount: (state.currentUser.stats?.followingCount || 0) + 1,
                  },
                } : null,
                isLoading: false,
              }));
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to follow user',
              isLoading: false 
            });
          }
        },

        unfollowUser: async (userId) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`/api/users/${userId}/unfollow`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetUserId: userId }),
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to unfollow user');
            
            const data: ApiResponse<any> = await response.json();
            
            if (data.success) {
              // Update following count
              set((state) => ({
                currentUser: state.currentUser ? {
                  ...state.currentUser,
                  stats: {
                    ...state.currentUser.stats!,
                    followingCount: Math.max((state.currentUser.stats?.followingCount || 0) - 1, 0),
                  },
                } : null,
                isLoading: false,
              }));
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to unfollow user',
              isLoading: false 
            });
          }
        },

        fetchFollowers: async (userId, page = 1) => {
          set({ isLoading: true, error: null });
          try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '50');
            
            const response = await fetch(`/api/users/${userId}/followers?${params}`, {
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to fetch followers');
            
            const data: ApiResponse<FollowersResponse> = await response.json();
            
            if (data.success && data.data) {
              set({
                followers: data.data.followers,
                isLoading: false,
              });
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch followers',
              isLoading: false 
            });
          }
        },

        fetchFollowing: async (userId, page = 1) => {
          set({ isLoading: true, error: null });
          try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '50');
            
            const response = await fetch(`/api/users/${userId}/following?${params}`, {
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to fetch following');
            
            const data: ApiResponse<any> = await response.json();
            
            if (data.success && data.data) {
              set({
                following: data.data.following,
                isLoading: false,
              });
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch following',
              isLoading: false 
            });
          }
        },

        // Like Actions
        likePost: async (postId) => {
          set({ error: null });
          
          // Optimistic update
          set((state) => ({
            timeline: state.timeline.map((post) =>
              post._id === postId
                ? {
                    ...post,
                    isLiked: true,
                    engagement: {
                      ...post.engagement,
                      likes: post.engagement.likes + 1,
                    },
                  }
                : post
            ),
          }));
          
          try {
            const response = await fetch(`/api/posts/${postId}/like`, {
              method: 'POST',
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to like post');
            
            const data: ApiResponse<{ likesCount: number }> = await response.json();
            
            if (data.success && data.data) {
              // Update with actual count from server
              set((state) => ({
                timeline: state.timeline.map((post) =>
                  post._id === postId
                    ? {
                        ...post,
                        engagement: {
                          ...post.engagement,
                          likes: data.data!.likesCount,
                        },
                      }
                    : post
                ),
              }));
            }
          } catch (error) {
            // Revert optimistic update
            set((state) => ({
              timeline: state.timeline.map((post) =>
                post._id === postId
                  ? {
                      ...post,
                      isLiked: false,
                      engagement: {
                        ...post.engagement,
                        likes: Math.max(post.engagement.likes - 1, 0),
                      },
                    }
                  : post
              ),
              error: error instanceof Error ? error.message : 'Failed to like post',
            }));
          }
        },

        unlikePost: async (postId) => {
          set({ error: null });
          
          // Optimistic update
          set((state) => ({
            timeline: state.timeline.map((post) =>
              post._id === postId
                ? {
                    ...post,
                    isLiked: false,
                    engagement: {
                      ...post.engagement,
                      likes: Math.max(post.engagement.likes - 1, 0),
                    },
                  }
                : post
            ),
          }));
          
          try {
            const response = await fetch(`/api/posts/${postId}/unlike`, {
              method: 'DELETE',
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to unlike post');
            
            const data: ApiResponse<{ likesCount: number }> = await response.json();
            
            if (data.success && data.data) {
              // Update with actual count from server
              set((state) => ({
                timeline: state.timeline.map((post) =>
                  post._id === postId
                    ? {
                        ...post,
                        engagement: {
                          ...post.engagement,
                          likes: data.data!.likesCount,
                        },
                      }
                    : post
                ),
              }));
            }
          } catch (error) {
            // Revert optimistic update
            set((state) => ({
              timeline: state.timeline.map((post) =>
                post._id === postId
                  ? {
                      ...post,
                      isLiked: true,
                      engagement: {
                        ...post.engagement,
                        likes: post.engagement.likes + 1,
                      },
                    }
                  : post
              ),
              error: error instanceof Error ? error.message : 'Failed to unlike post',
            }));
          }
        },

        // Notification Actions
        fetchNotifications: async (isRead, page = 1) => {
          set({ isLoading: true, error: null });
          try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '30');
            if (isRead !== undefined) params.append('isRead', isRead.toString());
            
            const response = await fetch(`/api/notifications?${params}`, {
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to fetch notifications');
            
            const data: ApiResponse<NotificationsResponse> = await response.json();
            
            if (data.success && data.data) {
              set({
                notifications: data.data.notifications,
                unreadNotificationCount: data.data.unreadCount,
                isLoading: false,
              });
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch notifications',
              isLoading: false 
            });
          }
        },

        markNotificationAsRead: async (notificationIds) => {
          set({ error: null });
          try {
            const response = await fetch('/api/notifications/read', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notificationIds }),
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to mark notifications as read');
            
            const data: ApiResponse<{ updatedCount: number; unreadCount: number }> = await response.json();
            
            if (data.success && data.data) {
              set((state) => ({
                notifications: state.notifications.map((notif) =>
                  !notificationIds || notificationIds.includes(notif._id)
                    ? { ...notif, isRead: true, readAt: new Date() }
                    : notif
                ),
                unreadNotificationCount: data.data.unreadCount,
              }));
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to mark notifications as read',
            });
          }
        },

        deleteNotification: async (notificationId) => {
          set({ error: null });
          try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
              method: 'DELETE',
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to delete notification');
            
            const data: ApiResponse<any> = await response.json();
            
            if (data.success) {
              set((state) => ({
                notifications: state.notifications.filter((notif) => notif._id !== notificationId),
                unreadNotificationCount: state.notifications.find(n => n._id === notificationId && !n.isRead)
                  ? Math.max(state.unreadNotificationCount - 1, 0)
                  : state.unreadNotificationCount,
              }));
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to delete notification',
            });
          }
        },

        addNotification: (notification) => {
          set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadNotificationCount: !notification.isRead 
              ? state.unreadNotificationCount + 1 
              : state.unreadNotificationCount,
          }));
        },

        updateUnreadCount: (count) => {
          set({ unreadNotificationCount: count });
        },

        // User Actions
        updateCurrentUser: (user) => {
          set({ currentUser: user });
        },

        updateProfile: async (updates) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch('/api/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
              credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Failed to update profile');
            
            const data: ApiResponse<UserProfile> = await response.json();
            
            if (data.success && data.data) {
              set({
                currentUser: data.data,
                isLoading: false,
              });
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to update profile',
              isLoading: false 
            });
          }
        },

        // Utility Actions
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        updateFeatureFlags: (flags) => {
          set((state) => ({
            featureFlags: { ...state.featureFlags, ...flags },
          }));
        },
        reset: () => set(initialState),
      }),
      {
        name: 'sns-store',
        partialize: (state) => ({
          currentUser: state.currentUser,
          featureFlags: state.featureFlags,
          unreadNotificationCount: state.unreadNotificationCount,
        }),
      }
    ),
    {
      name: 'SNSStore',
    }
  )
);