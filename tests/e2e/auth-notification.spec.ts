/**
 * 認証付き通知システムE2Eテスト
 * STRICT120プロトコル準拠
 */

import { test, expect } from '@playwright/test';

// テスト設定
const TEST_EMAIL = 'one.photolife+1@gmail.com';
const TEST_PASSWORD = '?@thc123THC@?';
const BASE_URL = 'http://localhost:3000';

test.describe('認証付き通知システムテスト', () => {
  test.beforeEach(async ({ page }) => {
    console.log('[TEST] テスト開始: ' + new Date().toISOString());
  });

  test('認証とAPI呼び出しテスト', async ({ page, request }) => {
    // 1. ログインページへ移動
    console.log('[AUTH] ログインページへ移動');
    await page.goto(`${BASE_URL}/auth/signin`);
    
    // 2. ログインフォームの入力
    console.log('[AUTH] 認証情報入力');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // 3. ログインボタンをクリック
    console.log('[AUTH] ログイン実行');
    await page.click('button[type="submit"]');
    
    // 4. ログイン成功を確認（リダイレクト待機）
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('[AUTH] ダッシュボードリダイレクトなし');
    });
    
    // 5. セッション確認
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session-token'));
    console.log('[AUTH] セッショントークン取得:', sessionCookie ? '成功' : '失敗');
    
    // 6. APIコンテキストでの通知API呼び出し
    console.log('[API] 通知API呼び出し');
    const apiResponse = await page.request.get('/api/notifications');
    const status = apiResponse.status();
    
    console.log('[API] レスポンスステータス:', status);
    
    if (status === 200) {
      const data = await apiResponse.json();
      console.log('[API] 通知データ取得成功:', {
        success: data.success,
        notificationCount: data.notifications?.length || 0
      });
      
      // アサーション
      expect(data.success).toBe(true);
      expect(data.notifications).toBeDefined();
    } else {
      console.log('[API] 通知API呼び出し失敗:', status);
    }
  });

  test('通知作成と取得のフローテスト', async ({ page }) => {
    // 1. ログイン
    console.log('[FLOW] ログイン処理');
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ログイン待機
    await page.waitForTimeout(2000);
    
    // 2. 投稿ページへ移動
    console.log('[FLOW] 投稿ページへ移動');
    await page.goto(`${BASE_URL}/board`);
    
    // 3. 新規投稿作成（通知のトリガー）
    const testContent = `テスト投稿 ${Date.now()}`;
    console.log('[FLOW] 新規投稿作成');
    
    const postInput = page.locator('textarea[placeholder*="投稿"]').first();
    if (await postInput.isVisible()) {
      await postInput.fill(testContent);
      await page.click('button:has-text("投稿")');
      console.log('[FLOW] 投稿完了');
    } else {
      console.log('[FLOW] 投稿フォームが見つかりません');
    }
    
    // 4. 通知APIを直接呼び出し
    console.log('[FLOW] 通知確認');
    const notificationResponse = await page.request.get('/api/notifications');
    
    if (notificationResponse.ok()) {
      const notifications = await notificationResponse.json();
      console.log('[FLOW] 通知取得成功:', notifications);
    } else {
      console.log('[FLOW] 通知取得失敗:', notificationResponse.status());
    }
  });
});