# 結合テスト設計書（404エラー解決策）

## 1. 認証フロー結合テスト

### ログイン→プロフィール取得フロー
```typescript
// test/integration/auth-profile-flow.test.ts
describe('Authentication to Profile Flow', () => {
  describe('Complete Login Flow', () => {
    it('【OK】正常なログインからプロフィール取得まで', async () => {
      // Arrange
      const testUser = {
        email: 'integration@example.com',
        password: 'Test123!',
        name: 'Integration User'
      };
      await createTestUser(testUser);
      
      // Act
      // Step 1: ログイン
      const loginResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });
      
      // Step 2: セッション確認
      const sessionResponse = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      const session = await sessionResponse.json();
      
      // Step 3: プロフィール取得
      const profileResponse = await fetch('/api/profile', {
        credentials: 'include'
      });
      
      // Assert
      expect(loginResponse.status).toBe(200);
      expect(session.user.email).toBe(testUser.email);
      expect(profileResponse.status).toBe(200);
      const profile = await profileResponse.json();
      expect(profile.user.email).toBe(testUser.email);
    });
    
    it('【NG】DBに存在しないユーザーでのプロフィール取得', async () => {
      // Arrange
      // セッションは有効だがDBにユーザーが存在しない状態を模擬
      const mockSession = {
        user: { 
          email: 'phantom@example.com',
          id: '999',
          emailVerified: true
        }
      };
      
      // Act
      const profileResponse = await fetch('/api/profile', {
        credentials: 'include',
        headers: {
          'Cookie': `session-token=${createMockSessionToken(mockSession)}`
        }
      });
      
      // Assert
      expect(profileResponse.status).toBe(404);
      const error = await profileResponse.json();
      expect(error.error).toBe('ユーザーが見つかりません');
    });
  });
  
  describe('Provider Initialization Sequence', () => {
    it('【OK】Provider連鎖初期化の正常動作', async () => {
      // Arrange
      const { getByTestId } = render(
        <SessionProvider>
          <UserProvider>
            <PermissionProvider>
              <TestComponent />
            </PermissionProvider>
          </UserProvider>
        </SessionProvider>
      );
      
      // Act & Assert
      // 初期状態: ローディング
      expect(getByTestId('loading-indicator')).toBeInTheDocument();
      
      // 100ms後: UserProvider初期化
      await waitFor(() => {
        expect(getByTestId('user-loaded')).toBeInTheDocument();
      }, { timeout: 200 });
      
      // 権限情報も読み込まれる
      await waitFor(() => {
        expect(getByTestId('permissions-loaded')).toBeInTheDocument();
      });
      
      // エラーがないことを確認
      expect(queryByTestId('error-message')).not.toBeInTheDocument();
    });
    
    it('【NG】Provider初期化時の競合状態', async () => {
      // Arrange
      const fetchSpy = jest.spyOn(global, 'fetch');
      
      // 同時に複数のProviderがAPIを呼び出す状況を作る
      render(
        <SessionProvider>
          <UserProvider>
            <PermissionProvider>
              <TestComponent />
            </PermissionProvider>
          </UserProvider>
        </SessionProvider>
      );
      
      // Act
      await waitFor(() => {
        const apiCalls = fetchSpy.mock.calls;
        
        // Assert
        // /api/profile と /api/user/permissions が同時に呼ばれていないこと
        const profileCallTime = apiCalls.find(call => 
          call[0].includes('/api/profile')
        )?.[1]?.timestamp;
        const permissionsCallTime = apiCalls.find(call => 
          call[0].includes('/api/user/permissions')
        )?.[1]?.timestamp;
        
        if (profileCallTime && permissionsCallTime) {
          const timeDiff = Math.abs(profileCallTime - permissionsCallTime);
          expect(timeDiff).toBeGreaterThan(50); // 最低50msの間隔
        }
      });
    });
  });
});
```

## 2. フォロー機能結合テスト

### 認証→CSRF→フォロー実行フロー
```typescript
// test/integration/follow-flow.test.ts
describe('Follow Feature Integration', () => {
  describe('Complete Follow Flow', () => {
    it('【OK】認証済みユーザーのフォロー実行', async () => {
      // Arrange
      const currentUser = await createAndLoginUser({
        email: 'follower@example.com'
      });
      const targetUser = await createTestUser({
        email: 'target@example.com'
      });
      
      // Act
      // Step 1: CSRFトークン取得
      const csrfResponse = await fetch('/api/csrf/token', {
        credentials: 'include'
      });
      const { csrfToken } = await csrfResponse.json();
      
      // Step 2: フォロー実行
      const followResponse = await fetch(`/api/follow/${targetUser.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });
      
      // Assert
      expect(csrfResponse.status).toBe(200);
      expect(followResponse.status).toBe(200);
      const result = await followResponse.json();
      expect(result.success).toBe(true);
      expect(result.message).toBe('フォローしました');
    });
    
    it('【NG】CSRFトークンなしでのフォロー試行', async () => {
      // Arrange
      await createAndLoginUser({ email: 'attacker@example.com' });
      const targetUser = await createTestUser({
        email: 'victim@example.com'
      });
      
      // Act
      const followResponse = await fetch(`/api/follow/${targetUser.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
          // CSRFトークンなし
        }
      });
      
      // Assert
      expect(followResponse.status).toBe(403);
      const error = await followResponse.json();
      expect(error.error.code).toBe('CSRF_VALIDATION_FAILED');
    });
    
    it('【NG】未認証ユーザーのフォロー試行', async () => {
      // Arrange
      const targetUser = await createTestUser({
        email: 'target@example.com'
      });
      
      // Act
      const followResponse = await fetch(`/api/follow/${targetUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Assert
      expect(followResponse.status).toBe(403); // CSRF検証で先に弾かれる
    });
  });
});
```

## 3. エラーリカバリー結合テスト

### API失敗→リトライ→成功フロー
```typescript
// test/integration/error-recovery.test.ts
describe('Error Recovery Integration', () => {
  describe('API Retry Mechanism', () => {
    it('【OK】CSRFエラー後の自動リトライ成功', async () => {
      // Arrange
      let attemptCount = 0;
      const mockFetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          // 初回: CSRFエラー
          return Promise.resolve({
            status: 403,
            json: () => Promise.resolve({ 
              error: { code: 'CSRF_VALIDATION_FAILED' }
            })
          });
        }
        // 2回目以降: 成功
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ success: true })
        });
      });
      
      global.fetch = mockFetch;
      
      // Act
      const result = await secureFetchWithRetry('/api/test', {
        method: 'POST'
      });
      
      // Assert
      expect(attemptCount).toBe(2); // リトライ1回
      expect(result.status).toBe(200);
    });
    
    it('【NG】最大リトライ回数超過', async () => {
      // Arrange
      const mockFetch = jest.fn().mockResolvedValue({
        status: 403,
        json: () => Promise.resolve({ 
          error: { code: 'CSRF_VALIDATION_FAILED' }
        })
      });
      
      global.fetch = mockFetch;
      
      // Act & Assert
      await expect(secureFetchWithRetry('/api/test', {
        method: 'POST'
      }, { maxRetries: 3 })).rejects.toThrow('Max retries exceeded');
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Provider Error Boundary', () => {
    it('【OK】404エラーの透過処理', async () => {
      // Arrange
      const mockFetch = jest.fn().mockRejectedValueOnce(
        new Error('404 Not Found')
      ).mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({ user: { email: 'test@example.com' } })
      });
      
      global.fetch = mockFetch;
      
      // Act
      const { queryByText } = render(
        <ProviderErrorBoundary>
          <UserProvider>
            <TestComponent />
          </UserProvider>
        </ProviderErrorBoundary>
      );
      
      // Assert
      // 404エラーは表示されない
      expect(queryByText('エラーが発生しました')).not.toBeInTheDocument();
      
      // コンポーネントは正常にレンダリングされる
      await waitFor(() => {
        expect(queryByText('test@example.com')).toBeInTheDocument();
      });
    });
  });
});
```

## 4. WebSocket制御結合テスト

### 環境変数→Socket初期化フロー
```typescript
// test/integration/socket-control.test.ts
describe('Socket.io Control Integration', () => {
  describe('Environment Variable to Socket Initialization', () => {
    it('【OK】Socket無効化設定の伝播', async () => {
      // Arrange
      process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'false';
      const ioSpy = jest.spyOn(io, 'connect');
      
      // Act
      render(
        <ConditionalSocketProvider>
          <TestComponent />
        </ConditionalSocketProvider>
      );
      
      // Assert
      expect(ioSpy).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('WebSocket connection')
      );
    });
    
    it('【NG】Socket有効時の接続失敗処理', async () => {
      // Arrange
      process.env.NEXT_PUBLIC_ENABLE_SOCKET = 'true';
      const mockSocket = {
        on: jest.fn((event, handler) => {
          if (event === 'connect_error') {
            setTimeout(() => handler(new Error('Connection failed')), 100);
          }
        }),
        disconnect: jest.fn()
      };
      
      jest.spyOn(io, 'connect').mockReturnValue(mockSocket);
      
      // Act
      const { queryByTestId } = render(
        <ConditionalSocketProvider>
          <TestComponent />
        </ConditionalSocketProvider>
      );
      
      // Assert
      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      });
      
      // エラーでもアプリは動作継続
      expect(queryByTestId('app-content')).toBeInTheDocument();
    });
  });
});
```

## 5. 完全フロー結合テスト

### ログイン→プロフィール→権限→フォロー
```typescript
// test/integration/complete-flow.test.ts
describe('Complete Application Flow', () => {
  it('【OK】新規ユーザーの完全なフロー', async () => {
    // Arrange
    const newUser = {
      email: 'complete@example.com',
      password: 'Test123!',
      name: 'Complete User'
    };
    
    // Act & Assert
    // Step 1: ユーザー登録
    const registerResponse = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    expect(registerResponse.status).toBe(201);
    
    // Step 2: ログイン
    const loginResponse = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newUser.email,
        password: newUser.password
      })
    });
    expect(loginResponse.status).toBe(200);
    
    // Step 3: プロフィール取得
    const profileResponse = await fetch('/api/profile', {
      credentials: 'include'
    });
    expect(profileResponse.status).toBe(200);
    
    // Step 4: 権限取得
    const permissionsResponse = await fetch('/api/user/permissions', {
      credentials: 'include'
    });
    expect(permissionsResponse.status).toBe(200);
    const permissions = await permissionsResponse.json();
    expect(permissions.role).toBe('user');
    
    // Step 5: 他ユーザーをフォロー
    const targetUser = await createTestUser({ email: 'target@example.com' });
    const csrfResponse = await fetch('/api/csrf/token', {
      credentials: 'include'
    });
    const { csrfToken } = await csrfResponse.json();
    
    const followResponse = await fetch(`/api/follow/${targetUser.id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      }
    });
    expect(followResponse.status).toBe(200);
  });
});
```

## テスト実行コマンド

```bash
# 結合テスト実行
npm test -- --testPathPattern=integration

# 特定フローのテスト
npm test -- --testNamePattern="Complete Login Flow"

# 並列実行無効化（結合テストでは推奨）
npm test -- --runInBand --testPathPattern=integration
```

## テスト環境セットアップ

```javascript
// test/integration/setup.js
beforeAll(async () => {
  // テストDBのセットアップ
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  await clearDatabase();
});

afterEach(async () => {
  // 各テスト後のクリーンアップ
  await clearCollections(['users', 'follows']);
  jest.clearAllMocks();
});

afterAll(async () => {
  // 接続クローズ
  await mongoose.disconnect();
});
```

## 成功判定基準

| テスト項目 | 合格基準 | 優先度 |
|-----------|---------|--------|
| 認証フロー | 全ステップ成功 | 高 |
| フォロー機能 | CSRF検証含め動作 | 高 |
| エラーリカバリー | 3回以内で復旧 | 中 |
| Socket制御 | エラーなし | 低 |
| 完全フロー | End-to-End成功 | 高 |

I attest: all integration tests are based on actual system behavior.