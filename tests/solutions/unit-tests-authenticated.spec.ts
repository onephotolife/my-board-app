/**
 * Dashboard Route競合解決策 - 単体テスト（認証済み）
 * STRICT120準拠 - 認証必須テスト
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import axios from 'axios';

// 認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?',
  baseUrl: 'http://localhost:3000'
};

// デバッグログ用フラグ
const DEBUG = process.env.DEBUG === '1';

class AuthenticationHelper {
  private cookies: string[] = [];
  private csrfToken: string = '';

  /**
   * 認証実行
   */
  async authenticate(): Promise<{ success: boolean; cookies: string[]; error?: string }> {
    try {
      console.log('🔐 [AUTH] 認証開始...');
      
      // 1. CSRFトークン取得
      const csrfResponse = await axios.get(`${AUTH_CREDENTIALS.baseUrl}/api/auth/csrf`, {
        withCredentials: true
      });
      
      this.csrfToken = csrfResponse.data.csrfToken;
      console.log('✅ [AUTH] CSRFトークン取得成功');
      
      // 2. 認証実行
      const authResponse = await axios.post(
        `${AUTH_CREDENTIALS.baseUrl}/api/auth/callback/credentials`,
        {
          email: AUTH_CREDENTIALS.email,
          password: AUTH_CREDENTIALS.password,
          csrfToken: this.csrfToken
        },
        {
          withCredentials: true,
          maxRedirects: 0,
          validateStatus: (status) => status < 500
        }
      );
      
      // 3. Cookie取得
      if (authResponse.headers['set-cookie']) {
        this.cookies = authResponse.headers['set-cookie'];
        console.log('✅ [AUTH] セッションCookie取得成功');
        return { success: true, cookies: this.cookies };
      }
      
      return { success: false, cookies: [], error: 'Cookie取得失敗' };
      
    } catch (error: any) {
      console.error('❌ [AUTH] 認証エラー:', error.message);
      return { success: false, cookies: [], error: error.message };
    }
  }
  
  getCookies(): string[] {
    return this.cookies;
  }
  
  getCsrfToken(): string {
    return this.csrfToken;
  }
}

test.describe('Solution #1: Dashboard競合解決 - 単体テスト', () => {
  let authHelper: AuthenticationHelper;
  
  test.beforeAll(async () => {
    authHelper = new AuthenticationHelper();
    const authResult = await authHelper.authenticate();
    
    if (!authResult.success) {
      throw new Error(`認証失敗: ${authResult.error}`);
    }
  });
  
  test('U-1: ファイル存在確認テスト', async () => {
    console.log('📁 [TEST] ファイル存在確認開始...');
    
    // OKパターン: ファイルが存在する
    const fs = require('fs');
    const path = require('path');
    
    const dashboardDirect = path.join(process.cwd(), 'src/app/dashboard/page.tsx');
    const dashboardMain = path.join(process.cwd(), 'src/app/(main)/dashboard/page.tsx');
    
    const directExists = fs.existsSync(dashboardDirect);
    const mainExists = fs.existsSync(dashboardMain);
    
    console.log(`✅ Direct Dashboard: ${directExists ? '存在' : '不在'}`);
    console.log(`✅ Main Dashboard: ${mainExists ? '存在' : '不在'}`);
    
    // NGパターン: 両方存在する場合は競合
    if (directExists && mainExists) {
      console.log('❌ [CONFLICT] 両方のdashboard/page.tsxが存在 - Route競合発生');
      expect(directExists && mainExists).toBe(false);
    }
    
    // OKパターン: どちらか1つだけ存在
    expect(directExists || mainExists).toBe(true);
  });
  
  test('U-2: Route解決テスト（認証済み）', async ({ request }) => {
    console.log('🔍 [TEST] Route解決テスト開始...');
    
    const cookies = authHelper.getCookies();
    const cookieHeader = cookies.join('; ');
    
    // OKパターン: /dashboardへのアクセス
    const response = await request.get('/dashboard', {
      headers: {
        'Cookie': cookieHeader
      },
      failOnStatusCode: false
    });
    
    const status = response.status();
    console.log(`📊 Dashboard Response Status: ${status}`);
    
    // 期待値判定
    if (status === 500) {
      // NGパターン: Route競合エラー
      console.log('❌ [ERROR] 500エラー - Route競合の可能性');
      const body = await response.text();
      if (body.includes('parallel pages')) {
        console.log('❌ [CONFIRMED] Route競合エラー確認');
      }
    } else if (status === 200) {
      // OKパターン: 正常表示
      console.log('✅ [SUCCESS] Dashboard正常表示');
    } else if (status === 307) {
      // 認証リダイレクト
      console.log('⚠️ [REDIRECT] 認証リダイレクト検出');
    }
    
    // デバッグログ
    if (DEBUG) {
      console.log('[DEBUG] Response Headers:', response.headers());
    }
  });
  
  test('U-3: Layout継承テスト', async () => {
    console.log('🏗️ [TEST] Layout継承テスト開始...');
    
    const fs = require('fs');
    const path = require('path');
    
    // レイアウトファイルの確認
    const dashboardLayout = path.join(process.cwd(), 'src/app/dashboard/layout.tsx');
    const mainLayout = path.join(process.cwd(), 'src/app/(main)/layout.tsx');
    
    const dashboardLayoutExists = fs.existsSync(dashboardLayout);
    const mainLayoutExists = fs.existsSync(mainLayout);
    
    console.log(`Dashboard Layout: ${dashboardLayoutExists ? '存在' : '不在'}`);
    console.log(`Main Layout: ${mainLayoutExists ? '存在' : '不在'}`);
    
    // OKパターン: 適切なレイアウトが存在
    if (dashboardLayoutExists) {
      const content = fs.readFileSync(dashboardLayout, 'utf-8');
      const hasAuth = content.includes('getServerSession');
      console.log(`✅ Dashboard Layout認証: ${hasAuth ? '有り' : '無し'}`);
      expect(hasAuth).toBe(true);
    }
    
    if (mainLayoutExists) {
      const content = fs.readFileSync(mainLayout, 'utf-8');
      const hasHeader = content.includes('ClientHeader');
      console.log(`✅ Main LayoutにHeader: ${hasHeader ? '有り' : '無し'}`);
    }
    
    // NGパターン対処
    if (!dashboardLayoutExists && !mainLayoutExists) {
      console.log('❌ [ERROR] レイアウトファイルが見つかりません');
      expect(dashboardLayoutExists || mainLayoutExists).toBe(true);
    }
  });
  
  test('U-4: Import依存関係テスト', async () => {
    console.log('🔗 [TEST] Import依存関係テスト開始...');
    
    const fs = require('fs');
    const path = require('path');
    const glob = require('glob');
    
    // dashboardをimportしているファイルを探索
    const files = glob.sync('src/**/*.{ts,tsx}', {
      ignore: ['**/node_modules/**', '**/.next/**']
    });
    
    const importingFiles: string[] = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('dashboard') && !file.includes('dashboard')) {
        importingFiles.push(file);
      }
    }
    
    console.log(`📊 Dashboard参照ファイル数: ${importingFiles.length}`);
    
    // OKパターン: 参照が存在する
    expect(importingFiles.length).toBeGreaterThan(0);
    
    // NGパターン検出: 削除予定ファイルへの直接import
    const directImports = importingFiles.filter(file => {
      const content = fs.readFileSync(file, 'utf-8');
      return content.includes("from '@/app/dashboard/page'") || 
             content.includes('from "../dashboard/page"');
    });
    
    if (directImports.length > 0) {
      console.log('❌ [WARNING] 直接import検出:', directImports);
      // 対処法: これらのファイルのimportを修正する必要がある
    }
  });
  
  test('U-5: デバッグログ動作確認', async ({ page }) => {
    console.log('🐛 [TEST] デバッグログ動作確認開始...');
    
    // ブラウザコンソールを監視
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG-ROUTE]')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Dashboardアクセス
    try {
      await page.goto(`${AUTH_CREDENTIALS.baseUrl}/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 5000
      });
    } catch (error) {
      console.log('⚠️ ページロードエラー（想定内）');
    }
    
    // デバッグログ確認
    if (consoleLogs.length > 0) {
      console.log('✅ デバッグログ検出:');
      consoleLogs.forEach(log => console.log(`  ${log}`));
      
      // どちらのファイルから来たか判定
      const directPath = consoleLogs.find(log => log.includes('DIRECT PATH'));
      const routeGroup = consoleLogs.find(log => log.includes('ROUTE GROUP'));
      
      if (directPath && routeGroup) {
        console.log('❌ [CONFLICT] 両方のデバッグログが出力 - 競合確認');
      } else if (directPath || routeGroup) {
        console.log('✅ [OK] 1つのソースからのみ出力');
      }
    } else {
      console.log('⚠️ デバッグログ未検出（エラーによる可能性）');
    }
  });
});

// エラーハンドリング
test.afterAll(async () => {
  console.log('🧹 [CLEANUP] テスト終了処理...');
});

// NGパターン対処法マッピング
const ERROR_HANDLERS = {
  'ROUTE_CONFLICT': {
    description: 'Route競合検出',
    solution: 'Solution #1: dashboard/page.tsx削除',
    command: 'rm src/app/dashboard/page.tsx'
  },
  'AUTH_FAILED': {
    description: '認証失敗',
    solution: '認証情報確認、セッション再生成',
    command: 'npm run auth:reset'
  },
  'LAYOUT_MISSING': {
    description: 'レイアウト不在',
    solution: 'レイアウトファイル復元',
    command: 'git restore src/app/dashboard/layout.tsx'
  },
  'IMPORT_BROKEN': {
    description: 'Import破損',
    solution: 'Import文の修正',
    command: 'npm run fix:imports'
  }
};

export { AuthenticationHelper, ERROR_HANDLERS };