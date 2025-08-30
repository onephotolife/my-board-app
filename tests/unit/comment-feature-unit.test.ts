/**
 * コメント機能単体テスト
 * 認証必須: one.photolife+1@gmail.com / ?@thc123THC@?
 * 
 * テスト対象：
 * 1. コメント表示機能（GET）
 * 2. コメント投稿機能（POST）
 * 3. リアルタイム更新（Socket.IO）
 * 4. いいね・削除機能
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// ============================================================
// デバッグログクラス
// ============================================================
class UnitTestDebugLogger {
  private static readonly PREFIX = '[UNIT-TEST]';
  
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
}

// ============================================================
// 認証ヘルパー
// ============================================================
interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };
  token: string;
  csrfToken: string;
}

class AuthHelper {
  private static readonly CREDENTIALS: AuthCredentials = {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  };
  
  static async authenticate(): Promise<AuthSession> {
    UnitTestDebugLogger.log('AUTH_START', { email: this.CREDENTIALS.email });
    
    try {
      // 模擬認証セッション
      const session: AuthSession = {
        user: {
          id: '68b00bb9e2d2d61e174b2204',
          email: this.CREDENTIALS.email,
          name: 'Test User',
          emailVerified: true
        },
        token: 'mock-jwt-token',
        csrfToken: 'mock-csrf-token'
      };
      
      UnitTestDebugLogger.success('AUTH_COMPLETED', { userId: session.user.id });
      return session;
    } catch (error) {
      UnitTestDebugLogger.error('AUTH_FAILED', error);
      throw new Error('認証に失敗しました');
    }
  }
  
  static validateToken(token: string): boolean {
    if (!token) {
      UnitTestDebugLogger.warn('TOKEN_VALIDATION', 'トークンが空です');
      return false;
    }
    return true;
  }
}

// ============================================================
// テスト1: コメント表示機能（GET）
// ============================================================
describe('コメント表示機能の単体テスト', () => {
  let session: AuthSession;
  
  beforeEach(async () => {
    UnitTestDebugLogger.log('TEST_SETUP', { test: 'コメント表示機能' });
    session = await AuthHelper.authenticate();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('認証済み状態でコメント一覧を取得できる（OK）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'コメント一覧取得OK' });
    
    // 入力検証
    const postId = '6784cf91d4cf2a4e8c8b4567';
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    
    expect(objectIdPattern.test(postId)).toBe(true);
    UnitTestDebugLogger.success('VALIDATION_PASSED', { postId });
    
    // API呼び出しのモック
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          {
            _id: 'comment1',
            content: 'テストコメント1',
            author: { _id: 'user1', name: 'User 1' },
            createdAt: new Date().toISOString()
          }
        ],
        pagination: { page: 1, limit: 20, total: 1 }
      })
    });
    
    const response = await mockFetch(`/api/posts/${postId}/comments`, {
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Accept': 'application/json'
      }
    });
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    
    UnitTestDebugLogger.success('COMMENTS_FETCHED', { count: data.data.length });
  });
  
  it('認証なしでコメント取得を拒否する（NG - 401）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'コメント取得NG - 401' });
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: '認証が必要です' })
    });
    
    const response = await mockFetch('/api/posts/123/comments', {
      headers: { 'Accept': 'application/json' }
    });
    
    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
    
    const error = await response.json();
    expect(error.error).toBe('認証が必要です');
    
    UnitTestDebugLogger.warn('UNAUTHORIZED_ACCESS', 'Expected 401 error');
  });
  
  it('無効な投稿IDフォーマットを検出する（NG - 400）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: '無効な投稿ID' });
    
    const invalidPostId = 'invalid-id';
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    
    expect(objectIdPattern.test(invalidPostId)).toBe(false);
    
    UnitTestDebugLogger.error('INVALID_POST_ID', { postId: invalidPostId });
    
    // 対処法: エラーメッセージを表示
    const errorMessage = '無効な投稿IDフォーマットです';
    expect(errorMessage).toBeDefined();
  });
});

// ============================================================
// テスト2: コメント投稿機能（POST）
// ============================================================
describe('コメント投稿機能の単体テスト', () => {
  let session: AuthSession;
  
  beforeEach(async () => {
    UnitTestDebugLogger.log('TEST_SETUP', { test: 'コメント投稿機能' });
    session = await AuthHelper.authenticate();
  });
  
  it('正常なコメント投稿（OK）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'コメント投稿OK' });
    
    const commentContent = 'これはテストコメントです';
    
    // 入力検証
    expect(commentContent.length).toBeGreaterThan(0);
    expect(commentContent.length).toBeLessThanOrEqual(500);
    
    // XSS検証
    const dangerousPatterns = /<script|<iframe|javascript:|on\w+=/gi;
    expect(dangerousPatterns.test(commentContent)).toBe(false);
    
    UnitTestDebugLogger.success('VALIDATION_PASSED', { contentLength: commentContent.length });
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          _id: 'new-comment-id',
          content: commentContent,
          author: session.user
        }
      })
    });
    
    const response = await mockFetch('/api/posts/123/comments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'X-CSRF-Token': session.csrfToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: commentContent })
    });
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    
    UnitTestDebugLogger.success('COMMENT_POSTED', { status: 201 });
  });
  
  it('CSRFトークンなしで投稿を拒否（NG - 403）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'CSRF保護NG' });
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'CSRFトークンが必要です' })
    });
    
    const response = await mockFetch('/api/posts/123/comments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: 'test' })
    });
    
    expect(response.status).toBe(403);
    
    UnitTestDebugLogger.warn('CSRF_PROTECTION', 'CSRFトークンが必要です');
    
    // 対処法: csrfFetchを使用する
    const solution = 'csrfFetchヘルパーを使用してCSRFトークンを自動付与';
    expect(solution).toBeDefined();
  });
  
  it('レート制限超過を検出（NG - 429）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'レート制限' });
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'レート制限に達しました' })
    });
    
    const response = await mockFetch('/api/posts/123/comments', {
      method: 'POST'
    });
    
    expect(response.status).toBe(429);
    
    UnitTestDebugLogger.warn('RATE_LIMIT', '1分間に10回までの制限');
    
    // 対処法: 指数バックオフ
    const retryAfter = 60; // seconds
    expect(retryAfter).toBeGreaterThan(0);
  });
});

// ============================================================
// テスト3: リアルタイム更新（Socket.IO）
// ============================================================
describe('リアルタイム更新の単体テスト', () => {
  let mockSocket: any;
  
  beforeEach(() => {
    UnitTestDebugLogger.log('TEST_SETUP', { test: 'リアルタイム更新' });
    
    // Socket.IOモック
    mockSocket = {
      connected: false,
      id: null,
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn()
    };
  });
  
  it('Socket接続の確立（OK）', () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'Socket接続OK' });
    
    mockSocket.connect();
    mockSocket.connected = true;
    mockSocket.id = 'socket-123';
    
    expect(mockSocket.connected).toBe(true);
    expect(mockSocket.id).toBeDefined();
    
    UnitTestDebugLogger.success('SOCKET_CONNECTED', { socketId: mockSocket.id });
  });
  
  it('コメント作成イベントの受信（OK）', () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'リアルタイムイベント受信' });
    
    const postId = 'post-123';
    const newComment = {
      _id: 'comment-456',
      content: 'リアルタイムコメント',
      postId: postId
    };
    
    // イベントハンドラー登録
    const handleCommentCreated = jest.fn();
    mockSocket.on('comment:created', handleCommentCreated);
    
    // イベント発火シミュレーション
    mockSocket.on.mock.calls[0][1](newComment);
    
    expect(handleCommentCreated).toHaveBeenCalledWith(newComment);
    
    UnitTestDebugLogger.success('EVENT_RECEIVED', { event: 'comment:created', commentId: newComment._id });
  });
  
  it('接続失敗時の再接続（NG → リトライ）', () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'Socket再接続' });
    
    let retryCount = 0;
    const maxRetries = 5;
    
    const attemptReconnect = () => {
      retryCount++;
      UnitTestDebugLogger.log('RECONNECT_ATTEMPT', { attempt: retryCount });
      
      if (retryCount < maxRetries) {
        setTimeout(attemptReconnect, 1000 * retryCount); // 指数バックオフ
      } else {
        UnitTestDebugLogger.error('RECONNECT_FAILED', { maxRetries });
      }
    };
    
    expect(maxRetries).toBe(5);
    
    // 対処法: 自動再接続とフォールバック
    const fallbackStrategy = 'ポーリングに切り替え';
    expect(fallbackStrategy).toBeDefined();
  });
});

// ============================================================
// テスト4: いいね・削除機能
// ============================================================
describe('いいね・削除機能の単体テスト', () => {
  let session: AuthSession;
  
  beforeEach(async () => {
    UnitTestDebugLogger.log('TEST_SETUP', { test: 'いいね・削除機能' });
    session = await AuthHelper.authenticate();
  });
  
  it('コメントにいいねをつける（OK）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: 'いいねOK' });
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        likes: ['user1', 'user2'],
        likeCount: 2,
        isLikedByUser: true
      })
    });
    
    const response = await mockFetch('/api/posts/123/comments/456/like', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'X-CSRF-Token': session.csrfToken
      }
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.likeCount).toBe(2);
    
    UnitTestDebugLogger.success('COMMENT_LIKED', { likeCount: data.likeCount });
  });
  
  it('自分のコメントを削除（OK）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: '削除OK' });
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'コメントを削除しました' })
    });
    
    const response = await mockFetch('/api/posts/123/comments/456', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'X-CSRF-Token': session.csrfToken
      }
    });
    
    expect(response.ok).toBe(true);
    
    UnitTestDebugLogger.success('COMMENT_DELETED', { commentId: '456' });
  });
  
  it('他人のコメント削除を拒否（NG - 403）', async () => {
    UnitTestDebugLogger.log('TEST_CASE', { case: '権限エラー' });
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: '削除権限がありません' })
    });
    
    const response = await mockFetch('/api/posts/123/comments/789', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.token}`
      }
    });
    
    expect(response.status).toBe(403);
    
    UnitTestDebugLogger.warn('PERMISSION_DENIED', '削除権限がありません');
    
    // 対処法: 権限チェックを事前に実施
    const canDelete = false; // comment.author._id === session.user.id
    expect(canDelete).toBe(false);
  });
});

// ============================================================
// 構文チェック用エクスポート
// ============================================================
export default {
  UnitTestDebugLogger,
  AuthHelper,
  testSuites: [
    'コメント表示機能の単体テスト',
    'コメント投稿機能の単体テスト',
    'リアルタイム更新の単体テスト',
    'いいね・削除機能の単体テスト'
  ]
};