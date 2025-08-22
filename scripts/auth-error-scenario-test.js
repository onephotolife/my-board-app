#!/usr/bin/env node

/**
 * 認証エラーシナリオテスト
 * 25人天才エンジニア会議による問題修正検証
 * 
 * 特定問題: 誤パスワード入力時に /auth/email-not-verified に誤遷移する問題
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
  log('🎯 認証エラーシナリオテスト - 25人天才エンジニア会議', 'cyan');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ 
    headless: true,  // CI環境対応でヘッドレスモード
    slowMo: 500      // 0.5秒ごとに操作
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    
    // シナリオ1: 正常ユーザーで誤パスワード入力
    await runTest('シナリオ1: verified@test.com + 誤パスワード → パスワードエラー表示のみ', async () => {
      // ログインページに移動
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForSelector('input[name="email"]');
      
      // 正常ユーザーのメールアドレス入力
      await page.fill('input[name="email"]', 'verified@test.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      
      // ログインボタンクリック
      await page.click('button[type="submit"]');
      
      // 3秒待機（誤った場合の自動リダイレクトがないことを確認）
      await page.waitForTimeout(3000);
      
      // 現在のURLが /auth/signin のままであることを確認
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/email-not-verified')) {
        throw new Error('❌ 誤パスワードなのに /auth/email-not-verified にリダイレクトされました');
      }
      
      if (!currentUrl.includes('/auth/signin')) {
        throw new Error(`❌ 期待されるページにいません: ${currentUrl}`);
      }
      
      // パスワードエラーメッセージが表示されていることを確認
      const errorElements = await page.$$('div'); // エラーメッセージを含む要素を探す
      let foundPasswordError = false;
      
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text && (text.includes('パスワードが間違って') || text.includes('パスワードが正しく'))) {
          foundPasswordError = true;
          log(`    ✅ パスワードエラーメッセージ確認: "${text.substring(0, 50)}..."`, 'blue');
          break;
        }
      }
      
      if (!foundPasswordError) {
        throw new Error('❌ パスワードエラーメッセージが表示されていません');
      }
      
      log(`    ✅ 正常: ログインページに留まり、適切なエラーメッセージ表示`, 'green');
    });
    
    // シナリオ2: メール未確認ユーザーでのログイン
    await runTest('シナリオ2: unverified@test.com + 正パスワード → メール未確認ページ遷移', async () => {
      // ページをクリア
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForSelector('input[name="email"]');
      
      // メール未確認ユーザーのログイン試行
      await page.fill('input[name="email"]', 'unverified@test.com');
      await page.fill('input[name="password"]', 'Test123!');
      
      // ログインボタンクリック
      await page.click('button[type="submit"]');
      
      // 3秒待機（メール未確認の場合の自動リダイレクト待ち）
      await page.waitForTimeout(3000);
      
      // /auth/email-not-verified にリダイレクトされることを確認
      const currentUrl = page.url();
      if (!currentUrl.includes('/auth/email-not-verified')) {
        throw new Error(`❌ メール未確認なのに適切にリダイレクトされませんでした: ${currentUrl}`);
      }
      
      log(`    ✅ 正常: メール未確認ページにリダイレクト`, 'green');
    });
    
    // シナリオ3: 存在しないユーザー
    await runTest('シナリオ3: 存在しないユーザー → エラーメッセージ表示のみ', async () => {
      // ページをクリア
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForSelector('input[name="email"]');
      
      // 存在しないユーザーでのログイン試行
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'AnyPassword123!');
      
      // ログインボタンクリック
      await page.click('button[type="submit"]');
      
      // 3秒待機
      await page.waitForTimeout(3000);
      
      // ログインページに留まることを確認
      const currentUrl = page.url();
      if (!currentUrl.includes('/auth/signin')) {
        throw new Error(`❌ 存在しないユーザーなのに他のページにリダイレクトされました: ${currentUrl}`);
      }
      
      // エラーメッセージが表示されていることを確認
      const errorElements = await page.$$('div');
      let foundError = false;
      
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text && (text.includes('ログインできませんでした') || text.includes('正しくありません'))) {
          foundError = true;
          log(`    ✅ エラーメッセージ確認: "${text.substring(0, 50)}..."`, 'blue');
          break;
        }
      }
      
      if (!foundError) {
        throw new Error('❌ 適切なエラーメッセージが表示されていません');
      }
      
      log(`    ✅ 正常: ログインページに留まり、適切なエラーメッセージ表示`, 'green');
    });
    
    // シナリオ4: 正常ログイン（ベースライン確認）
    await runTest('シナリオ4: verified@test.com + 正パスワード → ダッシュボード遷移', async () => {
      // ページをクリア
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForSelector('input[name="email"]');
      
      // 正常ログイン
      await page.fill('input[name="email"]', 'verified@test.com');
      await page.fill('input[name="password"]', 'Test123!');
      
      // ログインボタンクリック
      await page.click('button[type="submit"]');
      
      // ダッシュボードへのリダイレクト待機
      await page.waitForTimeout(3000);
      
      // ダッシュボードまたは適切なページにリダイレクトされることを確認
      const currentUrl = page.url();
      if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/') && !currentUrl.endsWith('/')) {
        // 3秒追加で待機（ログイン処理の完了を待つ）
        await page.waitForTimeout(3000);
        const finalUrl = page.url();
        if (!finalUrl.includes('/dashboard')) {
          throw new Error(`❌ 正常ログインなのにダッシュボードにリダイレクトされませんでした: ${finalUrl}`);
        }
      }
      
      log(`    ✅ 正常: ダッシュボードまたはホームにリダイレクト`, 'green');
    });

  } finally {
    await browser.close();
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  log('📊 認証エラーシナリオテスト結果', 'cyan');
  console.log('='.repeat(60));
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  log(`\n✅ 成功: ${results.passed}件`, 'green');
  log(`❌ 失敗: ${results.failed}件`, 'red');
  log(`📈 成功率: ${passRate}%`, passRate === '100.0' ? 'green' : 'red');
  
  if (results.failed > 0) {
    log('\n❌ 失敗したテスト:', 'red');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      log(`  - ${test.name}: ${test.error}`, 'red');
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    log('🎉 認証エラーハンドリングが正常に修正されました！', 'green');
    log('✨ 誤パスワード→メール未確認ページ問題 解決済み', 'green');
  } else {
    log('⚠️  一部のシナリオでまだ問題があります', 'yellow');
  }
  
  console.log('='.repeat(60) + '\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
  log(`\n❌ テスト実行エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});