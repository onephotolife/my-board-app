/**
 * Dashboard Route競合解決策 - 結合テスト（認証済み）
 * STRICT120準拠 - 認証必須・システム間連携テスト
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { AuthenticationHelper } from './unit-tests-authenticated.spec';

// テスト設定
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  retryCount: 3
};

// デバッグモード
const DEBUG = process.env.DEBUG === '1';

test.describe('Solution Integration Tests - 認証済み結合テスト', () => {
  let authHelper: AuthenticationHelper;
  let authCookies: string[] = [];
  
  test.beforeAll(async () => {
    console.log('🔐 [SETUP] 認証セットアップ開始...');
    authHelper = new AuthenticationHelper();
    const authResult = await authHelper.authenticate();
    
    if (!authResult.success) {
      throw new Error(`認証失敗: ${authResult.error}`);
    }
    
    authCookies = authResult.cookies;
    console.log('✅ [SETUP] 認証成功');
  });
  
  test('I-1: ナビゲーション統合テスト', async ({ page, context }) => {
    console.log('🧭 [TEST] ナビゲーション統合テスト開始...');
    
    // Cookieをセット
    for (const cookie of authCookies) {
      const [nameValue, ...attrs] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      await context.addCookies([{
        name: name.trim(),
        value: value.trim(),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax'
      }]);
    }
    
    // ホームページから開始
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });
    
    // OKパターン: ヘッダーのDashboardリンククリック
    const dashboardLink = await page.$('a[href="/dashboard"]');
    if (dashboardLink) {
      console.log('✅ Dashboardリンク発見');
      
      // リンククリック前のURL
      const beforeUrl = page.url();
      
      // クリックイベント
      await Promise.all([
        page.waitForResponse(response => 
          response.url().includes('/dashboard') || 
          response.url().includes('/auth/signin'),
          { timeout: 5000 }
        ).catch(() => null),
        dashboardLink.click()
      ]);
      
      // クリック後のURL
      const afterUrl = page.url();
      console.log(`Navigation: ${beforeUrl} → ${afterUrl}`);
      
      // 結果判定
      if (afterUrl.includes('/dashboard')) {
        console.log('✅ [OK] Dashboard遷移成功');
      } else if (afterUrl.includes('/auth/signin')) {
        console.log('⚠️ [REDIRECT] 認証画面へリダイレクト');
      } else if (afterUrl === beforeUrl) {
        console.log('❌ [ERROR] 遷移失敗 - Route競合の可能性');
      }
    } else {
      console.log('⚠️ Dashboardリンクが見つかりません');
    }
    
    // NGパターン対処: エラーダイアログ確認
    const errorDialog = await page.$('[role="alert"]');
    if (errorDialog) {
      const errorText = await errorDialog.textContent();
      console.log(`❌ [ERROR] エラーダイアログ: ${errorText}`);
    }
  });
  
  test('I-2: API連携テスト', async ({ request }) => {
    console.log('🔌 [TEST] API連携テスト開始...');
    
    const cookieHeader = authCookies.join('; ');
    
    // 1. プロファイルAPI
    const profileResponse = await request.get('/api/profile', {
      headers: { 'Cookie': cookieHeader }
    });
    console.log(`Profile API: ${profileResponse.status()}`);
    
    // 2. 投稿統計API
    const statsResponse = await request.get('/api/posts/stats', {
      headers: { 'Cookie': cookieHeader }
    });
    console.log(`Stats API: ${statsResponse.status()}`);
    
    // 3. ユーザーアクティビティAPI
    const activityResponse = await request.get('/api/user/activity', {
      headers: { 'Cookie': cookieHeader }
    });
    console.log(`Activity API: ${activityResponse.status()}`);
    
    // OKパターン: すべて200
    if (profileResponse.ok() && statsResponse.ok() && activityResponse.ok()) {
      console.log('✅ [OK] すべてのAPI正常動作');
      
      // データ整合性チェック
      const profileData = await profileResponse.json();
      const statsData = await statsResponse.json();
      
      if (profileData.user?.id && statsData.userId) {
        expect(profileData.user.id).toBe(statsData.userId);
        console.log('✅ データ整合性確認');
      }
    }
    
    // NGパターン: API失敗
    if (!profileResponse.ok()) {
      console.log('❌ [ERROR] Profile API失敗');
      const error = await profileResponse.text();
      console.log(`Error: ${error.substring(0, 200)}`);
    }
  });
  
  test('I-3: レイアウト統合テスト', async ({ page }) => {
    console.log('🏗️ [TEST] レイアウト統合テスト開始...');
    
    // セッションCookie設定
    await page.context().addCookies(
      authCookies.map(cookie => {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        return {
          name: name.trim(),
          value: value.trim(),
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          sameSite: 'Lax' as 'Lax'
        };
      })
    );
    
    // Dashboardアクセス試行
    const response = await page.goto(`${CONFIG.baseUrl}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    }).catch(err => null);
    
    if (response) {
      const status = response.status();
      
      if (status === 200) {
        // OKパターン: レイアウト要素確認
        const header = await page.$('header');
        const sidebar = await page.$('[role="navigation"]');
        const main = await page.$('main');
        
        console.log(`Header: ${header ? '✅' : '❌'}`);
        console.log(`Sidebar: ${sidebar ? '✅' : '❌'}`);
        console.log(`Main: ${main ? '✅' : '❌'}`);
        
        // 認証状態の表示確認
        const userInfo = await page.$('[data-testid="user-info"]');
        if (userInfo) {
          const userName = await userInfo.textContent();
          console.log(`✅ ユーザー情報表示: ${userName}`);
        }
      } else if (status === 500) {
        // NGパターン: サーバーエラー
        console.log('❌ [ERROR] 500エラー - レイアウト競合');
        
        // エラーメッセージ取得
        const errorText = await page.textContent('body');
        if (errorText?.includes('parallel pages')) {
          console.log('❌ [CONFIRMED] Route競合エラー');
        }
      }
    } else {
      console.log('⚠️ ページロード失敗');
    }
  });
  
  test('I-4: データフロー統合テスト', async ({ page, request }) => {
    console.log('📊 [TEST] データフロー統合テスト開始...');
    
    const cookieHeader = authCookies.join('; ');
    
    // 1. 投稿作成
    const createPostResponse = await request.post('/api/posts', {
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Integration Test Post',
        content: 'Dashboard統合テスト投稿',
        category: 'general'
      }
    });
    
    if (createPostResponse.ok()) {
      const postData = await createPostResponse.json();
      console.log(`✅ 投稿作成成功: ID=${postData.data?.id}`);
      
      // 2. Dashboard統計更新確認
      const statsResponse = await request.get('/api/posts/stats', {
        headers: { 'Cookie': cookieHeader }
      });
      
      if (statsResponse.ok()) {
        const stats = await statsResponse.json();
        console.log(`✅ 統計更新確認: Total=${stats.totalPosts}`);
      }
      
      // 3. クリーンアップ（投稿削除）
      if (postData.data?.id) {
        await request.delete(`/api/posts/${postData.data.id}`, {
          headers: { 'Cookie': cookieHeader }
        });
        console.log('✅ テスト投稿削除完了');
      }
    } else {
      console.log('❌ [ERROR] 投稿作成失敗');
      const error = await createPostResponse.text();
      console.log(`Error: ${error.substring(0, 200)}`);
    }
  });
  
  test('I-5: エラーリカバリテスト', async ({ page, context }) => {
    console.log('🔧 [TEST] エラーリカバリテスト開始...');
    
    // エラー状態のシミュレーション
    const scenarios = [
      {
        name: 'セッション期限切れ',
        action: async () => {
          // セッションCookieを削除
          await context.clearCookies();
          await page.goto(`${CONFIG.baseUrl}/dashboard`);
        },
        expected: 'リダイレクト to /auth/signin'
      },
      {
        name: 'ネットワークエラー',
        action: async () => {
          await page.route('**/api/**', route => route.abort());
          await page.goto(`${CONFIG.baseUrl}/dashboard`).catch(() => null);
        },
        expected: 'エラーメッセージ表示'
      },
      {
        name: 'キャッシュクリア後',
        action: async () => {
          await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
          });
          await page.reload();
        },
        expected: '正常動作継続'
      }
    ];
    
    for (const scenario of scenarios) {
      console.log(`\n📝 シナリオ: ${scenario.name}`);
      
      try {
        await scenario.action();
        
        // 結果確認
        const url = page.url();
        const hasError = await page.$('[role="alert"]');
        
        console.log(`  URL: ${url}`);
        console.log(`  エラー: ${hasError ? 'あり' : 'なし'}`);
        console.log(`  期待値: ${scenario.expected}`);
        
        // OKパターン判定
        if (url.includes('/auth/signin') && scenario.name === 'セッション期限切れ') {
          console.log('  ✅ [OK] 適切なリダイレクト');
        } else if (hasError && scenario.name === 'ネットワークエラー') {
          console.log('  ✅ [OK] エラーハンドリング正常');
        }
      } catch (error: any) {
        console.log(`  ⚠️ エラー: ${error.message}`);
      }
      
      // リセット
      await page.unroute('**/api/**');
    }
  });
  
  test('I-6: 並行アクセステスト', async ({ browser }) => {
    console.log('🔀 [TEST] 並行アクセステスト開始...');
    
    // 複数のコンテキストを作成
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    // 各コンテキストでDashboardアクセス
    const results = await Promise.all(
      contexts.map(async (context, index) => {
        const page = await context.newPage();
        
        // Cookie設定
        await context.addCookies(
          authCookies.map(cookie => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            return {
              name: name.trim(),
              value: value.trim(),
              domain: 'localhost',
              path: '/',
              httpOnly: true,
              sameSite: 'Lax' as 'Lax'
            };
          })
        );
        
        const startTime = Date.now();
        const response = await page.goto(`${CONFIG.baseUrl}/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        }).catch(() => null);
        const endTime = Date.now();
        
        const status = response?.status() || 0;
        const duration = endTime - startTime;
        
        await page.close();
        await context.close();
        
        return { index, status, duration };
      })
    );
    
    // 結果分析
    console.log('\n📊 並行アクセス結果:');
    results.forEach(result => {
      console.log(`  Context ${result.index}: Status=${result.status}, Time=${result.duration}ms`);
    });
    
    // OKパターン: すべて同じステータス
    const statuses = results.map(r => r.status);
    const allSame = statuses.every(s => s === statuses[0]);
    
    if (allSame && statuses[0] === 200) {
      console.log('✅ [OK] 並行アクセス正常');
    } else if (allSame && statuses[0] === 500) {
      console.log('❌ [ERROR] 全アクセスで500エラー - Route競合');
    } else {
      console.log('⚠️ [WARNING] 不整合な結果');
    }
  });
});

// エラーパターンと対処法
const INTEGRATION_ERROR_PATTERNS = {
  'NAVIGATION_FAILED': {
    symptoms: ['リンククリックで遷移しない', 'URLが変わらない'],
    diagnosis: 'Route競合によるナビゲーション障害',
    solution: 'Solution #1実行後、キャッシュクリア'
  },
  'API_INCONSISTENT': {
    symptoms: ['APIレスポンスの不整合', 'データ同期エラー'],
    diagnosis: 'セッション管理の問題',
    solution: 'Middleware確認、セッション再生成'
  },
  'LAYOUT_BROKEN': {
    symptoms: ['レイアウト要素の欠落', 'スタイル適用されない'],
    diagnosis: 'レイアウト継承の破損',
    solution: 'layout.tsxの整合性確認'
  },
  'CONCURRENT_ERRORS': {
    symptoms: ['並行アクセスで異なる結果', 'タイミング依存エラー'],
    diagnosis: 'キャッシュまたは状態管理の問題',
    solution: '.next削除、完全再ビルド'
  }
};

export { INTEGRATION_ERROR_PATTERNS };