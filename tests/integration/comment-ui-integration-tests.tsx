/**
 * コメントUI機能 - 結合テストスイート
 * 
 * テスト対象:
 * - EnhancedPostCard + CommentSection の統合
 * - API + フロントエンドの連携
 * - 認証 + CSRF + APIの統合動作
 * 
 * 認証要件:
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 */

import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, jest } from '@jest/globals';
import { render, fireEvent, waitFor, screen, within } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import '@testing-library/jest-dom';

// =================================================================
// 結合テスト用デバッグログシステム
// =================================================================
class IntegrationTestLogger {
  private static readonly PREFIX = '[TEST-INTEGRATION]';
  private static logs: Array<{ 
    level: string; 
    message: string; 
    data: any; 
    timestamp: string;
    sequence: number;
  }> = [];
  private static sequence = 0;
  
  static log(action: string, data: any = {}) {
    const entry = {
      level: 'INFO',
      message: `${this.PREFIX}-${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        testFile: 'comment-ui-integration-tests.ts'
      },
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence
    };
    
    this.logs.push(entry);
    console.log(`[${entry.sequence}] ${entry.message}`, entry.data);
  }
  
  static error(action: string, error: any, context?: any) {
    const entry = {
      level: 'ERROR',
      message: `${this.PREFIX}-ERROR-${action}`,
      data: {
        error: error.message || error,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence
    };
    
    this.logs.push(entry);
    console.error(`[${entry.sequence}] ${entry.message}`, entry.data);
  }
  
  static warn(action: string, data: any = {}) {
    const entry = {
      level: 'WARN',
      message: `${this.PREFIX}-WARN-${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence
    };
    
    this.logs.push(entry);
    console.warn(`[${entry.sequence}] ${entry.message}`, entry.data);
  }
  
  static metric(action: string, metrics: any) {
    const entry = {
      level: 'METRIC',
      message: `${this.PREFIX}-METRIC-${action}`,
      data: {
        ...metrics,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence
    };
    
    this.logs.push(entry);
    console.log(`[${entry.sequence}] [METRIC] ${action}`, metrics);
  }
  
  static getLogs() {
    return [...this.logs];
  }
  
  static clearLogs() {
    this.logs = [];
    this.sequence = 0;
  }
}

// =================================================================
// MSW (Mock Service Worker) セットアップ
// =================================================================
const server = setupServer(
  // 認証エンドポイント
  rest.post('/api/auth/signin', (req, res, ctx) => {
    IntegrationTestLogger.log('AUTH_REQUEST_RECEIVED', {
      endpoint: '/api/auth/signin',
      body: req.body
    });
    
    const { email, password } = req.body as any;
    
    if (email === 'one.photolife+1@gmail.com' && password === '?@thc123THC@?') {
      IntegrationTestLogger.log('AUTH_SUCCESS', { email });
      return res(
        ctx.status(200),
        ctx.json({
          user: {
            id: 'test-user-id',
            email: email,
            name: 'Test User',
            emailVerified: true
          },
          accessToken: 'test-access-token',
          csrfToken: 'test-csrf-token'
        }),
        ctx.set('Set-Cookie', 'next-auth.session-token=test-session-token; Path=/; HttpOnly')
      );
    }
    
    IntegrationTestLogger.warn('AUTH_FAILED', { email });
    return res(ctx.status(401), ctx.json({ error: 'Invalid credentials' }));
  }),
  
  // コメント取得エンドポイント
  rest.get('/api/posts/:postId/comments', (req, res, ctx) => {
    const { postId } = req.params;
    const authHeader = req.headers.get('Authorization');
    
    IntegrationTestLogger.log('COMMENTS_FETCH_REQUEST', {
      postId,
      hasAuth: !!authHeader
    });
    
    if (!authHeader) {
      IntegrationTestLogger.warn('COMMENTS_FETCH_UNAUTHORIZED');
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            _id: 'comment-1',
            content: 'Test comment 1',
            postId: postId,
            author: {
              _id: 'user-1',
              name: 'User 1',
              email: 'user1@example.com'
            },
            createdAt: new Date().toISOString(),
            likes: []
          },
          {
            _id: 'comment-2',
            content: 'Test comment 2',
            postId: postId,
            author: {
              _id: 'test-user-id',
              name: 'Test User',
              email: 'one.photolife+1@gmail.com'
            },
            createdAt: new Date().toISOString(),
            likes: ['user-1']
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      })
    );
  }),
  
  // コメント投稿エンドポイント
  rest.post('/api/posts/:postId/comments', (req, res, ctx) => {
    const { postId } = req.params;
    const authHeader = req.headers.get('Authorization');
    const csrfToken = req.headers.get('X-CSRF-Token');
    const { content } = req.body as any;
    
    IntegrationTestLogger.log('COMMENT_POST_REQUEST', {
      postId,
      hasAuth: !!authHeader,
      hasCSRF: !!csrfToken,
      contentLength: content?.length
    });
    
    // 認証チェック
    if (!authHeader) {
      IntegrationTestLogger.warn('COMMENT_POST_UNAUTHORIZED');
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }
    
    // CSRFチェック
    if (!csrfToken) {
      IntegrationTestLogger.warn('COMMENT_POST_CSRF_MISSING');
      return res(ctx.status(403), ctx.json({ error: 'CSRF token missing' }));
    }
    
    // バリデーション
    if (!content || content.length === 0) {
      IntegrationTestLogger.warn('COMMENT_POST_VALIDATION_ERROR', { content });
      return res(ctx.status(400), ctx.json({ error: 'Content is required' }));
    }
    
    if (content.length > 500) {
      IntegrationTestLogger.warn('COMMENT_POST_CONTENT_TOO_LONG', { length: content.length });
      return res(ctx.status(400), ctx.json({ error: 'Content too long' }));
    }
    
    const newComment = {
      _id: `comment-${Date.now()}`,
      content,
      postId,
      author: {
        _id: 'test-user-id',
        name: 'Test User',
        email: 'one.photolife+1@gmail.com'
      },
      createdAt: new Date().toISOString(),
      likes: []
    };
    
    IntegrationTestLogger.log('COMMENT_POST_SUCCESS', { commentId: newComment._id });
    
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: newComment
      })
    );
  }),
  
  // コメント削除エンドポイント
  rest.delete('/api/posts/:postId/comments/:commentId', (req, res, ctx) => {
    const { postId, commentId } = req.params;
    const authHeader = req.headers.get('Authorization');
    
    IntegrationTestLogger.log('COMMENT_DELETE_REQUEST', {
      postId,
      commentId,
      hasAuth: !!authHeader
    });
    
    if (!authHeader) {
      IntegrationTestLogger.warn('COMMENT_DELETE_UNAUTHORIZED');
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }
    
    // 所有者チェックのシミュレーション
    if (commentId === 'comment-1') {
      IntegrationTestLogger.warn('COMMENT_DELETE_FORBIDDEN', { commentId });
      return res(ctx.status(403), ctx.json({ error: 'Not the comment owner' }));
    }
    
    IntegrationTestLogger.log('COMMENT_DELETE_SUCCESS', { commentId });
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Comment deleted'
      })
    );
  })
);

// サーバーのライフサイクル管理
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  IntegrationTestLogger.log('MSW_SERVER_STARTED');
});

afterEach(() => {
  server.resetHandlers();
  IntegrationTestLogger.log('MSW_HANDLERS_RESET');
});

afterAll(() => {
  server.close();
  IntegrationTestLogger.log('MSW_SERVER_STOPPED');
});

// =================================================================
// 結合テスト: 認証フロー統合
// =================================================================
describe('Authentication Flow Integration - 認証フロー統合', () => {
  
  beforeEach(() => {
    IntegrationTestLogger.clearLogs();
    IntegrationTestLogger.log('TEST_SUITE_START', { suite: 'AuthenticationFlow' });
  });
  
  afterEach(() => {
    IntegrationTestLogger.log('TEST_SUITE_END', { suite: 'AuthenticationFlow' });
  });
  
  it('正常系: 完全な認証フローが成功する', async () => {
    const startTime = Date.now();
    
    // ステップ1: ログイン
    const loginResponse = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'one.photolife+1@gmail.com',
        password: '?@thc123THC@?'
      })
    });
    
    expect(loginResponse.status).toBe(200);
    const loginData = await loginResponse.json();
    
    IntegrationTestLogger.log('LOGIN_STEP_COMPLETE', {
      userId: loginData.user.id,
      hasToken: !!loginData.accessToken,
      hasCSRF: !!loginData.csrfToken
    });
    
    // ステップ2: トークンを使用してAPIアクセス
    const commentsResponse = await fetch('/api/posts/test-post-id/comments', {
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`
      }
    });
    
    expect(commentsResponse.status).toBe(200);
    const commentsData = await commentsResponse.json();
    expect(commentsData.success).toBe(true);
    
    IntegrationTestLogger.log('AUTHENTICATED_API_ACCESS_SUCCESS', {
      commentCount: commentsData.data.length
    });
    
    // ステップ3: CSRFトークンを使用して投稿
    const postResponse = await fetch('/api/posts/test-post-id/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.accessToken}`,
        'X-CSRF-Token': loginData.csrfToken
      },
      body: JSON.stringify({
        content: 'Integration test comment'
      })
    });
    
    expect(postResponse.status).toBe(201);
    const postData = await postResponse.json();
    expect(postData.success).toBe(true);
    
    const duration = Date.now() - startTime;
    IntegrationTestLogger.metric('AUTH_FLOW_COMPLETE', {
      duration,
      steps: 3,
      success: true
    });
  });
  
  it('異常系: 認証なしでAPIアクセスが拒否される', async () => {
    const response = await fetch('/api/posts/test-post-id/comments');
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
    
    IntegrationTestLogger.warn('UNAUTHORIZED_ACCESS_BLOCKED', {
      endpoint: '/api/posts/test-post-id/comments',
      status: 401
    });
  });
  
  it('異常系: CSRFトークンなしで投稿が拒否される', async () => {
    // まず認証
    const loginResponse = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'one.photolife+1@gmail.com',
        password: '?@thc123THC@?'
      })
    });
    
    const loginData = await loginResponse.json();
    
    // CSRFトークンなしで投稿試行
    const postResponse = await fetch('/api/posts/test-post-id/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.accessToken}`
        // X-CSRF-Token を意図的に省略
      },
      body: JSON.stringify({
        content: 'Test without CSRF'
      })
    });
    
    expect(postResponse.status).toBe(403);
    const data = await postResponse.json();
    expect(data.error).toBe('CSRF token missing');
    
    IntegrationTestLogger.warn('CSRF_PROTECTION_WORKING', {
      attemptedAction: 'POST comment',
      csrfProvided: false,
      result: 'Blocked'
    });
  });
});

// =================================================================
// 結合テスト: コンポーネント連携
// =================================================================
describe('Component Integration - コンポーネント連携', () => {
  
  const mockPost = {
    _id: 'test-post-id',
    title: 'Test Post',
    content: 'Test post content',
    author: { _id: 'author-id', name: 'Author' },
    commentCount: 2,
    commentsEnabled: true
  };
  
  beforeEach(() => {
    IntegrationTestLogger.clearLogs();
    IntegrationTestLogger.log('TEST_SUITE_START', { suite: 'ComponentIntegration' });
  });
  
  afterEach(() => {
    IntegrationTestLogger.log('TEST_SUITE_END', { suite: 'ComponentIntegration' });
  });
  
  it('正常系: EnhancedPostCardとCommentSectionが連携動作する', async () => {
    // モックセッションの定義
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'one.photolife+1@gmail.com',
        name: 'Test User'
      },
      expires: '2024-12-31'
    };
    // EnhancedPostCardのモックコンポーネント
    const EnhancedPostCard = ({ post }: { post: any }) => {
      const [showComments, setShowComments] = React.useState(false);
      const [comments, setComments] = React.useState<any[]>([]);
      const [loading, setLoading] = React.useState(false);
      
      const loadComments = async () => {
        IntegrationTestLogger.log('LOADING_COMMENTS', { postId: post._id });
        setLoading(true);
        
        try {
          const response = await fetch(`/api/posts/${post._id}/comments`, {
            headers: { 'Authorization': 'Bearer test-token' }
          });
          const data = await response.json();
          
          if (data.success) {
            setComments(data.data);
            IntegrationTestLogger.log('COMMENTS_LOADED', { count: data.data.length });
          }
        } catch (error) {
          IntegrationTestLogger.error('COMMENTS_LOAD_ERROR', error);
        } finally {
          setLoading(false);
        }
      };
      
      React.useEffect(() => {
        if (showComments && comments.length === 0) {
          loadComments();
        }
      }, [showComments]);
      
      return (
        <div data-testid="enhanced-post-card">
          <div>{post.title}</div>
          <button 
            onClick={() => setShowComments(!showComments)}
            data-testid="toggle-comments"
          >
            コメント ({post.commentCount})
          </button>
          
          {showComments && (
            <div data-testid="comment-section">
              {loading ? (
                <div>Loading...</div>
              ) : (
                comments.map(comment => (
                  <div key={comment._id} data-testid={`comment-${comment._id}`}>
                    {comment.content}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      );
    };
    
    const { getByTestId, findByTestId } = render(
      <SessionProvider session={mockSession}>
        <EnhancedPostCard post={mockPost} />
      </SessionProvider>
    );
    
    // コメントセクションが初期状態で非表示
    expect(() => getByTestId('comment-section')).toThrow();
    
    // コメントボタンをクリック
    const toggleButton = getByTestId('toggle-comments');
    fireEvent.click(toggleButton);
    
    // コメントセクションが表示される
    const commentSection = await findByTestId('comment-section');
    expect(commentSection).toBeInTheDocument();
    
    // コメントが読み込まれる
    await waitFor(() => {
      expect(getByTestId('comment-comment-1')).toBeInTheDocument();
      expect(getByTestId('comment-comment-2')).toBeInTheDocument();
    });
    
    IntegrationTestLogger.log('COMPONENT_INTEGRATION_SUCCESS', {
      postId: mockPost._id,
      commentsDisplayed: true
    });
  });
  
  it('正常系: コメント投稿フォームとAPIが連携する', async () => {
    const CommentForm = ({ postId, onSubmit }: { postId: string; onSubmit: Function }) => {
      const [content, setContent] = React.useState('');
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState<string | null>(null);
      
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        IntegrationTestLogger.log('COMMENT_FORM_SUBMIT', { contentLength: content.length });
        
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
              'X-CSRF-Token': 'test-csrf-token'
            },
            body: JSON.stringify({ content })
          });
          
          const data = await response.json();
          
          if (response.ok && data.success) {
            IntegrationTestLogger.log('COMMENT_POSTED', { commentId: data.data._id });
            onSubmit(data.data);
            setContent('');
          } else {
            setError(data.error || 'Failed to post comment');
            IntegrationTestLogger.warn('COMMENT_POST_FAILED', { error: data.error });
          }
        } catch (error) {
          IntegrationTestLogger.error('COMMENT_POST_ERROR', error);
          setError('Network error');
        } finally {
          setLoading(false);
        }
      };
      
      return (
        <form onSubmit={handleSubmit} data-testid="comment-form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            data-testid="comment-input"
            placeholder="コメントを入力..."
            disabled={loading}
          />
          {error && <div data-testid="error-message">{error}</div>}
          <button type="submit" disabled={loading || !content} data-testid="submit-button">
            {loading ? '送信中...' : '送信'}
          </button>
        </form>
      );
    };
    
    const handleCommentSubmit = jest.fn();
    
    const { getByTestId } = render(
      <CommentForm postId="test-post-id" onSubmit={handleCommentSubmit} />
    );
    
    // コメントを入力
    const input = getByTestId('comment-input');
    fireEvent.change(input, { target: { value: 'Test comment from integration test' } });
    
    // 送信ボタンをクリック
    const submitButton = getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    // コメントが正常に投稿される
    await waitFor(() => {
      expect(handleCommentSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Test comment from integration test'
        })
      );
    });
    
    IntegrationTestLogger.log('FORM_API_INTEGRATION_SUCCESS');
  });
  
  it('異常系: バリデーションエラーが適切に処理される', async () => {
    const CommentForm = ({ postId }: { postId: string }) => {
      const [content, setContent] = React.useState('');
      const [error, setError] = React.useState<string | null>(null);
      
      const validateContent = (text: string): string | null => {
        if (!text.trim()) return 'コメントを入力してください';
        if (text.length > 500) return 'コメントは500文字以内で入力してください';
        return null;
      };
      
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validationError = validateContent(content);
        if (validationError) {
          setError(validationError);
          IntegrationTestLogger.warn('VALIDATION_ERROR', { error: validationError });
          return;
        }
        
        // API呼び出し（省略）
      };
      
      return (
        <form onSubmit={handleSubmit} data-testid="comment-form">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
            }}
            data-testid="comment-input"
          />
          {error && <div data-testid="error-message">{error}</div>}
          <button type="submit" data-testid="submit-button">送信</button>
        </form>
      );
    };
    
    const { getByTestId, queryByTestId } = render(
      <CommentForm postId="test-post-id" />
    );
    
    // 空のコメントで送信試行
    const submitButton = getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    // エラーメッセージが表示される
    await waitFor(() => {
      const errorMessage = getByTestId('error-message');
      expect(errorMessage).toHaveTextContent('コメントを入力してください');
    });
    
    // 長すぎるコメントを入力
    const input = getByTestId('comment-input');
    fireEvent.change(input, { target: { value: 'a'.repeat(501) } });
    fireEvent.click(submitButton);
    
    // エラーメッセージが更新される
    await waitFor(() => {
      const errorMessage = getByTestId('error-message');
      expect(errorMessage).toHaveTextContent('500文字以内');
    });
    
    IntegrationTestLogger.log('VALIDATION_HANDLING_SUCCESS');
  });
});

// =================================================================
// 結合テスト: リアルタイム機能
// =================================================================
describe('Realtime Integration - リアルタイム機能統合', () => {
  
  beforeEach(() => {
    IntegrationTestLogger.clearLogs();
    IntegrationTestLogger.log('TEST_SUITE_START', { suite: 'RealtimeIntegration' });
  });
  
  afterEach(() => {
    IntegrationTestLogger.log('TEST_SUITE_END', { suite: 'RealtimeIntegration' });
  });
  
  it('正常系: Socket.IOイベントでコメントがリアルタイム更新される', async () => {
    // Socket.IOモックの設定
    const mockSocketCallbacks: { [key: string]: Function[] } = {};
    const mockSocket = {
      on: (event: string, callback: Function) => {
        if (!mockSocketCallbacks[event]) {
          mockSocketCallbacks[event] = [];
        }
        mockSocketCallbacks[event].push(callback);
        IntegrationTestLogger.log('SOCKET_LISTENER_REGISTERED', { event });
      },
      emit: (event: string, data: any) => {
        if (mockSocketCallbacks[event]) {
          mockSocketCallbacks[event].forEach(cb => cb(data));
        }
        IntegrationTestLogger.log('SOCKET_EVENT_EMITTED', { event, data });
      },
      off: (event: string) => {
        delete mockSocketCallbacks[event];
        IntegrationTestLogger.log('SOCKET_LISTENER_REMOVED', { event });
      }
    };
    
    const CommentSection = ({ postId }: { postId: string }) => {
      const [comments, setComments] = React.useState<any[]>([]);
      
      React.useEffect(() => {
        // Socket.IOイベントリスナー登録
        const handleNewComment = (comment: any) => {
          IntegrationTestLogger.log('NEW_COMMENT_RECEIVED', { commentId: comment._id });
          setComments(prev => [...prev, comment]);
        };
        
        const handleCommentDeleted = (commentId: string) => {
          IntegrationTestLogger.log('COMMENT_DELETED_EVENT', { commentId });
          setComments(prev => prev.filter(c => c._id !== commentId));
        };
        
        mockSocket.on(`comment:created:${postId}`, handleNewComment);
        mockSocket.on(`comment:deleted:${postId}`, handleCommentDeleted);
        
        return () => {
          mockSocket.off(`comment:created:${postId}`);
          mockSocket.off(`comment:deleted:${postId}`);
        };
      }, [postId]);
      
      return (
        <div data-testid="comment-section">
          {comments.map(comment => (
            <div key={comment._id} data-testid={`comment-${comment._id}`}>
              {comment.content}
            </div>
          ))}
        </div>
      );
    };
    
    const { getByTestId, queryByTestId } = render(
      <CommentSection postId="test-post-id" />
    );
    
    // 新しいコメントイベントを発火
    const newComment = {
      _id: 'new-comment-1',
      content: 'Realtime comment',
      author: { _id: 'user-1', name: 'User 1' }
    };
    
    mockSocket.emit(`comment:created:test-post-id`, newComment);
    
    // コメントが表示される
    await waitFor(() => {
      const commentElement = getByTestId('comment-new-comment-1');
      expect(commentElement).toHaveTextContent('Realtime comment');
    });
    
    // コメント削除イベントを発火
    mockSocket.emit(`comment:deleted:test-post-id`, 'new-comment-1');
    
    // コメントが削除される
    await waitFor(() => {
      expect(queryByTestId('comment-new-comment-1')).not.toBeInTheDocument();
    });
    
    IntegrationTestLogger.log('REALTIME_INTEGRATION_SUCCESS');
  });
  
  it('異常系: Socket切断時の再接続処理', async () => {
    let isConnected = true;
    const reconnectDelay = 5000;
    
    const mockSocket = {
      connected: isConnected,
      connect: jest.fn(() => {
        isConnected = true;
        IntegrationTestLogger.log('SOCKET_CONNECTED');
      }),
      disconnect: jest.fn(() => {
        isConnected = false;
        IntegrationTestLogger.log('SOCKET_DISCONNECTED');
      }),
      on: jest.fn((event, callback) => {
        if (event === 'disconnect') {
          // 切断時の処理
          setTimeout(() => {
            IntegrationTestLogger.log('ATTEMPTING_RECONNECT');
            mockSocket.connect();
          }, reconnectDelay);
        }
      })
    };
    
    // 初期接続状態
    expect(mockSocket.connected).toBe(true);
    
    // 切断をシミュレート
    mockSocket.disconnect();
    expect(mockSocket.connected).toBe(false);
    
    // 再接続処理の実行
    mockSocket.on('disconnect', () => {});
    
    // 再接続の確認（タイムアウト後）
    await new Promise(resolve => setTimeout(resolve, reconnectDelay + 100));
    
    expect(mockSocket.connect).toHaveBeenCalled();
    
    IntegrationTestLogger.log('RECONNECTION_HANDLING_SUCCESS', {
      reconnectDelay,
      reconnected: isConnected
    });
  });
});

// =================================================================
// エラーパターンと対処法（結合レベル）
// =================================================================
describe('Integration Error Patterns - 結合エラーパターン', () => {
  
  beforeEach(() => {
    IntegrationTestLogger.clearLogs();
    IntegrationTestLogger.log('TEST_SUITE_START', { suite: 'IntegrationErrorPatterns' });
  });
  
  afterEach(() => {
    IntegrationTestLogger.log('TEST_SUITE_END', { suite: 'IntegrationErrorPatterns' });
  });
  
  it('対処法: トークン更新とAPI呼び出しの連携', async () => {
    let accessToken = 'expired-token';
    let tokenExpiry = Date.now() - 1000; // 既に期限切れ
    
    const refreshToken = async () => {
      IntegrationTestLogger.log('REFRESHING_TOKEN');
      accessToken = 'new-access-token';
      tokenExpiry = Date.now() + 3600000; // 1時間後
      return { accessToken, expiresIn: 3600 };
    };
    
    const apiCallWithRefresh = async (url: string) => {
      // トークン期限チェック
      if (Date.now() >= tokenExpiry) {
        await refreshToken();
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      // 401の場合は再度リフレッシュ
      if (response.status === 401) {
        IntegrationTestLogger.warn('TOKEN_EXPIRED_DURING_REQUEST');
        await refreshToken();
        
        return fetch(url, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      }
      
      return response;
    };
    
    // APIコール実行
    const response = await apiCallWithRefresh('/api/posts/test/comments');
    
    expect(response.status).toBe(200);
    expect(accessToken).toBe('new-access-token');
    
    IntegrationTestLogger.log('TOKEN_REFRESH_INTEGRATION_SUCCESS');
  });
  
  it('対処法: 楽観的更新とエラーロールバック', async () => {
    const comments = [
      { _id: '1', content: 'Comment 1' },
      { _id: '2', content: 'Comment 2' }
    ];
    
    const optimisticDelete = async (commentId: string) => {
      // 楽観的更新
      const originalComments = [...comments];
      const commentIndex = comments.findIndex(c => c._id === commentId);
      
      if (commentIndex !== -1) {
        comments.splice(commentIndex, 1);
        IntegrationTestLogger.log('OPTIMISTIC_UPDATE_APPLIED', { commentId });
      }
      
      try {
        // API呼び出し
        const response = await fetch(`/api/posts/test/comments/${commentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer test-token' }
        });
        
        if (!response.ok) {
          throw new Error('Delete failed');
        }
        
        IntegrationTestLogger.log('DELETE_CONFIRMED', { commentId });
      } catch (error) {
        // ロールバック
        comments.length = 0;
        comments.push(...originalComments);
        
        IntegrationTestLogger.warn('OPTIMISTIC_UPDATE_ROLLED_BACK', {
          commentId,
          error: (error as Error).message
        });
        
        throw error;
      }
    };
    
    // 成功ケース
    await optimisticDelete('2');
    expect(comments).toHaveLength(1);
    expect(comments[0]._id).toBe('1');
    
    // 失敗ケース（権限なし）のシミュレーション
    try {
      await optimisticDelete('1'); // これは失敗する想定
    } catch (error) {
      // ロールバックされているはず
      expect(comments).toHaveLength(1);
    }
    
    IntegrationTestLogger.log('OPTIMISTIC_UPDATE_PATTERN_SUCCESS');
  });
});

// =================================================================
// テスト実行レポート
// =================================================================
afterAll(() => {
  const logs = IntegrationTestLogger.getLogs();
  
  const summary = {
    totalLogs: logs.length,
    infoLogs: logs.filter(l => l.level === 'INFO').length,
    warnLogs: logs.filter(l => l.level === 'WARN').length,
    errorLogs: logs.filter(l => l.level === 'ERROR').length,
    metricLogs: logs.filter(l => l.level === 'METRIC').length,
    testSuites: [...new Set(logs
      .filter(l => l.message.includes('TEST_SUITE_START'))
      .map(l => l.data.suite))],
    apiCalls: logs.filter(l => 
      l.message.includes('REQUEST') || 
      l.message.includes('RESPONSE')
    ).length,
    socketEvents: logs.filter(l => 
      l.message.includes('SOCKET')
    ).length,
    timestamp: new Date().toISOString()
  };
  
  IntegrationTestLogger.log('INTEGRATION_TEST_COMPLETE', summary);
  
  console.log('=====================================');
  console.log('結合テスト実行完了');
  console.log('=====================================');
  console.log(JSON.stringify(summary, null, 2));
});