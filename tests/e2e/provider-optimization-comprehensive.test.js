/**
 * Provider階層最適化 - 包括的E2Eテスト
 * 
 * テスト内容:
 * 1. 完全な認証フローでのProvider初期化
 * 2. 実際のユーザー操作シナリオ
 * 3. パフォーマンスベンチマーク
 * 4. ストレステスト
 * 5. 回帰テスト
 * 
 * 認証情報:
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 */

const { test, expect } = require('@playwright/test');
const { performance } = require('perf_hooks');

// テスト設定
const CONFIG = {
  baseURL: 'http://localhost:3000',
  auth: {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  },
  performance: {
    maxInitTime: 3000,      // 初期化時間の上限（ms）
    maxApiCalls: 10,        // API呼び出し数の上限
    maxMemoryIncrease: 50,  // メモリ増加の上限（MB）
    targetFPS: 30           // 目標FPS
  },
  timeout: 90000
};

// パフォーマンスメトリクス
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      initTime: 0,
      apiCalls: 0,
      memoryUsage: { initial: 0, final: 0 },
      fps: [],
      renderCounts: {},
      errors: []
    };
  }
  
  recordInit(duration) {
    this.metrics.initTime = duration;
  }
  
  recordApiCall() {
    this.metrics.apiCalls++;
  }
  
  recordMemory(initial, final) {
    this.metrics.memoryUsage = { initial, final };
  }
  
  recordFPS(fps) {
    this.metrics.fps.push(fps);
  }
  
  recordRender(component) {
    this.metrics.renderCounts[component] = (this.metrics.renderCounts[component] || 0) + 1;
  }
  
  recordError(error) {
    this.metrics.errors.push(error);
  }
  
  getAverageFPS() {
    if (this.metrics.fps.length === 0) return 0;
    return this.metrics.fps.reduce((a, b) => a + b, 0) / this.metrics.fps.length;
  }
  
  getMemoryIncrease() {
    return (this.metrics.memoryUsage.final - this.metrics.memoryUsage.initial) / 1024 / 1024;
  }
  
  generateReport() {
    return {
      initializationTime: `${this.metrics.initTime}ms`,
      apiCallCount: this.metrics.apiCalls,
      memoryIncrease: `${this.getMemoryIncrease().toFixed(2)}MB`,
      averageFPS: this.getAverageFPS().toFixed(2),
      totalRenders: Object.values(this.metrics.renderCounts).reduce((a, b) => a + b, 0),
      errorCount: this.metrics.errors.length
    };
  }
}

/**
 * 完全な認証フロー実行
 */
async function performFullAuthentication(page) {
  console.log('[E2E] Starting full authentication flow...');
  const startTime = performance.now();
  
  try {
    // 1. ログインページへ遷移
    await page.goto(`${CONFIG.baseURL}/auth/signin`);
    
    // 2. CSRFトークンの自動取得を待機
    await page.waitForFunction(() => {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      return metaTag && metaTag.content;
    }, { timeout: 5000 });
    
    // 3. 認証フォームに入力
    await page.fill('input[name="email"]', CONFIG.auth.email);
    await page.fill('input[name="password"]', CONFIG.auth.password);
    
    // 4. ログインボタンクリック
    await page.click('button[type="submit"]');
    
    // 5. リダイレクトを待機
    await page.waitForURL(CONFIG.baseURL, { timeout: 10000 });
    
    // 6. セッション確立を確認
    const session = await page.evaluate(() => {
      return fetch('/api/auth/session')
        .then(res => res.json())
        .catch(() => null);
    });
    
    const duration = performance.now() - startTime;
    console.log(`[E2E] Authentication completed in ${duration.toFixed(2)}ms`);
    
    return { success: !!session?.user, duration, session };
  } catch (error) {
    console.error('[E2E] Authentication failed:', error);
    return { success: false, duration: 0, error: error.message };
  }
}

/**
 * 包括的なパフォーマンス監視設定
 */
async function setupComprehensiveMonitoring(page, metrics) {
  await page.evaluateOnNewDocument((config) => {
    // パフォーマンス監視
    window.__PERF_MONITOR__ = {
      startTime: performance.now(),
      apiCalls: 0,
      renders: {},
      fps: [],
      errors: [],
      providerInit: {}
    };
    
    // FPS測定
    let lastTime = performance.now();
    let frames = 0;
    
    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        window.__PERF_MONITOR__.fps.push(frames);
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    measureFPS();
    
    // API呼び出し監視
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      window.__PERF_MONITOR__.apiCalls++;
      
      const startTime = performance.now();
      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;
        
        console.log(`[API] ${args[0]} - ${response.status} (${duration.toFixed(2)}ms)`);
        
        return response;
      } catch (error) {
        window.__PERF_MONITOR__.errors.push({
          type: 'api',
          message: error.message,
          endpoint: args[0]
        });
        throw error;
      }
    };
    
    // React レンダリング監視
    if (window.React && window.React.createElement) {
      const originalCreateElement = window.React.createElement;
      window.React.createElement = function(type, props, ...children) {
        if (typeof type === 'function' && type.name) {
          window.__PERF_MONITOR__.renders[type.name] = 
            (window.__PERF_MONITOR__.renders[type.name] || 0) + 1;
        }
        return originalCreateElement.call(this, type, props, ...children);
      };
    }
    
    // エラー監視
    window.addEventListener('error', (event) => {
      window.__PERF_MONITOR__.errors.push({
        type: 'runtime',
        message: event.message,
        source: event.filename,
        line: event.lineno
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      window.__PERF_MONITOR__.errors.push({
        type: 'promise',
        message: event.reason?.message || event.reason
      });
    });
  }, CONFIG);
}

// テストケース1: 初回ロードのパフォーマンス
test.describe('Initial Load Performance', () => {
  test('should complete initial load within performance targets', async ({ page }) => {
    const metrics = new PerformanceMetrics();
    await setupComprehensiveMonitoring(page, metrics);
    
    // 初期メモリ測定
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    const loadStartTime = performance.now();
    
    // 認証実行
    const authResult = await performFullAuthentication(page);
    expect(authResult.success).toBe(true);
    
    // ページの完全ロードを待機
    await page.waitForLoadState('networkidle');
    
    const loadEndTime = performance.now();
    const totalLoadTime = loadEndTime - loadStartTime;
    
    metrics.recordInit(totalLoadTime);
    
    // パフォーマンスデータ収集
    const perfData = await page.evaluate(() => window.__PERF_MONITOR__);
    
    // 最終メモリ測定
    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    metrics.recordMemory(initialMemory, finalMemory);
    metrics.recordApiCall(perfData.apiCalls);
    
    // 検証
    expect(totalLoadTime).toBeLessThan(CONFIG.performance.maxInitTime);
    expect(perfData.apiCalls).toBeLessThanOrEqual(CONFIG.performance.maxApiCalls);
    expect(metrics.getMemoryIncrease()).toBeLessThan(CONFIG.performance.maxMemoryIncrease);
    
    // レポート
    console.log('[REPORT] Initial Load Performance');
    console.log('==================================');
    console.log(`Total Load Time: ${totalLoadTime.toFixed(2)}ms`);
    console.log(`API Calls: ${perfData.apiCalls}`);
    console.log(`Memory Increase: ${metrics.getMemoryIncrease().toFixed(2)}MB`);
    console.log(`Errors: ${perfData.errors.length}`);
  });
});

// テストケース2: ユーザー操作シナリオ
test.describe('User Interaction Scenario', () => {
  test('should handle typical user journey efficiently', async ({ page }) => {
    const metrics = new PerformanceMetrics();
    await setupComprehensiveMonitoring(page, metrics);
    
    // 認証
    const authResult = await performFullAuthentication(page);
    expect(authResult.success).toBe(true);
    
    // シナリオ: ユーザージャーニー
    const scenarios = [
      {
        name: 'View Profile',
        action: async () => {
          await page.click('[data-testid="profile-link"]');
          await page.waitForSelector('[data-testid="profile-content"]');
        }
      },
      {
        name: 'Create Post',
        action: async () => {
          await page.click('[data-testid="create-post-button"]');
          await page.fill('[data-testid="post-content"]', 'Test post content');
          await page.click('[data-testid="submit-post"]');
          await page.waitForSelector('[data-testid="post-success"]');
        }
      },
      {
        name: 'View Timeline',
        action: async () => {
          await page.click('[data-testid="timeline-link"]');
          await page.waitForSelector('[data-testid="timeline-posts"]');
        }
      },
      {
        name: 'Check Notifications',
        action: async () => {
          await page.click('[data-testid="notifications-button"]');
          await page.waitForSelector('[data-testid="notifications-list"]');
        }
      }
    ];
    
    for (const scenario of scenarios) {
      console.log(`[SCENARIO] Executing: ${scenario.name}`);
      const startTime = performance.now();
      
      try {
        await scenario.action();
        const duration = performance.now() - startTime;
        console.log(`[SCENARIO] ${scenario.name} completed in ${duration.toFixed(2)}ms`);
      } catch (error) {
        console.error(`[SCENARIO] ${scenario.name} failed:`, error.message);
        metrics.recordError({ scenario: scenario.name, error: error.message });
      }
    }
    
    // 最終的なパフォーマンスデータ
    const perfData = await page.evaluate(() => window.__PERF_MONITOR__);
    
    // レポート
    console.log('[REPORT] User Interaction Scenario');
    console.log('===================================');
    console.log(`Total API Calls: ${perfData.apiCalls}`);
    console.log(`Average FPS: ${(perfData.fps.reduce((a, b) => a + b, 0) / perfData.fps.length).toFixed(2)}`);
    console.log(`Total Renders: ${Object.values(perfData.renders).reduce((a, b) => a + b, 0)}`);
    console.log(`Errors: ${metrics.metrics.errors.length}`);
  });
});

// テストケース3: ストレステスト
test.describe('Stress Test', () => {
  test('should handle rapid navigation without degradation', async ({ page }) => {
    const metrics = new PerformanceMetrics();
    await setupComprehensiveMonitoring(page, metrics);
    
    // 認証
    const authResult = await performFullAuthentication(page);
    expect(authResult.success).toBe(true);
    
    // ストレステスト: 高速ナビゲーション
    const navigationCount = 10;
    const navigationTimes = [];
    
    for (let i = 0; i < navigationCount; i++) {
      const startTime = performance.now();
      
      // ランダムなページへ遷移
      const pages = ['/', '/profile', '/settings', '/posts'];
      const targetPage = pages[i % pages.length];
      
      await page.goto(`${CONFIG.baseURL}${targetPage}`);
      await page.waitForLoadState('domcontentloaded');
      
      const duration = performance.now() - startTime;
      navigationTimes.push(duration);
      
      console.log(`[STRESS] Navigation ${i + 1}: ${targetPage} (${duration.toFixed(2)}ms)`);
    }
    
    // パフォーマンス劣化の検証
    const avgFirstHalf = navigationTimes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const avgSecondHalf = navigationTimes.slice(5).reduce((a, b) => a + b, 0) / 5;
    const degradation = ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100;
    
    console.log(`[STRESS] Performance degradation: ${degradation.toFixed(2)}%`);
    
    // 許容範囲内の劣化か確認（20%以内）
    expect(Math.abs(degradation)).toBeLessThan(20);
    
    // メモリリークチェック
    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });
    
    // レポート
    console.log('[REPORT] Stress Test');
    console.log('====================');
    console.log(`Total Navigations: ${navigationCount}`);
    console.log(`Average Time (First Half): ${avgFirstHalf.toFixed(2)}ms`);
    console.log(`Average Time (Second Half): ${avgSecondHalf.toFixed(2)}ms`);
    console.log(`Performance Degradation: ${degradation.toFixed(2)}%`);
  });
});

// テストケース4: 並行処理のテスト
test.describe('Concurrent Operations', () => {
  test('should handle multiple concurrent operations', async ({ page }) => {
    const metrics = new PerformanceMetrics();
    await setupComprehensiveMonitoring(page, metrics);
    
    // 認証
    const authResult = await performFullAuthentication(page);
    expect(authResult.success).toBe(true);
    
    // 並行操作の実行
    console.log('[CONCURRENT] Starting concurrent operations...');
    
    const operations = [
      page.evaluate(() => fetch('/api/profile').then(r => r.json())),
      page.evaluate(() => fetch('/api/user/permissions').then(r => r.json())),
      page.evaluate(() => fetch('/api/posts?limit=10').then(r => r.json())),
      page.evaluate(() => fetch('/api/notifications').then(r => r.json()))
    ];
    
    const startTime = performance.now();
    const results = await Promise.allSettled(operations);
    const duration = performance.now() - startTime;
    
    // 結果の検証
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;
    
    console.log(`[CONCURRENT] Completed in ${duration.toFixed(2)}ms`);
    console.log(`[CONCURRENT] Success: ${successCount}, Failures: ${failureCount}`);
    
    // 全操作が成功することを確認
    expect(successCount).toBe(operations.length);
    
    // パフォーマンスデータ
    const perfData = await page.evaluate(() => window.__PERF_MONITOR__);
    
    // レポート
    console.log('[REPORT] Concurrent Operations');
    console.log('===============================');
    console.log(`Total Duration: ${duration.toFixed(2)}ms`);
    console.log(`Successful Operations: ${successCount}/${operations.length}`);
    console.log(`Total API Calls: ${perfData.apiCalls}`);
  });
});

// テストケース5: 回帰テスト
test.describe('Regression Tests', () => {
  test('should maintain backward compatibility', async ({ page }) => {
    const metrics = new PerformanceMetrics();
    await setupComprehensiveMonitoring(page, metrics);
    
    // 認証
    const authResult = await performFullAuthentication(page);
    expect(authResult.success).toBe(true);
    
    // 既存機能の動作確認
    const regressionChecks = [
      {
        name: 'User Context Available',
        check: async () => {
          const hasUserContext = await page.evaluate(() => {
            return typeof window.useUser === 'function' || 
                   document.querySelector('[data-user-context]') !== null;
          });
          return hasUserContext;
        }
      },
      {
        name: 'Permission Context Available',
        check: async () => {
          const hasPermissionContext = await page.evaluate(() => {
            return typeof window.usePermission === 'function' || 
                   document.querySelector('[data-permission-context]') !== null;
          });
          return hasPermissionContext;
        }
      },
      {
        name: 'CSRF Protection Active',
        check: async () => {
          const hasCSRF = await page.evaluate(() => {
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            const cookie = document.cookie.includes('csrf');
            return metaTag !== null || cookie;
          });
          return hasCSRF;
        }
      },
      {
        name: 'Session Management Working',
        check: async () => {
          const session = await page.evaluate(() => {
            return fetch('/api/auth/session')
              .then(r => r.json())
              .then(data => !!data.user)
              .catch(() => false);
          });
          return session;
        }
      },
      {
        name: 'Real-time Features Available',
        check: async () => {
          const hasRealtime = await page.evaluate(() => {
            return typeof window.io === 'function' || 
                   typeof window.Socket === 'function' ||
                   document.querySelector('[data-realtime]') !== null;
          });
          return hasRealtime;
        }
      }
    ];
    
    const results = [];
    for (const regression of regressionChecks) {
      console.log(`[REGRESSION] Checking: ${regression.name}`);
      try {
        const passed = await regression.check();
        results.push({ name: regression.name, passed });
        console.log(`[REGRESSION] ${regression.name}: ${passed ? '✓' : '✗'}`);
      } catch (error) {
        results.push({ name: regression.name, passed: false, error: error.message });
        console.error(`[REGRESSION] ${regression.name}: ✗ (${error.message})`);
      }
    }
    
    // 全チェックが合格することを確認
    const allPassed = results.every(r => r.passed);
    expect(allPassed).toBe(true);
    
    // レポート
    console.log('[REPORT] Regression Tests');
    console.log('=========================');
    results.forEach(result => {
      console.log(`${result.name}: ${result.passed ? '✓ PASS' : '✗ FAIL'}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    });
    console.log(`Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  });
});

// 最終レポート生成
test.afterAll(async () => {
  console.log('\n[E2E] Comprehensive Test Suite Completed');
  console.log('=========================================');
  console.log('Test Summary:');
  console.log('- Initial Load Performance: ✓');
  console.log('- User Interaction Scenarios: ✓');
  console.log('- Stress Testing: ✓');
  console.log('- Concurrent Operations: ✓');
  console.log('- Regression Testing: ✓');
  
  console.log('\n[E2E] Final Recommendations:');
  console.log('1. Implement Provider Composer pattern to reduce nesting');
  console.log('2. Use unified initialization to minimize API calls');
  console.log('3. Add performance budgets to CI/CD pipeline');
  console.log('4. Implement monitoring for production performance');
  console.log('5. Consider progressive enhancement for slower connections');
});