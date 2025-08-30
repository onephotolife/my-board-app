#!/usr/bin/env node

/**
 * Postsルート競合解決策 - 結合テスト検証スクリプト
 * STRICT120プロトコル準拠
 * 認証必須: one.photolife+1@gmail.com / ?@thc123THC@?
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 認証情報
const AUTH_CREDENTIALS = {
  email: 'one.photolife+1@gmail.com',
  password: '?@thc123THC@?'
};

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 60000;

// ログ設定
const LOG_FILE = path.join(__dirname, 'integration-test-results.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
    authentication: 'ENFORCED'
  };
  
  console.log(`[${timestamp}] [${level}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  logStream.write(JSON.stringify(logEntry) + '\n');
}

class IntegrationTestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionCookie = null;
    this.csrfToken = null;
    this.testResults = {
      authentication: { passed: [], failed: [] },
      routing: { passed: [], failed: [] },
      functionality: { passed: [], failed: [] },
      integration: { passed: [], failed: [] }
    };
  }

  // ===============================
  // 初期化とクリーンアップ
  // ===============================
  async initialize() {
    log('INFO', '=== 結合テスト初期化開始 ===');
    
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        devtools: true
      });
      
      this.page = await this.browser.newPage();
      
      // コンソールログを記録
      this.page.on('console', msg => {
        log('BROWSER', `Console ${msg.type()}`, msg.text());
      });
      
      // エラーをキャッチ
      this.page.on('error', err => {
        log('ERROR', 'Page error', err.message);
      });
      
      // ネットワークエラーを記録
      this.page.on('requestfailed', request => {
        log('WARN', 'Request failed', {
          url: request.url(),
          failure: request.failure()
        });
      });
      
      await this.page.setViewport({ width: 1280, height: 800 });
      
      log('INFO', 'ブラウザ初期化完了');
      return true;
      
    } catch (error) {
      log('ERROR', 'ブラウザ初期化失敗', error.message);
      throw error;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      log('INFO', 'ブラウザクローズ完了');
    }
  }

  // ===============================
  // 認証テスト
  // ===============================
  async testAuthentication() {
    log('INFO', '=== 認証テスト開始 ===');
    
    try {
      // サインインページへ移動
      await this.page.goto(`${BASE_URL}/auth/signin`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });
      
      log('DEBUG', 'サインインページ到達');
      
      // スクリーンショット保存
      await this.page.screenshot({
        path: path.join(__dirname, 'screenshots', 'signin-page.png')
      });
      
      // 認証フォームの存在確認
      const emailInput = await this.page.$('input[name="email"], input[type="email"]');
      const passwordInput = await this.page.$('input[name="password"], input[type="password"]');
      
      if (!emailInput || !passwordInput) {
        throw new Error('認証フォームが見つかりません');
      }
      
      // 認証情報入力
      await emailInput.type(AUTH_CREDENTIALS.email);
      await passwordInput.type(AUTH_CREDENTIALS.password);
      
      log('DEBUG', '認証情報入力完了');
      
      // サインインボタンクリック
      const submitButton = await this.page.$('button[type="submit"], button:has-text("サインイン"), button:has-text("ログイン")');
      if (!submitButton) {
        throw new Error('サインインボタンが見つかりません');
      }
      
      // サインイン実行
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: TEST_TIMEOUT }),
        submitButton.click()
      ]);
      
      // 認証成功確認
      const currentUrl = this.page.url();
      log('DEBUG', '認証後URL', { url: currentUrl });
      
      // セッション確認
      const cookies = await this.page.cookies();
      this.sessionCookie = cookies.find(c => 
        c.name.includes('session') || 
        c.name.includes('auth') || 
        c.name === 'next-auth.session-token'
      );
      
      if (this.sessionCookie) {
        log('INFO', '✅ 認証成功', { 
          cookieName: this.sessionCookie.name,
          secure: this.sessionCookie.secure,
          httpOnly: this.sessionCookie.httpOnly
        });
        
        this.testResults.authentication.passed.push({
          test: 'login',
          message: '認証成功',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('セッションCookieが取得できません');
      }
      
      // CSRFトークン取得試行
      try {
        const response = await this.page.evaluate(async () => {
          const res = await fetch('/api/csrf', {
            credentials: 'include'
          });
          return {
            ok: res.ok,
            status: res.status,
            data: res.ok ? await res.json() : null
          };
        });
        
        if (response.ok && response.data) {
          this.csrfToken = response.data.token;
          log('INFO', '✅ CSRFトークン取得成功');
          this.testResults.authentication.passed.push({
            test: 'csrf-token',
            message: 'CSRFトークン取得成功'
          });
        }
      } catch (csrfError) {
        log('WARN', 'CSRFトークン取得失敗（オプション）', csrfError.message);
      }
      
      return true;
      
    } catch (error) {
      log('ERROR', '❌ 認証テスト失敗', error.message);
      this.testResults.authentication.failed.push({
        test: 'authentication',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // ===============================
  // ルーティングテスト
  // ===============================
  async testRouting() {
    log('INFO', '=== ルーティングテスト開始 ===');
    
    const routes = [
      { path: '/posts/new', name: '新規投稿ページ', requiresAuth: true },
      { path: '/board', name: '掲示板ページ', requiresAuth: false },
      { path: '/my-posts', name: 'マイ投稿ページ', requiresAuth: true }
    ];
    
    for (const route of routes) {
      try {
        log('DEBUG', `テスト中: ${route.name}`);
        
        const response = await this.page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: 'networkidle2',
          timeout: TEST_TIMEOUT
        });
        
        const status = response.status();
        const currentUrl = this.page.url();
        
        // スクリーンショット保存
        const screenshotName = route.path.replace(/\//g, '-').substring(1) || 'home';
        await this.page.screenshot({
          path: path.join(__dirname, 'screenshots', `${screenshotName}.png`)
        });
        
        // ステータス確認
        if (status === 200) {
          log('INFO', `✅ ${route.name}アクセス成功`, { 
            status, 
            url: currentUrl 
          });
          
          this.testResults.routing.passed.push({
            route: route.path,
            name: route.name,
            status: status
          });
          
          // ページコンテンツ確認
          const hasError = await this.page.evaluate(() => {
            const errorText = document.body.innerText.toLowerCase();
            return errorText.includes('error') || 
                   errorText.includes('エラー') ||
                   errorText.includes('parallel pages');
          });
          
          if (hasError) {
            log('WARN', `⚠️ ${route.name}にエラーメッセージ検出`);
            this.testResults.routing.failed.push({
              route: route.path,
              error: 'エラーメッセージが表示されています'
            });
          }
          
        } else if (status === 500) {
          log('ERROR', `❌ ${route.name}サーバーエラー`, { status });
          this.testResults.routing.failed.push({
            route: route.path,
            name: route.name,
            error: `サーバーエラー (${status})`
          });
        } else if (route.requiresAuth && currentUrl.includes('/auth/signin')) {
          log('INFO', `ℹ️ ${route.name}認証リダイレクト`);
          this.testResults.routing.passed.push({
            route: route.path,
            name: route.name,
            message: '認証が必要（正常動作）'
          });
        }
        
      } catch (error) {
        log('ERROR', `❌ ${route.name}テスト失敗`, error.message);
        this.testResults.routing.failed.push({
          route: route.path,
          name: route.name,
          error: error.message
        });
      }
    }
  }

  // ===============================
  // 機能テスト
  // ===============================
  async testFunctionality() {
    log('INFO', '=== 機能テスト開始 ===');
    
    try {
      // 掲示板ページで投稿一覧確認
      await this.page.goto(`${BASE_URL}/board`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });
      
      // 投稿の存在確認
      const posts = await this.page.evaluate(() => {
        const postElements = document.querySelectorAll('[data-testid*="post-"], .post-item, article');
        return postElements.length;
      });
      
      log('DEBUG', `投稿数: ${posts}`);
      
      if (posts > 0) {
        this.testResults.functionality.passed.push({
          test: 'post-display',
          message: `${posts}件の投稿を表示`
        });
      }
      
      // 新規投稿ボタンの確認
      const newPostButton = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.some(btn => 
          btn.textContent.includes('新規投稿') || 
          btn.textContent.includes('投稿する') ||
          btn.href?.includes('/posts/new')
        );
      });
      
      if (newPostButton) {
        log('INFO', '✅ 新規投稿ボタン検出');
        this.testResults.functionality.passed.push({
          test: 'new-post-button',
          message: '新規投稿ボタンが存在'
        });
      }
      
      // APIエンドポイントテスト
      const apiResponse = await this.page.evaluate(async (csrfToken) => {
        try {
          const headers = {
            'Content-Type': 'application/json'
          };
          
          if (csrfToken) {
            headers['x-csrf-token'] = csrfToken;
          }
          
          const res = await fetch('/api/posts', {
            method: 'GET',
            credentials: 'include',
            headers
          });
          
          return {
            ok: res.ok,
            status: res.status,
            hasData: res.ok ? (await res.json()).length > 0 : false
          };
        } catch (error) {
          return { error: error.message };
        }
      }, this.csrfToken);
      
      if (apiResponse.ok) {
        log('INFO', '✅ APIエンドポイント正常', apiResponse);
        this.testResults.functionality.passed.push({
          test: 'api-posts',
          message: 'API応答正常'
        });
      } else {
        log('WARN', '⚠️ APIエンドポイント異常', apiResponse);
        this.testResults.functionality.failed.push({
          test: 'api-posts',
          error: apiResponse.error || `Status: ${apiResponse.status}`
        });
      }
      
    } catch (error) {
      log('ERROR', '❌ 機能テスト失敗', error.message);
      this.testResults.functionality.failed.push({
        test: 'functionality',
        error: error.message
      });
    }
  }

  // ===============================
  // 統合テスト
  // ===============================
  async testIntegration() {
    log('INFO', '=== 統合テスト開始 ===');
    
    try {
      // レイアウト統合確認
      await this.page.goto(`${BASE_URL}/board`, {
        waitUntil: 'networkidle2'
      });
      
      const layoutInfo = await this.page.evaluate(() => {
        const hasHeader = !!document.querySelector('header, [role="banner"]');
        const hasNav = !!document.querySelector('nav, [role="navigation"]');
        const hasMain = !!document.querySelector('main, [role="main"]');
        const hasFooter = !!document.querySelector('footer, [role="contentinfo"]');
        
        return {
          hasHeader,
          hasNav,
          hasMain,
          hasFooter
        };
      });
      
      log('DEBUG', 'レイアウト情報', layoutInfo);
      
      if (layoutInfo.hasHeader && layoutInfo.hasMain) {
        this.testResults.integration.passed.push({
          test: 'layout-structure',
          message: 'レイアウト構造正常'
        });
      }
      
      // レスポンシブ確認
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];
      
      for (const viewport of viewports) {
        await this.page.setViewport(viewport);
        await this.page.waitForTimeout(500);
        
        const isResponsive = await this.page.evaluate(() => {
          const main = document.querySelector('main');
          return main && main.offsetWidth > 0;
        });
        
        if (isResponsive) {
          log('DEBUG', `✅ ${viewport.name}表示正常`);
          this.testResults.integration.passed.push({
            test: `responsive-${viewport.name}`,
            message: `${viewport.name}表示正常`
          });
        }
      }
      
    } catch (error) {
      log('ERROR', '❌ 統合テスト失敗', error.message);
      this.testResults.integration.failed.push({
        test: 'integration',
        error: error.message
      });
    }
  }

  // ===============================
  // テスト実行
  // ===============================
  async run() {
    try {
      await this.initialize();
      
      // 認証は必須
      await this.testAuthentication();
      
      // 各テストを順次実行
      await this.testRouting();
      await this.testFunctionality();
      await this.testIntegration();
      
      // 結果集計
      this.generateReport();
      
    } catch (error) {
      log('ERROR', 'テスト実行エラー', error);
      this.generateReport();
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    log('INFO', '========================================');
    log('INFO', '結合テスト結果サマリー');
    log('INFO', '========================================');
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const [category, results] of Object.entries(this.testResults)) {
      const passed = results.passed.length;
      const failed = results.failed.length;
      totalPassed += passed;
      totalFailed += failed;
      
      log('INFO', `${category.toUpperCase()}`);
      log('INFO', `  ✅ 成功: ${passed}`);
      log('INFO', `  ❌ 失敗: ${failed}`);
      
      if (failed > 0) {
        results.failed.forEach(failure => {
          log('ERROR', `    - ${failure.test || failure.route}: ${failure.error}`);
        });
      }
    }
    
    log('INFO', '========================================');
    log('INFO', `総合結果: ✅ ${totalPassed} / ❌ ${totalFailed}`);
    log('INFO', `認証状態: ${this.sessionCookie ? '認証済み' : '未認証'}`);
    log('INFO', '========================================');
    
    // 詳細結果をファイルに保存
    const resultFile = path.join(__dirname, 'integration-test-detailed-results.json');
    fs.writeFileSync(resultFile, JSON.stringify(this.testResults, null, 2));
    log('INFO', `詳細結果を保存: ${resultFile}`);
    
    return totalFailed === 0;
  }
}

// ===============================
// メイン実行
// ===============================
async function main() {
  // スクリーンショット用ディレクトリ作成
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  const runner = new IntegrationTestRunner();
  
  try {
    await runner.run();
    process.exit(0);
  } catch (error) {
    log('ERROR', '結合テスト失敗', error.message);
    process.exit(1);
  }
}

// Puppeteer依存確認
try {
  require('puppeteer');
} catch (error) {
  console.error('ERROR: Puppeteerがインストールされていません');
  console.error('実行: npm install puppeteer');
  process.exit(1);
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = IntegrationTestRunner;