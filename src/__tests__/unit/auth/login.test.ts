import { authConfig } from '@/lib/auth.config';
import User from '@/lib/models/User';

describe('User Login (NextAuth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Credentials Provider - authorize', () => {
    const credentialsProvider = authConfig.providers[0];
    
    it('should authenticate user with valid credentials', async () => {
      // Userモックを設定
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: 'hashed_password',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser)
        })
      }));

      const authorize = credentialsProvider.authorize;
      
      const result = await authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeTruthy();
      expect(result?.id).toBe('507f1f77bcf86cd799439011');
      expect(result?.email).toBe('test@example.com');
      expect(result?.name).toBe('Test User');
    });

    it('should reject authentication with invalid password', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: 'hashed_password',
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser)
        })
      }));

      const authorize = credentialsProvider.authorize;
      
      const result = await authorize({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      expect(result).toBeNull();
    });

    it('should reject authentication for non-existent user', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const authorize = credentialsProvider.authorize;
      
      const result = await authorize({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      });

      expect(result).toBeNull();
    });

    it('should reject authentication for unverified email', async () => {
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'unverified@example.com',
        name: 'Unverified User',
        emailVerified: false,
        password: 'hashed_password',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser)
        })
      }));

      const authorize = credentialsProvider.authorize;
      
      const result = await authorize({
        email: 'unverified@example.com',
        password: 'TestPassword123!',
      });

      // メール未確認の場合は特別なIDが返される
      expect(result).toBeTruthy();
      expect(result?.id).toBe('email-not-verified');
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
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        password: 'hashed_password',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockImplementation((query) => {
        // 大文字小文字を無視して検索
        if (query.email?.toLowerCase() === 'test@example.com') {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
      });
      User.findById = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          toObject: jest.fn(() => mockUser)
        })
      }));

      const authorize = credentialsProvider.authorize;
      
      const result = await authorize({
        email: 'TEST@EXAMPLE.COM',
        password: 'TestPassword123!',
      });

      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@example.com');
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
      
      // tokenがある場合はuserオブジェクトが作成される
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user123');
      expect(result.user.emailVerified).toBeUndefined();
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