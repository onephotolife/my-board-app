import * as path from 'path';
import * as fs from 'fs';

import { test as setup, type Cookie } from '@playwright/test';

import { createMockStorageState } from './utils/create-mock-storage-state';

const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate', async ({ page, context }) => {
  // 認証ディレクトリの作成
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 環境にMongoDBが無い場合など、UIログインが不可能なケースに備えたモック経路
  if (process.env.E2E_MOCK_AUTH === '1') {
    const state = createMockStorageState();
    // storageState 形式で保存
    await context.addCookies(state.cookies as Cookie[]);
    // playwright の storageState ファイルとして保存
    await context.storageState({ path: authFile });
    console.warn('[GLOBAL-SETUP] Mock storageState created at:', authFile);
    return;
  }

  console.warn('Navigating to login page...');
  // ログインページへ移動（実際のページパスを使用）
  await page.goto('/auth/signin');

  // ページが完全に読み込まれるまで待機
  await page.waitForLoadState('networkidle');

  console.warn('Filling in credentials...');
  // 実際のdata-testidを使用してログイン（既存のテストユーザーを使用）
  const email = process.env.TEST_EMAIL || 'one.photolife+1@gmail.com';
  const password = process.env.TEST_PASSWORD || '?@thc123THC@?';

  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);

  console.warn(`Submitting login form with email: ${email}`);

  // ネットワークアクティビティを監視
  const [response] = await Promise.all([
    page
      .waitForResponse((resp) => resp.url().includes('/api/auth/') && resp.status() === 200, {
        timeout: 10000,
      })
      .catch(() => null),
    page.click('[data-testid="signin-button"]'),
  ]);

  if (response) {
    console.warn(`Auth response received: ${response.url()} - ${response.status()}`);
  }

  // エラーメッセージの確認
  const errorElement = await page.locator('.error-message').first();
  if (await errorElement.isVisible()) {
    const errorText = await errorElement.textContent();
    console.error(`Login error displayed: ${errorText}`);
    throw new Error(`Login failed: ${errorText}`);
  }

  console.warn('Waiting for redirect to dashboard...');
  // ログイン成功を待機（ダッシュボードへのリダイレクト）
  await page.waitForURL('/dashboard', { timeout: 10000 });

  // セッション確認（ページが完全に読み込まれるまで少し待機）
  await page.waitForLoadState('networkidle');

  // ユーザーがログインしていることを確認（例：ヘッダーのユーザーメニューやログアウトボタン）
  // TODO: 実際のUIに合わせてセレクタを調整
  // await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });

  // 認証状態を保存
  await page.context().storageState({ path: authFile });

  console.warn('Authentication completed and saved to:', authFile);
});
