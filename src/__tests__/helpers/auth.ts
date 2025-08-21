import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import User from '@/lib/models/User';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  _id?: string;
}

/**
 * Create a test user with hashed password
 */
export const createTestUser = async (
  userData: Partial<TestUser> = {}
): Promise<TestUser & { _id: string }> => {
  const defaultUser = {
    email: `test-${uuidv4()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    emailVerified: true,
    ...userData,
  };

  const user = new User({
    ...defaultUser,
    password: await bcrypt.hash(defaultUser.password, 10),
  });

  await user.save();

  return {
    email: user.email,
    password: defaultUser.password, // 元のパスワード（テスト用）
    name: user.name,
    _id: user._id.toString(),
  };
};

/**
 * Create multiple test users
 */
export const createTestUsers = async (count: number): Promise<TestUser[]> => {
  const users: TestUser[] = [];
  
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `test${i}@example.com`,
      name: `Test User ${i}`,
    });
    users.push(user);
  }
  
  return users;
};

/**
 * Mock NextAuth session
 */
export const mockSession = (user?: Partial<TestUser>) => {
  return {
    user: user ? {
      id: user._id || '123456789',
      email: user.email || 'test@example.com',
      name: user.name || 'Test User',
    } : null,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
};