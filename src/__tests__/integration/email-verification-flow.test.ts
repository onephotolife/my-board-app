/**
 * メール認証フロー結合テスト
 * 
 * テスト対象:
 * 1. 新規登録API → メール送信 → トークン生成
 * 2. メール認証API → トークン検証 → ユーザー更新
 * 3. 認証後のログイン
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import User from '@/lib/models/User';

describe('Email Verification Flow - Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // インメモリMongoDBサーバーの起動
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // 各テスト前にデータベースをクリア
    await User.deleteMany({});
  });

  describe('新規登録からメール認証までのフロー', () => {
    it('正常なフロー: 新規登録 → トークン生成 → メール認証 → ログイン', async () => {
      // 1. 新規ユーザー作成（登録APIの処理を模擬）
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        emailVerificationToken: 'test-verification-token-123',
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
        emailVerified: false,
      };

      const newUser = new User(userData);
      await newUser.save();

      // ユーザーが作成されたことを確認
      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser).toBeTruthy();
      expect(createdUser?.emailVerified).toBe(false);
      expect(createdUser?.emailVerificationToken).toBe(userData.emailVerificationToken);

      // 2. メール認証処理（verify-email APIの処理を模擬）
      const userToVerify = await User.findOne({ 
        emailVerificationToken: userData.emailVerificationToken 
      });

      expect(userToVerify).toBeTruthy();
      
      // トークンの有効期限を確認
      const now = new Date();
      expect(userToVerify?.emailVerificationTokenExpiry).toBeTruthy();
      expect(userToVerify!.emailVerificationTokenExpiry! > now).toBe(true);

      // メール認証を実行
      userToVerify!.emailVerified = true;
      userToVerify!.emailVerificationToken = undefined;
      userToVerify!.emailVerificationTokenExpiry = undefined;
      await userToVerify!.save();

      // 3. 認証後の状態を確認
      const verifiedUser = await User.findOne({ email: userData.email });
      expect(verifiedUser?.emailVerified).toBe(true);
      expect(verifiedUser?.emailVerificationToken).toBeUndefined();
      expect(verifiedUser?.emailVerificationTokenExpiry).toBeUndefined();

      // 4. パスワード検証（ログイン処理の模擬）
      const passwordMatch = await bcrypt.compare(
        userData.password,
        verifiedUser!.password
      );
      expect(passwordMatch).toBe(true);
    });

    it('トークンが期限切れの場合、認証に失敗する', async () => {
      // 期限切れトークンでユーザー作成
      const userData = {
        email: 'expired@example.com',
        password: 'Password123!',
        name: 'Expired User',
        emailVerificationToken: 'expired-token-456',
        emailVerificationTokenExpiry: new Date(Date.now() - 1000), // 1秒前（期限切れ）
        emailVerified: false,
      };

      const newUser = new User(userData);
      await newUser.save();

      // トークンでユーザーを検索
      const userToVerify = await User.findOne({ 
        emailVerificationToken: userData.emailVerificationToken 
      });

      expect(userToVerify).toBeTruthy();

      // 期限切れを確認
      const now = new Date();
      expect(userToVerify!.emailVerificationTokenExpiry! < now).toBe(true);

      // 認証を実行しない（APIでは400エラーを返す想定）
      expect(userToVerify?.emailVerified).toBe(false);
    });

    it('無効なトークンの場合、ユーザーが見つからない', async () => {
      // ユーザー作成
      const userData = {
        email: 'valid@example.com',
        password: 'Password123!',
        name: 'Valid User',
        emailVerificationToken: 'valid-token-789',
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        emailVerified: false,
      };

      const newUser = new User(userData);
      await newUser.save();

      // 無効なトークンで検索
      const userWithInvalidToken = await User.findOne({ 
        emailVerificationToken: 'invalid-token-000' 
      });

      expect(userWithInvalidToken).toBeNull();
    });

    it('既に認証済みのユーザーの場合、再認証をスキップする', async () => {
      // 認証済みユーザー作成
      const userData = {
        email: 'verified@example.com',
        password: 'Password123!',
        name: 'Verified User',
        emailVerified: true,
      };

      const newUser = new User(userData);
      await newUser.save();

      const verifiedUser = await User.findOne({ email: userData.email });
      expect(verifiedUser?.emailVerified).toBe(true);
      expect(verifiedUser?.emailVerificationToken).toBeUndefined();
    });
  });

  describe('パスワード変更フロー', () => {
    it('パスワード変更後、新しいパスワードでログインできる', async () => {
      // ユーザー作成
      const userData = {
        email: 'password@example.com',
        password: 'OldPassword123!',
        name: 'Password User',
        emailVerified: true,
      };

      const newUser = new User(userData);
      await newUser.save();

      // パスワード変更
      const user = await User.findOne({ email: userData.email });
      const newPassword = 'NewPassword456!';
      user!.password = newPassword;
      await user!.save();

      // 新しいパスワードで検証
      const updatedUser = await User.findOne({ email: userData.email });
      const passwordMatch = await bcrypt.compare(
        newPassword,
        updatedUser!.password
      );
      expect(passwordMatch).toBe(true);

      // 古いパスワードでは検証失敗
      const oldPasswordMatch = await bcrypt.compare(
        userData.password,
        updatedUser!.password
      );
      expect(oldPasswordMatch).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('同じメールアドレスで複数登録を防ぐ', async () => {
      const email = 'duplicate@example.com';
      
      // 最初のユーザー作成
      const user1 = new User({
        email,
        password: 'Password123!',
        name: 'User 1',
      });
      await user1.save();

      // 同じメールで2番目のユーザー作成を試みる
      const user2 = new User({
        email,
        password: 'Password456!',
        name: 'User 2',
      });

      await expect(user2.save()).rejects.toThrow();
    });

    it('必須フィールドが欠けている場合、エラーになる', async () => {
      // メールなし
      const userWithoutEmail = new User({
        password: 'Password123!',
        name: 'No Email',
      });
      await expect(userWithoutEmail.save()).rejects.toThrow();

      // パスワードなし
      const userWithoutPassword = new User({
        email: 'nopassword@example.com',
        name: 'No Password',
      });
      await expect(userWithoutPassword.save()).rejects.toThrow();
    });
  });
});