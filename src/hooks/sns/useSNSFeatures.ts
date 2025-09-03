import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

import { useSNSStore } from '@/store/sns-store';
import type { UserProfile } from '@/types/sns';

export function useSNSFeatures() {
  const session = useSession();
  const {
    currentUser,
    timeline,
    notifications,
    unreadNotificationCount,
    isLoading,
    error,
    featureFlags,
    fetchTimeline,
    fetchNotifications,
    updateCurrentUser,
    clearError,
  } = useSNSStore();

  // Initialize user data when session changes
  useEffect(() => {
    if (session.data?.user) {
      // Convert session user to UserProfile format
      const userProfile: UserProfile = {
        _id: session.data.user.id || '',
        name: session.data.user.name || '',
        email: session.data.user.email || '',
        profile: {
          bio: '',
          avatar: session.data.user.image || undefined,
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
  }, [session.data, updateCurrentUser]);

  // Initialize timeline and notifications when features are enabled
  useEffect(() => {
    if (currentUser && featureFlags.timeline) {
      fetchTimeline('home');
    }
  }, [currentUser, featureFlags.timeline, fetchTimeline]);

  useEffect(() => {
    if (currentUser && featureFlags.notifications) {
      fetchNotifications();
    }
  }, [currentUser, featureFlags.notifications, fetchNotifications]);

  const refreshTimeline = useCallback(async () => {
    if (featureFlags.timeline) {
      await fetchTimeline('home');
    }
  }, [featureFlags.timeline, fetchTimeline]);

  const refreshNotifications = useCallback(async () => {
    if (featureFlags.notifications) {
      await fetchNotifications();
    }
  }, [featureFlags.notifications, fetchNotifications]);

  return {
    currentUser,
    timeline,
    notifications,
    unreadNotificationCount,
    isLoading,
    error,
    featureFlags,
    refreshTimeline,
    refreshNotifications,
    clearError,
    isAuthenticated: !!session.data?.user,
  };
}

// Hook for following functionality
export function useFollowFeature() {
  const {
    followers,
    following,
    followUser,
    unfollowUser,
    fetchFollowers,
    fetchFollowing,
    isLoading,
    error,
    featureFlags,
  } = useSNSStore();

  const isEnabled = featureFlags.follow;

  const handleFollow = useCallback(async (userId: string) => {
    if (!isEnabled) return;
    await followUser(userId);
  }, [isEnabled, followUser]);

  const handleUnfollow = useCallback(async (userId: string) => {
    if (!isEnabled) return;
    await unfollowUser(userId);
  }, [isEnabled, unfollowUser]);

  return {
    followers,
    following,
    handleFollow,
    handleUnfollow,
    fetchFollowers,
    fetchFollowing,
    isLoading,
    error,
    isEnabled,
  };
}

// Hook for like functionality
export function useLikeFeature() {
  const {
    likePost,
    unlikePost,
    isLoading,
    error,
    featureFlags,
  } = useSNSStore();

  const isEnabled = featureFlags.likes;

  const handleLike = useCallback(async (postId: string) => {
    if (!isEnabled) return;
    await likePost(postId);
  }, [isEnabled, likePost]);

  const handleUnlike = useCallback(async (postId: string) => {
    if (!isEnabled) return;
    await unlikePost(postId);
  }, [isEnabled, unlikePost]);

  return {
    handleLike,
    handleUnlike,
    isLoading,
    error,
    isEnabled,
  };
}

// Hook for notification functionality
export function useNotificationFeature() {
  const {
    notifications,
    unreadNotificationCount,
    fetchNotifications,
    markNotificationAsRead,
    deleteNotification,
    addNotification,
    updateUnreadCount,
    isLoading,
    error,
    featureFlags,
  } = useSNSStore();

  const isEnabled = featureFlags.notifications;
  const isRealtimeEnabled = featureFlags.realtimeNotifications;

  const markAsRead = useCallback(async (notificationIds?: string[]) => {
    if (!isEnabled) return;
    await markNotificationAsRead(notificationIds);
  }, [isEnabled, markNotificationAsRead]);

  const deleteNotif = useCallback(async (notificationId: string) => {
    if (!isEnabled) return;
    await deleteNotification(notificationId);
  }, [isEnabled, deleteNotification]);

  const markAllAsRead = useCallback(async () => {
    if (!isEnabled) return;
    await markNotificationAsRead();
  }, [isEnabled, markNotificationAsRead]);

  return {
    notifications,
    unreadNotificationCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    addNotification,
    updateUnreadCount,
    isLoading,
    error,
    isEnabled,
    isRealtimeEnabled,
  };
}

// Hook for timeline functionality
export function useTimelineFeature() {
  const {
    timeline,
    fetchTimeline,
    addToTimeline,
    updateTimelinePost,
    clearTimeline,
    isLoading,
    error,
    featureFlags,
  } = useSNSStore();

  const isEnabled = featureFlags.timeline;

  const loadMore = useCallback(async (cursor?: string) => {
    if (!isEnabled) return;
    await fetchTimeline('home', cursor);
  }, [isEnabled, fetchTimeline]);

  const loadExplore = useCallback(async (cursor?: string) => {
    if (!isEnabled) return;
    await fetchTimeline('explore', cursor);
  }, [isEnabled, fetchTimeline]);

  const loadMentions = useCallback(async (cursor?: string) => {
    if (!isEnabled) return;
    await fetchTimeline('mentions', cursor);
  }, [isEnabled, fetchTimeline]);

  return {
    timeline,
    loadMore,
    loadExplore,
    loadMentions,
    addToTimeline,
    updateTimelinePost,
    clearTimeline,
    isLoading,
    error,
    isEnabled,
  };
}