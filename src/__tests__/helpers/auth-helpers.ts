import type { NextAuthConfig } from 'next-auth';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import User from '@/lib/models/User';

/**
 * テスト用認証ヘルパー関数集
 */

// テスト用MongoDBセットアップ
let mongoServer: MongoMemoryServer;

export const setupTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(mongoUri);
  console.log('🧪 Test database connected:', mongoUri);
};

export const cleanupTestDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('🧹 Test database cleaned up');
};

// テストユーザーファクトリー
export interface TestUser {
  email: string;
  password: string;
  name: string;
  emailVerified?: boolean;
  role?: 'admin' | 'moderator' | 'user';
}

export const createTestUser = async (userData: Partial<TestUser> = {}): Promise<{
  user: any;
  plainPassword: string;
}> => {
  const defaultData: TestUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    emailVerified: true,
    role: 'user',
    ...userData,
  };

  const user = new User(defaultData);
  await user.save();
  
  return {
    user: user.toJSON(),
    plainPassword: defaultData.password,
  };
};

// テスト用JWTトークン生成
export const createTestJWT = (payload: any, secret?: string) => {
  return jwt.sign(
    payload,
    secret || 'test-secret-key',
    { expiresIn: '1h' }
  );
};

// NextAuth モック
export const mockNextAuthSession = (user: any) => {
  return {
    user: {
      id: user._id || user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
};

// パスワードハッシュ化ヘルパー
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// メールバリデーションヘルパー
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// テスト用環境変数設定
export const setupTestEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_SECRET = 'test-secret-key-for-auth-testing-purposes';
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-auth-testing-purposes';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
  process.env.SEND_EMAILS = 'false'; // テスト時はメール送信無効
};

// 認証APIレスポンス検証ヘルパー
export const validateAuthResponse = (response: any, expectedStatus: number) => {
  expect(response.status).toBe(expectedStatus);
  
  if (expectedStatus === 200 || expectedStatus === 201) {
    expect(response.body).toHaveProperty('success', true);
  } else {
    expect(response.body).toHaveProperty('error');
    expect(typeof response.body.error).toBe('string');
  }
};

// レート制限テスト用
export const simulateRateLimitRequests = async (
  requestFn: () => Promise<any>,
  maxAttempts: number = 6
) => {
  const results = [];
  
  for (let i = 0; i < maxAttempts; i++) {
    const result = await requestFn();
    results.push(result);
  }
  
  return results;
};

// Cookie解析ヘルパー
export const parseCookies = (cookieHeader: string): Record<string, string> => {
  return cookieHeader
    .split(';')
    .reduce((cookies: Record<string, string>, cookie) => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
      return cookies;
    }, {});
};

// セッション検証ヘルパー
export const validateSession = (session: any) => {
  expect(session).toHaveProperty('user');
  expect(session.user).toHaveProperty('id');
  expect(session.user).toHaveProperty('email');
  expect(session.user).toHaveProperty('name');
  expect(session.user).toHaveProperty('emailVerified');
  expect(session).toHaveProperty('expires');
};

// テストデータクリーンアップ
export const cleanupTestData = async () => {
  await User.deleteMany({ email: { $regex: /test-.*@example\.com/ } });
};

// テスト用認証設定
export const getTestAuthConfig = (): Partial<NextAuthConfig> => ({
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60, // 1時間（テスト用短縮）
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

// エラーメッセージ検証
export const validateErrorMessage = (error: any, expectedType: string) => {
  expect(error).toHaveProperty('message');
  expect(error).toHaveProperty('type', expectedType);
  expect(typeof error.message).toBe('string');
  expect(error.message.length).toBeGreaterThan(0);
};