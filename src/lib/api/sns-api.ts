// SNS API Helper Functions

import type { 
  ApiResponse, 
  TimelineResponse, 
  FollowersResponse,
  NotificationsResponse,
  SNSPost,
  UserProfile 
} from '@/types/sns';

// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Request configuration
const defaultHeaders = {
  'Content-Type': 'application/json',
};

// Error handler
function handleApiError(response: Response): never {
  const statusText = response.statusText || 'Unknown error';
  const message = `API Error: ${response.status} - ${statusText}`;
  
  switch (response.status) {
    case 401:
      throw new Error('認証が必要です。ログインしてください。');
    case 403:
      throw new Error('アクセス権限がありません。');
    case 404:
      throw new Error('リソースが見つかりません。');
    case 429:
      throw new Error('リクエスト制限に達しました。しばらくお待ちください。');
    case 500:
      throw new Error('サーバーエラーが発生しました。');
    default:
      throw new Error(message);
  }
}

// Generic API request wrapper
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      handleApiError(response);
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

// Timeline API
export const timelineApi = {
  async fetch(params: {
    type?: 'home' | 'explore' | 'mentions';
    cursor?: string;
    limit?: number;
  }): Promise<TimelineResponse> {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.append('type', params.type);
    if (params.cursor) searchParams.append('cursor', params.cursor);
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiRequest<TimelineResponse>(
      `/api/timeline?${searchParams}`
    );
    return response.data!;
  },
};

// Follow API
export const followApi = {
  async follow(targetUserId: string): Promise<any> {
    const response = await apiRequest(`/api/users/${targetUserId}/follow`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
    return response.data;
  },

  async unfollow(targetUserId: string): Promise<any> {
    const response = await apiRequest(`/api/users/${targetUserId}/unfollow`, {
      method: 'DELETE',
      body: JSON.stringify({ targetUserId }),
    });
    return response.data;
  },

  async getFollowers(userId: string, page = 1, limit = 50): Promise<FollowersResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiRequest<FollowersResponse>(
      `/api/users/${userId}/followers?${params}`
    );
    return response.data!;
  },

  async getFollowing(userId: string, page = 1, limit = 50): Promise<any> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiRequest<any>(
      `/api/users/${userId}/following?${params}`
    );
    return response.data!;
  },
};

// Like API
export const likeApi = {
  async like(postId: string): Promise<{ likesCount: number }> {
    const response = await apiRequest<{ likesCount: number }>(
      `/api/posts/${postId}/like`,
      { method: 'POST' }
    );
    return response.data!;
  },

  async unlike(postId: string): Promise<{ likesCount: number }> {
    const response = await apiRequest<{ likesCount: number }>(
      `/api/posts/${postId}/unlike`,
      { method: 'DELETE' }
    );
    return response.data!;
  },

  async getLikes(postId: string, page = 1, limit = 50): Promise<any> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiRequest<any>(
      `/api/posts/${postId}/likes?${params}`
    );
    return response.data!;
  },
};

// Comment API
export const commentApi = {
  async create(postId: string, content: string, parentId?: string, mentions?: string[]): Promise<any> {
    const response = await apiRequest(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId, mentions }),
    });
    return response.data;
  },

  async update(commentId: string, content: string): Promise<any> {
    const response = await apiRequest(`/api/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    return response.data;
  },

  async delete(commentId: string): Promise<any> {
    const response = await apiRequest(`/api/comments/${commentId}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  async getComments(
    postId: string,
    params: { sort?: 'newest' | 'oldest' | 'popular'; page?: number; limit?: number } = {}
  ): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiRequest<any>(
      `/api/posts/${postId}/comments?${searchParams}`
    );
    return response.data!;
  },
};

// Notification API
export const notificationApi = {
  async fetch(params: {
    type?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<NotificationsResponse> {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.append('type', params.type);
    if (params.isRead !== undefined) searchParams.append('isRead', params.isRead.toString());
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiRequest<NotificationsResponse>(
      `/api/notifications?${searchParams}`
    );
    return response.data!;
  },

  async markAsRead(notificationIds?: string[]): Promise<{ updatedCount: number; unreadCount: number }> {
    const response = await apiRequest<{ updatedCount: number; unreadCount: number }>(
      '/api/notifications/read',
      {
        method: 'PUT',
        body: JSON.stringify({ notificationIds }),
      }
    );
    return response.data!;
  },

  async delete(notificationId: string): Promise<any> {
    const response = await apiRequest(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    return response.data;
  },
};

// Profile API
export const profileApi = {
  async getProfile(userId: string): Promise<UserProfile> {
    const response = await apiRequest<UserProfile>(`/api/users/${userId}/profile`);
    return response.data!;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiRequest<UserProfile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data!;
  },

  async getCurrentUser(): Promise<UserProfile> {
    const response = await apiRequest<UserProfile>('/api/profile/current');
    return response.data!;
  },
};