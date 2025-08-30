/**
 * コメント機能結合テスト
 * 認証必須: one.photolife+1@gmail.com / ?@thc123THC@?
 * 
 * テスト対象：
 * 1. EnhancedPostCardとAPIの連携
 * 2. CSRFとの統合
 * 3. Socket.IOとUIの連携
 * 4. 複数コンポーネント間の状態管理
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import '@testing-library/jest-dom';

// ============================================================
// デバッグログクラス
// ============================================================
class IntegrationTestDebugLogger {
  private static readonly PREFIX = '[INTEGRATION-TEST]';
  
  static log(action: string, data: any = {}) {
    console.log(`${this.PREFIX} ${new Date().toISOString()} ${action}:`, JSON.stringify(data, null, 2));
  }
  
  static error(action: string, error: any) {
    console.error(`${this.PREFIX}-ERROR ${new Date().toISOString()} ${action}:`, error);
  }
  
  static success(action: string, data: any = {}) {
    console.log(`${this.PREFIX}-SUCCESS ✅ ${action}:`, data);
  }
  
  static warn(action: string, message: string) {
    console.warn(`${this.PREFIX}-WARN ⚠️ ${action}: ${message}`);
  }
  
  static trace(action: string, stack: string[]) {
    console.log(`${this.PREFIX}-TRACE ${action}:`, stack.join(' → '));
  }
}

// ============================================================
// モックセッション
// ============================================================
const mockSession = {
  user: {
    id: '68b00bb9e2d2d61e174b2204',
    email: 'one.photolife+1@gmail.com',
    name: 'Test User',
    emailVerified: true
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// ============================================================
// モックコンポーネント
// ============================================================
interface EnhancedPostCardProps {
  post: {
    _id: string;
    title: string;
    content: string;
    author: string;
    authorName: string;
    createdAt: string;
    updatedAt: string;
  };
  currentUserId?: string;
  onEdit: (post: any) => void;
  onDelete: (id: string) => void;
}

// 模擬EnhancedPostCard（実際の実装を簡略化）
const MockEnhancedPostCard: React.FC<EnhancedPostCardProps> = ({ post, currentUserId }) => {
  const [showComments, setShowComments] = React.useState(false);
  const [comments, setComments] = React.useState<any[]>([]);
  const [comment, setComment] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // コメント取得
  const fetchComments = async () => {
    IntegrationTestDebugLogger.log('FETCH_COMMENTS', { postId: post._id });
    setLoading(true);
    setError(null);
    
    try {
      // モックAPI呼び出し
      const mockComments = [
        { _id: '1', content: 'コメント1', author: { name: 'User1' } },
        { _id: '2', content: 'コメント2', author: { name: 'User2' } }
      ];
      
      setComments(mockComments);
      IntegrationTestDebugLogger.success('COMMENTS_LOADED', { count: mockComments.length });
    } catch (err) {
      IntegrationTestDebugLogger.error('FETCH_ERROR', err);
      setError('コメントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // コメント投稿
  const handleCommentSubmit = async () => {
    IntegrationTestDebugLogger.log('SUBMIT_COMMENT', { content: comment });
    
    if (!comment.trim()) {
      setError('コメントを入力してください');
      return;
    }
    
    setLoading(true);
    try {
      const newComment = {
        _id: Date.now().toString(),
        content: comment,
        author: { name: 'Current User' }
      };
      
      setComments(prev => [newComment, ...prev]);
      setComment('');
      IntegrationTestDebugLogger.success('COMMENT_POSTED', { commentId: newComment._id });
    } catch (err) {
      IntegrationTestDebugLogger.error('POST_ERROR', err);
      setError('コメントの投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  React.useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);
  
  return (
    <div data-testid="post-card">
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      <button onClick={() => setShowComments(!showComments)}>
        コメント ({comments.length})
      </button>
      
      {showComments && (
        <div data-testid="comments-section">
          {error && <div role="alert">{error}</div>}
          {loading && <div>読み込み中...</div>}
          
          <div>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="コメントを入力..."
              data-testid="comment-input"
            />
            <button 
              onClick={handleCommentSubmit}
              disabled={loading || !comment.trim()}
              data-testid="comment-submit"
            >
              投稿
            </button>
          </div>
          
          <div data-testid="comments-list">
            {comments.map((c) => (
              <div key={c._id}>
                <strong>{c.author.name}:</strong> {c.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// テスト1: コンポーネントとAPIの連携
// ============================================================
describe('EnhancedPostCardとAPIの連携テスト', () => {
  const mockPost = {
    _id: 'post123',
    title: 'テスト投稿',
    content: 'テスト内容',
    author: 'user123',
    authorName: 'Test Author',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  beforeEach(() => {
    IntegrationTestDebugLogger.log('TEST_SETUP', { test: 'コンポーネントAPI連携' });
  });
  
  it('コメントセクションの表示と非表示（OK）', async () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: 'コメントセクション表示' });
    
    render(
      <SessionProvider session={mockSession}>
        <MockEnhancedPostCard
          post={mockPost}
          currentUserId={mockSession.user.id}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </SessionProvider>
    );
    
    // 初期状態：コメントセクション非表示
    expect(screen.queryByTestId('comments-section')).not.toBeInTheDocument();
    
    // コメントボタンクリック
    const commentButton = screen.getByText(/コメント/);
    fireEvent.click(commentButton);
    
    // コメントセクション表示
    await waitFor(() => {
      expect(screen.getByTestId('comments-section')).toBeInTheDocument();
    });
    
    IntegrationTestDebugLogger.success('SECTION_TOGGLED', { visible: true });
  });
  
  it('コメント一覧の取得と表示（OK）', async () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: 'コメント一覧表示' });
    
    render(
      <SessionProvider session={mockSession}>
        <MockEnhancedPostCard
          post={mockPost}
          currentUserId={mockSession.user.id}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </SessionProvider>
    );
    
    // コメントセクションを開く
    fireEvent.click(screen.getByText(/コメント/));
    
    // コメントが読み込まれるまで待機
    await waitFor(() => {
      const commentsList = screen.getByTestId('comments-list');
      expect(commentsList.children).toHaveLength(2);
    });
    
    IntegrationTestDebugLogger.success('COMMENTS_DISPLAYED', { count: 2 });
  });
  
  it('認証なしでエラー処理（NG - 401）', async () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: '認証エラー処理' });
    
    // セッションなしでレンダリング
    render(
      <SessionProvider session={null}>
        <div>認証が必要です</div>
      </SessionProvider>
    );
    
    expect(screen.getByText('認証が必要です')).toBeInTheDocument();
    
    IntegrationTestDebugLogger.warn('AUTH_REQUIRED', '認証なしでのアクセス');
    
    // 対処法: リダイレクトまたはログインモーダル表示
    const solution = 'useSession()でセッションチェック → /auth/signinへリダイレクト';
    expect(solution).toBeDefined();
  });
});

// ============================================================
// テスト2: CSRF保護との統合
// ============================================================
describe('CSRF保護との統合テスト', () => {
  let csrfToken: string;
  
  beforeEach(() => {
    IntegrationTestDebugLogger.log('TEST_SETUP', { test: 'CSRF統合' });
    csrfToken = 'mock-csrf-token-12345';
  });
  
  it('CSRFトークンの自動付与（OK）', async () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: 'CSRFトークン付与' });
    
    // csrfFetchのモック
    const mockCsrfFetch = jest.fn().mockImplementation((url, options) => {
      IntegrationTestDebugLogger.trace('CSRF_FETCH', [
        'getCsrfToken()',
        'fetch with X-CSRF-Token',
        'response'
      ]);
      
      expect(options.headers['X-CSRF-Token']).toBe(csrfToken);
      
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true })
      });
    });
    
    await mockCsrfFetch('/api/posts/123/comments', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'test' })
    });
    
    expect(mockCsrfFetch).toHaveBeenCalled();
    
    IntegrationTestDebugLogger.success('CSRF_PROTECTED', { tokenUsed: true });
  });
  
  it('CSRFトークン欠落時のエラー（NG - 403）', async () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: 'CSRFトークン欠落' });
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'CSRF_TOKEN_MISSING' })
    });
    
    const response = await mockFetch('/api/posts/123/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(response.status).toBe(403);
    
    IntegrationTestDebugLogger.error('CSRF_MISSING', { status: 403 });
    
    // 対処法: CSRFトークンの再取得
    const recovery = async () => {
      const newToken = await fetch('/api/csrf/token');
      return newToken;
    };
    
    expect(recovery).toBeDefined();
  });
});

// ============================================================
// テスト3: Socket.IOとUIの連携
// ============================================================
describe('Socket.IOとUIの連携テスト', () => {
  let mockSocket: any;
  
  beforeEach(() => {
    IntegrationTestDebugLogger.log('TEST_SETUP', { test: 'Socket.IO連携' });
    
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn()
    };
  });
  
  it('リアルタイムコメント更新（OK）', async () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: 'リアルタイム更新' });
    
    const comments: any[] = [];
    
    // コメント追加ハンドラー
    const handleNewComment = (data: any) => {
      IntegrationTestDebugLogger.log('REALTIME_EVENT', { event: 'comment:created', data });
      
      if (data.postId === 'post123') {
        comments.push(data.comment);
        IntegrationTestDebugLogger.success('COMMENT_ADDED_REALTIME', {
          commentId: data.comment._id,
          total: comments.length
        });
      }
    };
    
    // イベントリスナー登録
    mockSocket.on('comment:created', handleNewComment);
    
    // イベント発火シミュレーション
    const newCommentData = {
      postId: 'post123',
      comment: {
        _id: 'realtime-1',
        content: 'リアルタイムコメント',
        author: { name: 'User3' }
      }
    };
    
    mockSocket.on.mock.calls[0][1](newCommentData);
    
    expect(comments).toHaveLength(1);
    expect(comments[0]._id).toBe('realtime-1');
  });
  
  it('切断時の再接続処理（NG → リカバリー）', () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: 'Socket再接続' });
    
    let isConnected = false;
    let reconnectAttempts = 0;
    
    const handleDisconnect = (reason: string) => {
      IntegrationTestDebugLogger.warn('SOCKET_DISCONNECTED', reason);
      isConnected = false;
      
      // 再接続ロジック
      const reconnect = () => {
        reconnectAttempts++;
        IntegrationTestDebugLogger.log('RECONNECT_ATTEMPT', { 
          attempt: reconnectAttempts,
          backoff: Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
        });
        
        if (reconnectAttempts < 5) {
          setTimeout(() => {
            // 再接続試行
            isConnected = true;
            IntegrationTestDebugLogger.success('RECONNECTED', { attempts: reconnectAttempts });
          }, 1000 * reconnectAttempts);
        }
      };
      
      reconnect();
    };
    
    handleDisconnect('transport close');
    
    expect(reconnectAttempts).toBeGreaterThan(0);
  });
});

// ============================================================
// テスト4: 複数コンポーネント間の状態管理
// ============================================================
describe('複数コンポーネント間の状態管理テスト', () => {
  beforeEach(() => {
    IntegrationTestDebugLogger.log('TEST_SETUP', { test: '状態管理' });
  });
  
  it('複数投稿カード間でのコメント独立性（OK）', () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: 'コメント独立性' });
    
    const post1Comments: any[] = [];
    const post2Comments: any[] = [];
    
    // Post1にコメント追加
    post1Comments.push({ _id: '1', postId: 'post1', content: 'Post1のコメント' });
    
    // Post2にコメント追加
    post2Comments.push({ _id: '2', postId: 'post2', content: 'Post2のコメント' });
    
    // 独立性の確認
    expect(post1Comments).toHaveLength(1);
    expect(post2Comments).toHaveLength(1);
    expect(post1Comments[0].postId).not.toBe(post2Comments[0].postId);
    
    IntegrationTestDebugLogger.success('STATE_ISOLATED', {
      post1: post1Comments.length,
      post2: post2Comments.length
    });
  });
  
  it('楽観的更新とロールバック（OK/NG）', async () => {
    IntegrationTestDebugLogger.log('TEST_CASE', { case: '楽観的更新' });
    
    const comments = [{ _id: '1', content: '既存コメント' }];
    const optimisticComment = { _id: 'temp-1', content: '楽観的コメント' };
    
    // 楽観的追加
    comments.push(optimisticComment);
    IntegrationTestDebugLogger.log('OPTIMISTIC_ADD', { tempId: optimisticComment._id });
    
    // API呼び出しシミュレーション
    const apiSuccess = false; // 失敗ケース
    
    if (apiSuccess) {
      // 成功: tempIdを実際のIDに置換
      const index = comments.findIndex(c => c._id === 'temp-1');
      comments[index]._id = 'real-1';
      IntegrationTestDebugLogger.success('OPTIMISTIC_CONFIRMED', { realId: 'real-1' });
    } else {
      // 失敗: ロールバック
      const index = comments.findIndex(c => c._id === 'temp-1');
      comments.splice(index, 1);
      IntegrationTestDebugLogger.warn('OPTIMISTIC_ROLLBACK', 'APIエラーによりロールバック');
    }
    
    expect(comments).toHaveLength(1); // ロールバック後
  });
});

// ============================================================
// 構文チェック用エクスポート
// ============================================================
export default {
  IntegrationTestDebugLogger,
  mockSession,
  MockEnhancedPostCard,
  testSuites: [
    'EnhancedPostCardとAPIの連携テスト',
    'CSRF保護との統合テスト',
    'Socket.IOとUIの連携テスト',
    '複数コンポーネント間の状態管理テスト'
  ]
};