/**
 * E2Eテスト用のデータベースヘルパー
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB接続
export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app-test';
  
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  } catch (error) {
    console.warn('MongoDB接続エラー（テスト続行）:', error);
    // テストはモックで続行可能
  }
  
  return mongoose.connection;
}

// ユーザーモデルの簡易版（テスト用）
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationTokenExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// テストユーザー作成
export async function createTestUser(userData: {
  email: string;
  password: string;
  name?: string;
  emailVerified?: boolean;
}) {
  await connectDB();
  
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const user = await User.create({
    ...userData,
    password: hashedPassword,
    emailVerified: userData.emailVerified || false,
  });
  
  return user;
}

// テストユーザー削除
export async function deleteTestUser(email: string) {
  await connectDB();
  await User.deleteOne({ email });
}

// すべてのテストユーザー削除
export async function cleanupTestUsers() {
  await connectDB();
  // test で始まるメールアドレスを持つユーザーを削除
  await User.deleteMany({ 
    email: { $regex: /^test/i } 
  });
}

// ユーザー検索
export async function findUser(email: string) {
  await connectDB();
  return await User.findOne({ email });
}

// メール認証トークン設定
export async function setVerificationToken(email: string, token: string) {
  await connectDB();
  
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  
  await User.updateOne(
    { email },
    {
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiry,
    }
  );
}

// メール認証状態を設定
export async function setEmailVerified(email: string, verified: boolean) {
  await connectDB();
  
  await User.updateOne(
    { email },
    {
      emailVerified: verified,
      emailVerificationToken: verified ? undefined : undefined,
      emailVerificationTokenExpiry: verified ? undefined : undefined,
    }
  );
}

// レート制限スキーマ
const RateLimitSchema = new mongoose.Schema({
  identifier: { type: String, required: true },
  action: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date },
  blockedUntil: { type: Date },
});

const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);

// レート制限のリセット
export async function resetRateLimit(identifier: string, action: string) {
  await connectDB();
  await RateLimit.deleteOne({ identifier, action });
}

// レート制限の設定
export async function setRateLimit(identifier: string, action: string, attempts: number) {
  await connectDB();
  
  const blockedUntil = new Date();
  blockedUntil.setHours(blockedUntil.getHours() + 1);
  
  await RateLimit.findOneAndUpdate(
    { identifier, action },
    {
      attempts,
      lastAttempt: new Date(),
      blockedUntil: attempts >= 3 ? blockedUntil : undefined,
    },
    { upsert: true }
  );
}

// データベース接続を閉じる
export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}