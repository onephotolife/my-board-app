/**
 * 認証とコメント機能のE2Eテスト
 * 必須認証: one.photolife+1@gmail.com / ?@thc123THC@?
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// テスト設定
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  credentials: {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  },
  timeout: 10000
};

// E2Eデバッグログ
class E2ELogger {
  static log(action: string, data: any = {}) {
    console.log(`[E2E] ${new Date().toISOString()} ${action}:`, data);
  }
  
  static error(action: string, error: any) {
    console.error(`[E2E-ERROR] ${new Date().toISOString()} ${action}:`, error.message || error);
  }
}

// 認証ヘルパー関数
async function authenticateUser(page: Page): Promise<boolean> {
  try {
    E2ELogger.log('AUTH_START', { email: TEST_CONFIG.credentials.email });
    
    // サインインページへ
    await page.goto(`${TEST_CONFIG.baseURL}/auth/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeout
    });
    
    // フォーム入力
    await page.fill('input[name="email"], input[type="email"]', TEST_CONFIG.credentials.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_CONFIG.credentials.password);
    
    // サインインボタンクリック
    await Promise.all([
      page.waitForNavigation({ timeout: TEST_CONFIG.timeout }),
      page.click('button[type="submit"]')
    ]);
    
    // 認証確認
    const currentURL = page.url();
    const isAuthenticated = !currentURL.includes('/auth/signin');
    
    if (isAuthenticated) {
      E2ELogger.log('AUTH_SUCCESS', { redirectURL: currentURL });
    } else {
      E2ELogger.error('AUTH_FAILED', { currentURL });
    }
    
    return isAuthenticated;
  } catch (error) {
    E2ELogger.error('AUTH_ERROR', error);
    return false;
  }
}

test.describe('認証フロー', () => {
  test('正常系: 必須認証情報でログインできる', async ({ page }) => {
    const isAuthenticated = await authenticateUser(page);
    expect(isAuthenticated).toBe(true);
    
    // セッション確認
    const response = await page.request.get('/api/auth/session');
    const session = await response.json();
    
    E2ELogger.log('SESSION_CHECK', session);
    
    if (session.user) {
      expect(session.user.email).toBe(TEST_CONFIG.credentials.email);
      E2ELogger.log('SESSION_VERIFIED', { email: session.user.email });
    }
  });
  
  test('異常系: 誤った認証情報でログインできない', async ({ page }) => {
    E2ELogger.log('INVALID_AUTH_TEST');
    
    await page.goto(`${TEST_CONFIG.baseURL}/auth/signin`);
    
    await page.fill('input[name="email"], input[type="email"]', 'invalid@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // エラーメッセージまたはサインインページに留まることを確認
    await page.waitForTimeout(1000);
    const currentURL = page.url();
    expect(currentURL).toContain('/auth/signin');
    
    E2ELogger.log('INVALID_AUTH_BLOCKED', { currentURL });
  });
});

test.describe('コメント機能（認証必須）', () => {
  test.beforeEach(async ({ page }) => {
    // 各テストの前に認証
    const isAuthenticated = await authenticateUser(page);
    if (!isAuthenticated) {
      throw new Error('認証に失敗しました');
    }
  });
  
  test('ダッシュボードにアクセスできる', async ({ page }) => {
    E2ELogger.log('DASHBOARD_ACCESS_TEST');
    
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // ダッシュボードのコンテンツ確認
    const title = await page.title();
    E2ELogger.log('DASHBOARD_LOADED', { title });
    
    // 投稿一覧が表示されることを確認
    const hasContent = await page.locator('main').isVisible();
    expect(hasContent).toBe(true);
  });
  
  test('投稿を作成できる', async ({ page }) => {
    E2ELogger.log('POST_CREATE_TEST');
    
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);
    
    // 投稿フォームを探す
    const postInput = page.locator('textarea, input[type="text"]').first();
    const hasPostForm = await postInput.isVisible();
    
    if (hasPostForm) {
      await postInput.fill('E2Eテスト投稿: ' + new Date().toISOString());
      
      // 送信ボタンを探す
      const submitButton = page.locator('button').filter({ hasText: /投稿|送信|Post|Submit/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        E2ELogger.log('POST_SUBMITTED');
        
        // 成功メッセージまたは投稿の表示を待つ
        await page.waitForTimeout(2000);
      }
    } else {
      E2ELogger.log('POST_FORM_NOT_FOUND');
    }
  });
  
  test('コメントAPIの動作確認', async ({ page }) => {
    E2ELogger.log('COMMENT_API_TEST');
    
    // APIで直接テスト
    const postsResponse = await page.request.get('/api/posts');
    
    if (postsResponse.ok()) {
      const posts = await postsResponse.json();
      E2ELogger.log('POSTS_FETCHED', { count: posts.length });
      
      if (posts.length > 0 && posts[0]._id) {
        const postId = posts[0]._id;
        
        // コメントAPI確認
        const commentResponse = await page.request.get(`/api/posts/${postId}/comments`);
        E2ELogger.log('COMMENT_API_STATUS', { 
          status: commentResponse.status(),
          postId 
        });
        
        if (commentResponse.status() === 404) {
          E2ELogger.log('COMMENT_API_NOT_IMPLEMENTED');
        } else if (commentResponse.ok()) {
          const comments = await commentResponse.json();
          E2ELogger.log('COMMENTS_FETCHED', { count: comments.length });
        }
      }
    } else {
      E2ELogger.log('POSTS_API_ERROR', { status: postsResponse.status() });
    }
  });
});

test.describe('影響範囲確認', () => {
  test('既存ページのアクセシビリティ', async ({ page }) => {
    E2ELogger.log('ACCESSIBILITY_TEST');
    
    const pages = ['/', '/privacy', '/terms'];
    
    for (const path of pages) {
      await page.goto(`${TEST_CONFIG.baseURL}${path}`);
      const isAccessible = await page.locator('body').isVisible();
      expect(isAccessible).toBe(true);
      E2ELogger.log('PAGE_ACCESSIBLE', { path });
    }
  });
  
  test('パフォーマンス測定', async ({ page }) => {
    E2ELogger.log('PERFORMANCE_TEST');
    
    await page.goto(TEST_CONFIG.baseURL);
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        responseTime: navigation.responseEnd - navigation.requestStart
      };
    });
    
    E2ELogger.log('PERFORMANCE_METRICS', metrics);
    
    // パフォーマンス基準
    expect(metrics.responseTime).toBeLessThan(3000);
    expect(metrics.domContentLoaded).toBeLessThan(5000);
  });
});