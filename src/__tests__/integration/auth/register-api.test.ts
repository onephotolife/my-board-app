/**
 * ユーザー登録API統合テスト
 * /api/auth/register エンドポイントの動作テスト
 */

import { createMocks } from 'node-mocks-http';

import { POST } from '@/app/api/auth/register/route';
import User from '@/lib/models/User';

import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  setupTestEnv,
  validateAuthResponse,
  simulateRateLimitRequests,
  cleanupTestData,
} from '../../helpers/auth-helpers';

// テスト前セットアップ
beforeAll(async () => {
  setupTestEnv();
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});

afterEach(async () => {
  await cleanupTestData();
});

// リクエストヘルパー関数
const createRequest = (body: any, headers: Record<string, string> = {}) => {
  const { req } = createMocks({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  // NextRequestのようなメソッドを追加
  (req as any).json = async () => body;
  (req as any).headers = new Map(Object.entries(req.headers));

  return req;
};

describe('User Registration API Integration Tests', () => {
  describe('正常登録ケース', () => {
    test('正しい情報でユーザー登録成功', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        name: 'New User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.message).toContain('登録が完了しました');
      expect(result.email).toBe(userData.email);

      // データベースにユーザーが作成されているか確認
      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser).toBeTruthy();
      expect(createdUser!.name).toBe(userData.name);
      expect(createdUser!.emailVerified).toBe(false);
    });

    test('メールアドレスが自動的に小文字変換される', async () => {
      const userData = {
        email: 'UPPERCASE@EXAMPLE.COM',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.email).toBe('uppercase@example.com');

      const createdUser = await User.findOne({ email: 'uppercase@example.com' });
      expect(createdUser).toBeTruthy();
    });

    test('名前が自動的にトリムされる', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: '  Trimmed Name  ',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);

      expect(response.status).toBe(201);

      const createdUser = await User.findOne({ email: 'test@example.com' });
      expect(createdUser!.name).toBe('Trimmed Name');
    });
  });

  describe('入力バリデーションエラー', () => {
    test('メールアドレス未入力でエラー', async () => {
      const userData = {
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('VALIDATION');
      expect(result.error).toContain('メール');
    });

    test('無効なメールアドレスでエラー', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('VALIDATION');
    });

    test('弱いパスワードでエラー', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123', // 弱いパスワード
        name: 'Test User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('WEAK_PASSWORD');
      expect(result.passwordFeedback).toBeDefined();
    });

    test('名前が短すぎるとエラー', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'A', // 1文字（2文字未満）
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('VALIDATION');
    });

    test('名前が長すぎるとエラー', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'A'.repeat(100), // 100文字（50文字超過）
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('VALIDATION');
    });
  });

  describe('重複登録エラー', () => {
    test('既存のメールアドレスでエラー', async () => {
      // 既存ユーザーを作成
      await createTestUser({ email: 'existing@example.com' });

      const userData = {
        email: 'existing@example.com',
        password: 'StrongPassword123!',
        name: 'New User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('EMAIL_EXISTS');
      expect(result.error).toContain('既に登録されています');
      expect(result.actionLink).toBe('/auth/signin');
    });

    test('大文字小文字違いでも重複エラー', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const userData = {
        email: 'EXISTING@EXAMPLE.COM', // 大文字
        password: 'StrongPassword123!',
        name: 'New User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('EMAIL_EXISTS');
    });
  });

  describe('レート制限テスト', () => {
    test('連続登録試行でレート制限エラー', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const requests = [];
      for (let i = 0; i < 6; i++) {
        const req = createRequest({
          ...userData,
          email: `test${i}@example.com`, // 異なるメールアドレス
        });
        requests.push(POST(req as any));
      }

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];
      const result = await lastResponse.json();

      // 最後のリクエストはレート制限でエラーになるはず
      expect(lastResponse.status).toBe(429);
      expect(result.type).toBe('RATE_LIMIT');
      expect(result.error).toContain('試行回数が多すぎます');
    });

    test('テストモードでレート制限がスキップされる', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const requests = [];
      for (let i = 0; i < 6; i++) {
        const req = createRequest(
          {
            ...userData,
            email: `test${i}@example.com`,
          },
          { 'x-test-mode': 'true' }
        );
        requests.push(POST(req as any));
      }

      const responses = await Promise.all(requests);
      
      // テストモードでは全て成功するはず
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
      });
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なJSONでエラー', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      // 無効なJSONをシミュレート
      (req as any).json = async () => {
        throw new Error('Invalid JSON');
      };
      (req as any).headers = new Map(Object.entries(req.headers));

      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('INVALID_REQUEST');
    });

    test('空のリクエストボディでエラー', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });

      (req as any).json = async () => null;
      (req as any).headers = new Map(Object.entries(req.headers));

      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('EMPTY_REQUEST');
    });
  });

  describe('セキュリティテスト', () => {
    test('XSS攻撃の試行を適切に処理', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: '<script>alert("xss")</script>',
      };

      const req = createRequest(maliciousData);
      const response = await POST(req as any);

      if (response.status === 201) {
        // 登録が成功した場合、XSSが無害化されているか確認
        const createdUser = await User.findOne({ email: 'test@example.com' });
        expect(createdUser!.name).not.toContain('<script>');
      }
    });

    test('SQLインジェクション攻撃の試行を適切に処理', async () => {
      const maliciousData = {
        email: "test@example.com'; DROP TABLE users; --",
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const req = createRequest(maliciousData);
      const response = await POST(req as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.type).toBe('VALIDATION');
    });
  });

  describe('パスワードセキュリティ', () => {
    test('パスワードがハッシュ化されて保存される', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);

      expect(response.status).toBe(201);

      const createdUser = await User.findOne({ email: 'test@example.com' });
      expect(createdUser!.password).not.toBe('StrongPassword123!');
      expect(createdUser!.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt形式
    });
  });

  describe('メール確認トークン', () => {
    test('メール確認トークンが生成される', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const req = createRequest(userData);
      const response = await POST(req as any);

      expect(response.status).toBe(201);

      const createdUser = await User.findOne({ email: 'test@example.com' });
      expect(createdUser!.emailVerificationToken).toBeDefined();
      expect(createdUser!.emailVerificationTokenExpiry).toBeDefined();
      expect(createdUser!.emailVerificationToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ); // UUID形式
    });

    test('メール確認トークンが24時間後に期限切れ', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const req = createRequest(userData);
      await POST(req as any);

      const createdUser = await User.findOne({ email: 'test@example.com' });
      const tokenExpiry = createdUser!.emailVerificationTokenExpiry!;
      const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // 1分の誤差を許容
      const timeDiff = Math.abs(tokenExpiry.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000);
    });
  });
});