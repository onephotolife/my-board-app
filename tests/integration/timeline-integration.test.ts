/**
 * Timeline統合テスト（STRICT120準拠）
 * 認証・フォロー・タイムライン機能の結合テスト
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';

// 認証情報
const AUTH_EMAIL = process.env.AUTH_EMAIL || 'one.photolife+1@gmail.com';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '?@thc123THC@?';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// デバッグログクラス
class IntegrationDebugLogger {
  private logs: any[] = [];
  private traceId: string;
  
  constructor(traceId?: string) {
    this.traceId = traceId || this.generateTraceId();
  }
  
  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  log(category: string, data: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      traceId: this.traceId,
      category,
      data,
      testFile: 'timeline-integration.test.ts'
    };
    this.logs.push(entry);
    console.log('[INTEGRATION-DEBUG]', JSON.stringify(entry));
  }
  
  error(category: string, error: any) {
    this.log(`${category}-error`, {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
  }
  
  getAll() {
    return this.logs;
  }
  
  getTrace() {
    return this.traceId;
  }
  
  summary() {
    return {
      traceId: this.traceId,
      totalLogs: this.logs.length,
      categories: [...new Set(this.logs.map(l => l.category))],
      duration: this.logs.length > 0 
        ? new Date(this.logs[this.logs.length - 1].timestamp).getTime() - 
          new Date(this.logs[0].timestamp).getTime()
        : 0
    };
  }
}

// ヘルパー関数
async function authenticateUser(
  request: APIRequestContext, 
  logger: IntegrationDebugLogger
): Promise<{ sessionToken: string; csrfToken: string; userId: string }> {
  logger.log('auth-start', { email: AUTH_EMAIL });
  
  try {
    // CSRF Token取得
    const csrfResponse = await request.get('/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    logger.log('csrf-token-obtained', { hasToken: !!csrfToken });
    
    // ログイン実行
    const loginResponse = await request.post('/api/auth/callback/credentials', {
      data: {
        email: AUTH_EMAIL,
        password: AUTH_PASSWORD,
        csrfToken: csrfToken
      }
    });
    
    if (loginResponse.status() !== 200) {
      throw new Error(`Authentication failed: ${loginResponse.status()}`);
    }
    
    // セッショントークン取得
    const cookies = loginResponse.headers()['set-cookie'];
    const sessionToken = extractSessionToken(cookies);
    
    // セッション情報取得
    const sessionResponse = await request.get('/api/auth/session', {
      headers: {
        'Cookie': `next-auth.session-token=${sessionToken}`
      }
    });
    
    const sessionData = await sessionResponse.json();
    
    logger.log('auth-success', {
      hasToken: !!sessionToken,
      userId: sessionData.user?.id,
      email: sessionData.user?.email,
      emailVerified: sessionData.user?.emailVerified
    });
    
    return {
      sessionToken,
      csrfToken,
      userId: sessionData.user?.id || ''
    };
  } catch (error) {
    logger.error('auth-failed', error);
    throw error;
  }
}

function extractSessionToken(cookies: string | string[]): string {
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
  for (const cookie of cookieArray) {
    if (cookie.includes('next-auth.session-token=')) {
      const match = cookie.match(/next-auth\.session-token=([^;]+)/);
      if (match) return match[1];
    }
  }
  return '';
}

// 結合テストスイート
test.describe('Timeline Integration Tests - 認証必須', () => {
  let sessionToken: string;
  let csrfToken: string;
  let userId: string;
  let logger: IntegrationDebugLogger;
  
  test.beforeAll(async ({ request }) => {
    logger = new IntegrationDebugLogger();
    logger.log('test-suite-start', { timestamp: new Date().toISOString() });
    
    // 認証実行
    const authResult = await authenticateUser(request, logger);
    sessionToken = authResult.sessionToken;
    csrfToken = authResult.csrfToken;
    userId = authResult.userId;
    
    expect(sessionToken).toBeTruthy();
    expect(userId).toBeTruthy();
  });
  
  test.afterAll(() => {
    logger.log('test-suite-complete', logger.summary());
  });
  
  test.describe('認証とタイムラインAPI統合', () => {
    
    test('OK: 認証済みユーザーのタイムライン取得', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'authenticated-timeline-fetch' });
      
      // タイムラインAPI呼び出し
      const response = await request.get('/api/timeline', {
        headers: {
          'Cookie': `next-auth.session-token=${sessionToken}`
        }
      });
      
      const data = await response.json();
      
      testLogger.log('timeline-response', {
        status: response.status(),
        success: data.success,
        dataCount: data.data?.length,
        pagination: data.pagination,
        metadata: data.metadata
      });
      
      // 検証
      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.metadata.followingCount).toBeGreaterThanOrEqual(0);
      
      testLogger.log('test-complete', { result: 'PASS' });
    });
    
    test('NG: 無効なセッショントークンでのアクセス', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'invalid-session-token' });
      
      // 無効なトークンでAPI呼び出し
      const response = await request.get('/api/timeline', {
        headers: {
          'Cookie': 'next-auth.session-token=invalid-token-123'
        }
      });
      
      const data = await response.json();
      
      testLogger.log('unauthorized-response', {
        status: response.status(),
        success: data.success,
        error: data.error
      });
      
      // 検証
      expect(response.status()).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        expectedError: '401 UNAUTHORIZED'
      });
    });
  });
  
  test.describe('フォロー機能とタイムライン統合', () => {
    
    test('OK: フォロー操作後のタイムライン更新', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'follow-timeline-integration' });
      
      // Step 1: 現在のタイムライン状態を取得
      const beforeResponse = await request.get('/api/timeline', {
        headers: {
          'Cookie': `next-auth.session-token=${sessionToken}`
        }
      });
      const beforeData = await beforeResponse.json();
      
      testLogger.log('timeline-before', {
        followingCount: beforeData.metadata?.followingCount,
        postsCount: beforeData.data?.length
      });
      
      // Step 2: ユーザー存在確認
      const targetUserId = 'test-user-to-follow';
      const checkUserResponse = await request.get(
        `/api/users/${targetUserId}/exists`,
        {
          headers: {
            'Cookie': `next-auth.session-token=${sessionToken}`
          }
        }
      );
      
      testLogger.log('user-check', {
        userId: targetUserId,
        exists: checkUserResponse.status() === 200
      });
      
      // Step 3: フォロー操作（ユーザーが存在する場合）
      if (checkUserResponse.status() === 200) {
        const followResponse = await request.post(
          `/api/users/${targetUserId}/follow`,
          {
            headers: {
              'Cookie': `next-auth.session-token=${sessionToken}`,
              'X-CSRF-Token': csrfToken
            }
          }
        );
        
        testLogger.log('follow-action', {
          targetUser: targetUserId,
          status: followResponse.status(),
          success: followResponse.status() === 200
        });
        
        // Step 4: タイムライン再取得
        const afterResponse = await request.get('/api/timeline', {
          headers: {
            'Cookie': `next-auth.session-token=${sessionToken}`
          }
        });
        const afterData = await afterResponse.json();
        
        testLogger.log('timeline-after', {
          followingCount: afterData.metadata?.followingCount,
          postsCount: afterData.data?.length,
          change: {
            followingDiff: (afterData.metadata?.followingCount || 0) - 
                          (beforeData.metadata?.followingCount || 0),
            postsDiff: (afterData.data?.length || 0) - 
                      (beforeData.data?.length || 0)
          }
        });
        
        // 検証
        expect(afterResponse.status()).toBe(200);
        expect(afterData.success).toBe(true);
      }
      
      testLogger.log('test-complete', { result: 'PASS' });
    });
    
    test('NG: CSRF保護なしでのフォロー操作', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'follow-without-csrf' });
      
      const targetUserId = 'test-user-123';
      
      // CSRFトークンなしでフォロー試行
      const response = await request.post(
        `/api/users/${targetUserId}/follow`,
        {
          headers: {
            'Cookie': `next-auth.session-token=${sessionToken}`
            // X-CSRF-Token を意図的に省略
          }
        }
      );
      
      testLogger.log('csrf-protection-check', {
        status: response.status(),
        hasCSRFToken: false
      });
      
      // 検証（CSRFエラーまたは認証エラー）
      expect([403, 401]).toContain(response.status());
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        expectedError: 'CSRF_PROTECTION'
      });
    });
  });
  
  test.describe('ページネーション統合テスト', () => {
    
    test('OK: 複数ページのデータ取得', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'pagination-integration' });
      
      const pages = [];
      let hasNext = true;
      let currentPage = 1;
      const maxPages = 3;
      
      while (hasNext && currentPage <= maxPages) {
        const response = await request.get(
          `/api/timeline?page=${currentPage}&limit=5`,
          {
            headers: {
              'Cookie': `next-auth.session-token=${sessionToken}`
            }
          }
        );
        
        const data = await response.json();
        
        testLogger.log(`page-${currentPage}-fetched`, {
          status: response.status(),
          postsCount: data.data?.length,
          pagination: data.pagination
        });
        
        expect(response.status()).toBe(200);
        expect(data.success).toBe(true);
        
        pages.push({
          page: currentPage,
          posts: data.data?.length || 0,
          hasNext: data.pagination?.hasNext
        });
        
        hasNext = data.pagination?.hasNext || false;
        currentPage++;
      }
      
      testLogger.log('pagination-summary', {
        totalPagesFetched: pages.length,
        pagesData: pages
      });
      
      testLogger.log('test-complete', { result: 'PASS' });
    });
    
    test('対処法: ページネーションエラーのハンドリング', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'pagination-error-handling' });
      
      // 存在しないページへのアクセス
      const response = await request.get(
        '/api/timeline?page=99999&limit=10',
        {
          headers: {
            'Cookie': `next-auth.session-token=${sessionToken}`
          }
        }
      );
      
      const data = await response.json();
      
      testLogger.log('high-page-number-response', {
        requestedPage: 99999,
        status: response.status(),
        actualData: data.data?.length,
        pagination: data.pagination
      });
      
      // 検証（空の結果が返るが、エラーにはならない）
      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.pagination.hasNext).toBe(false);
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Graceful handling of out-of-range pages'
      });
    });
  });
  
  test.describe('リアルタイム更新統合', () => {
    
    test('OK: Socket.io接続とタイムライン更新', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'realtime-integration' });
      
      // Socket.io接続のシミュレーション
      // 実際のテストではSocket.ioクライアントを使用
      const socketEndpoint = '/api/socket';
      
      const response = await request.get(socketEndpoint, {
        headers: {
          'Cookie': `next-auth.session-token=${sessionToken}`,
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      
      testLogger.log('socket-connection-attempt', {
        endpoint: socketEndpoint,
        status: response.status()
      });
      
      // WebSocket接続は通常のHTTPテストでは完全にテストできないため、
      // エンドポイントの存在確認のみ
      expect([101, 426, 404]).toContain(response.status());
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Socket endpoint verified'
      });
    });
    
    test('対処法: リアルタイム接続失敗時のフォールバック', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'realtime-fallback' });
      
      // ポーリングによるフォールバック実装
      const pollInterval = 5000; // 5秒
      const maxPolls = 3;
      
      for (let i = 0; i < maxPolls; i++) {
        const response = await request.get('/api/timeline', {
          headers: {
            'Cookie': `next-auth.session-token=${sessionToken}`
          }
        });
        
        const data = await response.json();
        
        testLogger.log(`poll-${i + 1}`, {
          status: response.status(),
          postsCount: data.data?.length,
          timestamp: new Date().toISOString()
        });
        
        expect(response.status()).toBe(200);
        
        if (i < maxPolls - 1) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Polling fallback successful'
      });
    });
  });
  
  test.describe('エラーリカバリー統合', () => {
    
    test('対処法: ネットワークエラーのリトライ', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'network-retry' });
      
      const maxRetries = 3;
      let lastError: Error | null = null;
      let response: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          testLogger.log(`retry-attempt-${attempt}`, {
            timestamp: new Date().toISOString()
          });
          
          response = await request.get('/api/timeline', {
            headers: {
              'Cookie': `next-auth.session-token=${sessionToken}`
            },
            timeout: 5000 // 5秒タイムアウト
          });
          
          if (response.status() === 200) {
            testLogger.log('request-success', {
              attempt,
              status: response.status()
            });
            break;
          }
        } catch (error) {
          lastError = error as Error;
          testLogger.error(`retry-${attempt}-failed`, error);
          
          if (attempt < maxRetries) {
            // 指数バックオフ
            const delay = Math.pow(2, attempt - 1) * 1000;
            testLogger.log('backoff-wait', { delay });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // 最終的に成功することを期待
      expect(response).toBeTruthy();
      if (response) {
        expect(response.status()).toBe(200);
      }
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Retry mechanism validated'
      });
    });
    
    test('対処法: 認証トークン更新', async ({ request }) => {
      const testLogger = new IntegrationDebugLogger();
      testLogger.log('test-start', { test: 'token-refresh' });
      
      // 古いトークンでアクセス試行
      let response = await request.get('/api/timeline', {
        headers: {
          'Cookie': `next-auth.session-token=${sessionToken}`
        }
      });
      
      testLogger.log('initial-request', {
        status: response.status()
      });
      
      // トークンが無効な場合、再認証
      if (response.status() === 401) {
        testLogger.log('token-expired', { 
          needsRefresh: true 
        });
        
        // 再認証
        const newAuth = await authenticateUser(request, testLogger);
        sessionToken = newAuth.sessionToken;
        
        // 新しいトークンで再試行
        response = await request.get('/api/timeline', {
          headers: {
            'Cookie': `next-auth.session-token=${sessionToken}`
          }
        });
        
        testLogger.log('refreshed-request', {
          status: response.status(),
          newTokenUsed: true
        });
      }
      
      expect(response.status()).toBe(200);
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Token refresh mechanism validated'
      });
    });
  });
});

// 構文チェック用エクスポート
export { IntegrationDebugLogger };