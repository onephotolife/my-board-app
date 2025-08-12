#!/usr/bin/env node

/**
 * 認証リダイレクト機能の検証テスト
 * 
 * テスト項目:
 * 1. 未ログイン状態でアクセスするとログインページにリダイレクトされる
 * 2. ログイン後に元のページに自動で戻る
 * 3. ダッシュボードが正しく表示され、ユーザー情報が見える
 */

const puppeteer = require('puppeteer');
const chalk = require('chalk');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

class AuthRedirectTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
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

  async setup() {
    this.log('ブラウザを起動中...', 'info');
    this.browser = await puppeteer.launch({
      headless: false, // 実際の動作を確認
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    });
    this.page = await this.browser.newPage();
    
    // コンソールログを表示
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(chalk.gray(`[Browser Error] ${msg.text()}`));
      }
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('ブラウザを終了しました', 'info');
    }
  }

  /**
   * テスト1: 未ログイン状態でのリダイレクト確認
   */
  async testUnauthorizedRedirect() {
    console.log('\n' + chalk.cyan('━'.repeat(60)));
    this.log('テスト1: 未ログイン状態でのリダイレクト確認', 'test');
    console.log(chalk.cyan('━'.repeat(60)) + '\n');
    
    const protectedPages = [
      { path: '/dashboard', name: 'ダッシュボード' },
      { path: '/profile', name: 'プロフィール' },
      { path: '/board', name: '掲示板' }
    ];

    let allPassed = true;

    for (const page of protectedPages) {
      this.log(`${page.name} (${page.path}) にアクセス中...`, 'info');
      
      try {
        await this.page.goto(`${BASE_URL}${page.path}`, { 
          waitUntil: 'networkidle0',
          timeout: 10000 
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
        const currentUrl = this.page.url();

        if (currentUrl.includes('/auth/signin')) {
          // callbackUrlパラメータの確認
          const url = new URL(currentUrl);
          const callbackUrl = url.searchParams.get('callbackUrl');
          
          if (callbackUrl) {
            this.log(`✅ ${page.name}: ログインページへリダイレクト成功 (callbackUrl=${callbackUrl})`, 'success');
          } else {
            this.log(`⚠️ ${page.name}: リダイレクトされたがcallbackUrlがない`, 'warning');
            allPassed = false;
          }
        } else {
          this.log(`❌ ${page.name}: リダイレクトされませんでした (現在のURL: ${currentUrl})`, 'error');
          allPassed = false;
        }
      } catch (error) {
        this.log(`❌ ${page.name}: エラー - ${error.message}`, 'error');
        allPassed = false;
      }
    }

    return allPassed;
  }

  /**
   * テスト2: ログイン後の元ページへの復帰
   */
  async testLoginRedirectBack() {
    console.log('\n' + chalk.cyan('━'.repeat(60)));
    this.log('テスト2: ログイン後の元ページへの復帰', 'test');
    console.log(chalk.cyan('━'.repeat(60)) + '\n');

    const targetPath = '/dashboard';
    
    try {
      // 1. 保護されたページにアクセス
      this.log(`${targetPath} にアクセス中...`, 'info');
      await this.page.goto(`${BASE_URL}${targetPath}`, {
        waitUntil: 'networkidle0',
        timeout: 10000
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. ログインページにリダイレクトされたことを確認
      const loginUrl = this.page.url();
      if (!loginUrl.includes('/auth/signin')) {
        this.log('❌ ログインページへのリダイレクトが失敗しました', 'error');
        return false;
      }

      const urlObj = new URL(loginUrl);
      const callbackUrl = urlObj.searchParams.get('callbackUrl');
      this.log(`ログインページにリダイレクトされました (callbackUrl=${callbackUrl})`, 'success');

      // 3. ログインフォームに入力
      this.log('ログイン情報を入力中...', 'info');
      
      // メールアドレス入力
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
      const emailInput = await this.page.$('input[type="email"], input[name="email"]');
      await emailInput.click({ clickCount: 3 }); // 全選択
      await emailInput.type(TEST_USER.email);
      
      // パスワード入力
      const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
      await passwordInput.click({ clickCount: 3 }); // 全選択
      await passwordInput.type(TEST_USER.password);
      
      this.log(`入力内容: ${TEST_USER.email} / ****`, 'info');

      // 4. ログインボタンをクリック
      this.log('ログインボタンをクリック...', 'info');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        this.page.click('button[type="submit"]')
      ]);

      // 5. リダイレクト先を確認
      await new Promise(resolve => setTimeout(resolve, 2000));
      const currentUrl = this.page.url();

      if (currentUrl.includes(targetPath)) {
        this.log(`✅ ログイン成功！元のページ (${targetPath}) へ正しくリダイレクトされました`, 'success');
        return true;
      } else {
        this.log(`❌ リダイレクト先が異なります。期待: ${targetPath}, 実際: ${currentUrl}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ エラー: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * テスト3: ダッシュボードの表示とユーザー情報確認
   */
  async testDashboardContent() {
    console.log('\n' + chalk.cyan('━'.repeat(60)));
    this.log('テスト3: ダッシュボードの表示とユーザー情報確認', 'test');
    console.log(chalk.cyan('━'.repeat(60)) + '\n');

    try {
      // 現在ダッシュボードにいることを確認
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/dashboard')) {
        this.log('ダッシュボードページに移動中...', 'info');
        await this.page.goto(`${BASE_URL}/dashboard`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // ページタイトルの確認
      const title = await this.page.title();
      this.log(`ページタイトル: ${title}`, 'info');

      // ユーザー情報の表示確認
      const checks = [];

      // 1. ウェルカムメッセージの確認
      try {
        const welcomeText = await this.page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          const welcomeElement = elements.find(el => 
            el.textContent.includes('ようこそ') || 
            el.textContent.includes('ダッシュボード') ||
            el.textContent.includes('Dashboard')
          );
          return welcomeElement ? welcomeElement.textContent : null;
        });
        
        if (welcomeText) {
          this.log(`✅ ウェルカムメッセージ表示: "${welcomeText}"`, 'success');
          checks.push(true);
        } else {
          this.log('⚠️ ウェルカムメッセージが見つかりません', 'warning');
          checks.push(false);
        }
      } catch (e) {
        this.log('⚠️ ウェルカムメッセージの確認失敗', 'warning');
        checks.push(false);
      }

      // 2. ユーザー名の表示確認
      try {
        const userName = await this.page.evaluate(() => {
          const bodyText = document.body.innerText;
          return bodyText.includes('test@example.com') || 
                 bodyText.includes('テストユーザー') ||
                 bodyText.includes('Test User');
        });
        
        if (userName) {
          this.log('✅ ユーザー情報が表示されています', 'success');
          checks.push(true);
        } else {
          this.log('⚠️ ユーザー情報が見つかりません', 'warning');
          checks.push(false);
        }
      } catch (e) {
        this.log('⚠️ ユーザー情報の確認失敗', 'warning');
        checks.push(false);
      }

      // 3. ログアウトボタンの確認
      try {
        const logoutButton = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(btn => 
            btn.textContent.includes('ログアウト') || 
            btn.textContent.includes('Logout') ||
            btn.textContent.includes('Sign out')
          );
        });
        
        if (logoutButton) {
          this.log('✅ ログアウトボタンが表示されています', 'success');
          checks.push(true);
        } else {
          this.log('⚠️ ログアウトボタンが見つかりません', 'warning');
          checks.push(false);
        }
      } catch (e) {
        this.log('⚠️ ログアウトボタンの確認失敗', 'warning');
        checks.push(false);
      }

      // 4. ナビゲーションメニューの確認
      try {
        const hasNavigation = await this.page.evaluate(() => {
          const navLinks = Array.from(document.querySelectorAll('a, button'));
          return navLinks.some(link => 
            link.textContent.includes('プロフィール') || 
            link.textContent.includes('Profile') ||
            link.textContent.includes('掲示板') ||
            link.textContent.includes('Board')
          );
        });
        
        if (hasNavigation) {
          this.log('✅ ナビゲーションメニューが表示されています', 'success');
          checks.push(true);
        } else {
          this.log('⚠️ ナビゲーションメニューが見つかりません', 'warning');
          checks.push(false);
        }
      } catch (e) {
        this.log('⚠️ ナビゲーションメニューの確認失敗', 'warning');
        checks.push(false);
      }

      // スクリーンショットを保存
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `dashboard-test-${timestamp}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      this.log(`📸 スクリーンショットを保存: ${screenshotPath}`, 'info');

      // 結果の集計
      const passedChecks = checks.filter(c => c).length;
      const totalChecks = checks.length;
      
      if (passedChecks === totalChecks) {
        this.log(`✅ すべての項目が確認されました (${passedChecks}/${totalChecks})`, 'success');
        return true;
      } else if (passedChecks > totalChecks / 2) {
        this.log(`⚠️ 一部の項目のみ確認されました (${passedChecks}/${totalChecks})`, 'warning');
        return true;
      } else {
        this.log(`❌ ダッシュボードの表示に問題があります (${passedChecks}/${totalChecks})`, 'error');
        return false;
      }

    } catch (error) {
      this.log(`❌ エラー: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * メインテスト実行
   */
  async run() {
    console.log(chalk.cyan.bold('\n🔒 認証リダイレクト機能テストを開始します\n'));
    
    const results = {
      test1: false,
      test2: false,
      test3: false
    };

    try {
      await this.setup();
      
      // テスト1: 未ログイン状態でのリダイレクト
      results.test1 = await this.testUnauthorizedRedirect();
      
      // テスト2: ログイン後の元ページへの復帰
      results.test2 = await this.testLoginRedirectBack();
      
      // テスト3: ダッシュボードの表示確認
      results.test3 = await this.testDashboardContent();
      
      // 結果サマリー
      console.log('\n' + chalk.cyan('═'.repeat(60)));
      console.log(chalk.cyan.bold('テスト結果サマリー'));
      console.log(chalk.cyan('═'.repeat(60)));
      
      console.log(results.test1 ? 
        chalk.green('✅ テスト1: 未ログイン時のリダイレクト - 成功') :
        chalk.red('❌ テスト1: 未ログイン時のリダイレクト - 失敗')
      );
      
      console.log(results.test2 ? 
        chalk.green('✅ テスト2: ログイン後の元ページ復帰 - 成功') :
        chalk.red('❌ テスト2: ログイン後の元ページ復帰 - 失敗')
      );
      
      console.log(results.test3 ? 
        chalk.green('✅ テスト3: ダッシュボード表示 - 成功') :
        chalk.red('❌ テスト3: ダッシュボード表示 - 失敗')
      );
      
      console.log(chalk.cyan('═'.repeat(60)));
      
      const allPassed = Object.values(results).every(r => r);
      if (allPassed) {
        console.log(chalk.green.bold('\n🎉 すべてのテストが成功しました！\n'));
      } else {
        console.log(chalk.yellow.bold('\n⚠️ 一部のテストが失敗しました\n'));
      }
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      console.error(error);
    } finally {
      // ブラウザは開いたままにして確認できるようにする
      this.log('\nブラウザは開いたままです。確認後、手動で閉じてください', 'info');
      this.log('Ctrl+C でスクリプトを終了できます', 'info');
      
      // プロセスを継続
      await new Promise(() => {});
    }
  }
}

// メイン実行
(async () => {
  const tester = new AuthRedirectTester();
  await tester.run();
})();