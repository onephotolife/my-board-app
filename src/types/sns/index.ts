// SNS Feature Types

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  profile?: {
    bio?: string;
    avatar?: string;
    coverImage?: string;
    location?: string;
    website?: string;
    joinedAt: Date;
    isPrivate: boolean;
    isVerified: boolean;
  };
  stats?: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    likesCount: number;
  };
  settings?: {
    notifications: NotificationSettings;
    privacy: PrivacySettings;
  };
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  follows: boolean;
  likes: boolean;
  comments: boolean;
  mentions: boolean;
}

export interface PrivacySettings {
  showEmail: boolean;
  showFollowers: boolean;
  showFollowing: boolean;
}

export interface Follow {
  _id: string;
  follower: {
    _id: string;
    name: string;
    avatar?: string;
  };
  following: {
    _id: string;
    name: string;
    avatar?: string;
  };
  status: 'active' | 'pending' | 'blocked';
  createdAt: Date;
}

export interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface SNSPost {
  _id: string;
  title?: string;
  content: string;
  author: string;
  authorInfo: {
    _id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean;
  };
  mentions?: string[];
  hashtags?: string[];
  engagement: PostEngagement;
  visibility: 'public' | 'followers' | 'private';
  isRepost?: boolean;
  originalPost?: string;
  media?: MediaItem[];
  isLiked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  alt?: string;
}

export interface Like {
  _id: string;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  targetType: 'post' | 'comment';
  targetId: string;
  createdAt: Date;
}

export interface Comment {
  _id: string;
  postId: string;
  parentId?: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean;
  };
  content: string;
  mentions?: string[];
  engagement: {
    likes: number;
    replies: number;
  };
  status: 'active' | 'deleted' | 'hidden';
  editedAt?: Date;
  replies?: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  _id: string;
  recipient: string;
  type: 'follow' | 'like' | 'comment' | 'mention' | 'repost';
  actor: {
    _id: string;
    name: string;
    avatar?: string;
  };
  target: {
    type: 'post' | 'comment' | 'user';
    id: string;
    preview?: string;
  };
  message: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface TimelinePost {
  postId: string;
  authorId: string;
  score: number;
  reason: 'following' | 'popular' | 'recommended';
  addedAt: Date;
  post?: SNSPost;
}

export interface Timeline {
  _id: string;
  userId: string;
  posts: TimelinePost[];
  cursor?: string;
  generatedAt: Date;
  expiresAt: Date;
}

// API Response Types
export interface PaginationInfo {
  total: number;
  page: number;
  totalPages: number;
  hasMore?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TimelineResponse {
  posts: SNSPost[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface FollowersResponse {
  followers: Array<UserProfile & { followedAt: Date; isFollowing: boolean }>;
  pagination: PaginationInfo;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: PaginationInfo;
}

// Feature Flags
export interface FeatureFlags {
  follow: boolean;
  timeline: boolean;
  likes: boolean;
  notifications: boolean;
  comments: boolean;
  realtimeNotifications: boolean;
  profile: boolean;
  search: boolean;
  privacy: boolean;
  recommendations: boolean;
  analytics: boolean;
}

// Store States
export interface SNSState {
  currentUser: UserProfile | null;
  timeline: SNSPost[];
  notifications: Notification[];
  unreadNotificationCount: number;
  followers: UserProfile[];
  following: UserProfile[];
  isLoading: boolean;
  error: string | null;
  featureFlags: FeatureFlags;
}

// Socket Events
export interface SocketEvents {
  'subscribe:timeline': { userId: string };
  'subscribe:notifications': { userId: string };
  'timeline:new-post': { post: SNSPost };
  'notification:new': { notification: Notification };
  'notification:update-count': { unreadCount: number };
  'post:engagement-update': { 
    postId: string;
    engagement: PostEngagement;
  };
}