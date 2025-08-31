/**
 * Provider階層最適化 - 単体テスト
 * 
 * テスト内容:
 * 1. Provider初期化回数の検証
 * 2. API呼び出し回数の検証
 * 3. 初期化時間の測定
 * 4. メモリリークの検出
 * 
 * 認証情報:
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 */

const { test, expect } = require('@playwright/test');

// テスト設定
const CONFIG = {
  baseURL: 'http://localhost:3000',
  auth: {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  },
  timeout: 30000
};

// グローバルカウンター
let providerMountCount = {};
let apiCallCount = {};
let initializationTimes = {};

/**
 * 認証処理
 */
async function authenticate(page) {
  console.log('[AUTH] Starting authentication...');
  
  try {
    // CSRFトークン取得
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
    if (!csrfToken) {
      throw new Error('Failed to get CSRF token');
    }
    
    console.log('[AUTH] CSRF token obtained');
    
    // 認証実行
    const authResponse = await page.request.post('/api/auth/callback/credentials', {
      form: {
        email: CONFIG.auth.email,
        password: CONFIG.auth.password,
        csrfToken: csrfToken,
        callbackUrl: CONFIG.baseURL,
        json: 'true'
      }
    });
    
    if (!authResponse.ok()) {
      throw new Error(`Authentication failed: ${authResponse.status()}`);
    }
    
    console.log('[AUTH] Authentication successful');
    
    // セッションCookieの確認
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session-token'));
    
    if (!sessionCookie) {
      console.warn('[AUTH] Warning: Session cookie not found');
    }
    
    return true;
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    return false;
  }
}

/**
 * Provider初期化の監視セットアップ
 */
async function setupProviderMonitoring(page) {
  await page.evaluateOnNewDocument(() => {
    window.__PROVIDER_METRICS__ = {
      mounts: {},
      unmounts: {},
      apiCalls: {},
      initTimes: {},
      errors: []
    };
    
    // Provider初期化を監視
    const originalUseEffect = window.React?.useEffect || (() => {});
    window.React = window.React || {};
    window.React.useEffect = function(effect, deps) {
      // Provider検出ロジック
      const stack = new Error().stack;
      const providerMatch = stack?.match(/(User|Permission|CSRF|SNS|Theme|Socket)Provider/);
      
      if (providerMatch) {
        const providerName = providerMatch[0];
        window.__PROVIDER_METRICS__.mounts[providerName] = 
          (window.__PROVIDER_METRICS__.mounts[providerName] || 0) + 1;
      }
      
      return originalUseEffect.call(this, effect, deps);
    };
    
    // API呼び出しを監視
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = args[0];
      const endpoint = typeof url === 'string' ? url : url.url;
      
      window.__PROVIDER_METRICS__.apiCalls[endpoint] = 
        (window.__PROVIDER_METRICS__.apiCalls[endpoint] || 0) + 1;
      
      const startTime = performance.now();
      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;
        
        console.log(`[API] ${endpoint} - ${response.status} (${duration.toFixed(2)}ms)`);
        
        return response;
      } catch (error) {
        window.__PROVIDER_METRICS__.errors.push({
          endpoint,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };
  });
}

// テストケース1: Provider初期化回数の検証
test.describe('Provider Initialization Count', () => {
  test('should initialize each provider only once', async ({ page }) => {
    // 監視セットアップ
    await setupProviderMonitoring(page);
    
    // 認証
    const authSuccess = await authenticate(page);
    expect(authSuccess).toBe(true);
    
    // ホームページアクセス
    await page.goto(CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // メトリクス取得
    const metrics = await page.evaluate(() => window.__PROVIDER_METRICS__);
    
    console.log('[TEST] Provider mount counts:', metrics.mounts);
    
    // 検証: 各Providerが2回以下の初期化（StrictModeで2回は許容）
    for (const [provider, count] of Object.entries(metrics.mounts)) {
      expect(count).toBeLessThanOrEqual(2);
    }
    
    // レポート生成
    console.log('[REPORT] Provider Initialization Test');
    console.log('=====================================');
    console.log('Provider Mount Counts:');
    for (const [provider, count] of Object.entries(metrics.mounts)) {
      console.log(`  ${provider}: ${count} times`);
    }
  });
});

// テストケース2: API呼び出し回数の検証
test.describe('API Call Optimization', () => {
  test('should minimize API calls during initialization', async ({ page }) => {
    // 監視セットアップ
    await setupProviderMonitoring(page);
    
    // 認証
    const authSuccess = await authenticate(page);
    expect(authSuccess).toBe(true);
    
    // ホームページアクセス
    await page.goto(CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // メトリクス取得
    const metrics = await page.evaluate(() => window.__PROVIDER_METRICS__);
    
    console.log('[TEST] API call counts:', metrics.apiCalls);
    
    // 検証: 重要なAPIエンドポイントの呼び出し回数
    const criticalEndpoints = [
      '/api/profile',
      '/api/user/permissions',
      '/api/csrf'
    ];
    
    let totalCalls = 0;
    for (const endpoint of criticalEndpoints) {
      const count = metrics.apiCalls[endpoint] || 0;
      totalCalls += count;
      
      // 各エンドポイントは最大2回まで（StrictMode考慮）
      expect(count).toBeLessThanOrEqual(2);
    }
    
    // 総API呼び出し数は10回以下であるべき
    expect(totalCalls).toBeLessThanOrEqual(10);
    
    // レポート生成
    console.log('[REPORT] API Call Optimization Test');
    console.log('====================================');
    console.log('API Call Counts:');
    for (const [endpoint, count] of Object.entries(metrics.apiCalls)) {
      console.log(`  ${endpoint}: ${count} calls`);
    }
    console.log(`Total Critical API Calls: ${totalCalls}`);
  });
});

// テストケース3: 初期化時間の測定
test.describe('Initialization Performance', () => {
  test('should complete initialization within acceptable time', async ({ page }) => {
    // 監視セットアップ
    await setupProviderMonitoring(page);
    
    // 認証
    const authSuccess = await authenticate(page);
    expect(authSuccess).toBe(true);
    
    // パフォーマンス測定開始
    const startTime = Date.now();
    
    // ホームページアクセス
    await page.goto(CONFIG.baseURL);
    
    // Provider初期化完了を待機
    await page.waitForFunction(() => {
      // すべてのProviderが初期化されたかチェック
      const requiredProviders = ['UserProvider', 'PermissionProvider', 'CSRFProvider'];
      const metrics = window.__PROVIDER_METRICS__;
      
      return requiredProviders.every(p => 
        metrics.mounts[p] && metrics.mounts[p] > 0
      );
    }, { timeout: 10000 });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`[TEST] Total initialization time: ${totalTime}ms`);
    
    // 検証: 初期化は3秒以内に完了すべき
    expect(totalTime).toBeLessThan(3000);
    
    // 詳細メトリクス取得
    const metrics = await page.evaluate(() => window.__PROVIDER_METRICS__);
    
    // レポート生成
    console.log('[REPORT] Initialization Performance Test');
    console.log('========================================');
    console.log(`Total Initialization Time: ${totalTime}ms`);
    console.log('Errors during initialization:', metrics.errors.length);
    if (metrics.errors.length > 0) {
      console.log('Error details:', metrics.errors);
    }
  });
});

// テストケース4: メモリリークの検出
test.describe('Memory Leak Detection', () => {
  test('should not leak memory during provider unmount/remount', async ({ page }) => {
    // 監視セットアップ
    await setupProviderMonitoring(page);
    
    // 認証
    const authSuccess = await authenticate(page);
    expect(authSuccess).toBe(true);
    
    // 初期メモリ使用量
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return null;
    });
    
    console.log(`[TEST] Initial memory: ${initialMemory ? (initialMemory / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}`);
    
    // 複数回のナビゲーション（Provider再マウント）
    for (let i = 0; i < 3; i++) {
      await page.goto(CONFIG.baseURL);
      await page.waitForLoadState('networkidle');
      await page.goto('about:blank');
      await page.waitForTimeout(100);
    }
    
    // 最終的にホームに戻る
    await page.goto(CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // ガベージコレクション強制実行（可能な場合）
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    // 最終メモリ使用量
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return null;
    });
    
    console.log(`[TEST] Final memory: ${finalMemory ? (finalMemory / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}`);
    
    // メモリ増加の検証（50MB以下の増加は許容）
    if (initialMemory && finalMemory) {
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      console.log(`[TEST] Memory increase: ${memoryIncrease.toFixed(2)}MB`);
      expect(memoryIncrease).toBeLessThan(50);
    }
    
    // レポート生成
    console.log('[REPORT] Memory Leak Detection Test');
    console.log('====================================');
    if (initialMemory && finalMemory) {
      console.log(`Initial Memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final Memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory Increase: ${((finalMemory - initialMemory) / 1024 / 1024).toFixed(2)}MB`);
    } else {
      console.log('Memory profiling not available in this browser');
    }
  });
});

// テスト後のクリーンアップ
test.afterAll(async () => {
  console.log('[TEST] All unit tests completed');
  console.log('=====================================');
  console.log('Summary:');
  console.log('- Provider initialization tests: Complete');
  console.log('- API optimization tests: Complete');
  console.log('- Performance tests: Complete');
  console.log('- Memory leak tests: Complete');
});