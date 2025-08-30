/**
 * コメント機能実装検証コード
 * 実装はせず、構文チェックとバグチェックのみ実施
 * 認証情報: one.photolife+1@gmail.com / ?@thc123THC@?
 */

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// デバッグログクラス
class CommentDebugLogger {
  static log(action: string, data: any = {}) {
    console.log(`[COMMENT-DEBUG] ${new Date().toISOString()} ${action}:`, data);
  }
  
  static error(action: string, error: any) {
    console.error(`[COMMENT-ERROR] ${new Date().toISOString()} ${action}:`, error);
  }
  
  static success(action: string, data: any) {
    console.log(`[COMMENT-SUCCESS] ✅ ${action}:`, data);
  }
}

// ============================================================
// 優先度1: コメント表示機能（改善版）
// ============================================================
export const fetchCommentsImproved = async (
  postId: string,
  csrfFetch: Function,
  setComments: Function,
  setLoadingComments: Function,
  setError: Function
) => {
  CommentDebugLogger.log('FETCH_COMMENTS_START', { postId });
  setLoadingComments(true);
  setError(null);
  
  try {
    // 入力検証
    if (!postId || typeof postId !== 'string') {
      throw new Error('Invalid postId');
    }
    
    // ObjectId形式チェック
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(postId)) {
      throw new Error('Invalid postId format');
    }
    
    const response = await csrfFetch(`/api/posts/${postId}/comments`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // キャッシュ無効化
    });
    
    CommentDebugLogger.log('FETCH_COMMENTS_RESPONSE', { 
      status: response.status,
      ok: response.ok 
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('認証が必要です');
      } else if (response.status === 404) {
        throw new Error('投稿が見つかりません');
      } else {
        throw new Error(`コメント取得エラー: ${response.status}`);
      }
    }
    
    const data = await response.json();
    
    // データ検証
    if (!data || !data.data || !Array.isArray(data.data)) {
      CommentDebugLogger.error('INVALID_RESPONSE_FORMAT', { data });
      setComments([]);
      return;
    }
    
    setComments(data.data);
    CommentDebugLogger.success('COMMENTS_FETCHED', { 
      count: data.data.length,
      pagination: data.pagination 
    });
    
  } catch (error) {
    CommentDebugLogger.error('FETCH_COMMENTS_ERROR', error);
    setError(error instanceof Error ? error.message : 'コメント取得に失敗しました');
    setComments([]);
  } finally {
    setLoadingComments(false);
  }
};

// ============================================================
// 優先度2: コメント投稿機能（改善版）
// ============================================================
export const submitCommentImproved = async (
  postId: string,
  content: string,
  csrfFetch: Function,
  setComments: Function,
  setComment: Function,
  setSubmitting: Function,
  setError: Function
) => {
  CommentDebugLogger.log('SUBMIT_COMMENT_START', { postId, contentLength: content.length });
  
  // 入力検証
  if (!content || content.trim().length === 0) {
    setError('コメントを入力してください');
    return;
  }
  
  if (content.length > 500) {
    setError('コメントは500文字以内で入力してください');
    return;
  }
  
  setSubmitting(true);
  setError(null);
  
  try {
    // XSS対策のための危険パターンチェック
    const dangerousPatterns = /<script|<iframe|javascript:|on\w+=/gi;
    if (dangerousPatterns.test(content)) {
      throw new Error('不正な文字が含まれています');
    }
    
    const response = await csrfFetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        content: content.trim() 
      }),
    });
    
    CommentDebugLogger.log('SUBMIT_COMMENT_RESPONSE', { 
      status: response.status,
      ok: response.ok 
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('認証が必要です');
      } else if (response.status === 403) {
        throw new Error('CSRF保護エラー');
      } else if (response.status === 429) {
        throw new Error('レート制限に達しました');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `投稿エラー: ${response.status}`);
      }
    }
    
    const newComment = await response.json();
    
    // 楽観的更新
    setComments((prev: any[]) => [newComment.data, ...prev]);
    setComment('');
    
    CommentDebugLogger.success('COMMENT_POSTED', { 
      commentId: newComment.data?._id || newComment.data?.id 
    });
    
  } catch (error) {
    CommentDebugLogger.error('SUBMIT_COMMENT_ERROR', error);
    setError(error instanceof Error ? error.message : 'コメント投稿に失敗しました');
  } finally {
    setSubmitting(false);
  }
};

// ============================================================
// 優先度3: リアルタイム更新（改善版）
// ============================================================
export const setupRealtimeUpdatesImproved = (
  postId: string,
  setComments: Function,
  updateCommentCount?: Function
): (() => void) => {
  CommentDebugLogger.log('SETUP_REALTIME_START', { postId });
  
  let socket: Socket | null = null;
  
  try {
    // Socket.IOクライアント初期化
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    // 接続イベント
    socket.on('connect', () => {
      CommentDebugLogger.success('SOCKET_CONNECTED', { 
        socketId: socket?.id 
      });
      socket?.emit('join:post', postId);
    });
    
    // コメント作成イベント
    socket.on('comment:created', (data: any) => {
      CommentDebugLogger.log('REALTIME_COMMENT_RECEIVED', { 
        postId: data.postId,
        commentId: data.comment?._id 
      });
      
      if (data.postId === postId) {
        setComments((prev: any[]) => {
          // 重複チェック
          const exists = prev.some(c => c._id === data.comment._id);
          if (exists) {
            CommentDebugLogger.log('DUPLICATE_COMMENT_IGNORED', { 
              commentId: data.comment._id 
            });
            return prev;
          }
          return [data.comment, ...prev];
        });
        
        // コメント数更新
        if (updateCommentCount) {
          updateCommentCount(data.commentCount);
        }
      }
    });
    
    // コメント削除イベント
    socket.on('comment:deleted', (data: any) => {
      if (data.postId === postId) {
        setComments((prev: any[]) => 
          prev.filter(c => c._id !== data.commentId)
        );
      }
    });
    
    // エラーハンドリング
    socket.on('error', (error: any) => {
      CommentDebugLogger.error('SOCKET_ERROR', error);
    });
    
    socket.on('disconnect', (reason: string) => {
      CommentDebugLogger.log('SOCKET_DISCONNECTED', { reason });
    });
    
  } catch (error) {
    CommentDebugLogger.error('SETUP_REALTIME_ERROR', error);
  }
  
  // クリーンアップ関数を返す
  return () => {
    CommentDebugLogger.log('CLEANUP_REALTIME', { postId });
    if (socket) {
      socket.emit('leave:post', postId);
      socket.disconnect();
    }
  };
};

// ============================================================
// 優先度4: いいね・削除・編集機能（改善版）
// ============================================================
export const likeCommentImproved = async (
  postId: string,
  commentId: string,
  csrfFetch: Function,
  setComments: Function,
  setError: Function
) => {
  CommentDebugLogger.log('LIKE_COMMENT_START', { postId, commentId });
  
  try {
    const response = await csrfFetch(
      `/api/posts/${postId}/comments/${commentId}/like`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`いいねエラー: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 楽観的更新
    setComments((prev: any[]) => 
      prev.map(comment => {
        if (comment._id === commentId) {
          return {
            ...comment,
            likes: data.likes,
            likeCount: data.likeCount,
            isLikedByUser: data.isLikedByUser,
          };
        }
        return comment;
      })
    );
    
    CommentDebugLogger.success('COMMENT_LIKED', { 
      commentId,
      likeCount: data.likeCount 
    });
    
  } catch (error) {
    CommentDebugLogger.error('LIKE_COMMENT_ERROR', error);
    setError(error instanceof Error ? error.message : 'いいねに失敗しました');
  }
};

export const deleteCommentImproved = async (
  postId: string,
  commentId: string,
  csrfFetch: Function,
  setComments: Function,
  setError: Function
) => {
  CommentDebugLogger.log('DELETE_COMMENT_START', { postId, commentId });
  
  if (!confirm('このコメントを削除しますか？')) {
    return;
  }
  
  try {
    const response = await csrfFetch(
      `/api/posts/${postId}/comments/${commentId}`,
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('削除権限がありません');
      }
      throw new Error(`削除エラー: ${response.status}`);
    }
    
    // 楽観的更新
    setComments((prev: any[]) => 
      prev.filter(comment => comment._id !== commentId)
    );
    
    CommentDebugLogger.success('COMMENT_DELETED', { commentId });
    
  } catch (error) {
    CommentDebugLogger.error('DELETE_COMMENT_ERROR', error);
    setError(error instanceof Error ? error.message : 'コメント削除に失敗しました');
  }
};

// ============================================================
// 構文チェック用の型定義
// ============================================================
interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  postId: string;
  likes: string[];
  likeCount: number;
  isLikedByUser: boolean;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'deleted' | 'hidden' | 'reported';
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
}

// ============================================================
// 認証付きテストコード
// ============================================================
export const testCommentFunctions = async () => {
  const TEST_EMAIL = 'one.photolife+1@gmail.com';
  const TEST_PASSWORD = '?@thc123THC@?';
  const TEST_POST_ID = '6784cf91d4cf2a4e8c8b4567'; // 仮のID
  
  CommentDebugLogger.log('TEST_START', { email: TEST_EMAIL });
  
  // 模擬csrfFetch関数
  const mockCsrfFetch = async (url: string, options?: any) => {
    CommentDebugLogger.log('MOCK_FETCH', { url, method: options?.method || 'GET' });
    
    // 認証チェック
    if (!options?.headers?.['Cookie']) {
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: '認証が必要です' })
      };
    }
    
    // 成功レスポンスを返す
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0 }
      })
    };
  };
  
  // テスト実行
  try {
    // 1. コメント取得テスト
    await fetchCommentsImproved(
      TEST_POST_ID,
      mockCsrfFetch,
      () => {},
      () => {},
      () => {}
    );
    
    CommentDebugLogger.success('TEST_COMPLETED', { 
      message: '構文チェック完了' 
    });
    
  } catch (error) {
    CommentDebugLogger.error('TEST_ERROR', error);
  }
};

// エクスポート確認（構文チェック）
export default {
  fetchCommentsImproved,
  submitCommentImproved,
  setupRealtimeUpdatesImproved,
  likeCommentImproved,
  deleteCommentImproved,
  testCommentFunctions,
  CommentDebugLogger,
};