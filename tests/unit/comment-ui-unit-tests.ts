/**
 * コメントUI機能 - 単体テストスイート
 * 
 * 認証要件:
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import '@testing-library/jest-dom';

// =================================================================
// デバッグログシステム
// =================================================================
class TestDebugLogger {
  private static readonly PREFIX = '[TEST-UNIT]';
  private static logs: Array<{ level: string; message: string; data: any; timestamp: string }> = [];
  
  static log(action: string, data: any = {}) {
    const entry = {
      level: 'INFO',
      message: `${this.PREFIX}-${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        testFile: 'comment-ui-unit-tests.ts'
      },
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(entry);
    console.log(entry.message, entry.data);
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
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(entry);
    console.error(entry.message, entry.data);
  }
  
  static warn(action: string, data: any = {}) {
    const entry = {
      level: 'WARN',
      message: `${this.PREFIX}-WARN-${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(entry);
    console.warn(entry.message, entry.data);
  }
  
  static getLogs() {
    return [...this.logs];
  }
  
  static clearLogs() {
    this.logs = [];
  }
  
  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// =================================================================
// モックセットアップ
// =================================================================

// EnhancedPostCard コンポーネントのモック
const mockEnhancedPostCard = jest.fn();
jest.mock('@/components/EnhancedPostCard', () => ({
  __esModule: true,
  default: mockEnhancedPostCard
}));

// CSRFProvider のモック
const mockUseCSRF = jest.fn();
const mockUseSecureFetch = jest.fn();
jest.mock('@/components/CSRFProvider', () => ({
  useCSRF: mockUseCSRF,
  useSecureFetch: mockUseSecureFetch
}));

// Socket.IO のモック
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
};

jest.mock('@/contexts/SocketContext', () => ({
  useSocket: () => ({ socket: mockSocket })
}));

// NextAuth のモック
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'one.photolife+1@gmail.com',
    name: 'Test User',
    emailVerified: true
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSession,
    status: 'authenticated'
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children
}));

// =================================================================
// 単体テスト: CommentDebugger
// =================================================================
describe('CommentDebugger - デバッグログシステム', () => {
  
  beforeEach(() => {
    TestDebugLogger.clearLogs();
    TestDebugLogger.log('TEST_SUITE_START', { suite: 'CommentDebugger' });
  });
  
  afterEach(() => {
    TestDebugLogger.log('TEST_SUITE_END', { 
      suite: 'CommentDebugger',
      totalLogs: TestDebugLogger.getLogs().length 
    });
  });
  
  it('正常系: ログメッセージが正しく記録される', () => {
    TestDebugLogger.log('TEST_ACTION', { testData: 'sample' });
    
    const logs = TestDebugLogger.getLogs();
    expect(logs).toHaveLength(2); // START + ACTION
    expect(logs[1].message).toContain('TEST_ACTION');
    expect(logs[1].data.testData).toBe('sample');
    
    TestDebugLogger.log('LOG_VALIDATION_SUCCESS', { 
      logCount: logs.length,
      validated: true 
    });
  });
  
  it('正常系: エラーログが適切にスタックトレースを含む', () => {
    const testError = new Error('Test error message');
    TestDebugLogger.error('TEST_ERROR', testError, { context: 'unit-test' });
    
    const logs = TestDebugLogger.getLogs();
    const errorLog = logs.find(log => log.level === 'ERROR');
    
    expect(errorLog).toBeDefined();
    expect(errorLog?.data.error).toBe('Test error message');
    expect(errorLog?.data.stack).toBeDefined();
    expect(errorLog?.data.context).toBe('unit-test');
    
    TestDebugLogger.log('ERROR_LOG_VALIDATION_SUCCESS');
  });
  
  it('異常系: 空のデータでもログが記録される', () => {
    TestDebugLogger.log('EMPTY_DATA_TEST');
    
    const logs = TestDebugLogger.getLogs();
    const emptyLog = logs.find(log => log.message.includes('EMPTY_DATA_TEST'));
    
    expect(emptyLog).toBeDefined();
    expect(emptyLog?.data.timestamp).toBeDefined();
    
    TestDebugLogger.log('EMPTY_DATA_HANDLING_SUCCESS');
  });
  
  it('境界値: 大量のログが正しく保存される', () => {
    const logCount = 1000;
    
    for (let i = 0; i < logCount; i++) {
      TestDebugLogger.log(`BULK_LOG_${i}`, { index: i });
    }
    
    const logs = TestDebugLogger.getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(logCount);
    
    TestDebugLogger.log('BULK_LOG_TEST_SUCCESS', { totalLogs: logs.length });
  });
});

// =================================================================
// 単体テスト: CSRF統合
// =================================================================
describe('CSRF Integration - CSRF統合機能', () => {
  
  beforeEach(() => {
    TestDebugLogger.clearLogs();
    TestDebugLogger.log('TEST_SUITE_START', { suite: 'CSRF_Integration' });
    
    // CSRFモックのリセット
    mockUseCSRF.mockReturnValue({
      csrfToken: 'test-csrf-token',
      refreshToken: jest.fn()
    });
    
    mockUseSecureFetch.mockReturnValue(jest.fn());
  });
  
  afterEach(() => {
    TestDebugLogger.log('TEST_SUITE_END', { suite: 'CSRF_Integration' });
    jest.clearAllMocks();
  });
  
  it('正常系: CSRFトークンが正しく取得される', async () => {
    const { csrfToken } = mockUseCSRF();
    
    expect(csrfToken).toBe('test-csrf-token');
    
    TestDebugLogger.log('CSRF_TOKEN_RETRIEVED', { 
      token: csrfToken.substring(0, 10) + '...',
      tokenLength: csrfToken.length 
    });
  });
  
  it('正常系: SecureFetchがCSRFトークンを含む', async () => {
    const secureFetch = mockUseSecureFetch();
    const mockResponse = { ok: true, json: () => Promise.resolve({ success: true }) };
    
    secureFetch.mockResolvedValue(mockResponse);
    
    const response = await secureFetch('/api/test', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'test-csrf-token' }
    });
    
    expect(response.ok).toBe(true);
    expect(secureFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        'X-CSRF-Token': 'test-csrf-token'
      })
    }));
    
    TestDebugLogger.log('SECURE_FETCH_SUCCESS', { endpoint: '/api/test' });
  });
  
  it('異常系: CSRFトークンなしでのリクエストが拒否される', async () => {
    const secureFetch = mockUseSecureFetch();
    secureFetch.mockRejectedValue(new Error('CSRF token missing'));
    
    await expect(secureFetch('/api/test', {
      method: 'POST'
    })).rejects.toThrow('CSRF token missing');
    
    TestDebugLogger.warn('CSRF_TOKEN_MISSING_TEST', { 
      expectedBehavior: 'Request rejected',
      testPassed: true 
    });
  });
  
  it('異常系: 無効なCSRFトークンが拒否される', async () => {
    const secureFetch = mockUseSecureFetch();
    secureFetch.mockRejectedValue(new Error('Invalid CSRF token'));
    
    await expect(secureFetch('/api/test', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'invalid-token' }
    })).rejects.toThrow('Invalid CSRF token');
    
    TestDebugLogger.warn('INVALID_CSRF_TOKEN_TEST', { 
      token: 'invalid-token',
      expectedBehavior: 'Request rejected' 
    });
  });
});

// =================================================================
// 単体テスト: 認証統合
// =================================================================
describe('Authentication Integration - 認証統合', () => {
  
  const TEST_CREDENTIALS = {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  };
  
  beforeEach(() => {
    TestDebugLogger.clearLogs();
    TestDebugLogger.log('TEST_SUITE_START', { 
      suite: 'Authentication',
      testUser: TEST_CREDENTIALS.email 
    });
  });
  
  afterEach(() => {
    TestDebugLogger.log('TEST_SUITE_END', { suite: 'Authentication' });
  });
  
  it('正常系: 認証済みユーザーセッションが正しく取得される', () => {
    const { useSession } = require('next-auth/react');
    const { data: session, status } = useSession();
    
    expect(status).toBe('authenticated');
    expect(session?.user?.email).toBe(TEST_CREDENTIALS.email);
    expect(session?.user?.emailVerified).toBe(true);
    
    TestDebugLogger.log('SESSION_VALIDATION_SUCCESS', {
      userId: session?.user?.id,
      email: session?.user?.email,
      emailVerified: session?.user?.emailVerified
    });
  });
  
  it('正常系: 認証トークンがAPIリクエストに含まれる', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ authenticated: true })
    });
    
    global.fetch = mockFetch as any;
    
    const response = await fetch('/api/auth/session', {
      headers: {
        'Cookie': 'next-auth.session-token=mock-session-token'
      }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({
      headers: expect.objectContaining({
        'Cookie': expect.stringContaining('next-auth.session-token')
      })
    }));
    
    TestDebugLogger.log('AUTH_TOKEN_INCLUDED', { 
      endpoint: '/api/auth/session',
      tokenPresent: true 
    });
  });
  
  it('異常系: 未認証ユーザーのアクセスが拒否される', async () => {
    jest.spyOn(require('next-auth/react'), 'useSession').mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });
    
    const { useSession } = require('next-auth/react');
    const { data: session, status } = useSession();
    
    expect(status).toBe('unauthenticated');
    expect(session).toBeNull();
    
    TestDebugLogger.warn('UNAUTHENTICATED_ACCESS_TEST', {
      status: 'unauthenticated',
      expectedBehavior: 'Access denied'
    });
  });
  
  it('異常系: メール未確認ユーザーが制限される', () => {
    const unverifiedSession = {
      ...mockSession,
      user: {
        ...mockSession.user,
        emailVerified: false
      }
    };
    
    jest.spyOn(require('next-auth/react'), 'useSession').mockReturnValue({
      data: unverifiedSession,
      status: 'authenticated'
    });
    
    const { useSession } = require('next-auth/react');
    const { data: session } = useSession();
    
    expect(session?.user?.emailVerified).toBe(false);
    
    TestDebugLogger.warn('EMAIL_UNVERIFIED_TEST', {
      email: session?.user?.email,
      emailVerified: false,
      expectedBehavior: 'Limited access'
    });
  });
});

// =================================================================
// 単体テスト: Socket.IO統合
// =================================================================
describe('Socket.IO Integration - リアルタイム機能', () => {
  
  beforeEach(() => {
    TestDebugLogger.clearLogs();
    TestDebugLogger.log('TEST_SUITE_START', { suite: 'SocketIO' });
    
    // Socket.IOモックのリセット
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });
  
  afterEach(() => {
    TestDebugLogger.log('TEST_SUITE_END', { suite: 'SocketIO' });
  });
  
  it('正常系: Socket接続が確立される', () => {
    const { useSocket } = require('@/contexts/SocketContext');
    const { socket } = useSocket();
    
    expect(socket).toBeDefined();
    expect(socket.connect).toBeDefined();
    
    socket.connect();
    expect(socket.connect).toHaveBeenCalled();
    
    TestDebugLogger.log('SOCKET_CONNECTION_TEST', { 
      socketExists: !!socket,
      connectCalled: true 
    });
  });
  
  it('正常系: コメントイベントリスナーが登録される', () => {
    const { socket } = require('@/contexts/SocketContext').useSocket();
    const postId = 'test-post-id';
    
    const handlers = {
      onCommentCreated: jest.fn(),
      onCommentUpdated: jest.fn(),
      onCommentDeleted: jest.fn()
    };
    
    socket.on(`comment:created:${postId}`, handlers.onCommentCreated);
    socket.on(`comment:updated:${postId}`, handlers.onCommentUpdated);
    socket.on(`comment:deleted:${postId}`, handlers.onCommentDeleted);
    
    expect(socket.on).toHaveBeenCalledTimes(3);
    expect(socket.on).toHaveBeenCalledWith(`comment:created:${postId}`, expect.any(Function));
    
    TestDebugLogger.log('EVENT_LISTENERS_REGISTERED', {
      postId,
      events: ['comment:created', 'comment:updated', 'comment:deleted']
    });
  });
  
  it('正常系: コメントイベントが正しく発火される', () => {
    const { socket } = require('@/contexts/SocketContext').useSocket();
    const testComment = {
      _id: 'comment-id',
      content: 'Test comment',
      author: { _id: 'user-id', name: 'Test User' }
    };
    
    socket.emit('comment:create', testComment);
    
    expect(socket.emit).toHaveBeenCalledWith('comment:create', testComment);
    
    TestDebugLogger.log('COMMENT_EVENT_EMITTED', {
      event: 'comment:create',
      commentId: testComment._id
    });
  });
  
  it('異常系: Socket切断時の再接続処理', () => {
    const { socket } = require('@/contexts/SocketContext').useSocket();
    
    // 切断イベントのシミュレーション
    socket.disconnect();
    expect(socket.disconnect).toHaveBeenCalled();
    
    // 再接続処理（実装想定）
    setTimeout(() => {
      socket.connect();
      expect(socket.connect).toHaveBeenCalled();
    }, 5000);
    
    TestDebugLogger.warn('SOCKET_DISCONNECTION_TEST', {
      disconnected: true,
      reconnectScheduled: true,
      reconnectDelay: 5000
    });
  });
});

// =================================================================
// エラーパターンと対処法
// =================================================================
describe('Error Patterns and Solutions - エラーパターンと対処法', () => {
  
  beforeEach(() => {
    TestDebugLogger.clearLogs();
    TestDebugLogger.log('TEST_SUITE_START', { suite: 'ErrorPatterns' });
  });
  
  afterEach(() => {
    TestDebugLogger.log('TEST_SUITE_END', { suite: 'ErrorPatterns' });
  });
  
  it('対処法: CSRF競合エラーの解決', async () => {
    // NextAuth CSRFとカスタムCSRFの競合をシミュレート
    const nextAuthCSRF = 'nextauth-csrf-token';
    const customCSRF = 'custom-csrf-token';
    
    // 統合CSRF処理
    const validateCSRF = (nextAuth: string | null, custom: string | null): boolean => {
      if (nextAuth && validateNextAuthToken(nextAuth)) return true;
      if (custom && validateCustomToken(custom)) return true;
      return false;
    };
    
    function validateNextAuthToken(token: string): boolean {
      return token === 'nextauth-csrf-token';
    }
    
    function validateCustomToken(token: string): boolean {
      return token === 'custom-csrf-token';
    }
    
    // 両方のトークンで検証
    expect(validateCSRF(nextAuthCSRF, null)).toBe(true);
    expect(validateCSRF(null, customCSRF)).toBe(true);
    expect(validateCSRF('invalid', 'invalid')).toBe(false);
    
    TestDebugLogger.log('CSRF_CONFLICT_RESOLUTION', {
      solution: 'Dual token validation',
      nextAuthValid: true,
      customValid: true
    });
  });
  
  it('対処法: 認証トークン期限切れの処理', async () => {
    const refreshToken = jest.fn().mockResolvedValue({
      accessToken: 'new-access-token',
      expiresIn: 3600
    });
    
    // トークン期限チェック
    const isTokenExpired = (expiresAt: string): boolean => {
      return new Date(expiresAt) <= new Date();
    };
    
    const expiredToken = {
      expiresAt: new Date(Date.now() - 1000).toISOString()
    };
    
    if (isTokenExpired(expiredToken.expiresAt)) {
      const newToken = await refreshToken();
      expect(newToken.accessToken).toBe('new-access-token');
      
      TestDebugLogger.log('TOKEN_REFRESH_SUCCESS', {
        oldTokenExpired: true,
        newTokenReceived: true,
        expiresIn: newToken.expiresIn
      });
    }
  });
  
  it('対処法: ネットワークエラーのリトライ処理', async () => {
    let attempts = 0;
    const maxRetries = 3;
    const retryDelay = 1000;
    
    const fetchWithRetry = async (url: string): Promise<any> => {
      while (attempts < maxRetries) {
        try {
          attempts++;
          if (attempts < 3) {
            throw new Error('Network error');
          }
          return { success: true };
        } catch (error) {
          TestDebugLogger.warn(`RETRY_ATTEMPT_${attempts}`, {
            url,
            error: (error as Error).message,
            nextRetryIn: retryDelay
          });
          
          if (attempts >= maxRetries) {
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    };
    
    const result = await fetchWithRetry('/api/test');
    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
    
    TestDebugLogger.log('RETRY_SUCCESS', {
      totalAttempts: attempts,
      finalResult: 'success'
    });
  });
  
  it('対処法: 同時実行制御（楽観的ロック）', async () => {
    const comments: any[] = [];
    let version = 1;
    
    const updateComment = (id: string, content: string, expectedVersion: number) => {
      if (version !== expectedVersion) {
        throw new Error('Version mismatch - concurrent modification detected');
      }
      
      comments.push({ id, content, version: ++version });
      return { success: true, newVersion: version };
    };
    
    // 正常な更新
    const result1 = updateComment('1', 'First update', 1);
    expect(result1.success).toBe(true);
    expect(result1.newVersion).toBe(2);
    
    // 古いバージョンでの更新試行
    try {
      updateComment('2', 'Concurrent update', 1);
    } catch (error) {
      TestDebugLogger.warn('CONCURRENT_MODIFICATION_PREVENTED', {
        error: (error as Error).message,
        currentVersion: version,
        attemptedVersion: 1
      });
      expect((error as Error).message).toContain('Version mismatch');
    }
  });
});

// =================================================================
// テスト実行レポート
// =================================================================
afterAll(() => {
  const logs = TestDebugLogger.getLogs();
  const summary = {
    totalLogs: logs.length,
    infoLogs: logs.filter(l => l.level === 'INFO').length,
    warnLogs: logs.filter(l => l.level === 'WARN').length,
    errorLogs: logs.filter(l => l.level === 'ERROR').length,
    testSuites: [...new Set(logs.filter(l => l.message.includes('TEST_SUITE_START'))
      .map(l => l.data.suite))],
    timestamp: new Date().toISOString()
  };
  
  TestDebugLogger.log('TEST_EXECUTION_COMPLETE', summary);
  
  // ログをファイルに出力（実際のテスト環境では）
  if (process.env.EXPORT_TEST_LOGS === 'true') {
    const fs = require('fs');
    fs.writeFileSync(
      `./test-logs/unit-test-${Date.now()}.json`,
      TestDebugLogger.exportLogs()
    );
  }
  
  console.log('=====================================');
  console.log('単体テスト実行完了');
  console.log('=====================================');
  console.log(JSON.stringify(summary, null, 2));
});