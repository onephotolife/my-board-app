import { Page } from '@playwright/test';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';

export async function createTestUser(email: string, name: string, password = 'TestPassword123!') {
  await connectDB();
  
  // 既存のユーザーがあれば削除
  await User.deleteOne({ email });
  
  // Userモデルのpre-saveフックでハッシュ化させるため、プレーンテキストを渡す
  const user = await User.create({
    name,
    email,
    password, // プレーンテキストパスワード（pre-saveフックで自動ハッシュ化）
    emailVerified: true,
    status: 'active',
    role: 'user',
  });

  return user.toJSON();
}

export async function deleteTestUser(userId: string) {
  await connectDB();
  await User.findByIdAndDelete(userId);
}

export async function signInUser(page: Page, email: string, password: string) {
  await page.goto('/auth/signin');
  
  // メールアドレスを入力
  await page.fill('[data-testid="email-input"]', email);
  
  // パスワードを入力
  await page.fill('[data-testid="password-input"]', password);
  
  // ログインボタンをクリック
  await page.click('[data-testid="signin-button"]');
  
  // ログイン成功を待機（実際の挙動に合わせてdashboardを期待）
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

export async function signOutUser(page: Page) {
  // ユーザーメニューを開く
  await page.click('[data-testid="user-menu-button"]');
  
  // ログアウトボタンをクリック
  await page.click('[data-testid="signout-button"]');
  
  // ログアウト成功を待機
  await page.waitForURL('/auth/signin', { timeout: 5000 });
}

export async function createModeratorUser(email: string, name: string) {
  const user = await createTestUser(email, name);
  
  // モデレーター権限を設定
  await connectDB();
  await User.findByIdAndUpdate(user._id, { role: 'moderator' });
  
  return user;
}

export async function verifyUserEmail(userId: string) {
  await connectDB();
  await User.findByIdAndUpdate(userId, { emailVerified: true });
}

export async function banUser(userId: string, reason = 'テスト用BAN') {
  await connectDB();
  await User.findByIdAndUpdate(userId, {
    status: 'banned',
    bannedAt: new Date(),
    bannedReason: reason,
  });
}

export async function unbanUser(userId: string) {
  await connectDB();
  await User.findByIdAndUpdate(userId, {
    status: 'active',
    $unset: { bannedAt: 1, bannedReason: 1 },
  });
}