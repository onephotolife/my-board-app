#!/usr/bin/env node

/**
 * Playwright E2Eテストスクリプト（ブラウザベース）
 * 20人天才エンジニア会議による実装
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

// カラー出力
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// テスト結果
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

async function runTest(name, testFn) {
  log(`\n📝 ${name}`, 'cyan');
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    log(`  ✅ PASS (${duration}ms)`, 'green');
    results.passed++;
    results.tests.push({ name, status: 'passed', duration });
  } catch (error) {
    log(`  ❌ FAIL: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  log('🚀 Playwright E2Eテスト開始', 'cyan');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ 
    headless: true // ヘッドレスモードで実行
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // TEST 1: ログインページ表示
    await runTest('TEST-1: ログインページ表示', async () => {
      await page.goto(`${BASE_URL}/auth/signin`);
      const title = await page.title();
      if (!title.includes('会員制掲示板')) {
        throw new Error('ログインページが正しく表示されていません');
      }
    });

    // TEST 2: 正常なログイン
    await runTest('TEST-2: 正常なログイン', async () => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // フォーム入力
      await page.fill('input[name="email"]', 'verified@test.com');
      await page.fill('input[name="password"]', 'Test123!');
      
      // ログインボタンクリック
      await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]')
      ]);
      
      // ダッシュボードへのリダイレクト確認
      const url = page.url();
      if (!url.includes('/dashboard')) {
        throw new Error(`期待されるリダイレクトが発生しませんでした: ${url}`);
      }
      
      // セッション確認
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session-token'));
      if (!sessionCookie) {
        throw new Error('セッショントークンが作成されていません');
      }
      
      log(`    Session Cookie: ${sessionCookie.name}`, 'blue');
    });

    // TEST 3: ヘッダー表示確認
    await runTest('TEST-3: ログイン後のヘッダー表示', async () => {
      await page.goto(BASE_URL);
      
      // ユーザー名表示確認
      const userInfo = await page.textContent('header');
      if (!userInfo || !userInfo.includes('Verified User')) {
        log('    ⚠️  ユーザー名が表示されていない可能性', 'yellow');
      }
      
      // アバター表示確認
      const avatar = await page.$('header .MuiAvatar-root');
      if (!avatar) {
        throw new Error('アバターが表示されていません');
      }
    });

    // TEST 4: ログアウト
    await runTest('TEST-4: ログアウト処理', async () => {
      // メニューボタンクリック
      await page.click('[data-testid="menu-button"]');
      
      // ドロワーが開くのを待つ
      await page.waitForSelector('.MuiDrawer-root', { state: 'visible' });
      
      // ログアウトボタンクリック
      await Promise.all([
        page.waitForNavigation(),
        page.click('button:has-text("ログアウト")')
      ]);
      
      // トップページへのリダイレクト確認
      const url = page.url();
      if (!url.endsWith('/')) {
        log(`    ⚠️  トップページ以外にリダイレクト: ${url}`, 'yellow');
      }
      
      // セッション削除確認
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session-token'));
      if (sessionCookie && sessionCookie.value) {
        throw new Error('セッションが削除されていません');
      }
    });

    // TEST 5: 間違ったパスワード
    await runTest('TEST-5: 間違ったパスワード', async () => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      await page.fill('input[name="email"]', 'verified@test.com');
      await page.fill('input[name="password"]', 'WrongPassword!');
      
      await page.click('button[type="submit"]');
      
      // エラーメッセージ待機
      await page.waitForTimeout(1000);
      
      // エラー表示確認
      const errorText = await page.textContent('body');
      if (!errorText?.includes('間違って') && !errorText?.includes('エラー')) {
        log('    ⚠️  エラーメッセージが表示されていない可能性', 'yellow');
      }
      
      // ログインページに留まることを確認
      const url = page.url();
      if (!url.includes('/auth/signin')) {
        throw new Error('ログインページに留まっていません');
      }
    });

    // TEST 6: 未確認メール
    await runTest('TEST-6: 未確認メールアドレス', async () => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      await page.fill('input[name="email"]', 'unverified@test.com');
      await page.fill('input[name="password"]', 'Test123!');
      
      await page.click('button[type="submit"]');
      
      // エラーまたはリダイレクト待機
      await page.waitForTimeout(2000);
      
      // メール確認ページへのリダイレクト確認
      const url = page.url();
      if (url.includes('/dashboard')) {
        throw new Error('未確認メールでログインできてしまった');
      }
    });

    // TEST 7: 保護されたページへのアクセス
    await runTest('TEST-7: 未認証での保護ページアクセス', async () => {
      // 新しいコンテキストで開始（未認証状態）
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      
      await newPage.goto(`${BASE_URL}/dashboard`);
      
      // ログインページへのリダイレクト確認
      const url = newPage.url();
      if (!url.includes('/auth/signin')) {
        throw new Error(`ログインページにリダイレクトされませんでした: ${url}`);
      }
      
      await newContext.close();
    });

  } finally {
    await browser.close();
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  log('📊 テスト結果サマリー', 'cyan');
  console.log('='.repeat(60));
  
  log(`\n✅ 成功: ${results.passed}件`, 'green');
  log(`❌ 失敗: ${results.failed}件`, 'red');
  log(`📈 合格率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`, 'blue');
  
  if (results.failed > 0) {
    log('\n❌ 失敗したテスト:', 'red');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      log(`  - ${test.name}: ${test.error}`, 'red');
    });
  }

  if (results.failed === 0) {
    log('\n🎉 すべてのテストが成功しました！', 'green');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
  log(`\n❌ エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});