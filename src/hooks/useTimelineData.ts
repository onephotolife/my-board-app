import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSecureFetch } from '@/components/CSRFProvider';

export interface TimelinePost {
  _id: string;
  author: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  content: string;
  likes: string[];
  comments: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineMetadata {
  followingCount: number;
  isAuthenticated: boolean;
  lastUpdate: string;
}

export interface TimelinePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UseTimelineDataReturn {
  posts: TimelinePost[];
  loading: boolean;
  error: string | null;
  metadata: TimelineMetadata | null;
  pagination: TimelinePagination | null;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updatePost: (postId: string, updatedPost: TimelinePost) => void;
  removePost: (postId: string) => void;
  addPost: (post: TimelinePost) => void;
}

// デバッグログクラス
class HookDebugLogger {
  private logs: any[] = [];
  
  log(category: string, data: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      category,
      data,
      hook: 'useTimelineData'
    };
    this.logs.push(entry);
    console.log('[HOOK-TIMELINE-DEBUG]', JSON.stringify(entry));
  }
  
  getAll() {
    return this.logs;
  }
  
  clear() {
    this.logs = [];
  }
}

const debugLogger = new HookDebugLogger();

export function useTimelineData(limit: number = 20): UseTimelineDataReturn {
  const { data: session } = useSession();
  const secureFetch = useSecureFetch();
  
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<TimelineMetadata | null>(null);
  const [pagination, setPagination] = useState<TimelinePagination | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // タイムラインデータ取得
  const fetchTimelineData = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!session?.user?.id) {
      debugLogger.log('fetch-abort', { reason: 'no-session' });
      setLoading(false);
      return;
    }

    try {
      debugLogger.log('fetch-start', { 
        page, 
        limit, 
        append,
        userId: session.user.id 
      });
      
      setError(null);
      if (!append) {
        setLoading(true);
      }

      const url = `/api/timeline?page=${page}&limit=${limit}`;
      const response = await secureFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch timeline');
      }

      const data = await response.json();
      
      debugLogger.log('fetch-success', {
        page,
        postsCount: data.data?.length,
        totalPosts: data.pagination?.total,
        hasNext: data.pagination?.hasNext
      });

      if (data.success) {
        if (append) {
          setPosts(prev => [...prev, ...(data.data || [])]);
        } else {
          setPosts(data.data || []);
        }
        
        setMetadata(data.metadata);
        setPagination(data.pagination);
        setHasMore(data.pagination?.hasNext || false);
        setCurrentPage(page);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'タイムラインの取得に失敗しました';
      debugLogger.log('fetch-error', { 
        error: errorMessage,
        page,
        append
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [session, secureFetch, limit]);

  // 初回データ取得
  useEffect(() => {
    if (session?.user?.id && session?.user?.emailVerified) {
      fetchTimelineData(1, false);
    }
  }, [session, fetchTimelineData]);

  // さらに読み込む
  const fetchMore = useCallback(async () => {
    if (!hasMore || loading) {
      debugLogger.log('fetch-more-abort', { hasMore, loading });
      return;
    }
    
    const nextPage = currentPage + 1;
    debugLogger.log('fetch-more', { nextPage });
    await fetchTimelineData(nextPage, true);
  }, [hasMore, loading, currentPage, fetchTimelineData]);

  // リフレッシュ
  const refresh = useCallback(async () => {
    debugLogger.log('refresh', { timestamp: new Date().toISOString() });
    setCurrentPage(1);
    await fetchTimelineData(1, false);
  }, [fetchTimelineData]);

  // 投稿更新
  const updatePost = useCallback((postId: string, updatedPost: TimelinePost) => {
    debugLogger.log('update-post', { postId });
    setPosts(prev => prev.map(p => 
      p._id === postId ? updatedPost : p
    ));
  }, []);

  // 投稿削除
  const removePost = useCallback((postId: string) => {
    debugLogger.log('remove-post', { postId });
    setPosts(prev => prev.filter(p => p._id !== postId));
  }, []);

  // 投稿追加
  const addPost = useCallback((post: TimelinePost) => {
    debugLogger.log('add-post', { postId: post._id });
    setPosts(prev => [post, ...prev]);
  }, []);

  return {
    posts,
    loading,
    error,
    metadata,
    pagination,
    hasMore,
    fetchMore,
    refresh,
    updatePost,
    removePost,
    addPost,
  };
}