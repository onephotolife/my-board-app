/**
 * コメントUI機能 - 包括テスト（E2Eテスト）スイート
 * 
 * テスト環境: Playwright
 * テスト対象: 完全なユーザーフロー
 * 
 * 認証要件:
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// =================================================================
// E2Eテスト用デバッグログシステム
// =================================================================
class E2ETestLogger {
  private static readonly PREFIX = '[TEST-E2E]';
  private static logs: Array<{
    level: string;
    message: string;
    data: any;
    timestamp: string;
    sequence: number;
    screenshot?: string;
  }> = [];
  private static sequence = 0;
  private static screenshotDir = './test-results/screenshots';
  
  static {
    // スクリーンショットディレクトリの作成
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }
  
  static log(action: string, data: any = {}) {
    const entry = {
      level: 'INFO',
      message: `${this.PREFIX}-${action}`,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        testFile: 'comment-ui-e2e-tests.spec.ts'
      },
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence
    };
    
    this.logs.push(entry);
    console.log(`[${entry.sequence}] ${entry.message}`, entry.data);
  }
  
  static error(action: string, error: any, context?: any) {
    const entry = {
      level: 'ERROR',
      message: `${this.PREFIX}-ERROR-${action}`,
      data: {
        error: error.message || error,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence
    };
    
    this.logs.push(entry);
    console.error(`[${entry.sequence}] ${entry.message}`, entry.data);
  }
  
  static async screenshot(page: Page, name: string): Promise<string> {
    const filename = `${Date.now()}-${name}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await page.screenshot({ path: filepath, fullPage: true });
    
    this.log('SCREENSHOT_CAPTURED', { name, filepath });
    
    return filepath;
  }
  
  static metric(action: string, metrics: any) {
    const entry = {
      level: 'METRIC',
      message: `${this.PREFIX}-METRIC-${action}`,
      data: {
        ...metrics,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence
    };
    
    this.logs.push(entry);
    console.log(`[${entry.sequence}] [METRIC] ${action}`, metrics);
  }
  
  static checkpoint(name: string, data: any = {}) {
    const entry = {
      level: 'CHECKPOINT',
      message: `${this.PREFIX}-CHECKPOINT-${name}`,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence
    };
    
    this.logs.push(entry);
    console.log(`[${entry.sequence}] [CHECKPOINT] ${name}`, data);
  }
  
  static exportReport(): string {
    const report = {
      summary: {
        totalTests: this.logs.filter(l => l.message.includes('TEST_START')).length,
        passed: this.logs.filter(l => l.message.includes('TEST_PASSED')).length,
        failed: this.logs.filter(l => l.level === 'ERROR').length,
        screenshots: this.logs.filter(l => l.message.includes('SCREENSHOT')).length,
        checkpoints: this.logs.filter(l => l.level === 'CHECKPOINT').length
      },
      logs: this.logs,
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(report, null, 2);
  }
}

// =================================================================
// テスト設定とヘルパー関数
// =================================================================

// テスト環境設定
const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  credentials: {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  },
  timeout: {
    navigation: 30000,
    action: 10000,
    assertion: 5000
  }
};

// 認証ヘルパー関数
async function authenticateUser(page: Page, context: BrowserContext): Promise<void> {
  E2ETestLogger.log('AUTH_START', { email: TEST_CONFIG.credentials.email });
  const startTime = Date.now();
  
  try {
    // ログインページへ移動
    await page.goto(`${TEST_CONFIG.baseURL}/auth/signin`, {
      waitUntil: 'networkidle',
      timeout: TEST_CONFIG.timeout.navigation
    });
    
    E2ETestLogger.checkpoint('LOGIN_PAGE_LOADED');
    
    // ログインフォームの入力
    await page.fill('input[name="email"]', TEST_CONFIG.credentials.email);
    await page.fill('input[name="password"]', TEST_CONFIG.credentials.password);
    
    E2ETestLogger.log('CREDENTIALS_ENTERED');
    
    // スクリーンショット（認証前）
    await E2ETestLogger.screenshot(page, 'before-login');
    
    // ログインボタンをクリック
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    // 認証成功の確認
    await page.waitForSelector('[data-testid="user-menu"]', {
      timeout: TEST_CONFIG.timeout.action
    });
    
    // セッションクッキーの確認
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session-token'));
    
    if (!sessionCookie) {
      throw new Error('Session cookie not found');
    }
    
    const duration = Date.now() - startTime;
    E2ETestLogger.metric('AUTH_DURATION', { duration, success: true });
    E2ETestLogger.checkpoint('AUTH_COMPLETE', { 
      hasSession: true,
      cookieCount: cookies.length 
    });
    
    // スクリーンショット（認証後）
    await E2ETestLogger.screenshot(page, 'after-login');
    
  } catch (error) {
    E2ETestLogger.error('AUTH_FAILED', error);
    await E2ETestLogger.screenshot(page, 'auth-error');
    throw error;
  }
}

// コメント投稿ヘルパー関数
async function postComment(page: Page, postId: string, content: string): Promise<void> {
  E2ETestLogger.log('COMMENT_POST_START', { postId, contentLength: content.length });
  
  try {
    // 投稿ページへ移動
    await page.goto(`${TEST_CONFIG.baseURL}/posts/${postId}`, {
      waitUntil: 'networkidle'
    });
    
    // コメントセクションを開く
    const commentButton = await page.locator('button:has-text("コメント")');
    await commentButton.click();
    
    // コメントフォームが表示されるまで待機
    await page.waitForSelector('[data-testid="comment-form"]', {
      timeout: TEST_CONFIG.timeout.action
    });
    
    // コメントを入力
    await page.fill('[data-testid="comment-input"]', content);
    
    // 送信前のスクリーンショット
    await E2ETestLogger.screenshot(page, 'before-comment-submit');
    
    // 送信ボタンをクリック
    await page.click('[data-testid="submit-comment"]');
    
    // コメントが表示されるまで待機
    await page.waitForSelector(`text="${content}"`, {
      timeout: TEST_CONFIG.timeout.action
    });
    
    E2ETestLogger.checkpoint('COMMENT_POSTED', { content: content.substring(0, 50) });
    
    // 送信後のスクリーンショット
    await E2ETestLogger.screenshot(page, 'after-comment-submit');
    
  } catch (error) {
    E2ETestLogger.error('COMMENT_POST_FAILED', error, { postId, content });
    await E2ETestLogger.screenshot(page, 'comment-post-error');
    throw error;
  }
}

// =================================================================
// 包括テスト: 完全なユーザーフロー
// =================================================================

test.describe('Complete User Flow - 完全なユーザーフロー', () => {
  
  test.beforeEach(async ({ page, context }) => {
    E2ETestLogger.log('TEST_START', { test: test.info().title });
    
    // 認証実行
    await authenticateUser(page, context);
  });
  
  test.afterEach(async ({ page }) => {
    E2ETestLogger.log('TEST_END', { test: test.info().title });
    
    // 最終スクリーンショット
    await E2ETestLogger.screenshot(page, 'test-end');
  });
  
  test('正常系: コメント機能の完全フロー', async ({ page }) => {
    const testStartTime = Date.now();
    
    // ステップ1: ホームページへ移動
    await page.goto(TEST_CONFIG.baseURL);
    E2ETestLogger.checkpoint('HOME_PAGE_LOADED');
    
    // ステップ2: 投稿を見つける
    const firstPost = await page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();
    
    // 投稿IDを取得
    const postId = await firstPost.getAttribute('data-post-id');
    E2ETestLogger.log('POST_FOUND', { postId });
    
    // ステップ3: 投稿詳細へ移動
    await firstPost.click();
    await page.waitForURL(`**/posts/${postId}`);
    E2ETestLogger.checkpoint('POST_DETAIL_LOADED');
    
    // ステップ4: コメントセクションを開く
    const commentButton = await page.locator('button:has-text("コメント")');
    const commentCount = await commentButton.textContent();
    E2ETestLogger.log('COMMENT_COUNT', { initial: commentCount });
    
    await commentButton.click();
    await page.waitForSelector('[data-testid="comment-section"]');
    E2ETestLogger.checkpoint('COMMENT_SECTION_OPENED');
    
    // ステップ5: 既存コメントを確認
    const existingComments = await page.locator('[data-testid^="comment-"]').count();
    E2ETestLogger.log('EXISTING_COMMENTS', { count: existingComments });
    
    // ステップ6: 新しいコメントを投稿
    const testComment = `E2Eテストコメント - ${new Date().toISOString()}`;
    await page.fill('[data-testid="comment-input"]', testComment);
    
    // 文字数カウンターの確認
    const charCounter = await page.locator('[data-testid="char-counter"]');
    await expect(charCounter).toHaveText(`${testComment.length}/500`);
    
    // 送信ボタンの有効化確認
    const submitButton = await page.locator('[data-testid="submit-comment"]');
    await expect(submitButton).toBeEnabled();
    
    // コメント送信
    await submitButton.click();
    
    // ステップ7: コメントが表示されることを確認
    await page.waitForSelector(`text="${testComment}"`);
    E2ETestLogger.checkpoint('NEW_COMMENT_DISPLAYED');
    
    // コメント数が増加していることを確認
    const newCommentCount = await page.locator('[data-testid^="comment-"]').count();
    expect(newCommentCount).toBe(existingComments + 1);
    
    // ステップ8: 自分のコメントに削除ボタンがあることを確認
    const myComment = await page.locator(`[data-testid^="comment-"]:has-text("${testComment}")`);
    const deleteButton = await myComment.locator('[data-testid="delete-comment"]');
    await expect(deleteButton).toBeVisible();
    
    // ステップ9: コメントを削除
    await deleteButton.click();
    
    // 確認ダイアログが表示される
    await page.waitForSelector('[data-testid="confirm-dialog"]');
    await page.click('[data-testid="confirm-delete"]');
    
    // コメントが削除されることを確認
    await expect(page.locator(`text="${testComment}"`)).toBeHidden({ timeout: 5000 });
    E2ETestLogger.checkpoint('COMMENT_DELETED');
    
    // ステップ10: ページリロード後も変更が維持されることを確認
    await page.reload();
    await page.waitForSelector('[data-testid="comment-section"]');
    
    const finalCommentCount = await page.locator('[data-testid^="comment-"]').count();
    expect(finalCommentCount).toBe(existingComments);
    
    const testDuration = Date.now() - testStartTime;
    E2ETestLogger.metric('FULL_FLOW_COMPLETE', {
      duration: testDuration,
      steps: 10,
      success: true
    });
  });
  
  test('異常系: 認証なしでのアクセス制限', async ({ page, context }) => {
    // ログアウト（クッキークリア）
    await context.clearCookies();
    E2ETestLogger.log('COOKIES_CLEARED');
    
    // 投稿ページへ直接アクセス
    await page.goto(`${TEST_CONFIG.baseURL}/posts/test-post-id`);
    
    // コメントセクションを開く試行
    const commentButton = await page.locator('button:has-text("コメント")');
    await commentButton.click();
    
    // コメント入力欄が無効化されていることを確認
    const commentInput = await page.locator('[data-testid="comment-input"]');
    await expect(commentInput).toBeDisabled();
    
    // ログインを促すメッセージが表示される
    await expect(page.locator('text="ログインが必要です"')).toBeVisible();
    
    E2ETestLogger.checkpoint('UNAUTHENTICATED_ACCESS_BLOCKED');
    await E2ETestLogger.screenshot(page, 'unauthenticated-state');
  });
  
  test('異常系: 長すぎるコメントの投稿制限', async ({ page }) => {
    // 投稿ページへ移動
    await page.goto(`${TEST_CONFIG.baseURL}/posts/test-post-id`);
    
    // コメントセクションを開く
    await page.click('button:has-text("コメント")');
    await page.waitForSelector('[data-testid="comment-section"]');
    
    // 501文字のコメントを入力
    const longComment = 'a'.repeat(501);
    await page.fill('[data-testid="comment-input"]', longComment);
    
    // エラーメッセージが表示される
    await expect(page.locator('text="コメントは500文字以内"')).toBeVisible();
    
    // 送信ボタンが無効化される
    const submitButton = await page.locator('[data-testid="submit-comment"]');
    await expect(submitButton).toBeDisabled();
    
    E2ETestLogger.checkpoint('VALIDATION_ERROR_DISPLAYED');
    await E2ETestLogger.screenshot(page, 'validation-error');
  });
});

// =================================================================
// 包括テスト: パフォーマンス測定
// =================================================================

test.describe('Performance Testing - パフォーマンステスト', () => {
  
  test('パフォーマンス: コメント読み込み速度', async ({ page, context }) => {
    // 認証
    await authenticateUser(page, context);
    
    // パフォーマンス測定開始
    const metrics: any = {};
    
    // ナビゲーション開始時刻
    const navStart = Date.now();
    
    // 投稿ページへ移動
    await page.goto(`${TEST_CONFIG.baseURL}/posts/test-post-id`);
    
    metrics.navigationTime = Date.now() - navStart;
    
    // コメントセクション表示時間測定
    const commentStart = Date.now();
    await page.click('button:has-text("コメント")');
    await page.waitForSelector('[data-testid="comment-section"]');
    
    metrics.commentSectionLoadTime = Date.now() - commentStart;
    
    // コメント一覧表示時間測定
    await page.waitForSelector('[data-testid^="comment-"]');
    metrics.firstCommentRenderTime = Date.now() - commentStart;
    
    // Core Web Vitals取得
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: any = {};
        
        // LCP (Largest Contentful Paint)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // FID (First Input Delay) - シミュレーション
        metrics.fid = performance.now();
        
        // CLS (Cumulative Layout Shift)
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
          metrics.cls = cls;
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(metrics), 1000);
      });
    });
    
    metrics.webVitals = webVitals;
    
    // パフォーマンス基準のチェック
    expect(metrics.navigationTime).toBeLessThan(3000);
    expect(metrics.commentSectionLoadTime).toBeLessThan(1000);
    expect(metrics.firstCommentRenderTime).toBeLessThan(1500);
    
    E2ETestLogger.metric('PERFORMANCE_METRICS', metrics);
    E2ETestLogger.checkpoint('PERFORMANCE_TEST_COMPLETE', {
      passed: true,
      metrics
    });
  });
  
  test('パフォーマンス: 大量コメントの処理', async ({ page, context }) => {
    // 認証
    await authenticateUser(page, context);
    
    // 大量コメントがある投稿へ移動（モック）
    await page.goto(`${TEST_CONFIG.baseURL}/posts/heavy-comments-post`);
    
    const loadStart = Date.now();
    
    // コメントセクションを開く
    await page.click('button:has-text("コメント")');
    
    // 100件のコメントが表示されるまで待機
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid^="comment-"]').length >= 100,
      { timeout: 10000 }
    );
    
    const loadTime = Date.now() - loadStart;
    
    // スクロールパフォーマンステスト
    const scrollStart = Date.now();
    
    await page.evaluate(() => {
      const element = document.querySelector('[data-testid="comment-section"]');
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
    
    const scrollTime = Date.now() - scrollStart;
    
    // メモリ使用量の確認
    const performanceMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    E2ETestLogger.metric('HEAVY_LOAD_PERFORMANCE', {
      commentCount: 100,
      loadTime,
      scrollTime,
      memory: performanceMetrics
    });
    
    // パフォーマンス基準
    expect(loadTime).toBeLessThan(5000);
    expect(scrollTime).toBeLessThan(100);
  });
});

// =================================================================
// 包括テスト: リアルタイム機能
// =================================================================

test.describe('Realtime Features - リアルタイム機能', () => {
  
  test('リアルタイム: 複数ユーザーのコメント同期', async ({ browser }) => {
    // 2つのブラウザコンテキストを作成（2人のユーザー）
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      E2ETestLogger.log('MULTI_USER_TEST_START');
      
      // 両方のユーザーを認証
      await authenticateUser(page1, context1);
      await authenticateUser(page2, context2);
      
      // 同じ投稿ページを開く
      const postUrl = `${TEST_CONFIG.baseURL}/posts/test-post-id`;
      await page1.goto(postUrl);
      await page2.goto(postUrl);
      
      // 両方でコメントセクションを開く
      await page1.click('button:has-text("コメント")');
      await page2.click('button:has-text("コメント")');
      
      await page1.waitForSelector('[data-testid="comment-section"]');
      await page2.waitForSelector('[data-testid="comment-section"]');
      
      E2ETestLogger.checkpoint('BOTH_USERS_READY');
      
      // ユーザー1がコメントを投稿
      const comment1 = `User1 comment - ${Date.now()}`;
      await page1.fill('[data-testid="comment-input"]', comment1);
      await page1.click('[data-testid="submit-comment"]');
      
      // ユーザー1の画面で確認
      await expect(page1.locator(`text="${comment1}"`)).toBeVisible();
      
      // ユーザー2の画面でもリアルタイムで表示される
      await expect(page2.locator(`text="${comment1}"`)).toBeVisible({ timeout: 5000 });
      
      E2ETestLogger.checkpoint('REALTIME_SYNC_SUCCESS', { comment: comment1 });
      
      // ユーザー2がコメントを投稿
      const comment2 = `User2 comment - ${Date.now()}`;
      await page2.fill('[data-testid="comment-input"]', comment2);
      await page2.click('[data-testid="submit-comment"]');
      
      // 両方の画面で確認
      await expect(page2.locator(`text="${comment2}"`)).toBeVisible();
      await expect(page1.locator(`text="${comment2}"`)).toBeVisible({ timeout: 5000 });
      
      // スクリーンショット
      await E2ETestLogger.screenshot(page1, 'user1-final');
      await E2ETestLogger.screenshot(page2, 'user2-final');
      
      E2ETestLogger.checkpoint('MULTI_USER_TEST_COMPLETE');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
  
  test('リアルタイム: 削除の同期', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // 認証と準備
      await authenticateUser(page1, context1);
      await authenticateUser(page2, context2);
      
      const postUrl = `${TEST_CONFIG.baseURL}/posts/test-post-id`;
      await page1.goto(postUrl);
      await page2.goto(postUrl);
      
      await page1.click('button:has-text("コメント")');
      await page2.click('button:has-text("コメント")');
      
      // ユーザー1がコメントを投稿
      const comment = `Delete test - ${Date.now()}`;
      await page1.fill('[data-testid="comment-input"]', comment);
      await page1.click('[data-testid="submit-comment"]');
      
      // 両方で表示確認
      await expect(page1.locator(`text="${comment}"`)).toBeVisible();
      await expect(page2.locator(`text="${comment}"`)).toBeVisible({ timeout: 5000 });
      
      // ユーザー1がコメントを削除
      const myComment = await page1.locator(`[data-testid^="comment-"]:has-text("${comment}")`);
      await myComment.locator('[data-testid="delete-comment"]').click();
      await page1.click('[data-testid="confirm-delete"]');
      
      // 両方の画面から削除される
      await expect(page1.locator(`text="${comment}"`)).toBeHidden({ timeout: 5000 });
      await expect(page2.locator(`text="${comment}"`)).toBeHidden({ timeout: 5000 });
      
      E2ETestLogger.checkpoint('DELETE_SYNC_SUCCESS');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

// =================================================================
// エラーパターンと対処法（E2Eレベル）
// =================================================================

test.describe('Error Handling E2E - エラーハンドリングE2E', () => {
  
  test('対処法: ネットワークエラー時のリトライ', async ({ page, context }) => {
    await authenticateUser(page, context);
    
    // ネットワークエラーをシミュレート
    await context.route('**/api/posts/*/comments', route => {
      // 最初の2回は失敗
      if (!global.retryCount) global.retryCount = 0;
      global.retryCount++;
      
      if (global.retryCount <= 2) {
        E2ETestLogger.log('SIMULATING_NETWORK_ERROR', { level: 'warning', attempt: global.retryCount });
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    await page.goto(`${TEST_CONFIG.baseURL}/posts/test-post-id`);
    await page.click('button:has-text("コメント")');
    
    // リトライメッセージが表示される
    await expect(page.locator('text="接続中..."')).toBeVisible();
    
    // 最終的に成功する
    await expect(page.locator('[data-testid="comment-section"]')).toBeVisible({ 
      timeout: 15000 
    });
    
    E2ETestLogger.checkpoint('RETRY_SUCCESS', { attempts: global.retryCount });
  });
  
  test('対処法: セッション期限切れの自動更新', async ({ page, context }) => {
    await authenticateUser(page, context);
    
    // セッション期限切れをシミュレート
    await page.goto(`${TEST_CONFIG.baseURL}/posts/test-post-id`);
    
    // クッキーを削除してセッション無効化
    await context.clearCookies();
    E2ETestLogger.log('SESSION_INVALIDATED');
    
    // コメント投稿を試行
    await page.click('button:has-text("コメント")');
    await page.fill('[data-testid="comment-input"]', 'Test comment');
    await page.click('[data-testid="submit-comment"]');
    
    // 自動的に再認証画面へリダイレクト
    await page.waitForURL('**/auth/signin');
    E2ETestLogger.checkpoint('REDIRECTED_TO_LOGIN');
    
    // 再認証
    await page.fill('input[name="email"]', TEST_CONFIG.credentials.email);
    await page.fill('input[name="password"]', TEST_CONFIG.credentials.password);
    await page.click('button[type="submit"]');
    
    // 元のページへ戻る
    await page.waitForURL(`**/posts/test-post-id`);
    E2ETestLogger.checkpoint('SESSION_RESTORED');
  });
  
  test('対処法: 同時編集の競合解決', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // 両ユーザー認証
      await authenticateUser(page1, context1);
      await authenticateUser(page2, context2);
      
      // 同じコメントを編集
      const postUrl = `${TEST_CONFIG.baseURL}/posts/test-post-id`;
      await page1.goto(postUrl);
      await page2.goto(postUrl);
      
      // コメントセクションを開く
      await page1.click('button:has-text("コメント")');
      await page2.click('button:has-text("コメント")');
      
      // 既存のコメントを見つける
      const commentSelector = '[data-testid="comment-editable"]';
      await page1.waitForSelector(commentSelector);
      await page2.waitForSelector(commentSelector);
      
      // 両方で編集開始
      await page1.click(`${commentSelector} [data-testid="edit-button"]`);
      await page2.click(`${commentSelector} [data-testid="edit-button"]`);
      
      // ユーザー1が先に保存
      await page1.fill('[data-testid="edit-input"]', 'Edited by User 1');
      await page1.click('[data-testid="save-edit"]');
      
      // ユーザー2が保存試行
      await page2.fill('[data-testid="edit-input"]', 'Edited by User 2');
      await page2.click('[data-testid="save-edit"]');
      
      // 競合エラーメッセージ
      await expect(page2.locator('text="他のユーザーが編集しました"')).toBeVisible();
      
      // 最新版を取得するオプション
      await page2.click('[data-testid="refresh-content"]');
      
      // ユーザー1の編集が表示される
      await expect(page2.locator('text="Edited by User 1"')).toBeVisible();
      
      E2ETestLogger.checkpoint('CONFLICT_RESOLVED');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

// =================================================================
// テスト完了レポート
// =================================================================

test.afterAll(async () => {
  const report = E2ETestLogger.exportReport();
  
  // レポートをファイルに保存
  const reportPath = path.join('./test-results', `e2e-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, report);
  
  console.log('=====================================');
  console.log('E2Eテスト実行完了');
  console.log('=====================================');
  console.log(`レポート保存先: ${reportPath}`);
  console.log('=====================================');
  
  // サマリー表示
  const reportData = JSON.parse(report);
  console.log('テストサマリー:');
  console.log(JSON.stringify(reportData.summary, null, 2));
});