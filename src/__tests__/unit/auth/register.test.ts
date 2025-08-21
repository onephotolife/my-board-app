import { NextRequest } from 'next/server';

import { POST } from '@/app/api/auth/register/route';
import User from '@/lib/models/User';

import * as dbHelper from '../../helpers/db';

// メール送信のモック
jest.mock('@/lib/mail/sendMail', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  getVerificationEmailHtml: jest.fn().mockReturnValue('<html>Test Email</html>'),
}));

describe('User Registration API', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await dbHelper.clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dbHelper.closeDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const requestData = {
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        name: 'New User',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toContain('登録が完了しました');

      // データベースにユーザーが作成されているか確認
      const user = await User.findOne({ email: requestData.email });
      expect(user).toBeTruthy();
      expect(user?.email).toBe(requestData.email.toLowerCase());
      expect(user?.name).toBe(requestData.name);
      expect(user?.emailVerified).toBe(false);
      expect(user?.emailVerificationToken).toBeTruthy();
    });

    it('should reject registration with invalid email', async () => {
      const requestData = {
        email: 'invalid-email',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('有効なメールアドレスを入力してください');
    });

    it('should reject registration with weak password', async () => {
      const requestData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('パスワードは8文字以上');
    });

    it('should reject duplicate email registration', async () => {
      // 最初のユーザーを作成
      const existingUser = new User({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
        emailVerified: true,
      });
      await existingUser.save();

      // 同じメールアドレスで登録を試みる
      const requestData = {
        email: 'existing@example.com',
        password: 'StrongPassword123!',
        name: 'New User',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('このメールアドレスは登録できません');
    });

    it('should handle email sending failure gracefully', async () => {
      // メール送信失敗をモック
      const { sendEmail } = await import('@/lib/mail/sendMail');
      (sendEmail as jest.Mock).mockResolvedValueOnce({ success: false, error: 'SMTP Error' });

      const requestData = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.warning).toContain('確認メールの送信に失敗しました');
      expect(data.userId).toBeTruthy();

      // ユーザーは作成されているが、メール送信失敗フラグが立っている
      const user = await User.findOne({ email: requestData.email });
      expect(user).toBeTruthy();
      expect(user?.emailSendFailed).toBe(true);
    });

    it('should validate all required fields', async () => {
      const invalidRequests = [
        { email: 'test@example.com', password: 'StrongPassword123!' }, // name欠落
        { email: 'test@example.com', name: 'Test User' }, // password欠落
        { password: 'StrongPassword123!', name: 'Test User' }, // email欠落
      ];

      for (const requestData of invalidRequests) {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('無効なリクエスト');
    });
  });
});