import { authConfig } from '@/lib/auth.config';
import * as dbHelper from '../../helpers/db';
import { createTestUser } from '../../helpers/auth';
import User from '@/lib/models/User';

describe('User Login (NextAuth)', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await dbHelper.clearDatabase();
  });

  afterAll(async () => {
    await dbHelper.closeDatabase();
  });

  describe('Credentials Provider - authorize', () => {
    const credentialsProvider = authConfig.providers[0];
    
    it('should authenticate user with valid credentials', async () => {
      // テストユーザーを作成
      const testUser = await createTestUser({
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
      });

      // authorize関数を取得
      const authorize = credentialsProvider.authorize;
      
      // 正しい認証情報でログイン
      const result = await authorize({
        email: testUser.email,
        password: 'TestPassword123!', // 平文パスワード
      });

      expect(result).toBeTruthy();
      expect(result?.id).toBe(testUser._id);
      expect(result?.email).toBe(testUser.email);
      expect(result?.name).toBe(testUser.name);
    });

    it('should reject authentication with invalid password', async () => {
      const testUser = await createTestUser({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      const authorize = credentialsProvider.authorize;
      
      const result = await authorize({
        email: testUser.email,
        password: 'WrongPassword',
      });

      expect(result).toBeNull();
    });

    it('should reject authentication for non-existent user', async () => {
      const authorize = credentialsProvider.authorize;
      
      const result = await authorize({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      });

      expect(result).toBeNull();
    });

    it('should reject authentication for unverified email', async () => {
      // emailVerified: false のユーザーを作成
      const user = new User({
        email: 'unverified@example.com',
        password: 'TestPassword123!',
        name: 'Unverified User',
        emailVerified: false,
      });
      await user.save();

      const authorize = credentialsProvider.authorize;
      
      const result = await authorize({
        email: 'unverified@example.com',
        password: 'TestPassword123!',
      });

      expect(result).toBeNull();
    });

    it('should handle missing credentials', async () => {
      const authorize = credentialsProvider.authorize;
      
      // メールアドレスが欠落
      let result = await authorize({
        password: 'TestPassword123!',
      });
      expect(result).toBeNull();

      // パスワードが欠落
      result = await authorize({
        email: 'test@example.com',
      });
      expect(result).toBeNull();

      // 両方欠落
      result = await authorize({});
      expect(result).toBeNull();
    });

    it('should be case-insensitive for email', async () => {
      const testUser = await createTestUser({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      const authorize = credentialsProvider.authorize;
      
      // 大文字で試す
      const result = await authorize({
        email: 'TEST@EXAMPLE.COM',
        password: 'TestPassword123!',
      });

      expect(result).toBeTruthy();
      expect(result?.email).toBe(testUser.email);
    });
  });

  describe('JWT Callbacks', () => {
    it('should add user id to JWT token', async () => {
      const jwtCallback = authConfig.callbacks.jwt;
      
      const token = { sub: '123' };
      const user = { id: 'user123', email: 'test@example.com', name: 'Test' };
      
      const result = await jwtCallback({ token, user });
      
      expect(result.id).toBe('user123');
    });

    it('should preserve existing token when no user', async () => {
      const jwtCallback = authConfig.callbacks.jwt;
      
      const token = { sub: '123', id: 'existing-id' };
      
      const result = await jwtCallback({ token, user: undefined });
      
      expect(result.id).toBe('existing-id');
    });
  });

  describe('Session Callbacks', () => {
    it('should add user id to session', async () => {
      const sessionCallback = authConfig.callbacks.session;
      
      const session = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: '2024-12-31',
      };
      
      const token = {
        id: 'user123',
        email: 'test@example.com',
      };
      
      const result = await sessionCallback({ session, token });
      
      expect(result.user.id).toBe('user123');
    });

    it('should handle missing user in session', async () => {
      const sessionCallback = authConfig.callbacks.session;
      
      const session = {
        expires: '2024-12-31',
      };
      
      const token = {
        id: 'user123',
      };
      
      const result = await sessionCallback({ session, token });
      
      expect(result.user).toBeUndefined();
    });

    it('should handle missing id in token', async () => {
      const sessionCallback = authConfig.callbacks.session;
      
      const session = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: '2024-12-31',
      };
      
      const token = {
        email: 'test@example.com',
      };
      
      const result = await sessionCallback({ session, token });
      
      expect(result.user.id).toBeUndefined();
    });
  });
});