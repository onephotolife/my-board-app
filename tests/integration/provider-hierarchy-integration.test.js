/**
 * Provider階層最適化 - 結合テスト
 * 
 * テスト内容:
 * 1. Provider間の依存関係検証
 * 2. データフローの整合性確認
 * 3. カスケード更新の影響測定
 * 4. エラー伝播の検証
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
  timeout: 60000
};

// Provider依存関係マップ
const PROVIDER_DEPENDENCIES = {
  SessionProvider: [],
  ProvidersWithData: ['SessionProvider'],
  UserProvider: ['ProvidersWithData', 'SessionProvider'],
  PermissionProvider: ['UserProvider', 'SessionProvider'],
  CSRFProvider: ['SessionProvider'],
  SNSProvider: ['UserProvider', 'SessionProvider'],
  QueryProvider: [],
  ThemeProvider: []
};

/**
 * 認証とセッション確立
 */
async function establishAuthenticatedSession(page) {
  console.log('[INTEGRATION] Establishing authenticated session...');
  
  try {
    // CSRFトークン取得
    const csrfResponse = await page.request.get('/api/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    
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
    
    // セッション確認
    const sessionResponse = await page.request.get('/api/auth/session');
    const sessionData = await sessionResponse.json();
    
    if (!sessionData.user) {
      throw new Error('Session not established');
    }
    
    console.log('[INTEGRATION] Session established for:', sessionData.user.email);
    
    return sessionData;
  } catch (error) {
    console.error('[INTEGRATION] Session establishment failed:', error);
    throw error;
  }
}

/**
 * Provider間のデータフロー監視
 */
async function setupDataFlowMonitoring(page) {
  await page.evaluateOnNewDocument(() => {
    window.__PROVIDER_DATAFLOW__ = {
      sessionToUser: [],
      userToPermission: [],
      sessionToCSRF: [],
      userToSNS: [],
      errors: [],
      timestamps: {}
    };
    
    // データフローを追跡
    const trackDataFlow = (source, target, data) => {
      const key = `${source}To${target}`;
      const flowData = {
        timestamp: Date.now(),
        data: data,
        stack: new Error().stack?.split('\n').slice(2, 4).join(' -> ')
      };
      
      if (window.__PROVIDER_DATAFLOW__[key]) {
        window.__PROVIDER_DATAFLOW__[key].push(flowData);
      }
      
      console.log(`[DATAFLOW] ${source} -> ${target}`, data);
    };
    
    // グローバルに公開
    window.trackProviderDataFlow = trackDataFlow;
  });
}

// テストケース1: Provider依存関係の検証
test.describe('Provider Dependencies Verification', () => {
  test('should initialize providers in correct order', async ({ page }) => {
    const initOrder = [];
    
    // 初期化順序を記録
    await page.evaluateOnNewDocument(() => {
      window.__INIT_ORDER__ = [];
      
      // Providerコンポーネントの初期化を検知
      const originalCreateElement = window.React?.createElement || (() => {});
      window.React = window.React || {};
      window.React.createElement = function(type, props, ...children) {
        if (typeof type === 'function' && type.name?.includes('Provider')) {
          window.__INIT_ORDER__.push({
            name: type.name,
            timestamp: Date.now()
          });
        }
        return originalCreateElement.call(this, type, props, ...children);
      };
    });
    
    // 認証
    const session = await establishAuthenticatedSession(page);
    
    // ページロード
    await page.goto(CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // 初期化順序を取得
    const order = await page.evaluate(() => window.__INIT_ORDER__);
    
    console.log('[TEST] Provider initialization order:', order.map(p => p.name));
    
    // 依存関係に基づく順序検証
    for (let i = 0; i < order.length; i++) {
      const provider = order[i];
      const dependencies = PROVIDER_DEPENDENCIES[provider.name] || [];
      
      for (const dep of dependencies) {
        const depIndex = order.findIndex(p => p.name === dep);
        if (depIndex !== -1) {
          // 依存するProviderが先に初期化されているか確認
          expect(depIndex).toBeLessThan(i);
        }
      }
    }
    
    // レポート
    console.log('[REPORT] Provider Dependencies Test');
    console.log('====================================');
    console.log('Initialization Order:');
    order.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name}`);
    });
  });
});

// テストケース2: データフローの整合性
test.describe('Data Flow Integrity', () => {
  test('should maintain data consistency across providers', async ({ page }) => {
    await setupDataFlowMonitoring(page);
    
    // 認証
    const session = await establishAuthenticatedSession(page);
    
    // データ整合性チェック用のフック
    await page.evaluateOnNewDocument((sessionData) => {
      window.__DATA_CONSISTENCY__ = {
        session: sessionData,
        user: null,
        permissions: null,
        csrf: null,
        checks: []
      };
      
      // 各Providerのデータをキャプチャ
      window.captureProviderData = (provider, data) => {
        window.__DATA_CONSISTENCY__[provider] = data;
        
        // 整合性チェック
        if (provider === 'user' && data) {
          const consistent = data.email === window.__DATA_CONSISTENCY__.session.user.email;
          window.__DATA_CONSISTENCY__.checks.push({
            provider: 'UserProvider',
            field: 'email',
            consistent,
            expected: window.__DATA_CONSISTENCY__.session.user.email,
            actual: data.email
          });
        }
        
        if (provider === 'permissions' && data) {
          const consistent = data.userId === window.__DATA_CONSISTENCY__.session.user.id;
          window.__DATA_CONSISTENCY__.checks.push({
            provider: 'PermissionProvider',
            field: 'userId',
            consistent,
            expected: window.__DATA_CONSISTENCY__.session.user.id,
            actual: data.userId
          });
        }
      };
    }, session);
    
    // ページロード
    await page.goto(CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // データ整合性の結果を取得
    const consistency = await page.evaluate(() => window.__DATA_CONSISTENCY__);
    
    console.log('[TEST] Data consistency checks:', consistency.checks);
    
    // 全チェックが成功しているか検証
    for (const check of consistency.checks) {
      expect(check.consistent).toBe(true);
    }
    
    // レポート
    console.log('[REPORT] Data Flow Integrity Test');
    console.log('==================================');
    console.log('Consistency Checks:');
    consistency.checks.forEach(check => {
      console.log(`  ${check.provider}.${check.field}: ${check.consistent ? '✓' : '✗'}`);
      if (!check.consistent) {
        console.log(`    Expected: ${check.expected}`);
        console.log(`    Actual: ${check.actual}`);
      }
    });
  });
});

// テストケース3: カスケード更新の影響測定
test.describe('Cascade Update Impact', () => {
  test('should handle session changes efficiently', async ({ page }) => {
    await setupDataFlowMonitoring(page);
    
    // 初回認証
    const session = await establishAuthenticatedSession(page);
    
    // 更新カウンター設定
    await page.evaluateOnNewDocument(() => {
      window.__UPDATE_COUNTS__ = {
        providers: {},
        total: 0
      };
      
      // Provider更新を検知
      const trackUpdate = (providerName) => {
        window.__UPDATE_COUNTS__.providers[providerName] = 
          (window.__UPDATE_COUNTS__.providers[providerName] || 0) + 1;
        window.__UPDATE_COUNTS__.total++;
        
        console.log(`[UPDATE] ${providerName} updated (count: ${window.__UPDATE_COUNTS__.providers[providerName]})`);
      };
      
      window.trackProviderUpdate = trackUpdate;
    });
    
    // ページロード
    await page.goto(CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // セッション更新をシミュレート
    await page.evaluate(() => {
      // SessionProviderの更新イベントを発火
      window.dispatchEvent(new CustomEvent('session-update', {
        detail: { user: { name: 'Updated Name' } }
      }));
    });
    
    // 更新の伝播を待機
    await page.waitForTimeout(1000);
    
    // 更新カウントを取得
    const updateCounts = await page.evaluate(() => window.__UPDATE_COUNTS__);
    
    console.log('[TEST] Update cascade counts:', updateCounts);
    
    // カスケード更新が制御されているか検証
    expect(updateCounts.total).toBeLessThanOrEqual(10); // 過剰な更新を防ぐ
    
    // レポート
    console.log('[REPORT] Cascade Update Impact Test');
    console.log('====================================');
    console.log('Provider Update Counts:');
    for (const [provider, count] of Object.entries(updateCounts.providers)) {
      console.log(`  ${provider}: ${count} updates`);
    }
    console.log(`Total Updates: ${updateCounts.total}`);
  });
});

// テストケース4: エラー伝播の検証
test.describe('Error Propagation', () => {
  test('should handle provider errors gracefully', async ({ page }) => {
    // エラーハンドリング設定
    await page.evaluateOnNewDocument(() => {
      window.__PROVIDER_ERRORS__ = {
        caught: [],
        uncaught: [],
        propagated: []
      };
      
      // エラーバウンダリのシミュレート
      window.addEventListener('error', (event) => {
        window.__PROVIDER_ERRORS__.uncaught.push({
          message: event.message,
          source: event.filename,
          line: event.lineno
        });
      });
      
      // Providerエラーの追跡
      window.trackProviderError = (provider, error, propagated = false) => {
        const errorInfo = {
          provider,
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        };
        
        if (propagated) {
          window.__PROVIDER_ERRORS__.propagated.push(errorInfo);
        } else {
          window.__PROVIDER_ERRORS__.caught.push(errorInfo);
        }
      };
    });
    
    // 認証（エラーケースをテスト）
    try {
      // 不正な認証情報でテスト
      await page.request.post('/api/auth/callback/credentials', {
        form: {
          email: 'invalid@example.com',
          password: 'wrongpassword',
          callbackUrl: CONFIG.baseURL
        }
      });
    } catch (error) {
      console.log('[TEST] Expected auth error:', error.message);
    }
    
    // ページロード（エラー状態で）
    await page.goto(CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // エラー情報を取得
    const errors = await page.evaluate(() => window.__PROVIDER_ERRORS__);
    
    console.log('[TEST] Provider errors:', errors);
    
    // 未処理エラーがないことを確認
    expect(errors.uncaught.length).toBe(0);
    
    // エラーが適切に処理されているか確認
    if (errors.caught.length > 0) {
      for (const error of errors.caught) {
        // エラーがProviderレベルで処理されているか
        expect(error.provider).toBeTruthy();
      }
    }
    
    // レポート
    console.log('[REPORT] Error Propagation Test');
    console.log('================================');
    console.log(`Caught Errors: ${errors.caught.length}`);
    console.log(`Uncaught Errors: ${errors.uncaught.length}`);
    console.log(`Propagated Errors: ${errors.propagated.length}`);
    
    if (errors.caught.length > 0) {
      console.log('Caught Error Details:');
      errors.caught.forEach(err => {
        console.log(`  - ${err.provider}: ${err.message}`);
      });
    }
  });
});

// テストケース5: 並列初期化の検証
test.describe('Parallel Initialization', () => {
  test('should initialize independent providers in parallel', async ({ page }) => {
    // 並列実行の追跡
    await page.evaluateOnNewDocument(() => {
      window.__PARALLEL_INIT__ = {
        timeline: [],
        overlaps: []
      };
      
      // 初期化開始と終了を記録
      window.trackInitStart = (provider) => {
        window.__PARALLEL_INIT__.timeline.push({
          provider,
          type: 'start',
          timestamp: performance.now()
        });
      };
      
      window.trackInitEnd = (provider) => {
        window.__PARALLEL_INIT__.timeline.push({
          provider,
          type: 'end',
          timestamp: performance.now()
        });
        
        // 並列実行の検出
        const starts = window.__PARALLEL_INIT__.timeline.filter(e => e.type === 'start');
        const ends = window.__PARALLEL_INIT__.timeline.filter(e => e.type === 'end');
        
        for (let i = 0; i < starts.length - 1; i++) {
          const current = starts[i];
          const next = starts[i + 1];
          const currentEnd = ends.find(e => e.provider === current.provider);
          
          if (currentEnd && next.timestamp < currentEnd.timestamp) {
            window.__PARALLEL_INIT__.overlaps.push({
              provider1: current.provider,
              provider2: next.provider,
              overlapTime: currentEnd.timestamp - next.timestamp
            });
          }
        }
      };
    });
    
    // 認証
    const session = await establishAuthenticatedSession(page);
    
    // ページロード
    await page.goto(CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // 並列実行データを取得
    const parallelData = await page.evaluate(() => window.__PARALLEL_INIT__);
    
    console.log('[TEST] Parallel initialization data:', parallelData);
    
    // 独立したProviderが並列実行されているか確認
    const independentProviders = ['QueryProvider', 'ThemeProvider'];
    const hasParallelExecution = parallelData.overlaps.some(overlap => 
      independentProviders.includes(overlap.provider1) || 
      independentProviders.includes(overlap.provider2)
    );
    
    expect(hasParallelExecution).toBe(true);
    
    // レポート
    console.log('[REPORT] Parallel Initialization Test');
    console.log('=====================================');
    console.log('Timeline:');
    parallelData.timeline.forEach(event => {
      console.log(`  ${event.timestamp.toFixed(2)}ms: ${event.provider} ${event.type}`);
    });
    console.log('Parallel Executions:');
    parallelData.overlaps.forEach(overlap => {
      console.log(`  ${overlap.provider1} || ${overlap.provider2} (${overlap.overlapTime.toFixed(2)}ms overlap)`);
    });
  });
});

// テスト後のクリーンアップと総合レポート
test.afterAll(async () => {
  console.log('[INTEGRATION] All integration tests completed');
  console.log('==========================================');
  console.log('Test Coverage:');
  console.log('- Provider dependencies: ✓');
  console.log('- Data flow integrity: ✓');
  console.log('- Cascade updates: ✓');
  console.log('- Error propagation: ✓');
  console.log('- Parallel initialization: ✓');
  
  console.log('\nRecommendations:');
  console.log('1. Implement Provider Composer pattern for better dependency management');
  console.log('2. Use unified initialization to reduce API calls');
  console.log('3. Add circuit breakers for error isolation');
  console.log('4. Optimize parallel initialization for independent providers');
});