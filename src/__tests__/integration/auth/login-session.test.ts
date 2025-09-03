/**
 * ログイン・セッション管理統合テスト
 * NextAuth認証フローとセッション管理の統合テスト
 */

import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';

import User from '@/lib/models/User';

import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  setupTestEnv,
  createTestJWT,
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

// 簡易リクエストモックヘルパー
const createMockRequest = (cookies?: string) => {
  const headers = new Map();
  if (cookies) {
    headers.set('cookie', cookies);
  }
  
  const cookieMap = new Map();
  if (cookies) {
    cookies.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookieMap.set(name, value);
      }
    });
  }

  return {
    headers,
    cookies: cookieMap,
    nextUrl: new URL('http://localhost:3000/api/auth/session'),
  };
};

describe('Login and Session Management Integration Tests', () => {
  describe('JWT処理テスト', () => {
    test('getTokenでトークン情報取得成功', async () => {
      const { user } = await createTestUser({
        email: 'test@example.com',
        emailVerified: true,
      });

      const token = createTestJWT({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      });

      const req = createMockRequest(`next-auth.session-token=${token}`);
      
      // getTokenを直接テスト
      const tokenData = await getToken({
        req: req as any,
        secret: process.env.AUTH_SECRET,
      });

      expect(tokenData).toBeDefined();
      expect(tokenData!.id).toBe(user._id.toString());
      expect(tokenData!.email).toBe('test@example.com');
      expect(tokenData!.emailVerified).toBe(true);
    });

    test('トークンなしでgetToken結果はnull', async () => {
      const req = createMockRequest();
      
      const tokenData = await getToken({
        req: req as any,
        secret: process.env.AUTH_SECRET,
      });

      expect(tokenData).toBeNull();
    });

    test('期限切れトークンでgetToken結果はnull', async () => {
      const { user } = await createTestUser({
        email: 'test@example.com',
        emailVerified: true,
      });

      // 期限切れトークンを生成
      const expiredToken = jwt.sign(
        {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        process.env.AUTH_SECRET || 'test-secret-key',
        { expiresIn: '-1h' } // 1時間前に期限切れ
      );

      const req = createMockRequest(`next-auth.session-token=${expiredToken}`);
      
      const tokenData = await getToken({
        req: req as any,
        secret: process.env.AUTH_SECRET,
      });

      expect(tokenData).toBeNull();
    });
  });

  describe('セキュリティテスト', () => {
    test('トークン改ざん検知', async () => {
      const { user } = await createTestUser({
        email: 'test@example.com',
        emailVerified: true,
      });

      let token = createTestJWT({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      });

      // トークンを改ざん
      token = token.slice(0, -5) + 'XXXXX';

      const req = createMockRequest(`next-auth.session-token=${token}`);
      
      const tokenData = await getToken({
        req: req as any,
        secret: process.env.AUTH_SECRET,
      });

      expect(tokenData).toBeNull(); // 改ざんされたトークンは拒否
    });
  });

  describe('ユーザーデータベース連携テスト', () => {
    test('データベースからユーザー情報取得', async () => {
      const { user } = await createTestUser({
        email: 'dbtest@example.com',
        emailVerified: true,
      });

      // データベースから直接ユーザーを取得
      const foundUser = await User.findById(user._id);
      
      expect(foundUser).toBeTruthy();
      expect(foundUser!.email).toBe('dbtest@example.com');
      expect(foundUser!.emailVerified).toBe(true);
      expect(foundUser!.password).toBeDefined();
      expect(foundUser!.password).not.toBe('plain-password'); // ハッシュ化確認
    });

    test('存在しないユーザーの取得でnull', async () => {
      const nonExistentUser = await User.findOne({ 
        email: 'nonexistent@example.com' 
      });
      
      expect(nonExistentUser).toBeNull();
    });
  });
});