#!/usr/bin/env node

/**
 * 会員限定ページ保護機能の包括的テストスイート
 * 
 * テスト項目:
 * 1. 未ログインでのアクセス拒否とリダイレクト
 * 2. ログイン後の元ページへの復帰
 * 3. API認証チェック
 * 4. ローディング状態の表示
 * 5. エラー処理
 * 6. セッション管理
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

// 保護されたページ一覧
const PROTECTED_PAGES = [
  '/dashboard',
  '/profile',
  '/posts/new',
  '/board'
];

// 保護されたAPIエンドポイント
const PROTECTED_APIS = [
  { method: 'GET', path: '/api/posts' },
  { method: 'POST', path: '/api/posts' },
  { method: 'GET', path: '/api/user' },
  { method: 'PUT', path: '/api/user/profile' }
];

class AuthProtectionTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.sessionToken = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;
    
    switch(type) {
      case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`));
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
        break;
      case 'info':
        console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
        break;
      case 'test':
        console.log(chalk.magenta(`${prefix} 🧪 ${message}`));
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  addResult(testName, status, details = '', duration = 0) {
    this.testResults.push({
      testName,
      status,
      details,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  async setup() {
    this.log('ブラウザを起動中...', 'info');
    this.browser = await puppeteer.launch({
      headless: false, // UIを表示してテスト
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    });
    this.page = await this.browser.newPage();
    
    // コンソールログを表示
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.log(`Browser Console Error: ${msg.text()}`, 'error');
      }
    });

    // ネットワークエラーを監視
    this.page.on('requestfailed', request => {
      this.log(`Request failed: ${request.url()} - ${request.failure().errorText}`, 'error');
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('ブラウザを終了しました', 'info');
    }
  }

  /**
   * テスト1: 未ログイン状態でのアクセステスト
   */
  async testUnauthorizedAccess() {
    this.log('===== テスト1: 未ログイン状態でのアクセステスト =====', 'test');
    
    for (const path of PROTECTED_PAGES) {
      const startTime = Date.now();
      try {
        this.log(`Testing: ${path}`, 'info');
        
        // ページにアクセス
        await this.page.goto(`${BASE_URL}${path}`, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        // リダイレクトされたか確認
        const currentUrl = this.page.url();
        const duration = Date.now() - startTime;

        if (currentUrl.includes('/auth/signin')) {
          // callbackUrlパラメータの確認
          const url = new URL(currentUrl);
          const callbackUrl = url.searchParams.get('callbackUrl');
          
          if (callbackUrl && decodeURIComponent(callbackUrl) === path) {
            this.addResult(
              `未ログインアクセス: ${path}`,
              'passed',
              'ログインページへ正しくリダイレクト',
              duration
            );
            this.log(`✅ ${path} → ログインページへリダイレクト成功`, 'success');
          } else {
            this.addResult(
              `未ログインアクセス: ${path}`,
              'warning',
              `リダイレクトはされたがcallbackUrlが不正: ${callbackUrl}`,
              duration
            );
            this.log(`⚠️ callbackUrlが期待値と異なる`, 'warning');
          }
        } else if (currentUrl === `${BASE_URL}${path}`) {
          this.addResult(
            `未ログインアクセス: ${path}`,
            'failed',
            'リダイレクトされずページが表示された',
            duration
          );
          this.log(`❌ ${path} が保護されていません！`, 'error');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500)); // 次のテストまで少し待機
        
      } catch (error) {
        const duration = Date.now() - startTime;
        this.addResult(
          `未ログインアクセス: ${path}`,
          'error',
          error.message,
          duration
        );
        this.log(`Error testing ${path}: ${error.message}`, 'error');
      }
    }
  }

  /**
   * テスト2: ローディング状態のテスト
   */
  async testLoadingStates() {
    this.log('===== テスト2: ローディング状態のテスト =====', 'test');
    
    const startTime = Date.now();
    try {
      // ネットワークを遅延させてローディング状態を確認
      let loadingDetected = false;

      // 保護されたページにアクセス
      const navigationPromise = this.page.goto(`${BASE_URL}/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // ローディング表示を探す
      await new Promise(resolve => setTimeout(resolve, 500));
      const loadingElements = await this.page.$$eval(
        '[role="progressbar"], .MuiCircularProgress-root, .loading, .skeleton',
        elements => elements.length
      ).catch(() => 0);

      if (loadingElements > 0) {
        loadingDetected = true;
        this.log('ローディング表示を検出', 'success');
      }

      await navigationPromise;
      
      const duration = Date.now() - startTime;
      this.addResult(
        'ローディング状態の表示',
        loadingDetected ? 'passed' : 'warning',
        loadingDetected ? 'ローディング表示確認' : 'ローディング表示が見つかりません',
        duration
      );
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult(
        'ローディング状態の表示',
        'error',
        error.message,
        duration
      );
      this.log(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * テスト3: ログインとリダイレクトのテスト
   */
  async testLoginAndRedirect() {
    this.log('===== テスト3: ログインとリダイレクトのテスト =====', 'test');
    
    // まず保護されたページにアクセス
    const targetPath = '/dashboard';
    const startTime = Date.now();
    
    try {
      this.log(`${targetPath} にアクセス中...`, 'info');
      await this.page.goto(`${BASE_URL}${targetPath}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // ログインページにリダイレクトされたことを確認
      const loginUrl = this.page.url();
      if (!loginUrl.includes('/auth/signin')) {
        throw new Error('ログインページへのリダイレクトが失敗');
      }

      // ログインフォームに入力
      this.log('ログインフォームに入力中...', 'info');
      await this.page.waitForSelector('input[name="email"], input[type="email"]');
      await this.page.type('input[name="email"], input[type="email"]', TEST_USER.email);
      await this.page.type('input[name="password"], input[type="password"]', TEST_USER.password);

      // ログインボタンをクリック
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        this.page.click('button[type="submit"]')
      ]);

      // 元のページにリダイレクトされたか確認
      await new Promise(resolve => setTimeout(resolve, 500));
      const currentUrl = this.page.url();
      const duration = Date.now() - startTime;

      if (currentUrl.includes(targetPath)) {
        this.addResult(
          'ログイン後のリダイレクト',
          'passed',
          `${targetPath} へ正しくリダイレクト`,
          duration
        );
        this.log('✅ ログイン後、元のページへ正しくリダイレクトされました', 'success');
        
        // セッショントークンを取得
        const cookies = await this.page.cookies();
        const sessionCookie = cookies.find(c => c.name.includes('session-token'));
        if (sessionCookie) {
          this.sessionToken = sessionCookie.value;
          this.log('セッショントークンを取得しました', 'success');
        }
      } else {
        this.addResult(
          'ログイン後のリダイレクト',
          'failed',
          `期待: ${targetPath}, 実際: ${currentUrl}`,
          duration
        );
        this.log(`❌ リダイレクト先が異なります: ${currentUrl}`, 'error');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult(
        'ログイン後のリダイレクト',
        'error',
        error.message,
        duration
      );
      this.log(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * テスト4: API認証チェック
   */
  async testAPIAuthentication() {
    this.log('===== テスト4: API認証チェック =====', 'test');
    
    // 未認証状態でのAPIアクセス
    this.log('未認証状態でのAPIテスト', 'info');
    for (const endpoint of PROTECTED_APIS) {
      const startTime = Date.now();
      try {
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: endpoint.method !== 'GET' ? JSON.stringify({ test: true }) : undefined
        });

        const duration = Date.now() - startTime;
        
        if (response.status === 401 || response.status === 403) {
          this.addResult(
            `API認証 (未認証): ${endpoint.method} ${endpoint.path}`,
            'passed',
            `ステータス ${response.status} で正しく拒否`,
            duration
          );
          this.log(`✅ ${endpoint.method} ${endpoint.path} - 認証エラーで保護`, 'success');
        } else {
          const data = await response.json().catch(() => ({}));
          if (data.requireAuth || data.error?.includes('ログイン')) {
            this.addResult(
              `API認証 (未認証): ${endpoint.method} ${endpoint.path}`,
              'passed',
              '認証エラーメッセージで保護',
              duration
            );
            this.log(`✅ ${endpoint.method} ${endpoint.path} - 認証必要フラグで保護`, 'success');
          } else {
            this.addResult(
              `API認証 (未認証): ${endpoint.method} ${endpoint.path}`,
              'failed',
              `ステータス ${response.status} - 保護されていない`,
              duration
            );
            this.log(`❌ ${endpoint.method} ${endpoint.path} - 保護されていません！`, 'error');
          }
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        this.addResult(
          `API認証 (未認証): ${endpoint.method} ${endpoint.path}`,
          'error',
          error.message,
          duration
        );
        this.log(`Error: ${error.message}`, 'error');
      }
    }

    // 認証済み状態でのAPIアクセス（セッショントークンがある場合）
    if (this.sessionToken) {
      this.log('認証済み状態でのAPIテスト', 'info');
      const cookies = await this.page.cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      for (const endpoint of PROTECTED_APIS.slice(0, 2)) { // 最初の2つだけテスト
        const startTime = Date.now();
        try {
          const response = await fetch(`${BASE_URL}${endpoint.path}`, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookieString
            },
            body: endpoint.method !== 'GET' ? JSON.stringify({ test: true }) : undefined
          });

          const duration = Date.now() - startTime;
          
          if (response.ok || response.status < 400) {
            this.addResult(
              `API認証 (認証済み): ${endpoint.method} ${endpoint.path}`,
              'passed',
              'アクセス許可',
              duration
            );
            this.log(`✅ ${endpoint.method} ${endpoint.path} - 認証済みアクセス成功`, 'success');
          } else {
            this.addResult(
              `API認証 (認証済み): ${endpoint.method} ${endpoint.path}`,
              'warning',
              `ステータス ${response.status}`,
              duration
            );
            this.log(`⚠️ ${endpoint.method} ${endpoint.path} - ステータス ${response.status}`, 'warning');
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          this.addResult(
            `API認証 (認証済み): ${endpoint.method} ${endpoint.path}`,
            'error',
            error.message,
            duration
          );
        }
      }
    }
  }

  /**
   * テスト5: エラー処理のテスト
   */
  async testErrorHandling() {
    this.log('===== テスト5: エラー処理のテスト =====', 'test');
    
    const startTime = Date.now();
    try {
      // 無効な認証情報でログイン試行
      await this.page.goto(`${BASE_URL}/auth/signin`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await this.page.waitForSelector('input[name="email"], input[type="email"]');
      await this.page.type('input[name="email"], input[type="email"]', 'invalid@test.com');
      await this.page.type('input[name="password"], input[type="password"]', 'wrongpassword');

      await this.page.click('button[type="submit"]');
      await new Promise(resolve => setTimeout(resolve, 500));

      // エラーメッセージを探す
      const errorMessages = await this.page.$$eval(
        '.MuiAlert-root, .error-message, [role="alert"], .text-red-500',
        elements => elements.map(el => el.textContent)
      ).catch(() => []);

      const duration = Date.now() - startTime;
      
      if (errorMessages.length > 0) {
        this.addResult(
          'ログインエラー処理',
          'passed',
          `エラーメッセージ表示: ${errorMessages[0]}`,
          duration
        );
        this.log('✅ エラーメッセージが正しく表示されました', 'success');
      } else {
        this.addResult(
          'ログインエラー処理',
          'warning',
          'エラーメッセージが見つかりません',
          duration
        );
        this.log('⚠️ エラーメッセージが表示されていません', 'warning');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult(
        'ログインエラー処理',
        'error',
        error.message,
        duration
      );
      this.log(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * テスト6: セッション管理のテスト
   */
  async testSessionManagement() {
    this.log('===== テスト6: セッション管理のテスト =====', 'test');
    
    const startTime = Date.now();
    try {
      // ログイン状態を確認
      if (!this.sessionToken) {
        // 再度ログイン
        await this.testLoginAndRedirect();
      }

      // 保護されたページにアクセス可能か確認
      await this.page.goto(`${BASE_URL}/profile`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      const currentUrl = this.page.url();
      
      if (currentUrl.includes('/profile')) {
        this.log('✅ セッションが維持されています', 'success');
        
        // ログアウトテスト
        const logoutButton = await this.page.$('button:has-text("ログアウト"), button:has-text("Logout"), button:has-text("Sign out")');
        if (logoutButton) {
          await logoutButton.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // ログアウト後のリダイレクト確認
          const afterLogoutUrl = this.page.url();
          const duration = Date.now() - startTime;
          
          if (afterLogoutUrl.includes('/auth/signin') || afterLogoutUrl === `${BASE_URL}/`) {
            this.addResult(
              'セッション管理（ログアウト）',
              'passed',
              'ログアウト成功',
              duration
            );
            this.log('✅ ログアウトが正常に動作しました', 'success');
          } else {
            this.addResult(
              'セッション管理（ログアウト）',
              'warning',
              `予期しないリダイレクト先: ${afterLogoutUrl}`,
              duration
            );
          }
        } else {
          const duration = Date.now() - startTime;
          this.addResult(
            'セッション管理',
            'warning',
            'ログアウトボタンが見つかりません',
            duration
          );
        }
      } else {
        const duration = Date.now() - startTime;
        this.addResult(
          'セッション管理',
          'failed',
          'セッションが維持されていません',
          duration
        );
        this.log('❌ セッションが維持されていません', 'error');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult(
        'セッション管理',
        'error',
        error.message,
        duration
      );
      this.log(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * テスト結果のサマリー表示
   */
  displaySummary() {
    console.log('\n' + chalk.cyan('='.repeat(80)));
    console.log(chalk.cyan.bold('テスト結果サマリー'));
    console.log(chalk.cyan('='.repeat(80)));

    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const warnings = this.testResults.filter(r => r.status === 'warning').length;
    const errors = this.testResults.filter(r => r.status === 'error').length;
    const total = this.testResults.length;

    console.log(chalk.green(`✅ 成功: ${passed}/${total}`));
    if (failed > 0) console.log(chalk.red(`❌ 失敗: ${failed}/${total}`));
    if (warnings > 0) console.log(chalk.yellow(`⚠️  警告: ${warnings}/${total}`));
    if (errors > 0) console.log(chalk.red(`🔥 エラー: ${errors}/${total}`));

    console.log('\n' + chalk.cyan('詳細結果:'));
    console.log(chalk.cyan('-'.repeat(80)));

    this.testResults.forEach(result => {
      const statusIcon = 
        result.status === 'passed' ? '✅' :
        result.status === 'failed' ? '❌' :
        result.status === 'warning' ? '⚠️' : '🔥';
      
      const statusColor = 
        result.status === 'passed' ? chalk.green :
        result.status === 'failed' ? chalk.red :
        result.status === 'warning' ? chalk.yellow : chalk.red;

      console.log(
        statusColor(`${statusIcon} ${result.testName}`),
        chalk.gray(`(${result.duration}ms)`)
      );
      if (result.details) {
        console.log(chalk.gray(`   └─ ${result.details}`));
      }
    });

    console.log('\n' + chalk.cyan('='.repeat(80)));
    
    // 総合評価
    const successRate = (passed / total) * 100;
    if (successRate === 100) {
      console.log(chalk.green.bold('🎉 すべてのテストが成功しました！'));
    } else if (successRate >= 80) {
      console.log(chalk.yellow.bold('⚠️ 一部改善が必要な項目があります。'));
    } else {
      console.log(chalk.red.bold('❌ 重要な問題が検出されました。修正が必要です。'));
    }
    
    console.log(chalk.cyan('='.repeat(80)) + '\n');

    // テスト結果をファイルに保存
    this.saveResults();
  }

  /**
   * テスト結果をファイルに保存
   */
  saveResults() {
    const fs = require('fs');
    const path = require('path');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(process.cwd(), `auth-test-results-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'passed').length,
        failed: this.testResults.filter(r => r.status === 'failed').length,
        warnings: this.testResults.filter(r => r.status === 'warning').length,
        errors: this.testResults.filter(r => r.status === 'error').length
      },
      results: this.testResults
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    this.log(`テスト結果を保存しました: ${filename}`, 'info');
  }

  /**
   * メインテスト実行
   */
  async run() {
    console.log(chalk.cyan.bold('\n🔒 会員限定ページ保護機能テストを開始します\n'));
    
    try {
      await this.setup();
      
      // 各テストを順番に実行
      await this.testUnauthorizedAccess();
      await this.testLoadingStates();
      await this.testLoginAndRedirect();
      await this.testAPIAuthentication();
      await this.testErrorHandling();
      await this.testSessionManagement();
      
      // 結果表示
      this.displaySummary();
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      console.error(error);
    } finally {
      await this.cleanup();
    }
  }
}

// パッケージチェックと実行
async function checkDependencies() {
  const requiredPackages = ['puppeteer', 'node-fetch', 'chalk'];
  const { execSync } = require('child_process');
  
  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
    } catch (e) {
      console.log(`Installing ${pkg}...`);
      execSync(`npm install ${pkg}`, { stdio: 'inherit' });
    }
  }
}

// メイン実行
(async () => {
  await checkDependencies();
  const tester = new AuthProtectionTester();
  await tester.run();
})();