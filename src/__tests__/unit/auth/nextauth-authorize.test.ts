/**
 * NextAuth authorize関数単体テスト
 * 認証ロジックのテスト
 */

import { authConfig } from '@/lib/auth.config';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

// bcryptのモック
jest.mock('bcryptjs');

describe('NextAuth Authorize Function Unit Tests', () => {
  const credentialsProvider = authConfig.providers[0];
  const authorize = credentialsProvider.authorize;

  beforeEach(() => {
    jest.clearAllMocks();
    // bcryptのモック動作を設定
    (bcrypt.compare as jest.Mock) = jest.fn().mockImplementation((plain, hashed) => 
      Promise.resolve(hashed === `$2a$10$hashed_${plain}`)
    );
  });

  describe('認証成功ケース', () => {
    test('正しい認証情報で認証成功', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: '$2a$10$hashed_password123',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser),
          comparePassword: mockUser.comparePassword
        })
      }));

      const result = await authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeTruthy();
      expect(result?.id).toBe('507f1f77bcf86cd799439011');
      expect(result?.email).toBe('test@example.com');
      expect(result?.name).toBe('Test User');
    });

    test('大文字のメールアドレスでも認証成功', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: '$2a$10$hashed_password123',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockImplementation((query) => {
        if (query.email?.toLowerCase() === 'test@example.com') {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
      });
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser),
          comparePassword: mockUser.comparePassword
        })
      }));

      const result = await authorize({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });

      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('認証失敗ケース', () => {
    test('存在しないユーザーで認証失敗', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const result = await authorize({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    });

    test('間違ったパスワードで認証失敗', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: '$2a$10$hashed_password123',
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser),
          comparePassword: mockUser.comparePassword
        })
      }));

      const result = await authorize({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result).toBeNull();
    });

    test('メール未確認で認証失敗', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'unverified@example.com',
        name: 'Unverified User',
        emailVerified: false,
        password: '$2a$10$hashed_password123',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser),
          comparePassword: mockUser.comparePassword
        })
      }));

      const result = await authorize({
        email: 'unverified@example.com',
        password: 'password123',
      });

      // メール未確認の場合は特別なIDが返される
      expect(result).toBeTruthy();
      expect(result?.id).toBe('email-not-verified');
    });

    test('認証情報なしで認証失敗', async () => {
      let result = await authorize({});
      expect(result).toBeNull();

      result = await authorize({ email: 'test@example.com' });
      expect(result).toBeNull();

      result = await authorize({ password: 'password123' });
      expect(result).toBeNull();
    });

    test('空文字の認証情報で認証失敗', async () => {
      let result = await authorize({ email: '', password: 'password123' });
      expect(result).toBeNull();

      result = await authorize({ email: 'test@example.com', password: '' });
      expect(result).toBeNull();

      result = await authorize({ email: '', password: '' });
      expect(result).toBeNull();
    });
  });

  describe('セキュリティチェック', () => {
    test('SQLインジェクション攻撃の防御', async () => {
      const maliciousInputs = [
        "admin' OR '1'='1",
        "admin'; DROP TABLE users;--",
        "admin'/*",
        "' OR 1=1--",
      ];

      for (const maliciousInput of maliciousInputs) {
        User.findOne = jest.fn().mockResolvedValue(null);

        const result = await authorize({
          email: maliciousInput,
          password: 'password123',
        });

        expect(result).toBeNull();
        // findOneが安全に呼ばれていることを確認
        expect(User.findOne).toHaveBeenCalledWith({ email: maliciousInput });
      }
    });

    test('長すぎる入力の処理', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const longPassword = 'a'.repeat(1000);

      User.findOne = jest.fn().mockResolvedValue(null);

      const result = await authorize({
        email: longEmail,
        password: longPassword,
      });

      expect(result).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    test('データベースエラーの処理', async () => {
      User.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const result = await authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    });

    test('comparePasswordエラーの処理', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: '$2a$10$hashed_password123',
        comparePassword: jest.fn().mockRejectedValue(new Error('Bcrypt error'))
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser),
          comparePassword: mockUser.comparePassword
        })
      }));

      const result = await authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    });

    test('findByIdエラーの処理', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: '$2a$10$hashed_password123',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockRejectedValue(new Error('Database error'))
      }));

      const result = await authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      // findByIdがエラーの場合、安全のためnullを返す
      expect(result).toBeNull();
    });
  });

  describe('レート制限との統合', () => {
    test('認証成功時はレート制限がリセットされる想定', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: '$2a$10$hashed_password123',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser),
          comparePassword: mockUser.comparePassword
        })
      }));

      const result = await authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeTruthy();
      // レート制限のリセットは外部で処理される
    });

    test('認証失敗時はレート制限がカウントされる想定', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const result = await authorize({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result).toBeNull();
      // レート制限のカウントアップは外部で処理される
    });
  });
});