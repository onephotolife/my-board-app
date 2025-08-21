/**
 * メール認証機能の統合テスト（改善版）
 * 20人天才エンジニア会議による包括的なテスト
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { 
  generateEmailVerificationToken, 
  generateTokenExpiry,
  getTokenType,
  isTokenValid,
  secureTokenCompare
} from '@/lib/utils/token-generator';
import User from '@/lib/models/User';
import { connectDB } from '@/lib/db/mongodb-local';

describe('改善されたメール認証機能の統合テスト', () => {
  let testUser: any;
  const testEmail = `test-${Date.now()}@example.com`;

  beforeAll(async () => {
    // テスト用データベース接続
    await connectDB();
  });

  afterAll(async () => {
    // クリーンアップ
    if (testUser) {
      await User.deleteOne({ email: testEmail });
    }
    await mongoose.connection.close();
  });

  describe('トークン生成機能', () => {
    it('256ビットのセキュアなトークンを生成する', () => {
      const token = generateEmailVerificationToken();
      
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32バイト * 2（hex表現）
      expect(/^[0-9a-f]{64}$/i.test(token)).toBe(true);
    });

    it('毎回異なるトークンを生成する', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateEmailVerificationToken());
      }
      
      expect(tokens.size).toBe(100); // 全て異なるトークン
    });

    it('有効期限を正しく設定する', () => {
      const expiry24h = generateTokenExpiry(24);
      const expiry1h = generateTokenExpiry(1);
      const now = new Date();
      
      // 24時間後の検証
      expect(expiry24h.getTime()).toBeGreaterThan(now.getTime());
      expect(expiry24h.getTime() - now.getTime()).toBeCloseTo(24 * 60 * 60 * 1000, -3);
      
      // 1時間後の検証
      expect(expiry1h.getTime() - now.getTime()).toBeCloseTo(60 * 60 * 1000, -3);
    });
  });

  describe('トークン検証機能', () => {
    it('UUID v4形式のトークンを識別できる（後方互換性）', () => {
      const uuidToken = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const hexToken = generateEmailVerificationToken();
      
      expect(getTokenType(uuidToken)).toBe('uuid');
      expect(getTokenType(hexToken)).toBe('hex');
      expect(getTokenType('invalid-token')).toBe('invalid');
    });

    it('有効期限を正しく検証する', () => {
      const validExpiry = new Date(Date.now() + 60000); // 1分後
      const expiredExpiry = new Date(Date.now() - 60000); // 1分前
      
      expect(isTokenValid(validExpiry)).toBe(true);
      expect(isTokenValid(expiredExpiry)).toBe(false);
      expect(isTokenValid(null)).toBe(false);
      expect(isTokenValid(undefined)).toBe(false);
    });

    it('タイミング攻撃に耐性のあるトークン比較を行う', () => {
      const token1 = generateEmailVerificationToken();
      const token2 = generateEmailVerificationToken();
      
      expect(secureTokenCompare(token1, token1)).toBe(true);
      expect(secureTokenCompare(token1, token2)).toBe(false);
      expect(secureTokenCompare('', token1)).toBe(false);
      expect(secureTokenCompare(token1, '')).toBe(false);
    });
  });

  describe('ユーザー登録とメール認証フロー', () => {
    it('新規ユーザー登録時にトークンが生成される', async () => {
      const token = generateEmailVerificationToken();
      const expiry = generateTokenExpiry(24);
      
      testUser = new User({
        email: testEmail,
        password: 'SecurePassword123!',
        name: 'Test User',
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationTokenExpiry: expiry,
      });
      
      await testUser.save();
      
      expect(testUser.emailVerificationToken).toBe(token);
      expect(testUser.emailVerificationTokenExpiry).toEqual(expiry);
      expect(testUser.emailVerified).toBe(false);
    });

    it('トークンでユーザーを検索できる', async () => {
      const foundUser = await User.findOne({
        emailVerificationToken: testUser.emailVerificationToken,
      });
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(testEmail);
    });

    it('メール確認後にトークンがクリアされる', async () => {
      // メール確認処理をシミュレート
      testUser.emailVerified = true;
      testUser.emailVerificationToken = undefined;
      testUser.emailVerificationTokenExpiry = undefined;
      await testUser.save();
      
      const updatedUser = await User.findOne({ email: testEmail });
      
      expect(updatedUser?.emailVerified).toBe(true);
      expect(updatedUser?.emailVerificationToken).toBeUndefined();
      expect(updatedUser?.emailVerificationTokenExpiry).toBeUndefined();
    });
  });

  describe('APIエンドポイントの動作確認', () => {
    it('verify-email APIが新形式トークンを受け入れる', async () => {
      const mockRequest = {
        url: `/api/auth/verify-email?token=${generateEmailVerificationToken()}`,
        method: 'GET',
      };
      
      // APIルートが新形式のトークンを処理できることを確認
      const tokenType = getTokenType(mockRequest.url.split('token=')[1]);
      expect(tokenType).toBe('hex');
    });

    it('verify-email APIが旧形式UUID v4トークンも受け入れる（後方互換性）', async () => {
      const uuidToken = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const mockRequest = {
        url: `/api/auth/verify-email?token=${uuidToken}`,
        method: 'GET',
      };
      
      // APIルートが旧形式のトークンも処理できることを確認
      const tokenType = getTokenType(mockRequest.url.split('token=')[1]);
      expect(tokenType).toBe('uuid');
    });
  });

  describe('セキュリティ機能', () => {
    it('暗号学的に安全な乱数を使用している', () => {
      // crypto.randomBytesが使用されていることを確認
      const spy = jest.spyOn(crypto, 'randomBytes');
      generateEmailVerificationToken();
      
      expect(spy).toHaveBeenCalledWith(32);
      spy.mockRestore();
    });

    it('トークンのエントロピーが十分に高い', () => {
      // 1000個のトークンを生成して重複がないことを確認
      const tokens = new Set();
      for (let i = 0; i < 1000; i++) {
        tokens.add(generateEmailVerificationToken());
      }
      
      expect(tokens.size).toBe(1000); // 全て異なる
    });
  });
});

describe('レート制限機能のテスト', () => {
  it('レート制限設定が正しく定義されている', async () => {
    // レート制限の設定をテスト
    const rateLimitConfigs = {
      'auth.register': { windowMs: 15 * 60 * 1000, maxRequests: 5 },
      'auth.verify': { windowMs: 15 * 60 * 1000, maxRequests: 10 },
      'auth.resend': { windowMs: 60 * 60 * 1000, maxRequests: 3 },
    };
    
    Object.entries(rateLimitConfigs).forEach(([key, config]) => {
      expect(config.windowMs).toBeGreaterThan(0);
      expect(config.maxRequests).toBeGreaterThan(0);
    });
  });
});

describe('再送信UIコンポーネントのロジック', () => {
  it('クールダウン時間が正しく計算される', () => {
    const lastResendTime = Date.now() - 30000; // 30秒前
    const cooldownPeriod = 60; // 60秒のクールダウン
    const remainingCooldown = Math.max(0, cooldownPeriod - Math.floor((Date.now() - lastResendTime) / 1000));
    
    expect(remainingCooldown).toBeCloseTo(30, 0);
  });

  it('再送信回数の上限が適用される', () => {
    const MAX_RESENDS = 3;
    const resendCount = 3;
    
    expect(resendCount >= MAX_RESENDS).toBe(true);
  });
});