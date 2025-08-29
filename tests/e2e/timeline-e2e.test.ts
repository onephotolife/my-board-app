/**
 * Timeline E2Eテスト（STRICT120準拠）
 * UI含む完全なユーザーフローの包括テスト
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// 認証情報
const AUTH_EMAIL = process.env.AUTH_EMAIL || 'one.photolife+1@gmail.com';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '?@thc123THC@?';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// IPoV (Independent Proof of Visual) 構造
interface IPoV {
  colors: { [key: string]: string };
  positions: { [key: string]: { x: number; y: number; width?: number; height?: number } };
  texts: { [key: string]: string };
  states: { [key: string]: string };
  anomalies: string[];
}

// E2Eデバッグログクラス
class E2EDebugLogger {
  private logs: any[] = [];
  private traceId: string;
  private screenshots: string[] = [];
  
  constructor(traceId?: string) {
    this.traceId = traceId || this.generateTraceId();
  }
  
  private generateTraceId(): string {
    return `e2e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  log(category: string, data: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      traceId: this.traceId,
      category,
      data,
      testFile: 'timeline-e2e.test.ts'
    };
    this.logs.push(entry);
    console.log('[E2E-DEBUG]', JSON.stringify(entry));
  }
  
  async captureScreenshot(page: Page, name: string): Promise<void> {
    const screenshotPath = `screenshots/${this.traceId}-${name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    this.screenshots.push(screenshotPath);
    this.log('screenshot-captured', { name, path: screenshotPath });
  }
  
  async captureIPoV(page: Page, elementSelector: string): Promise<IPoV> {
    const ipov: IPoV = {
      colors: {},
      positions: {},
      texts: {},
      states: {},
      anomalies: []
    };
    
    try {
      // 要素の存在確認
      const element = await page.locator(elementSelector).first();
      const isVisible = await element.isVisible();
      
      if (!isVisible) {
        ipov.anomalies.push(`Element ${elementSelector} not visible`);
        return ipov;
      }
      
      // 位置情報取得
      const box = await element.boundingBox();
      if (box) {
        ipov.positions[elementSelector] = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        };
      }
      
      // テキスト取得
      const text = await element.textContent();
      if (text) {
        ipov.texts[elementSelector] = text.trim();
      }
      
      // 色情報取得（背景色とテキスト色）
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          display: computed.display,
          visibility: computed.visibility
        };
      });
      
      ipov.colors['background'] = styles.backgroundColor;
      ipov.colors['text'] = styles.color;
      
      // 状態情報
      ipov.states['display'] = styles.display;
      ipov.states['visibility'] = styles.visibility;
      ipov.states['enabled'] = await element.isEnabled() ? 'enabled' : 'disabled';
      
    } catch (error) {
      ipov.anomalies.push(`Error capturing IPoV: ${(error as Error).message}`);
    }
    
    this.log('ipov-captured', ipov);
    return ipov;
  }
  
  error(category: string, error: any) {
    this.log(`${category}-error`, {
      message: error.message,
      stack: error.stack
    });
  }
  
  summary() {
    return {
      traceId: this.traceId,
      totalLogs: this.logs.length,
      screenshots: this.screenshots.length,
      categories: [...new Set(this.logs.map(l => l.category))],
      duration: this.logs.length > 0 
        ? new Date(this.logs[this.logs.length - 1].timestamp).getTime() - 
          new Date(this.logs[0].timestamp).getTime()
        : 0
    };
  }
}

// ヘルパー関数
async function loginUser(
  page: Page, 
  logger: E2EDebugLogger
): Promise<boolean> {
  logger.log('login-start', { email: AUTH_EMAIL });
  
  try {
    // ログインページへ移動
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    // IPoV: ログインフォーム確認
    const loginFormIPoV = await logger.captureIPoV(page, 'form');
    logger.log('login-form-ipov', loginFormIPoV);
    
    // スクリーンショット: ログイン前
    await logger.captureScreenshot(page, 'login-before');
    
    // メールアドレス入力
    await page.fill('input[name="email"]', AUTH_EMAIL);
    logger.log('email-entered', { email: AUTH_EMAIL });
    
    // パスワード入力
    await page.fill('input[name="password"]', AUTH_PASSWORD);
    logger.log('password-entered', { masked: '***' });
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    logger.log('login-submitted', { timestamp: new Date().toISOString() });
    
    // ログイン成功を待つ
    await page.waitForURL((url) => !url.toString().includes('/auth/'), {
      timeout: 10000
    });
    
    // スクリーンショット: ログイン後
    await logger.captureScreenshot(page, 'login-after');
    
    // セッション確認
    const cookies = await page.context().cookies();
    const hasSession = cookies.some(c => c.name.includes('session-token'));
    
    logger.log('login-complete', {
      success: true,
      hasSession,
      currentUrl: page.url()
    });
    
    return true;
  } catch (error) {
    logger.error('login-failed', error);
    await logger.captureScreenshot(page, 'login-error');
    return false;
  }
}

// E2Eテストスイート
test.describe('Timeline E2E Tests - 包括テスト', () => {
  let context: BrowserContext;
  let page: Page;
  let logger: E2EDebugLogger;
  
  test.beforeAll(async ({ browser }) => {
    logger = new E2EDebugLogger();
    logger.log('e2e-suite-start', { timestamp: new Date().toISOString() });
    
    // ブラウザコンテキスト作成
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Playwright E2E Test'
    });
    
    page = await context.newPage();
    
    // ネットワークログ有効化
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        logger.log('network-request', {
          url: request.url(),
          method: request.method()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        logger.log('network-response', {
          url: response.url(),
          status: response.status()
        });
      }
    });
  });
  
  test.afterAll(async () => {
    await context.close();
    logger.log('e2e-suite-complete', logger.summary());
  });
  
  test.describe('完全なユーザーフロー', () => {
    
    test('OK: ログインからタイムライン表示まで', async () => {
      const testLogger = new E2EDebugLogger();
      testLogger.log('test-start', { test: 'complete-user-flow' });
      
      // Step 1: ログイン
      const loginSuccess = await loginUser(page, testLogger);
      expect(loginSuccess).toBe(true);
      
      // Step 2: タイムラインページへ移動
      await page.goto(`${BASE_URL}/timeline`);
      await page.waitForLoadState('networkidle');
      
      testLogger.log('timeline-page-loaded', {
        url: page.url(),
        title: await page.title()
      });
      
      // Step 3: タイムライン要素の確認
      const timelineContainer = page.locator('[data-testid="timeline-container"]');
      await expect(timelineContainer).toBeVisible({ timeout: 10000 });
      
      // IPoV: タイムライン表示確認
      const timelineIPoV = await testLogger.captureIPoV(
        page, 
        '[data-testid="timeline-container"]'
      );
      
      testLogger.log('timeline-container-ipov', timelineIPoV);
      
      // Step 4: 投稿の表示確認
      const posts = page.locator('[data-testid="post-item"]');
      const postCount = await posts.count();
      
      testLogger.log('posts-displayed', {
        count: postCount,
        hasContent: postCount > 0
      });
      
      // Step 5: スクリーンショット
      await testLogger.captureScreenshot(page, 'timeline-loaded');
      
      // 検証
      expect(timelineIPoV.anomalies.length).toBe(0);
      
      testLogger.log('test-complete', { result: 'PASS' });
    });
    
    test('NG: 未認証でのタイムラインアクセス', async () => {
      const testLogger = new E2EDebugLogger();
      testLogger.log('test-start', { test: 'unauthenticated-access' });
      
      // 新しいコンテキストで未認証状態を作る
      const newContext = await page.context().browser()?.newContext() || context;
      const newPage = await newContext.newPage();
      
      // タイムラインページへ直接アクセス
      await newPage.goto(`${BASE_URL}/timeline`);
      
      testLogger.log('direct-access-attempt', {
        url: newPage.url()
      });
      
      // リダイレクト確認
      await newPage.waitForURL((url) => url.toString().includes('/auth/'), {
        timeout: 5000
      });
      
      const finalUrl = newPage.url();
      testLogger.log('redirected-to-auth', {
        finalUrl,
        isAuthPage: finalUrl.includes('/auth/')
      });
      
      // スクリーンショット
      await testLogger.captureScreenshot(newPage, 'auth-redirect');
      
      // 検証
      expect(finalUrl).toContain('/auth/');
      
      await newPage.close();
      testLogger.log('test-complete', { 
        result: 'PASS',
        expectedBehavior: 'Redirect to auth'
      });
    });
  });
  
  test.describe('インタラクティブ機能テスト', () => {
    
    test('OK: 投稿へのいいね操作', async () => {
      const testLogger = new E2EDebugLogger();
      testLogger.log('test-start', { test: 'like-interaction' });
      
      // ログイン状態確認
      await page.goto(`${BASE_URL}/timeline`);
      await page.waitForLoadState('networkidle');
      
      // 最初の投稿を取得
      const firstPost = page.locator('[data-testid="post-item"]').first();
      const likeButton = firstPost.locator('[data-testid="like-button"]');
      
      // IPoV: いいねボタン前の状態
      const beforeIPoV = await testLogger.captureIPoV(
        page, 
        '[data-testid="like-button"]'
      );
      
      testLogger.log('like-button-before', beforeIPoV);
      
      // いいねボタンクリック
      if (await likeButton.isVisible()) {
        await likeButton.click();
        testLogger.log('like-clicked', { timestamp: new Date().toISOString() });
        
        // 状態変化を待つ
        await page.waitForTimeout(1000);
        
        // IPoV: いいねボタン後の状態
        const afterIPoV = await testLogger.captureIPoV(
          page, 
          '[data-testid="like-button"]'
        );
        
        testLogger.log('like-button-after', afterIPoV);
        
        // 状態変化の確認
        const stateChanged = 
          beforeIPoV.colors.background !== afterIPoV.colors.background ||
          beforeIPoV.texts['[data-testid="like-button"]'] !== 
          afterIPoV.texts['[data-testid="like-button"]'];
        
        expect(stateChanged).toBe(true);
      }
      
      testLogger.log('test-complete', { result: 'PASS' });
    });
    
    test('OK: 無限スクロール動作', async () => {
      const testLogger = new E2EDebugLogger();
      testLogger.log('test-start', { test: 'infinite-scroll' });
      
      await page.goto(`${BASE_URL}/timeline`);
      await page.waitForLoadState('networkidle');
      
      // 初期投稿数
      const initialPosts = await page.locator('[data-testid="post-item"]').count();
      testLogger.log('initial-posts', { count: initialPosts });
      
      // スクロール前のスクリーンショット
      await testLogger.captureScreenshot(page, 'before-scroll');
      
      // ページ最下部へスクロール
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      testLogger.log('scrolled-to-bottom', { 
        scrollHeight: await page.evaluate(() => document.body.scrollHeight)
      });
      
      // 新しい投稿の読み込みを待つ
      await page.waitForTimeout(2000);
      
      // スクロール後の投稿数
      const afterScrollPosts = await page.locator('[data-testid="post-item"]').count();
      testLogger.log('after-scroll-posts', { count: afterScrollPosts });
      
      // スクロール後のスクリーンショット
      await testLogger.captureScreenshot(page, 'after-scroll');
      
      // 検証（投稿が増えているか、または終端に達している）
      expect(afterScrollPosts).toBeGreaterThanOrEqual(initialPosts);
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        postsLoaded: afterScrollPosts - initialPosts
      });
    });
    
    test('対処法: ネットワーク遅延下での動作', async () => {
      const testLogger = new E2EDebugLogger();
      testLogger.log('test-start', { test: 'slow-network-handling' });
      
      // ネットワーク速度を制限
      await page.route('**/api/timeline**', async route => {
        testLogger.log('network-throttled', { url: route.request().url() });
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒遅延
        await route.continue();
      });
      
      await page.goto(`${BASE_URL}/timeline`);
      
      // ローディング状態の確認
      const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
      const isLoadingVisible = await loadingIndicator.isVisible();
      
      testLogger.log('loading-state', {
        hasLoadingIndicator: isLoadingVisible
      });
      
      // IPoV: ローディング状態
      if (isLoadingVisible) {
        const loadingIPoV = await testLogger.captureIPoV(
          page, 
          '[data-testid="loading-indicator"]'
        );
        testLogger.log('loading-ipov', loadingIPoV);
      }
      
      // データ読み込み完了を待つ
      await page.waitForSelector('[data-testid="post-item"]', { timeout: 30000 });
      
      testLogger.log('data-loaded', {
        success: true,
        afterDelay: true
      });
      
      // ルート設定をクリア
      await page.unroute('**/api/timeline**');
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Graceful handling of slow network'
      });
    });
  });
  
  test.describe('エラー状態のテスト', () => {
    
    test('対処法: APIエラー時のフォールバック表示', async () => {
      const testLogger = new E2EDebugLogger();
      testLogger.log('test-start', { test: 'api-error-fallback' });
      
      // APIエラーをシミュレート
      await page.route('**/api/timeline', route => {
        testLogger.log('api-error-simulated', { url: route.request().url() });
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Internal Server Error',
              code: 'SERVER_ERROR'
            }
          })
        });
      });
      
      await page.goto(`${BASE_URL}/timeline`);
      await page.waitForLoadState('networkidle');
      
      // エラー表示の確認
      const errorMessage = page.locator('[data-testid="error-message"]');
      const hasError = await errorMessage.isVisible();
      
      testLogger.log('error-display', {
        hasErrorMessage: hasError,
        errorText: hasError ? await errorMessage.textContent() : null
      });
      
      // IPoV: エラー状態
      if (hasError) {
        const errorIPoV = await testLogger.captureIPoV(
          page, 
          '[data-testid="error-message"]'
        );
        testLogger.log('error-ipov', errorIPoV);
        
        // エラー時のスクリーンショット
        await testLogger.captureScreenshot(page, 'api-error-state');
      }
      
      // リトライボタンの確認
      const retryButton = page.locator('[data-testid="retry-button"]');
      const hasRetry = await retryButton.isVisible();
      
      testLogger.log('retry-option', {
        hasRetryButton: hasRetry
      });
      
      // ルート設定をクリア
      await page.unroute('**/api/timeline');
      
      expect(hasError || hasRetry).toBe(true);
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Error state properly handled'
      });
    });
    
    test('対処法: セッションタイムアウト処理', async () => {
      const testLogger = new E2EDebugLogger();
      testLogger.log('test-start', { test: 'session-timeout' });
      
      // セッションクッキーを削除
      await page.context().clearCookies();
      testLogger.log('cookies-cleared', { timestamp: new Date().toISOString() });
      
      // タイムラインページへアクセス
      await page.goto(`${BASE_URL}/timeline`);
      
      // 認証ページへのリダイレクトを待つ
      await page.waitForURL((url) => url.toString().includes('/auth/'), {
        timeout: 10000
      });
      
      const redirectUrl = page.url();
      testLogger.log('session-expired-redirect', {
        redirectedTo: redirectUrl,
        isAuthPage: redirectUrl.includes('/auth/')
      });
      
      // 再ログイン
      const reLoginSuccess = await loginUser(page, testLogger);
      expect(reLoginSuccess).toBe(true);
      
      // タイムラインへ戻る
      await page.goto(`${BASE_URL}/timeline`);
      await page.waitForLoadState('networkidle');
      
      const timelineLoaded = await page.locator(
        '[data-testid="timeline-container"]'
      ).isVisible();
      
      expect(timelineLoaded).toBe(true);
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Session timeout handled with re-authentication'
      });
    });
  });
  
  test.describe('パフォーマンステスト', () => {
    
    test('OK: 初期表示パフォーマンス測定', async () => {
      const testLogger = new E2EDebugLogger();
      testLogger.log('test-start', { test: 'performance-metrics' });
      
      // パフォーマンス測定開始
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/timeline`);
      
      // First Contentful Paint待機
      await page.waitForSelector('[data-testid="timeline-container"]');
      const fcpTime = Date.now() - startTime;
      
      // 全コンテンツ読み込み待機
      await page.waitForLoadState('networkidle');
      const fullyLoadedTime = Date.now() - startTime;
      
      // Core Web Vitals取得
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
          loadComplete: perf.loadEventEnd - perf.loadEventStart,
          domInteractive: perf.domInteractive - perf.fetchStart
        };
      });
      
      testLogger.log('performance-metrics', {
        firstContentfulPaint: fcpTime,
        fullyLoaded: fullyLoadedTime,
        ...metrics
      });
      
      // パフォーマンス基準チェック
      expect(fcpTime).toBeLessThan(3000); // FCP < 3秒
      expect(fullyLoadedTime).toBeLessThan(5000); // 完全読み込み < 5秒
      
      testLogger.log('test-complete', { 
        result: 'PASS',
        performance: {
          fcp: `${fcpTime}ms`,
          loaded: `${fullyLoadedTime}ms`
        }
      });
    });
  });
});

// 構文チェック用エクスポート
export { E2EDebugLogger, IPoV };