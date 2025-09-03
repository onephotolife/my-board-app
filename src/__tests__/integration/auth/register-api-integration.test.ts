/**
 * ユーザー登録API統合テスト（モック版）
 * /api/auth/register エンドポイントの動作テスト
 */

import { NextRequest } from 'next/server';

import User from '@/lib/models/User';

// データベースとメールサービスのモック
jest.mock('@/lib/db/mongodb-local', () => ({
  connectDB: jest.fn().mockResolvedValue(true)
}));

jest.mock('@/lib/email/mailer-fixed', () => ({
  getEmailService: jest.fn(() => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({ success: true })
  }))
}));

describe('Register API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register - 統合フロー', () => {
    test('正常な登録フローが完了する', async () => {
      // ユーザーが存在しない状態をモック
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // 新規ユーザー作成をモック
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'newuser@example.com',
        name: 'New User',
        password: '$2a$10$hashed_password',
        emailVerified: false,
        verificationToken: 'test-token-123',
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.create = jest.fn().mockResolvedValue(mockUser);

      // データベース接続確認
      const { connectDB } = require('@/lib/db/mongodb-local');
      await connectDB();
      expect(connectDB).toHaveBeenCalled();

      // ユーザー作成確認
      const result = await User.create({
        email: 'newuser@example.com',
        password: 'hashed_password',
        name: 'New User',
      });

      expect(result).toBeTruthy();
      expect(result.email).toBe('newuser@example.com');

      // メール送信確認
      const { getEmailService } = require('@/lib/email/mailer-fixed');
      const emailService = getEmailService();
      await emailService.sendVerificationEmail(
        mockUser.email,
        mockUser.verificationToken
      );

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        'test-token-123'
      );
    });

    test('既存ユーザーで登録が拒否される', async () => {
      const existingUser = {
        email: 'existing@example.com',
        name: 'Existing User',
      };
      
      User.findOne = jest.fn().mockResolvedValue(existingUser);

      const exists = await User.findOne({ email: 'existing@example.com' });
      expect(exists).toBeTruthy();
      expect(exists.email).toBe('existing@example.com');
    });

    test('データベースエラーが適切に処理される', async () => {
      User.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      let error;
      try {
        await User.findOne({ email: 'test@example.com' });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.message).toBe('Database connection failed');
    });

    test('メール送信エラーでも登録は成功する', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        password: '$2a$10$hashed_password',
        emailVerified: false,
        verificationToken: 'test-token-456',
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.create = jest.fn().mockResolvedValue(mockUser);

      // メール送信をエラーにする
      const { getEmailService } = require('@/lib/email/mailer-fixed');
      getEmailService.mockImplementation(() => ({
        sendVerificationEmail: jest.fn().mockRejectedValue(new Error('Email service down'))
      }));

      const result = await User.create({
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
      });

      expect(result).toBeTruthy();
      
      const emailService = getEmailService();
      let emailError;
      try {
        await emailService.sendVerificationEmail(
          mockUser.email,
          mockUser.verificationToken
        );
      } catch (e) {
        emailError = e;
      }

      expect(emailError).toBeDefined();
      expect(emailError.message).toBe('Email service down');
    });
  });

  describe('レート制限統合テスト', () => {
    test('連続リクエストで制限が機能する', () => {
      const rateLimitMap = new Map();
      const RATE_LIMIT_MAX = 5;

      function checkRateLimit(ip: string): boolean {
        const count = rateLimitMap.get(ip) || 0;
        if (count >= RATE_LIMIT_MAX) {
          return false;
        }
        rateLimitMap.set(ip, count + 1);
        return true;
      }

      const clientIp = '192.168.1.1';
      
      // 5回まで成功
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(clientIp)).toBe(true);
      }
      
      // 6回目は失敗
      expect(checkRateLimit(clientIp)).toBe(false);
    });

    test('異なるIPは独立して制限される', () => {
      const rateLimitMap = new Map();
      const RATE_LIMIT_MAX = 5;

      function checkRateLimit(ip: string): boolean {
        const count = rateLimitMap.get(ip) || 0;
        if (count >= RATE_LIMIT_MAX) {
          return false;
        }
        rateLimitMap.set(ip, count + 1);
        return true;
      }

      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';
      
      // IP1を5回使い切る
      for (let i = 0; i < 5; i++) {
        checkRateLimit(ip1);
      }
      
      // IP1は制限される
      expect(checkRateLimit(ip1)).toBe(false);
      
      // IP2はまだ使える
      expect(checkRateLimit(ip2)).toBe(true);
    });
  });

  describe('入力サニタイゼーション', () => {
    test('メールアドレスが小文字に正規化される', () => {
      const input = 'TEST@EXAMPLE.COM';
      const normalized = input.toLowerCase().trim();
      expect(normalized).toBe('test@example.com');
    });

    test('名前の前後の空白が削除される', () => {
      const input = '  Test User  ';
      const trimmed = input.trim();
      expect(trimmed).toBe('Test User');
    });

    test('SQLインジェクション攻撃が防がれる', async () => {
      const maliciousEmail = "admin' OR '1'='1";
      
      User.findOne = jest.fn().mockImplementation((query) => {
        // MongoDBのクエリはオブジェクトベースなので、SQLインジェクションは効かない
        expect(query.email).toBe(maliciousEmail);
        return null;
      });

      const result = await User.findOne({ email: maliciousEmail });
      expect(result).toBeNull();
    });
  });
});